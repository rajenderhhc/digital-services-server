const express = require('express');
const multer = require('multer');
const smmCtrl = require('../../controllers/smmCtrl');

const router = express.Router();

router.use(multer().any());

router.get('/:reqId', smmCtrl.getSmmData);

module.exports = router;
