const ApiResponse = require('../utils/apiResponse');
const applicationDb = require('../db/applicationDb');

const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected', 'withdrawn'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const applicationController = {
    createApplication: async (req, res, next) => {
        try {
            const { companyName, position, status = 'applied' } = req.body;

            if (!companyName || !position) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Company name and position required')
                );
            }

            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid status', { allowedValues: VALID_STATUSES })
                );
            }

            const application = applicationDb.create(req.body);

            res.status(201).json(
                ApiResponse.success({
                    id: application.id,
                    companyName: application.companyName,
                    position: application.position,
                    status: application.status,
                    createdAt: application.createdAt
                })
            );
        } catch (error) {
            next(error);
        }
    },

    getAllApplications: async (req, res, next) => {
        try {
            const { status, sortBy, order, search, page, limit } = req.query;

            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid status', { allowedValues: VALID_STATUSES })
                );
            }

            const result = applicationDb.findAll({ status, sortBy, order, search, page, limit });
            res.json(ApiResponse.success(result));
        } catch (error) {
            next(error);
        }
    },

    getApplicationById: async (req, res, next) => {
        try {
            const application = applicationDb.findById(req.params.id);

            if (!application) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Application not found'));
            }

            res.json(ApiResponse.success(application));
        } catch (error) {
            next(error);
        }
    },

    updateApplication: async (req, res, next) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (updates.status && !VALID_STATUSES.includes(updates.status)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid status', { allowedValues: VALID_STATUSES })
                );
            }

            if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid priority', { allowedValues: VALID_PRIORITIES })
                );
            }

            const application = applicationDb.update(id, updates);

            if (!application) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Application not found'));
            }

            res.json(ApiResponse.success({
                id: application.id,
                status: application.status,
                updatedAt: application.updatedAt
            }));
        } catch (error) {
            next(error);
        }
    },

    deleteApplication: async (req, res, next) => {
        try {
            const deleted = applicationDb.delete(req.params.id);

            if (!deleted) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Application not found'));
            }

            res.json(ApiResponse.success({ message: 'Application deleted successfully' }));
        } catch (error) {
            next(error);
        }
    }
};

module.exports = applicationController;
