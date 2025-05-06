const router = require('express').Router();
const multer = require('multer');
const authRoutes = require('./authRoutes');
const servicesRoute = require('./servicesRoute');
const websiteRoutes = require('./websiteRoute');

const mastersRoute = require('./masterRoutes');
const smmRoute = require('./SMMRoute');
const adminRoutes = require('./Admin/adminRoutes');
const reportsRoute = require('./reportsRoute');

const authCtrl = require('../controllers/Authentication/protectCtrl');
const noteCtrl = require('../controllers/noteCtrl');

router.use('/auth', authRoutes);

router.use('/admin', adminRoutes);

router.use(authCtrl.protect('user'));

router.use('/masters', mastersRoute);
router.use('/services', servicesRoute);
router.use('/website/data', websiteRoutes);
router.use('/smm-data', smmRoute);
router.use('/reports', reportsRoute);
router.post('/note', multer().any(), noteCtrl.leaveaNote);
router.post('/request/notes', multer().any(), noteCtrl.requestNotes);
router.get(
  '/notifications',
  noteCtrl.userNotifications,
  noteCtrl.getNotifications
);

router.post('/notifications/read', noteCtrl.readNotifications);

module.exports = router;
