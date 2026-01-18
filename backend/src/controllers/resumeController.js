const ApiResponse = require('../utils/apiResponse');
const resumeDb = require('../db/resumeDb');

const resumeController = {
    createMaster: async (req, res, next) => {
        try {
            const resume = resumeDb.createMaster(req.body);
            res.status(201).json(ApiResponse.success({
                id: resume.id,
                title: resume.title,
                createdAt: resume.createdAt
            }));
        } catch (error) {
            next(error);
        }
    },

    getMaster: async (req, res, next) => {
        try {
            const resume = resumeDb.getMaster();
            if (!resume) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Master resume not found'));
            }
            res.json(ApiResponse.success(resume));
        } catch (error) {
            next(error);
        }
    },

    updateMaster: async (req, res, next) => {
        try {
            const resume = resumeDb.updateMaster(req.body);
            if (!resume) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Master resume not found'));
            }
            res.json(ApiResponse.success({
                id: resume.id,
                updatedAt: resume.updatedAt
            }));
        } catch (error) {
            next(error);
        }
    },

    createCustomized: async (req, res, next) => {
        try {
            const { applicationId, title } = req.body;

            if (!applicationId || !title) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Application ID and title required')
                );
            }

            const resume = resumeDb.createCustomized(req.body);
            res.status(201).json(ApiResponse.success({
                id: resume.id,
                applicationId: resume.applicationId,
                title: resume.title,
                createdAt: resume.createdAt
            }));
        } catch (error) {
            next(error);
        }
    },

    getAllCustomized: async (req, res, next) => {
        try {
            const { applicationId } = req.query;
            const resumes = resumeDb.getAllCustomized(applicationId);
            res.json(ApiResponse.success({ resumes }));
        } catch (error) {
            next(error);
        }
    },

    getCustomizedById: async (req, res, next) => {
        try {
            const resume = resumeDb.getCustomizedById(req.params.id);
            if (!resume) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Resume not found'));
            }
            res.json(ApiResponse.success(resume));
        } catch (error) {
            next(error);
        }
    },

    updateCustomized: async (req, res, next) => {
        try {
            const resume = resumeDb.updateCustomized(req.params.id, req.body);
            if (!resume) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Resume not found'));
            }
            res.json(ApiResponse.success({
                id: resume.id,
                updatedAt: resume.updatedAt
            }));
        } catch (error) {
            next(error);
        }
    },

    deleteCustomized: async (req, res, next) => {
        try {
            const deleted = resumeDb.deleteCustomized(req.params.id);
            if (!deleted) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Resume not found'));
            }
            res.json(ApiResponse.success({ message: 'Resume deleted successfully' }));
        } catch (error) {
            next(error);
        }
    }
};

module.exports = resumeController;
