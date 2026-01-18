const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const statusController = require('../controllers/statusController');

router.post('/', applicationController.createApplication);
router.get('/', applicationController.getAllApplications);
router.get('/:id', applicationController.getApplicationById);
router.patch('/:id', applicationController.updateApplication);
router.delete('/:id', applicationController.deleteApplication);

router.patch('/:id/status', statusController.updateStatus);
router.get('/:id/status-history', statusController.getStatusHistory);

module.exports = router;
