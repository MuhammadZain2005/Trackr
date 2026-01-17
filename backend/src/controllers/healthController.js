const ApiResponse = require('../utils/apiResponse');

const healthController = {
    check: async (req, res) => {
        res.json(ApiResponse.success({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    }
};

module.exports = healthController;
