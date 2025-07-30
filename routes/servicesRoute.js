const express = require("express");
const multer = require("multer");

const services = require("../controllers/servicesCtrl");
const AdminService = require("../controllers/Admin/services");
const router = express.Router();

router.use(multer().any());

router.post("/", AdminService.getServices);
router.post("/active", services.getServices);
router.post("/eligible", services.doctorEligibleService);
router.post("/doctor-enabled", services.getDoctorServices);
router.get("/service/history/:reqId", services.getServiceHistory);
router.post("/service/details", services.serviceDetails);
router.get("/forms/:service_id", services.seriveForms);
router.post("/forms/fillstatus", services.serviceFormFillstatus);
router.post("/pending-status", services.pendingstatusUpdate);

module.exports = router;
