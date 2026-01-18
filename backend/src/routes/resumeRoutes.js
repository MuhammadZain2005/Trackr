const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');

router.post('/master', resumeController.createMaster);
router.get('/master', resumeController.getMaster);
router.patch('/master', resumeController.updateMaster);

router.post('/customized', resumeController.createCustomized);
router.get('/customized', resumeController.getAllCustomized);
router.get('/customized/:id', resumeController.getCustomizedById);
router.patch('/customized/:id', resumeController.updateCustomized);
router.delete('/customized/:id', resumeController.deleteCustomized);

module.exports = router;
