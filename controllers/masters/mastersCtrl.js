const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

exports.getServies = catchAsync(async (req, res, next) => {
  const query = `SELECT id, service_name  FROM tbl_digital_services WHERE status  = 1 ORDER BY service_name`;
  const servies = await db(query);
  res.status(200).json(servies);
});

exports.getDivisions = catchAsync(async (req, res, next) => {
  const query = `SELECT division_id, division_name  FROM tbl_division_details WHERE status  = 1 ORDER BY division_name`;
  const divisions = await db(query);
  res.status(200).json(divisions);
});

exports.getSpecialities = catchAsync(async (req, res, next) => {
  const query = `SELECT spec_id, spec_name FROM tbl_doctor_specialities WHERE status  = 1 ORDER BY spec_id DESC `;
  const specialities = await db(query);
  res.status(200).json(specialities);
});

exports.getWebsiteThems = catchAsync(async (req, res, next) => {
  const query = `SELECT id, CONCAT('${req.protocol}://${req.get(
    'host'
  )}/api/images/themes/',theme_img) AS theme_img, theme_name, theme_url FROM tbl_website_themes WHERE status  = 1`;
  const webThems = await db(query);

  res.status(200).json(webThems);
});

exports.getDegrees = catchAsync(async (req, res, next) => {
  const query = `SELECT degree_id, degree_name FROM tbl_doctor_degrees WHERE status  = 1`;
  const degrees = await db(query);
  res.status(200).json(degrees);
});

exports.whyChooseDoc = catchAsync(async (req, res, next) => {
  const query = `SELECT id, title FROM tbl_why_to_choose_doctor_title WHERE status  = 1`;
  const degrees = await db(query);
  res.status(200).json(degrees);
});

exports.getAdminStatus = catchAsync(async (req, res, next) => {
  const query = `SELECT status_code , status_name  FROM tbl_admin_status_master WHERE  status = 1`;
  const status = await db(query);
  res.status(200).json(status);
});
