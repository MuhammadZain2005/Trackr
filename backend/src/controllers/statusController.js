const ApiResponse = require('../utils/apiResponse');
const applicationDb = require('../db/applicationDb');

const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected', 'withdrawn'];

const statusController = {
    updateStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, statusNote } = req.body;

            if (!status) {
                return res.status(400).json(ApiResponse.error('VALIDATION_ERROR', 'Status required'));
            }

            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid status', { allowedValues: VALID_STATUSES })
                );
            }

            const application = applicationDb.updateStatus(id, status, statusNote);

            if (!application) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Application not found'));
            }

            res.json(ApiResponse.success({
                id: application.id,
                status: application.status,
                statusHistory: application.statusHistory
            }));
        } catch (error) {
            next(error);
        }
    },

    getStatusHistory: async (req, res, next) => {
        try {
            const application = applicationDb.findById(req.params.id);

            if (!application) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Application not found'));
            }

            res.json(ApiResponse.success({ statusHistory: application.statusHistory || [] }));
        } catch (error) {
            next(error);
        }
    }
};

module.exports = statusController;
