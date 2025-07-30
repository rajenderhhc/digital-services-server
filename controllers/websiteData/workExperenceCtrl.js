const moment = require("moment");
const AppError = require("../../Utils/appError");
const catchAsync = require("../../Utils/catchAsync");
const { db } = require("../../dbConfig");

exports.workExprenceData = catchAsync(async (req, res, next) => {
  const { experienceData, requestId, doc_id } = req.body;

  if (!Array.isArray(experienceData) || experienceData.length === 0) {
    return next(new AppError("Invalid or empty experence data", 400));
  }
  console.log(experienceData);
  const values = experienceData.map((w) => [
    w.id === "" ? null : w.id,
    requestId,
    doc_id,
    w.hospitalName,
    w.department,
    w.designation,
    w.location,
    w.practicingSince ? moment(w.practicingSince).format("YYYY-MM-DD") : null,
    w.surgeriesCount,
    w.patientsCount,
    w.isRelieved,
    w.relievedDate ? moment(w.relievedDate).format("YYYY-MM-DD") : null,
    req.user.emp_code,
  ]);

  // Optimized SQL Query with ID tracking
  const query = `
    INSERT INTO tbl_work_experience (id,request_id,doc_id,hospital_name,department,
                designation,location, joined_date,surgeries_count,
                patients_count,relieved_status, relieved_date,create_by
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      hospital_name = IF(VALUES(hospital_name) != hospital_name, VALUES(hospital_name), hospital_name),
      department = IF(VALUES(department) != department, VALUES(department), department),
      designation = IF(VALUES(designation) != designation, VALUES(designation), designation),
      location = IF(VALUES(location) != location, VALUES(location), location),
      joined_date = IF(VALUES(joined_date) != joined_date, VALUES(joined_date), joined_date),
      surgeries_count = IF(VALUES(surgeries_count) != surgeries_count, VALUES(surgeries_count), surgeries_count),
      patients_count = IF(VALUES(patients_count) != patients_count, VALUES(patients_count), patients_count),
      relieved_status = IF(VALUES(relieved_status) != relieved_status, VALUES(relieved_status), relieved_status),
      relieved_date = IF(VALUES(relieved_date) != relieved_date, VALUES(relieved_date), relieved_date),
      update_by = VALUES(create_by);
  `;

  // Execute query with batch insertion
  const insertResult = await db(query, [values]);

  res.status(200).json({
    status: "success",
    message:
      insertResult.affectedRows > experienceData.length
        ? "Records updated"
        : "Records inserted",
    data: insertResult,
  });
});

exports.getWorkExprence = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const query = `SELECT id,hospital_name,department,
                    designation,location,DATE_FORMAT(joined_date , '%d-%m-%Y') as practicingSince,surgeries_count,
                    patients_count,relieved_status,DATE_FORMAT(relieved_date , '%d-%m-%Y') as  relieved_date
                FROM tbl_work_experience
                WHERE request_id = ? AND status = 1`;
  const experince_data = await db(query, [reqId]);
  res.status(200).json({
    status: "success",
    message: "Data Retrived Successfully",
    data: { fill_status: req.fill_status || null, experince_data },
  });
});

exports.deleteWorkExprence = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  const { reqId } = req.params;

  const query = `UPDATE tbl_work_experience SET status = 0 
                WHERE request_id = ? AND id = ?`;
  const result = await db(query, [reqId, id]);
  res.status(200).json({
    status: "success",
    message: "Record Deleted Successfully",
    data: result.affectedRows,
  });
});
