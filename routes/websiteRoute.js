const express = require('express');
const multer = require('multer');

const router = express.Router();

// Controllers
const serviceCtrl = require('../controllers/servicesCtrl');
const personalCtrl = require('../controllers/websiteData/personalCtrl');
const educationCtrl = require('../controllers/websiteData/educationCtrl');
const contactCtrl = require('../controllers/websiteData/contactCtrl');
const workExperienceCtrl = require('../controllers/websiteData/workExperenceCtrl');
const awardCtrl = require('../controllers/websiteData/awardsCtrl');
const socialMediaCtrl = require('../controllers/websiteData/socialMediaCtrl');
const metaDataCtrl = require('../controllers/websiteData/metaDataCtrl');

const {
  updateFromFillstatus,
  getFormFillStatus,
  checkTheServiceReqLimit,
} = require('../Utils/generFuns');

// ==== Meta Data ====
router.post(
  '/meta-data/images',
  metaDataCtrl.upload,
  updateFromFillstatus,
  metaDataCtrl.updateStoreWebImage,
  metaDataCtrl.websiteImages
);

// ==== Personal Data ====
router.post(
  '/personal',
  personalCtrl.upload,
  checkTheServiceReqLimit,
  personalCtrl.updateStoreProfileDoc,
  personalCtrl.personalData,
  updateFromFillstatus,
  serviceCtrl.registerService
);
router.get('/personal/:reqId', personalCtrl.getpersonalData);

// Middleware for form-data uploads (used globally where required)
router.use(multer().any());

router
  .route('/meta-data/images/:reqId')
  .post(getFormFillStatus, metaDataCtrl.getWebsiteImages)
  .put(metaDataCtrl.deleteImage);

router.post(
  '/meta-data/domain',
  updateFromFillstatus,
  metaDataCtrl.websiteDomain
);
router.post(
  '/meta-data/domain/:reqId',
  getFormFillStatus,
  metaDataCtrl.getWebsiteDomain
);

router.post(
  '/meta-data',
  updateFromFillstatus,
  metaDataCtrl.websiteData,
  serviceCtrl.submitService,
  serviceCtrl.addServiceTrack
);
router.post(
  '/meta-data/:reqId',
  getFormFillStatus,
  metaDataCtrl.getWebsiteData
);

// ==== Personal Data ====
router.get('/personal/:reqId', personalCtrl.getpersonalData);

// ==== Education ====
router.post('/education', updateFromFillstatus, educationCtrl.educationData);
router
  .route('/education/:reqId')
  .post(getFormFillStatus, educationCtrl.getEducationData)
  .put(educationCtrl.deleteEducationRecord);

// ==== Contact ====
router.post('/contactus', updateFromFillstatus, contactCtrl.contactData);
router
  .route('/contactus/:reqId')
  .post(getFormFillStatus, contactCtrl.getContactData)
  .put(contactCtrl.deleteContact);

// ==== Awards ====
router.post('/awards', updateFromFillstatus, awardCtrl.awardsData);
router
  .route('/awards/:reqId')
  .post(getFormFillStatus, awardCtrl.getAwardsData)
  .put(awardCtrl.deleteAward);

// ==== Work Experience ====
router.post(
  '/experience',
  updateFromFillstatus,
  workExperienceCtrl.workExprenceData
);
router
  .route('/experience/:reqId')
  .post(getFormFillStatus, workExperienceCtrl.getWorkExprence)
  .put(workExperienceCtrl.deleteWorkExprence);

// ==== Social Media ====
router.post(
  '/social-media',
  updateFromFillstatus,
  socialMediaCtrl.socialMediaData
);
router
  .route('/social-media/:reqId')
  .post(getFormFillStatus, socialMediaCtrl.getSmData)
  .put(socialMediaCtrl.deleteSm);

module.exports = router;
