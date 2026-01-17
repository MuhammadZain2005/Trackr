const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const code = err.code || 'INTERNAL_ERROR';

    res.status(statusCode).json(ApiResponse.error(code, message, err.details));
};

module.exports = errorHandler;
