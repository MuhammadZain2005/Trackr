const ApiResponse = require('../utils/apiResponse');

const notFound = (req, res) => {
    res.status(404).json(
        ApiResponse.error('NOT_FOUND', `Route ${req.method} ${req.path} not found`)
    );
};

module.exports = notFound;
