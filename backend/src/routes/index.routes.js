const express = require('express');
const router = express.Router();
const applicationRoutes = require('./application.routes');

router.use('/applications', applicationRoutes);

module.exports = router;
