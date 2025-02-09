const oracledb = require('oracledb');
const loadEnvFile = require('./utils/envUtil');

const envVariables = loadEnvFile('./.env');

// Database configuration setup. Ensure your .env file has the required database credentials.
const dbConfig = {
    user: envVariables.ORACLE_USER,
    password: envVariables.ORACLE_PASS,
    connectString: `${envVariables.ORACLE_HOST}:${envVariables.ORACLE_PORT}/${envVariables.ORACLE_DBNAME}`,
    poolMin: 1,
    poolMax: 50,
    poolIncrement: 1,
    poolTimeout: 60
};

// initialize connection pool
async function initializeConnectionPool() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool started');
    } catch (err) {
        console.error('Initialization error: ' + err.message);
    }
}

async function closePoolAndExit() {
    console.log('\nTerminating');
    try {
        await oracledb.getPool().close(10); // 10 seconds grace period for connections to finish
        console.log('Pool closed');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

initializeConnectionPool();

process
    .once('SIGTERM', closePoolAndExit)
    .once('SIGINT', closePoolAndExit);


// ----------------------------------------------------------
// Wrapper to manage OracleDB actions, simplifying connection handling.
async function withOracleDB(action) {
    let connection;
    try {
        connection = await oracledb.getConnection(); // Gets a connection from the default pool 
        return await action(connection);
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}


// ----------------------------------------------------------
// Core functions for database operations
// Modify these functions, especially the SQL queries, based on your project's requirements and design.
async function testOracleConnection() {
    return await withOracleDB(async (connection) => {
        return true;
    }).catch(() => {
        return false;
    });
}


async function registerUser(body) {
    const { userID, name, postalCode, address, country, province, city } = body;

    return await withOracleDB(async (connection) => {
        try {
            if (!userID || !name || !postalCode || !address || !country || !province || !city) {
                throw new Error('Missing required fields for user registration');
            }

            console.log('Ensuring User_table entry exists:', { userID, name });
            await connection.execute(
                `INSERT INTO User_table (id, name)
                 SELECT :userID, :name FROM DUAL
                 WHERE NOT EXISTS (
                     SELECT 1 FROM User_table WHERE id = :userID
                 )`,
                { userID, name },
                { autoCommit: true }
            );

            console.log('Ensuring Investor2 entry exists:', { country, postalCode, province, city });
            await connection.execute(
                `INSERT INTO Investor2 (country, postal_code, province, city)
                 SELECT :country, :postalCode, :province, :city FROM DUAL
                 WHERE NOT EXISTS (
                     SELECT 1 FROM Investor2 WHERE country = :country AND postal_code = :postalCode
                 )`,
                { country, postalCode, province, city },
                { autoCommit: true }
            );

            console.log('Inserting into Investor1:', { userID, postalCode, address, country });
            const investor1Result = await connection.execute(
                `INSERT INTO Investor1 (id, postal_code, address, country)
                 VALUES (:userID, :postalCode, :address, :country)`,
                { userID, postalCode, address, country },
                { autoCommit: true }
            );

            if (!investor1Result.rowsAffected) {
                throw new Error('Failed to insert into Investor1');
            }

            console.log('User registered successfully!');
            return true;
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    });
}

async function getColumnNames(tableName) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT COLUMN_NAME
            FROM USER_TAB_COLUMNS
            WHERE TABLE_NAME = UPPER('${tableName}')`);
        return result.rows;
    }).catch((e) => {
        console.log(e);
        return [];
    });
}



async function getRows(tableName, cols=null) {
    let columns = ""
    if(!cols) {
        columns = "*"
    } else {
        columns = cols.reduce((acc, colname)=>{
            return acc + colname + ", "
        }, "")

        // remove ", " from the end of the string
        columns =  columns.slice(0, columns.length - 2)
    }
    
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT ${columns}
            FROM ${tableName}`);
            return result.rows;
    }).catch((e) => {
        console.log(e);
        return [];
    });
}

