/*
 * These functions below are for various webpage functionalities. 
 * Each function serves to process data on the frontend:
 *      - Before sending requests to the backend.
 *      - After receiving responses from the backend.
 * 
 * To tailor them to your specific needs,
 * adjust or expand these functions to match both your 
 *   backend endpoints 
 * and 
 *   HTML structure.
 * 
 */

/**
 * Global Constants
 */

const questionsMap = {
    "company-net-worth": "Find industries where the average net worth of companies is above the overall average net worth of all companies.",
    "active-investors": "Find investors with more transactions than the average transaction count across all investors.",
    "revenue": "Find industries and their companies where the revenue in financial reports is above the average revenue of all companies in that industry.",
}


// This function checks the database connection and updates its status on the frontend.
async function checkDbConnection() {
    const statusElem = document.getElementById('dbStatus');
    const loadingGifElem = document.getElementById('loadingGif');

    const response = await fetch('/check-db-connection', {
        method: "GET"
    });

    // Hide the loading GIF once the response is received.
    loadingGifElem.style.display = 'none';
    // Display the statusElem's text in the placeholder.
    statusElem.style.display = 'inline';

    response.text()
    .then((text) => {
        statusElem.textContent = text;
    })
    .catch((error) => {
        statusElem.textContent = 'connection timed out';  // Adjust error handling if required.
    });
}


