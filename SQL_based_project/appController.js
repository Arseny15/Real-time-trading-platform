const express = require('express');
const appService = require('./appService');

const router = express.Router();

// ----------------------------------------------------------
// API endpoints
// Modify or extend these routes based on your project's needs.
router.get('/check-db-connection', async (req, res) => {
    const isConnect = await appService.testOracleConnection();
    if (isConnect) {
        res.send('connected');
    } else {
        res.send('unable to connect');
    }
});


router.post('/register-user', async (req, res) => {
    try {
        const success = await appService.registerUser(req.body);

        if (success) {
            res.status(200).json({ message: 'User registered successfully!' });
        } else {
            res.status(500).json({ message: 'Failed to register user.' });
        }
    } catch (error) {
        console.error('Error in /register-user:', error);
        res.status(500).json({ message: 'Error occurred.', error });
    }
});

router.get('/column-names/:tableName', async (req, res) => {
    const tableName = req.params.tableName
    const cols = await appService.getColumnNames(tableName);
    if (cols && cols.length > 0) {
        res.status(200).json({ 
            success: true,  
            columns: cols
        });
    } else {
        res.status(500).json({ 
            success: false, 
            columns: cols
        });
    }
});

router.post('/table/:tableName', async (req, res) => {
    const tableName = req.params.tableName
    const cols = req.body.cols
    const rows = await appService.getRows(tableName, cols);
    
    if (rows && rows.length > 0) {
        res.status(200).json({ 
            success: true,  
            rows: rows
        });
    } else {
        res.status(500).json({ 
            success: false, 
            rows: rows
        });
    }
});

router.post('/table/selection/:tableName', async (req, res) => {
    const tableName = req.params.tableName
    const conditions = req.body.conditions
    const rows = await appService.getSelectedRows(tableName, conditions);
    
    if (rows && rows.length >= 0) {
        res.status(200).json({ 
            success: true,  
            rows: rows
        });
    } else {
        res.status(500).json({ 
            success: false, 
            rows: rows
        });
    }
});


router.get('/investors', async (req, res) => {
    try {
        const investors = await appService.fetchInvestors();
        res.json(investors);
    } catch (error) {
        console.error('Error in /investors:', error);
        res.status(500).json({ message: 'Failed to fetch investors.' });
    }
});

// update
router.post('/update-investor-details', async (req, res) => {
    try {
        const success = await appService.updateInvestorDetails(req.body);
        if (success) {
            res.json({ success: true, message: 'Investor details updated!' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to update investor details.' });
        }
    } catch (error) {
        console.error('Error in /update-investor-details:', error);
        res.status(500).json({ success: false, message: 'Error occurred.', error });
    }
});

//2.1.3 DELETE
router.post('/delete-investor', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Investor ID is required.' });
    }

    try {
        const success = await appService.deleteInvestor(id);

        if (success) {
            res.status(200).json({ success: true, message: 'Investor deleted successfully!' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to delete investor.' });
        }
    } catch (error) {
        console.error('Error in /delete-investor:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


//show all investors
router.get('/show-AllInvestor', async (req, res) => {
    try {
        const data = await appService.showAllInvestor();

        if (data) {
            res.status(200).json({ success: true, data: data, message: 'All Investors are shown!' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to show all investors.' });
        }
    } catch (error) {
        console.error('Error in /show-AllInvestor:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

//2.1.6 Join 
router.get('/find-Buyers', async (req, res) => {
    const { name } = req.query;
    try {
        const data = await appService.findStockBuyers(name);

        if (data && data.length > 0) {
            res.status(200).json({ success: true, data: data, message: 'FOUND!' });
        } else {
            res.status(404).json({ success: false, message: 'No buyers found.' });
        }
    } catch (error) {
        console.error('Error in /find-Buyers:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

//2.1.7 Aggregation with GROUP BY 
router.get('/list-Shares', async (req, res) => {
    const { id } = req.query;
    try {
        const data = await appService.sharesOfInvestor(id);

        if (data && data.length > 0) {
            res.status(200).json({ success: true, data: data, message: 'FOUND!' });
        } else {
            res.status(404).json({ success: false, message: 'No shares found.' });
        }
    } catch (error) {
        console.error('Error in /list-Shares:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

//2.1.8 Aggregation with HAVING
router.get('/list-Stock', async (req, res) => {
    const { number } = req.query;
    try {
        const data = await appService.stockNum(number);

        if (data && data.length > 0) {
            res.status(200).json({ success: true, data: data, message: 'FOUND!' });
        } else {
            res.status(404).json({ success: false, message: 'No investor ID found.' });
        }
    } catch (error) {
        console.error('Error in /list-Stock:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

//2.1.9 Nested Aggregation with GROUP BY
router.get('/insights', async (req, res) => {
    const { type } = req.query;
    try {
        const data = await appService.getInsights(type);
        
        if (data && data.rows.length > 0) {
            res.status(200).json({ success: true, data: data, message: 'Fetching insights successful!' });
        } else {
            res.status(200).json({ success: false, data: data, message: 'No data to show.' });
        }
    } catch (error) {
        console.error('Error in /insights:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

//2.1.10 Division
router.get('/all-company-stock-owners', async (req, res) => {
    try {
        const data = await appService.getAllCompanyStockOwners();
        
        if (data && data.rows.length > 0) {
            res.status(200).json({ success: true, data: data, message: 'Fetching insights successful!' });
        } else {
            res.status(200).json({ success: false, data: data, message: 'No data to show.' });
        }
    } catch (error) {
        console.error('Error in /insights:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});




module.exports = router;