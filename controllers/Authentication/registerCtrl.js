const { db } = require("../../dbConfig");
const axios = require("axios");
const Jwt = require("jsonwebtoken");

const loginCtrl = require("./loginCtrl");
const catchAsync = require("../../Utils/catchAsync");

const JWT_SECRET = process.env.JWT_SECRET;

const insertDoctorDetails = async (doctorCode, empId) => {
  try {
    // Check if doctor already exists
    const checkDoctorQuery = `SELECT * FROM tbl_doctor_details WHERE doctor_code = ?`;
    const [doctor] = await db(checkDoctorQuery, [doctorCode]);

    if (doctor) return; // Doctor already exists, no need to insert

    const apiUrl = `https://apisfadoctors.heterohealthcare.com/api/DoctorDetails/GetDoctors/${doctorCode}`;

    const { data } = await axios.get(apiUrl);
    if (!data || data.length === 0) {
      throw new Error("Doctor details not found in API");
    }

    const {
      docCode,
      docName,
      qualification,
      category,
      mobileNo,
      divisionCode,
    } = data[0];

    const insertQuery = `
      INSERT INTO tbl_doctor_details (doctor_code, doctor_name, qualification, category, mobile_no, division_id,create_by)
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

    const values = [
      docCode,
      docName,
      qualification,
      category,
      mobileNo,
      divisionCode,
      empId,
    ];

    const result = await db(insertQuery, values);
  } catch (error) {
    throw new Error(`Failed to insert doctor details: ${error.message}`);
  }
};

exports.insertEmployeeDetails = catchAsync(async (req, res, next) => {
  const { doctorCode = "", employeeBasicDetails } = req.body;

  const {
    employeeCode,
    employeeName,
    hq,
    region,
    designation,
    desginationid,
    state,
    mobile,
    empType,
    empStatus,
    divisionId,
    divisionName,
    password,
    emp_code,
  } = employeeBasicDetails;

  // If doctorCode is provided, insert doctor details first
  if (doctorCode) {
    try {
      await insertDoctorDetails(doctorCode, employeeCode || emp_code);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: `Doctor insertion failed: ${error.message}`,
      });
    }
  }

  const insertQuery = `
      INSERT IGNORE INTO tbl_employees_details (
        emp_code, emp_name, hq, region, designation, designation_id, 
        state, mobile, emp_type, emp_status,division_name,
    division_id, create_by,password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

  const values = [
    employeeCode,
    employeeName,
    hq,
    region,
    designation,
    desginationid,
    state,
    mobile,
    empType,
    empStatus,
    divisionName,
    divisionId,
    employeeCode,
    password,
  ];

  const result = await db(insertQuery, values);

  const JwtToken = Jwt.sign({ id: employeeCode }, JWT_SECRET);

  loginCtrl.insertLoginLogs({
    userId: employeeCode || emp_code,
    role: "user",
    action: "Login",
  });

  res.status(200).json({
    status: "success",
    message:
      result.affectedRows === 0
        ? "Employee already exists"
        : "Data saved successfully",
    data: result.affectedRows === 0 ? null : result.insertId,
    token: JwtToken,
  });
});