async function registerUser(event) {
    event.preventDefault(); 

    const userID = document.getElementById('registerUserID').value;
    const name = document.getElementById('registerName').value;
    const postalCode = document.getElementById('registerPostalCode').value;
    const address = document.getElementById('registerAddress').value;
    const country = document.getElementById('registerCountry').value;
    const province = document.getElementById('registerProvince').value;
    const city = document.getElementById('registerCity').value;

    const userData = { userID, name, postalCode, address, country, province, city };
    

    try {
        const response = await fetch('/register-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const responseData = await response.json();
        const messageElement = document.getElementById('registerResultMsg');

        if (response.ok) {
            messageElement.textContent = 'User registered successfully :)';
            messageElement.style.color = 'green';
        } else {
            messageElement.textContent = responseData.message || 'Failed to register user :(';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error:', error);
        const messageElement = document.getElementById('registerResultMsg');
        messageElement.textContent = 'An error occurred. Try again :)';
        messageElement.style.color = 'red';
    }

    document.getElementById('registerUserForm').reset();
}

//2.1.3 DELETE
async function deleteInvestor(event) {
    event.preventDefault(); 

    const investorID = document.getElementById('deleteInvestor').value;
    const messageElement = document.getElementById('deleteInvestorResultMsg');

    messageElement.textContent = '';
    messageElement.style.color = '';

    if (!investorID) {
        alert('Investor ID is required.');
        return;
    }

    try {
        const response = await fetch('/delete-investor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: investorID }),
        });

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'Investor deleted successfully!';
            messageElement.style.color = 'green';
        } else {
            messageElement.textContent = responseData.message || 'Failed to delete investor.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}

//show all investors
async function showAllInvestor(event) {
    event.preventDefault(); 

    const messageElement = document.getElementById('showAllInvestorResultMsg');
    const investorListElement = document.getElementById('investorList'); 

    messageElement.textContent = '';
    messageElement.style.color = '';
    if (investorListElement) {
        investorListElement.innerHTML = '';
    }

    try {
        const response = await fetch('/show-AllInvestor', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'All investors are shown successfully!';
            messageElement.style.color = 'green';

            const investors = responseData.data;
            if (investors && investors.length > 0) {
                const table = createTable(investors);
                if (investorListElement) {
                    investorListElement.appendChild(table);
                }
            } else {
                messageElement.textContent = 'No investors found.';
                messageElement.style.color = 'blue';
            }
        } else {
            messageElement.textContent = responseData.message || 'Failed to show investors.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}

//2.1.6 Join 
async function findBuyers(event) {
    event.preventDefault(); 

    const messageElement = document.getElementById('findStockBuyersResultMsg');
    const investorListElement = document.getElementById('findStockBuyersList'); 
    const stockName = document.getElementById('findStockBuyers').value;

    if (!stockName) {
        alert('Stcok Name is required.');
        return;
    }

    messageElement.textContent = '';
    messageElement.style.color = '';
    if (investorListElement) {
        investorListElement.innerHTML = '';
    }

    try {
        const response = await fetch(`/find-Buyers?name=${encodeURIComponent(stockName)}`);

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'All buyers are shown successfully!';
            messageElement.style.color = 'green';

            const investors = responseData.data;
            if (investors && investors.length > 0) {
                const table = createTable(investors);
                if (investorListElement) {
                    investorListElement.appendChild(table);
                }
            } else {
                messageElement.textContent = 'No buyers found.';
                messageElement.style.color = 'blue';
            }
        } else {
            messageElement.textContent = responseData.message || 'Failed to show buyers.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}

//2.1.7 Aggregation with GROUP BY  
async function listShares(event) {
    event.preventDefault(); 

    const messageElement = document.getElementById('sharesOfInvestorResultMsg');
    const sharesListElement = document.getElementById('sharesOfInvestorList'); 
    const id = document.getElementById('sharesOfInvestor').value;

    if (!id) {
        alert('Investor ID is required.');
        return;
    }

    messageElement.textContent = '';
    messageElement.style.color = '';
    if (sharesListElement) {
        sharesListElement.innerHTML = '';
    }

    try {
        const response = await fetch(`/list-Shares?id=${encodeURIComponent(id)}`);

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'All shares are found successfully!';
            messageElement.style.color = 'green';

            const shares = responseData.data;
            if (shares && shares.length > 0) {
                const table = createTable(shares);
                if (sharesListElement) {
                    sharesListElement.appendChild(table);
                }
            } else {
                messageElement.textContent = 'No shares found.';
                messageElement.style.color = 'blue';
            }
        } else {
            messageElement.textContent = responseData.message || 'Failed to find shares.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}

//2.1.8 Aggregation with HAVING 
async function listStock(event) {
    event.preventDefault(); 

    const messageElement = document.getElementById('moreThanResultMsg');
    const moreThanElement = document.getElementById('moreThanList'); 
    const number = document.getElementById('moreThan').value;

    if (!number) {
        alert('Number entered is required.');
        return;
    }

    messageElement.textContent = '';
    messageElement.style.color = '';
    if (moreThanElement) {
        moreThanElement.innerHTML = '';
    }

    try {
        const response = await fetch(`/list-Stock?number=${encodeURIComponent(number)}`);

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'Found successfully!';
            messageElement.style.color = 'green';

            const shares = responseData.data;
            if (shares && shares.length > 0) {
                const table = createTable(shares);
                if (moreThanElement) {
                    moreThanElement.appendChild(table);
                }
            } else {
                messageElement.textContent = 'No investor ID found.';
                messageElement.style.color = 'blue';
            }
        } else {
            messageElement.textContent = responseData.message || 'Failed to find investor ID.';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}



const createTable = (data, headers=null) => {
    if (!data || !data.length) {
        console.error("No data provided to create the table.");
        return null;
    }

    // Determine headers
    const columns = headers || Object.keys(data[0]);

    // Create table element
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.border = "1px solid #ccc";

    // Create thead
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    columns.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        th.style.border = "1px solid #ccc";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f9f9f9";
        th.style.textAlign = "left";
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create tbody
    const tbody = document.createElement("tbody");
    data.forEach((row) => {
        const tr = document.createElement("tr");
        columns.forEach((col) => {
            const td = document.createElement("td");
            td.textContent = row[col] !== undefined ? row[col] : "";
            td.style.border = "1px solid #ccc";
            td.style.padding = "8px";
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

async function handleColumnNameRefresh(e) {
    e.preventDefault()
    e.stopImmediatePropagation()
    const cols = await fetchColumnNames()
    renderChecks("col-names-field", cols)
}

async function handleTableRefresh(e) {
    e.preventDefault()
    const cols = getSelectedColumns("col-names-field")
    if(cols.length === 0) {
        alert("Please select at least 1 column to display")
        return
    }
    const data = await fetchTable("ANALYSABLE_COMPANY_RELEASED_FINANCIALREPORT", cols)
    renderTable(data.rows, cols, "financialReportTableContainer", "financialReport")
}

async function fetchInsights(type) {
    const res = await fetch(`/insights?type=${encodeURIComponent(type)}`)
    return res.json();
}

async function handleInsights (e) {
    e.preventDefault();
    const form = document.getElementById("insightForm")
    const select = form.querySelector("select")
    const messageElement = document.getElementById('insightMsg');
    const insightListElem = document.getElementById('insightList'); 
    insightListElem.innerHTML = ''
    messageElement.textContent = '';

    const insightType = select.value;
    try {
        const response = await fetchInsights(insightType);
        const insights = response.data
        const rows = insights.rows
        const headers = insights.metaData.map(row=>row.name)
        
        if (insights && insights.rows.length >= 0) {
            renderTable(rows, headers, "insightList", "insightList")
            messageElement.textContent = response.message
            messageElement.style.color = 'green';
        } else {
            messageElement.textContent = 'No results to show.';
            messageElement.style.color = 'blue';
        }
    } catch(e) {
        console.log(e);
        messageElement.textContent = 'Error while getting Insights.';
        messageElement.style.color = 'red';
    }
}

async function fetchAllCompanyStocksOwners () {
    const res = await fetch(`/all-company-stock-owners`)
    return res.json();
}

async function handleAllStocksOwners (e) {
    e.preventDefault();
    const messageElement = document.getElementById('allStocksOwnerMsg');
    const listElem = document.getElementById('allStocksOwnerList'); 
    listElem.innerHTML = ''
    messageElement.textContent = '';
    
    try {
        const response = await fetchAllCompanyStocksOwners()
        const allCompanyStockOwners = response.data
        const rows = allCompanyStockOwners.rows
        const headers = allCompanyStockOwners.metaData.map(row=>row.name)
        
        if (allCompanyStockOwners && allCompanyStockOwners.rows.length >= 0) {
            renderTable(rows, headers, "allStocksOwnerList", "allStocksOwnerList")
            messageElement.textContent = response.message
            messageElement.style.color = 'green';
        } else {
            messageElement.textContent = 'No results to show.';
            messageElement.style.color = 'blue';
        }
    } catch(e) {
        console.log(e);
        messageElement.textContent = 'Error while getting Insights.';
        messageElement.style.color = 'red';
    }
}

const handleInsightSelectionChange = (e) => {
    const form = document.getElementById("insightForm")
    const select = form.querySelector("select")
    const questionText = document.getElementById("insightQuestion")
    const selection  = select.value

    questionText.textContent = ''

    if(!selection) {
        return
    }

    questionText.innerHTML = `The result will answer the following question:<br>"${questionsMap[selection]}"`;
}

// ---------------------------------------------------------------
// Initializes the webpage functionalities.
// Add or remove event listeners based on the desired functionalities.
window.onload = async function(e) {
    checkDbConnection();
    const cols = await fetchColumnNames()
    renderChecks("col-names-field", cols)
    document.getElementById("registerUserForm").addEventListener("submit", registerUser);
    document.getElementById('updateInvestorForm').addEventListener('submit', updateInvestorDetails);
    document.getElementById("getColNamesform").addEventListener("submit", handleColumnNameRefresh);
    document.getElementById("financialReportBtn").addEventListener("click", handleTableRefresh);
    document.getElementById('deleteInvestorForm').addEventListener('submit', deleteInvestor);
    document.getElementById('showAllInvestorForm').addEventListener('submit', showAllInvestor);
    document.getElementById('findStockBuyersForm').addEventListener('submit', findBuyers);
    document.getElementById('sharesOfInvestorForm').addEventListener('submit', listShares);
    document.getElementById('moreThanForm').addEventListener('submit', listStock);
    document.getElementById('insightForm').addEventListener('submit', handleInsights);
    document.getElementById('allStocksOwnerForm').addEventListener('submit', handleAllStocksOwners);
    document.getElementById('insight-select').addEventListener('change', handleInsightSelectionChange);
    // fetchTableData();
    // document.getElementById("resetDemotable").addEventListener("click", resetDemotable);
    // document.getElementById("insertDemotable").addEventListener("submit", insertDemotable);
    // document.getElementById("updataNameDemotable").addEventListener("submit", updateNameDemotable);
    // document.getElementById("countDemotable").addEventListener("click", countDemotable);
};

async function fetchAndDisplayInvestors() {
    const tableElement = document.getElementById('investorTable');
    const tableBody = tableElement.querySelector('tbody');

    try {
        const response = await fetch('/investors');
        const investors = await response.json();

        tableBody.innerHTML = '';

        investors.forEach((investor) => {
            const row = tableBody.insertRow();

            const idCell = row.insertCell(0);
            idCell.textContent = investor.id;

            const nameCell = row.insertCell(1); 
            nameCell.textContent = investor.name

            const postalCodeCell = row.insertCell(2);
            postalCodeCell.textContent = investor.postalCode;

            const addressCell = row.insertCell(3);
            addressCell.textContent = investor.address;

            const countryCell = row.insertCell(4);
            countryCell.textContent = investor.country;

            const provinceCell = row.insertCell(5);
            provinceCell.textContent = investor.province;

            const cityCell = row.insertCell(6);
            cityCell.textContent = investor.city;
        });
    } catch (error) {
        console.error('Error fetching investor data:', error);
    }
}



async function populateInvestorIDs() {
    const investorIDDropdown = document.getElementById('updateInvestorID');
    try {
        const response = await fetch('/investors');
        const investors = await response.json();

        investorIDDropdown.innerHTML = '<option value="" disabled selected>Select Investor ID</option>'; // clear existed

        investors.forEach((investor) => {
            const option = document.createElement('option');
            option.value = investor.id;
            option.textContent = `ID: ${investor.id}`;
            investorIDDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching investors:', error);
        const messageElement = document.getElementById('updateInvestorResultMsg');
        messageElement.textContent = 'Error loading investor IDs.';
        messageElement.style.color = 'red';
    }
}



async function updateInvestorDetails(event) {
    event.preventDefault(); 

    const investorID = document.getElementById('updateInvestorID').value;
    const name = document.getElementById('updateName').value || null; 
    const postalCode = document.getElementById('updatePostalCode').value || null;
    const address = document.getElementById('updateAddress').value || null;
    const country = document.getElementById('updateCountry').value || null;
    const province = document.getElementById('updateProvince').value || null;
    const city = document.getElementById('updateCity').value || null;

    const messageElement = document.getElementById('updateInvestorResultMsg');

    messageElement.textContent = '';
    messageElement.style.color = '';

    if (!investorID) {
        alert('ID is required to identify the Investor');
        return;
    }

    if ((postalCode && !country) || (!postalCode && country)) {
        messageElement.textContent = '`Postal Code` and `Country` must be filled together or left blank.';
        messageElement.style.color = 'red';
        return;
    }

    if (!name && !postalCode && !address && !country && !province && !city) {
        alert('Please fill at least one field to update!');
        return;
    }

    const payload = { id: investorID, name, postalCode, address, country, province, city };
    console.log('to backend:', payload);

    try {
        const response = await fetch('/update-investor-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (response.ok && responseData.success) {
            messageElement.textContent = 'Investor details updated!';
            messageElement.style.color = 'green';
            refreshInvestorTable();
        } else {
            messageElement.textContent = responseData.message || 'Error updating investor details!';
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        messageElement.textContent = 'An error occurred. Try again.';
        messageElement.style.color = 'red';
    }
}

// Refreshes the table data by invoking the fetch and display function
function refreshInvestorTable() {
    fetchAndDisplayInvestors();
}

const addConditionBtn = document.getElementById("addConditionBtn");
const stockSearchForm = document.getElementById("stockSearchForm");

// Handle Add Condition Button
addConditionBtn.addEventListener("click", async () => {
    addConditionRow(await fetchColumnNames("TRANSACTIONABLE_SHARE_OF_COMPANY_STOCK"));
});

// Handle Form Submission
stockSearchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const conditions = [];
    const conditionGroups = document.querySelectorAll(".condition-group");

    conditionGroups.forEach((group, index) => {
        const logic = index > 0 ? group.querySelector(".logic-operator").value : null;
        const attribute = group.querySelector(".attribute").value;
        const operator = group.querySelector(".comparison-operator").value;
        const value = group.querySelector(".value").value;

        conditions.push({ logic, attribute, operator, value });
    });

    try {
        const stocks = (await fetchStocks(conditions)).rows
        if(!stocks || stocks.length === 0) {
            alert("No stocks found matching the given conditions")
            return
        }
        renderTable(stocks, 
                    await fetchColumnNames("TRANSACTIONABLE_SHARE_OF_COMPANY_STOCK"), 
                    "displayStockSelectionResults", 
                    "displayStockSelectionResults"
                    )
    } catch(err) {
        console.log(e);
        alert("Error fetching stocks. Please double check the values you entered.")
    }
    
});

// Dummy fetch function to simulate backend query
async function fetchStocks(conditions) {
    const res = await fetch(`/table/selection/TRANSACTIONABLE_SHARE_OF_COMPANY_STOCK`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({conditions})
    })
    return await res.json()
}