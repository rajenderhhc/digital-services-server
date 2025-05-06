const express = require('express');
const multer = require('multer');

const authCtrl = require('../../controllers/Authentication/protectCtrl');
const serviceCtrl = require('../../controllers/Admin/services');
const noteCtrl = require('../../controllers/noteCtrl');
const mastersRoute = require('../masterRoutes');
const servicesRoute = require('../servicesRoute');
const websiteRoutes = require('./websiteRoutes');
const smmRoute = require('./smmRoutes');

const router = express.Router();

router.use(authCtrl.protect('admin'));

router.use('/services', servicesRoute);
router.use('/website/data', websiteRoutes);
router.use('/smm-data', smmRoute);

router.use(multer().any());
router.post('/download/req-details', serviceCtrl.getServiceRequestDetails);
router.use('/masters', mastersRoute);
router.post('/services', serviceCtrl.getServices);
router.post('/service/changestatus', serviceCtrl.changeServiceStatus);
router.post('/note', noteCtrl.leaveaNote);
router.post('/request/notes', noteCtrl.requestNotes);

router.get(
  '/notifications',
  noteCtrl.getAdminNotifications,
  noteCtrl.getNotifications
);
router.post('/notifications/read', noteCtrl.readNotifications);

module.exports = router;
