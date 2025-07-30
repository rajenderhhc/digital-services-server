const { db } = require("../dbConfig");
const AppError = require("./appError");
const catchAsync = require("./catchAsync");

const generateRequestId = (division, service) => {
  const timestamp = Date.now().toString(36).toUpperCase();

  const parts = [];

  if (division != null) {
    const cleanDivision = division.trim().replace(/\s+/g, "");
    if (cleanDivision) parts.push(cleanDivision);
  }

  if (service != null) {
    const cleanService = service.toString().trim().replace(/\s+/g, "");
    if (cleanService) parts.push(cleanService);
  }
  parts.push(timestamp);
  return parts.join("-");
};

const updateFromFillstatus = catchAsync(async (req, res, next) => {
  const { requestId, formId, fillStatus } = req.body;
  if (!requestId || requestId === "") return;
  const fillQuery = `
    INSERT INTO tbl_service_from_fill_status 
    (request_id, form_id, fill_status, create_by) 
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      fill_status = VALUES(fill_status),
      create_by = VALUES(create_by)
  `;

  await db(fillQuery, [requestId, formId, fillStatus, req.user.emp_code]);

  if (fillStatus === "1") {
    next();
  } else {
    res.status(200).json({
      status: "success",
      message: "Updated Successfully",
    });
  }
});

const getFormFillStatus = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const { formId } = req.body;

  const fillstatus = `SELECT  fill_status 
                      FROM tbl_service_from_fill_status
                      WHERE request_id = ? AND  form_id = ? `;

  const result = await db(fillstatus, [reqId, formId]);

  if (!result || result.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "Data Retrieved successfully",
      data: { fill_status: null, formData: null },
    });
  }

  const [{ fill_status }] = result;

  if (fill_status === 1) {
    req.fill_status = fill_status;
    return next();
  }

  res.status(200).json({
    status: "success",
    message: "Data Retrieved successfully",
    data: { fill_status, formData: null },
  });
});

const checkTheServiceReqLimit = catchAsync(async (req, res, next) => {
  const { requestId, serviceId, doctorCode } = req.body;

  // Skip limit check if requestId is present
  if (requestId && requestId.trim() !== "") return next();

  // Fetch service details
  const serviceQuery = `
    SELECT is_restrict, no_of_req 
    FROM tbl_digital_services 
    WHERE id = ?
  `;
  const serviceResult = await db(serviceQuery, [serviceId]);

  if (!serviceResult || serviceResult.length === 0) {
    return next(new AppError("No service found.", 400));
  }

  const { is_restrict, no_of_req } = serviceResult[0];

  // If not restricted, allow
  if (Number(is_restrict) === 0) return next();

  // Get how many times the doctor used the service
  const usageQuery = `
    SELECT COUNT(service_id)  AS req_count 
    FROM tbl_doctor_services 
    WHERE doctor_id = ? AND service_id = ? 
    GROUP BY service_id
  `;
  const usageResult = await db(usageQuery, [doctorCode, serviceId]);

  const currentUsage =
    usageResult.length > 0 ? Number(usageResult[0].req_count) : 0;

  if (currentUsage >= Number(no_of_req)) {
    return next(new AppError("Requests limit exceeded for this service.", 400));
  }

  next();
});

module.exports = {
  generateRequestId,
  updateFromFillstatus,
  getFormFillStatus,
  checkTheServiceReqLimit,
};
