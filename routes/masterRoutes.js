const express = require('express');

const mastrsCtrl = require('../controllers/masters/mastersCtrl');

const router = express.Router();

router.get('/services', mastrsCtrl.getServies);
router.get('/specialities', mastrsCtrl.getSpecialities);
router.get('/divisions', mastrsCtrl.getDivisions);
router.get('/webthems', mastrsCtrl.getWebsiteThems);
router.get('/doc-degrees', mastrsCtrl.getDegrees);
router.get('/why-choose-doc', mastrsCtrl.whyChooseDoc);

router.get('/aprove/status', mastrsCtrl.getAdminStatus);

module.exports = router;
