const express = require('express');
const multer = require('multer');

const router = express.Router();

// Controllers

const personalCtrl = require('../../controllers/websiteData/personalCtrl');
const educationCtrl = require('../../controllers/websiteData/educationCtrl');
const contactCtrl = require('../../controllers/websiteData/contactCtrl');
const workExperienceCtrl = require('../../controllers/websiteData/workExperenceCtrl');
const awardCtrl = require('../../controllers/websiteData/awardsCtrl');
const socialMediaCtrl = require('../../controllers/websiteData/socialMediaCtrl');
const metaDataCtrl = require('../../controllers/websiteData/metaDataCtrl');

// Middleware for form-data uploads (used globally where required)
router.use(multer().any());

// ==== Personal Data ====

router.get('/personal/:reqId', personalCtrl.getpersonalData);

// ==== Education ====
router.get('/education/:reqId', educationCtrl.getEducationData);

// ==== Contact ====

router.get('/contactus/:reqId', contactCtrl.getContactData);

// ==== Awards ====

router.get('/awards/:reqId', awardCtrl.getAwardsData);

// ==== Work Experience ====

router.get('/experience/:reqId', workExperienceCtrl.getWorkExprence);

// ==== Social Media ====

router.get('/social-media/:reqId', socialMediaCtrl.getSmData);

// ==== Meta Data ====
router.get('/meta-data/images/:reqId', metaDataCtrl.getWebsiteImages);
router.get('/meta-data/domain/:reqId', metaDataCtrl.getWebsiteDomain);
router.get('/meta-data/:reqId', metaDataCtrl.getWebsiteData);

module.exports = router;
