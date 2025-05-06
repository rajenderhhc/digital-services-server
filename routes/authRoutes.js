const express = require('express');
const multer = require('multer');

const registerCtrl = require('../controllers/Authentication/registerCtrl');
const loginCtrl = require('../controllers/Authentication/loginCtrl');
const authCtrl = require('../controllers/Authentication/protectCtrl');

const router = express.Router();

router.use(multer().any());
router.post('/register', registerCtrl.insertEmployeeDetails);
router.post('/admin/login', loginCtrl.adminLogin);
router.post('/user/login', loginCtrl.userLogin);

router.use(authCtrl.protect('admin'));

router.put('/admin/reset-password', loginCtrl.resetPasswword);

module.exports = router;
