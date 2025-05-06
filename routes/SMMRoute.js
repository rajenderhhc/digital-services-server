const express = require('express');
const multer = require('multer');
const smmCtrl = require('../controllers/smmCtrl');
const serviceCtrl = require('../controllers/servicesCtrl');
const {
  updateFromFillstatus,
  getFormFillStatus,
  checkTheServiceReqLimit,
} = require('../Utils/generFuns');

const router = express.Router();

router.post(
  '/',
  smmCtrl.upload,
  checkTheServiceReqLimit,
  smmCtrl.updateStoreSmmImage,
  smmCtrl.smmData,
  updateFromFillstatus,
  serviceCtrl.addNewService,
  serviceCtrl.addServiceTrack
);

router.use(multer().any());

router.post('/sms', serviceCtrl.addServiceTrack);
router.post('/:reqId', getFormFillStatus, smmCtrl.getSmmData);

module.exports = router;
