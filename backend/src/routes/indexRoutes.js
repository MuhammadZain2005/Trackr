const express = require('express');
const router = express.Router();
const applicationRoutes = require('./applicationRoutes');
const resumeRoutes = require('./resumeRoutes');
const reminderRoutes = require('./reminderRoutes');

router.use('/applications', applicationRoutes);
router.use('/resumes', resumeRoutes);
router.use('/reminders', reminderRoutes);

module.exports = router;
