const AppError = require("../../Utils/appError");
const catchAsync = require("../../Utils/catchAsync");
const { generateRequestId } = require("../../Utils/generFuns");
const { db } = require("../../dbConfig");

exports.basicInfo = catchAsync(async (req, res, next) => {
  const { mobile_number, wtsup_number, doc_id, divisionName, serviceId } =
    req.body;
  const { emp_code } = req.user;

  // Ensure requestId exists or generate a new one
  let requestId = req.body.requestId?.trim();
  if (!requestId) {
    requestId = generateRequestId(divisionName, serviceId);
    req.body.requestId = requestId; // optional: pass it along
  }

  if (!doc_id) {
    return next(new AppError("doctor_id is required", 400));
  }

  const query = `
    INSERT INTO tbl_doc_basic_details (request_id, doc_id, mobile_number, wtsup_number, create_by)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      mobile_number = VALUES(mobile_number),
      wtsup_number = VALUES(wtsup_number),
      update_by = VALUES(create_by)
  `;

  const result = await db(query, [
    requestId,
    doc_id,
    mobile_number,
    wtsup_number,
    emp_code,
  ]);

  // affectedRows = 1 (insert) or 2 (update)
  const action =
    result.insertId !== 0 && result.affectedRows === 1 ? "inserted" : "updated";

  if (result.insertId !== 0 && result.affectedRows === 1) return next();

  res.status(200).json({
    status: "success",
    message: `Record ${action}`,
    data: { requestId },
  });
});

exports.getBasicInfo = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  if (!reqId) {
    return next(new AppError("reqId is required", 400));
  }

  const query = `SELECT * FROM tbl_doc_basic_details WHERE request_id = ? AND status = 1`;
  const basic_info = await db(query, [reqId]);

  res.status(200).json({
    status: "success",
    message: "Data retrieved successfully",
    data: { fill_status: req.fill_status || null, basic_info },
  });
});

// exports.deleteBasicInfo = catchAsync(async (req, res, next) => {
//   const { reqId } = req.params;
//   const { id } = req.body;

//   const query = `UPDATE tbl_social_media SET status = 0 WHERE request_id = ? AND id = ? `;

//   const resuit = await db(query, [reqId, id]);
//   res.status(200).json({
//     status: 'success',
//     message: 'Deleted successfully',
//     data: resuit.affectedRows,
//   });
// });
