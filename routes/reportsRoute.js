const express = require('express');
const multer = require('multer');

const userReports = require('../controllers/Reports/userReportsCtrl');

const router = express.Router();

router.use(multer().any());

router.get('/request/:year', userReports.getRequestCout);
router.get('/approvals/:year', userReports.getAdminApproveCout);
router.get('/usagecount/:year', userReports.serviceUsageCount);

module.exports = router;