async function fetchInvestors() {
    return await withOracleDB(async (connection) => {

        const result = await connection.execute(
            `SELECT u.id, u.name, i1.postal_code, i1.address, i1.country, i2.province, i2.city
             FROM User_table u
             JOIN Investor1 i1 ON u.id = i1.id
             JOIN Investor2 i2 ON i1.country = i2.country AND i1.postal_code = i2.postal_code`
        );

        return result.rows.map((row) => ({
            id: row[0], 
            name: row[1],        
            postalCode: row[2], 
            address: row[3],    
            country: row[4],    
            province: row[5],   
            city: row[6],      
        }));
    });
}

async function updateInvestorDetails(payload) {
    const { id, postalCode, address, country, province, city, name } = payload;

    if (!id) {
        throw new Error('ID is required to identify the Investor');
    }

    if (!name && !postalCode && !address && !country && !province && !city) {
        throw new Error('At least one field must be provided for an update!');
    }


    if ((postalCode && !country) || (country && !postalCode)) {
        throw new Error('`country` and `postalCode` must be updated together.');
    }

    return await withOracleDB(async (connection) => {
        const userCheck = await connection.execute(
            `SELECT 1 FROM User_table WHERE id = :id`,
            { id }
        );
        if (userCheck.rows.length === 0) {
            throw new Error(`ID such :${id} does not exist in User_table.`);
        }

        if (name) {
            const updateNameResult = await connection.execute(
                `UPDATE User_table
                 SET name = :name
                 WHERE id = :id`,
                { name, id },
                { autoCommit: true }
            );

            if (updateNameResult.rowsAffected === 0) {
                throw new Error('Failed to update name in User_table.');
            }
        }

        if (postalCode && country) {
            const investor2Check = await connection.execute(
                `SELECT 1 FROM Investor2 WHERE country = :country AND postal_code = :postalCode`,
                { country, postalCode }
            );

            if (investor2Check.rows.length === 0) {
                console.log(`(country: ${country}, postalCode: ${postalCode}) does not exist in Investor2. Inserting it.`);
                await connection.execute(
                    `INSERT INTO Investor2 (country, postal_code, province, city)
                     VALUES (:country, :postalCode, :province, :city)`,
                    {
                        country,
                        postalCode,
                        province: province || 'Unknown', 
                        city: city || 'Unknown',
                    },
                    { autoCommit: true }
                );
            }
        }

        if (postalCode || address || country) {
            const updates = [];
            const params = { id };

            if (postalCode && country) {
                updates.push('postal_code = :postalCode', 'country = :country');
                params.postalCode = postalCode;
                params.country = country;
            }

            if (address) {
                updates.push('address = :address');
                params.address = address;
            }

            if (updates.length > 0) {
                const sql = `
                    UPDATE Investor1
                    SET ${updates.join(', ')}
                    WHERE id = :id
                `;

                const result = await connection.execute(sql, params, { autoCommit: true });
                if (result.rowsAffected === 0) {
                    throw new Error('Investor1 record not found or no changes made.');
                }
            }
        }



        if (province || city) {
            const existing = await connection.execute(
                `SELECT postal_code, country FROM Investor1 WHERE id = :id`,
                { id }
            );

            if (existing.rows.length === 0) {
                throw new Error(`No record in Investor1 found for ID ${id}. Cannot update Investor2.`);
            }

            const [currentPostalCode, currentCountry] = existing.rows[0];
            if (!currentPostalCode || !currentCountry) {
                console.warn('Skipping Investor2 update: postalCode or country is missing.', { postalCode: currentPostalCode, country: currentCountry });
                return; 
            }

            const updates = [];
            const params = { postalCode: currentPostalCode, country: currentCountry };

            if (province) {
                updates.push('province = :province');
                params.province = province;
            }
            if (city) {
                updates.push('city = :city');
                params.city = city;
            }

            if (updates.length > 0) {
                const sql = `
                    UPDATE Investor2
                    SET ${updates.join(', ')}
                    WHERE country = :country AND postal_code = :postalCode
                `;

                const result = await connection.execute(sql, params, { autoCommit: true });
                if (result.rowsAffected === 0) {
                    console.warn('No matching record found in Investor2 for update.', { postalCode: currentPostalCode, country: currentCountry });
                }
            }
        }

        console.log('Update successful!');
        return true;
    });
}


