const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

router.post('/', reminderController.createReminder);
router.get('/', reminderController.getAllReminders);
router.get('/upcoming', reminderController.getUpcoming);
router.get('/:id', reminderController.getReminderById);
router.patch('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
