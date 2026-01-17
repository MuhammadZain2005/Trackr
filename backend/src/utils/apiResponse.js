class ApiResponse {
    constructor(success, data = null, error = null) {
        this.success = success;
        if (data) this.data = data;
        if (error) this.error = error;
    }

    static success(data) {
        return new ApiResponse(true, data, null);
    }

    static error(code, message, details = null) {
        return new ApiResponse(false, null, {
            code,
            message,
            ...(details && { details })
        });
    }
}

module.exports = ApiResponse;