//2.1.3 DELETE  
async function deleteInvestor(id) {
    if (!id) {
        throw new Error('Investor ID is required to delete an investor.');
    }

    return await withOracleDB(async (connection) => {
        try {
            const checkInvestor = await connection.execute(
                `SELECT * FROM Investor1 WHERE id = :id`,
                { id }
            );

            if (checkInvestor.rows.length === 0) {
                throw new Error(`Investor with ID ${id} does not exist.`);
            }

            const deleteInvestor1Result = await connection.execute(
                `DELETE FROM Investor1 WHERE id = :id`,
                { id },
                { autoCommit: true }
            );

            if (deleteInvestor1Result.rowsAffected === 0) {
                throw new Error('Failed to delete investor.');
            }
            return true;
        } catch (error) {
            console.error('Error during investor deletion:', error);
            throw error;
        }
    });
}

//show all investors
async function showAllInvestor() {
    return await withOracleDB(async (connection) => {
        const query = `
        SELECT
            u.id AS user_id,
            u.name AS user_name,
            i1.postal_code,
            i1.address,
            i1.country,
            i2.province,
            i2.city
        FROM User_table u, Investor1 i1, Investor2 i2
        WHERE 
            u.id = i1.id
            AND i1.country = i2.country
            AND i1.postal_code = i2.postal_code`
        const result = await connection.execute(
           query,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
    }).catch((e) => {
        console.error('Database error:', e);
        return [];
    });
}

//2.1.6 Join 
async function findStockBuyers(name) {
    if (!name) {
        throw new Error('Name of Stock is required.');
    }

    return await withOracleDB(async (connection) => {
        try {
            const checkStock = await connection.execute(
                `SELECT *
                 FROM Transactionable_Share_of_Company_Stock  
                 WHERE company_name = :name`,
                { name }
            );

            if (checkStock.rows.length === 0) {
                throw new Error(`Stock with Name ${name} does not exist.`);
            }

            const query = `
                SELECT
                    u.id as investor_id,
                    u.name as Investor_name
                FROM (
                        SELECT DISTINCT E.investor_id
                        FROM Executed_Transaction E
                        JOIN Transactionable_Share_of_Company_Stock T ON E.transaction_id = T.transaction_id
                        WHERE T.company_name = :name
                    ) res,
                    User_table u
                WHERE
                    res.investor_id = u.id
            `
            const findBuyers = await connection.execute(
                query ,
                { name },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (findBuyers.rowsAffected === 0) {
                throw new Error('Failed to find buyers.');
            }

            return findBuyers.rows;
        } catch (error) {
            console.error('Error during find stock:', error);
            throw error;
        }
    });
}

//2.1.7 Aggregation with GROUP BY 
async function sharesOfInvestor(id) {
    if (!id) {
        throw new Error('Investor ID is required.');
    }

    return await withOracleDB(async (connection) => {
        try {
            const checkID = await connection.execute(
                `SELECT *
                 FROM Investor1  
                 WHERE id = :id`,
                { id }
            );

            if (checkID.rows.length === 0) {
                throw new Error(`Investor ID ${id} does not exist.`);
            }

            const listShares = await connection.execute(
                `SELECT T.company_name, SUM(E.number_of_shares) As total_shares
                 FROM Executed_Transaction E
                 JOIN Transactionable_Share_of_Company_Stock T ON E.transaction_id = T.transaction_id
                 WHERE E.investor_id = :id
                 GROUP BY T.company_name`,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (listShares.rowsAffected === 0) {
                throw new Error('No share is found for investor ID ${id}.');
            }
            return listShares.rows;
        } catch (error) {
            console.error('Error during finding shares:', error);
            throw error;
        }
    });
}

//2.1.8 Aggregation with HAVING
async function stockNum(threshold) {
    if (!threshold) {
        throw new Error('Number is required.');
    }

    return await withOracleDB(async (connection) => {
        try {
            const listStock = await connection.execute(
                `SELECT E.investor_id, COUNT(DISTINCT T.company_name) As numberOfCompanies
                 FROM Executed_Transaction E
                 JOIN Transactionable_Share_of_Company_Stock T ON E.transaction_id = T.transaction_id
                 GROUP BY E.investor_id
                 HAVING COUNT(DISTINCT T.company_name) >= :threshold`,
                { threshold },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (listStock.rows.length === 0) {
                throw new Error('No investors holding shares in more than ${threshold} companies.');
            }
            return listStock.rows;
        } catch (error) {
            console.error('Error during finding investor IDs:', error);
            throw error;
        }
    });
}



// Parse conditions into SQL-like structure
function parseConditions(conditions) {
    let query = "";

    conditions.forEach((condition, index) => {
        if (condition.logic) query += ` ${condition.logic} `;
        query += `${condition.attribute} ${condition.operator} '${condition.value}'`;
    });

    return query;
}


async function getSelectedRows(tableName, conditions) {
    // Return all rows if no conditions are provided
    let query = ""
    if(!conditions || conditions.length === 0) {
        query = `
            SELECT *
            FROM ${tableName}`
    } else {
        const parsedConditions = parseConditions(conditions)
        query = `
            SELECT *
            FROM ${tableName}
            WHERE ${parsedConditions}`
    }
    
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(query);
        return result.rows;
    }).catch((e) => {
        console.log(e);
        return [];
    });
}

async function getInsights(type) {
    let query = ""
    switch(type) {
        case "company-net-worth":
            query =
            `
                SELECT I.industry_name, AVG(C.net_worth) AS avg_net_worth_per_industry
                FROM Industrial_Company C
                JOIN Industry I ON C.industry_name = I.industry_name
                GROUP BY I.industry_name
                HAVING AVG(C.net_worth) > (SELECT AVG(net_worth) FROM Industrial_Company)
            `
            break
        case "active-investors":
            query = 
            `
                SELECT
                    u.id as investor_id,
                    u.name as Investor_name,
                    res.transaction_count
                FROM (
                        SELECT I.id AS investor_id, COUNT(T.transaction_id) AS transaction_count
                        FROM Executed_Transaction T
                        JOIN Investor1 I ON T.investor_id = I.id
                        GROUP BY I.id
                        HAVING COUNT(T.transaction_id) > (SELECT AVG(cnt) 
                                                        FROM (SELECT COUNT(transaction_id) AS cnt 
                                                                FROM Executed_Transaction 
                                                                GROUP BY investor_id))
                    ) res,
                    User_table u
                WHERE
                    res.investor_id = u.id
            `
            break
        case "revenue":
            query = 
            `
                SELECT IC.industry_name, F.company_name, F.revenue
                FROM Industrial_Company IC
                JOIN Analysable_Company_Released_FinancialReport F ON IC.company_name = F.company_name
                WHERE F.revenue > (
                    SELECT AVG(F2.revenue)
                    FROM Industrial_Company IC2
                    JOIN Analysable_Company_Released_FinancialReport F2 ON IC2.company_name = F2.company_name
                    WHERE IC.industry_name = IC2.industry_name
                    GROUP BY IC2.industry_name
                )
            `
            break
        default:
            throw new Error("Unsupported insight type received.")
    }
    
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(query);
        return result;
    }).catch((e) => {
        console.log(e);
        return [];
    });
}

async function getAllCompanyStockOwners() {
    // Return all rows if no conditions are provided
    let query = 
    `
        SELECT DISTINCT u.id as investor_id, u.name AS investor_name
        FROM User_table u
        JOIN Investor1 i ON u.id = i.id
        WHERE NOT EXISTS (
            SELECT c.company_name
            FROM Industrial_Company c
            WHERE c.company_name NOT IN (
                SELECT ts.company_name
                FROM Transactionable_Share_of_Company_Stock ts
                JOIN Executed_Transaction et ON ts.transaction_id = et.transaction_id
                WHERE et.investor_id = i.id
            )
        )
    `
   
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(query);
        return result;
    }).catch((e) => {
        console.log(e);
        return [];
    });
}

module.exports = {
    testOracleConnection,
    registerUser,
    fetchInvestors,
    updateInvestorDetails,
    getColumnNames,
    getRows,
    getSelectedRows,
    deleteInvestor,
    showAllInvestor,
    findStockBuyers,
    sharesOfInvestor,
    stockNum,
    getInsights,
    getAllCompanyStockOwners
};