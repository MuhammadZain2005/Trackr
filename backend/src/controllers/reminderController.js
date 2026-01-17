const ApiResponse = require('../utils/apiResponse');
const reminderDb = require('../db/reminderDb');

const VALID_PRIORITIES = ['low', 'medium', 'high'];

const reminderController = {
    createReminder: async (req, res, next) => {
        try {
            const { applicationId, title, dueDate } = req.body;

            if (!applicationId || !title || !dueDate) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Application ID, title, and due date required')
                );
            }

            if (req.body.priority && !VALID_PRIORITIES.includes(req.body.priority)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid priority', { allowedValues: VALID_PRIORITIES })
                );
            }

            const reminder = reminderDb.create(req.body);
            res.status(201).json(ApiResponse.success({
                id: reminder.id,
                applicationId: reminder.applicationId,
                title: reminder.title,
                dueDate: reminder.dueDate,
                completed: reminder.completed
            }));
        } catch (error) {
            next(error);
        }
    },

    getAllReminders: async (req, res, next) => {
        try {
            const { applicationId, status, sortBy } = req.query;
            const reminders = reminderDb.findAll({ applicationId, status, sortBy, order: 'asc' });
            res.json(ApiResponse.success({ reminders }));
        } catch (error) {
            next(error);
        }
    },

    getReminderById: async (req, res, next) => {
        try {
            const reminder = reminderDb.findById(req.params.id);
            if (!reminder) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Reminder not found'));
            }
            res.json(ApiResponse.success(reminder));
        } catch (error) {
            next(error);
        }
    },

    updateReminder: async (req, res, next) => {
        try {
            if (req.body.priority && !VALID_PRIORITIES.includes(req.body.priority)) {
                return res.status(400).json(
                    ApiResponse.error('VALIDATION_ERROR', 'Invalid priority', { allowedValues: VALID_PRIORITIES })
                );
            }

            const reminder = reminderDb.update(req.params.id, req.body);
            if (!reminder) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Reminder not found'));
            }
            res.json(ApiResponse.success({
                id: reminder.id,
                completed: reminder.completed,
                updatedAt: reminder.updatedAt
            }));
        } catch (error) {
            next(error);
        }
    },

    deleteReminder: async (req, res, next) => {
        try {
            const deleted = reminderDb.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json(ApiResponse.error('NOT_FOUND', 'Reminder not found'));
            }
            res.json(ApiResponse.success({ message: 'Reminder deleted successfully' }));
        } catch (error) {
            next(error);
        }
    },

    getUpcoming: async (req, res, next) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const reminders = reminderDb.findUpcoming(days);
            res.json(ApiResponse.success({ reminders }));
        } catch (error) {
            next(error);
        }
    }
};

module.exports = reminderController;
