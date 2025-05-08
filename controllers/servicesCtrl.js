const { db } = require("../dbConfig");
const moment = require("moment");
const catchAsync = require("../Utils/catchAsync");
const Email = require("../Utils/email");
const AppError = require("../Utils/appError");
const SMS = require("../Utils/sms");
const { hirarchyFilter } = require("../Utils/hirarchyFilter");

exports.seriveForms = catchAsync(async (req, res, next) => {
  const { service_id } = req.params;

  const query = `SELECT form_id, form_title FROM tbl_service_forms WHERE service_id = ? AND status = 1`;
  const result = await db(query, [service_id]);
  res.status(200).json(result);
});

exports.serviceFormFillstatus = catchAsync(async (req, res, next) => {
  const { requestId, serviceId } = req.body;

  const query = `
    SELECT 
      SF.form_title, 
      SF.form_id, 
      FFS.fill_status 
    FROM 
      tbl_service_forms SF
    LEFT JOIN 
      tbl_service_from_fill_status FFS
      ON FFS.form_id = SF.form_id AND FFS.request_id = ?
    WHERE 
      SF.service_id = ? AND SF.status = 1
  `;

  const result = await db(query, [requestId, serviceId]);

  res.status(200).json(result);
});

exports.getServices = catchAsync(async (req, res, next) => {
  const { empId, limit, pageNumber = 1, serviceId, status } = req.body;
  const offset = limit * (pageNumber - 1);

  const filters = ["DOCS.status = 1"];
  const filterValues = [];

  if (empId) {
    filters.push("DOCS.created_by = ?");
    filterValues.push(empId);
  } else {
    const { query, values } = await hirarchyFilter(req.user,"DOCS.");
    filters.push(query);
    filterValues.push(...values);
  }

  if (serviceId) {
    filters.push("DOCS.service_id = ?");
    filterValues.push(serviceId);
  }

  if (status) {
    filters.push("DOCS.submit_status = ?");
    filterValues.push(status);
  }

  const filterQuery = filters.join(" AND ");

  const serviresQuery = `SELECT request_id,
                              doctor_id,
                              doctor_name,
                              category as specialization,
                              service_id,
                              DATE_FORMAT(created_at , '%d-%b-%Y/ %H:%i:%s') AS created_on ,
                              DATE_FORMAT(updated_at , '%d-%b-%Y/ %H:%i:%s') AS updated_on ,
                              IF(DOCS.submit_status = 1, 'Submitted', 'In-progress') AS tse_status,
                              IFNULL(ASM.status_name, '') AS admin_status,
                               DOCS.approval_status AS admin_status_code,
                              service_name,
                              DD.division_name
                          FROM tbl_doctor_services as DOCS
                              LEFT JOIN tbl_digital_services ON DOCS.service_id = tbl_digital_services.id
                              LEFT JOIN tbl_doctor_details ON DOCS.doctor_id = tbl_doctor_details.doctor_code
                              LEFT JOIN tbl_admin_status_master AS ASM ON DOCS.approval_status = ASM.status_code
                              LEFT JOIN tbl_division_details AS DD ON DOCS.division_id = DD.division_id
                          WHERE ${filterQuery}
                          ORDER BY DOCS.created_at DESC
                          LIMIT ${limit} OFFSET ${offset}`;

  const services = await db(serviresQuery, filterValues);
  const [total_records] = await db(
    `SELECT COUNT(*) as total FROM tbl_doctor_services DOCS WHERE  ${filterQuery}`,
    filterValues
  );

  res.status(200).json({
    status: "success",
    message: "Data Retrieved successfully",
    data: { total_records: total_records.total, services_list: services },
  });
});

exports.doctorEligibleService = catchAsync(async (req, res, next) => {
  const { doctorCode } = req.body;

  const query = `
    SELECT
      DS.id,
      DS.service_name
    FROM
      tbl_digital_services AS DS
    LEFT JOIN (
      SELECT service_id, COUNT(*) AS use_count
      FROM tbl_doctor_services
      WHERE doctor_id = ? AND status = 1
      GROUP BY service_id
    ) AS SU ON DS.id = SU.service_id
    WHERE
      DS.status = 1 AND (
        NOT EXISTS (
          SELECT 1 FROM tbl_doctor_services WHERE doctor_id = ?
        )
        OR DS.is_restrict = 0
        OR (DS.is_restrict = 1 AND (SU.use_count IS NULL OR SU.use_count < DS.no_of_req))
      );
  `;

  const result = await db(query, [doctorCode, doctorCode]);
  res.status(200).json(result);
});

exports.getDoctorServices = catchAsync(async (req, res, next) => {
  const { empId, docCode } = req.body;

  const getQuery = `SELECT  service_id, service_name,  
          DATE_FORMAT(created_at , '%d-%b-%Y %H:%i:%s') AS created_on , submit_status,
           ASM.status_name
        FROM tbl_doctor_services as DOCS
          LEFT JOIN tbl_digital_services ON DOCS.service_id = tbl_digital_services.id
             LEFT JOIN tbl_admin_status_master AS ASM ON DOCS. approval_status = ASM.id
        WHERE DOCS.created_by = ? AND doctor_id = ? AND DOCS.status = 1`;

  const values = [empId, docCode];
  const doc_services = await db(getQuery, values);

  res.status(200).json({
    status: "success",
    message: "Data Retrieved successfully",
    data: doc_services,
  });
});

exports.registerService = catchAsync(async (req, res, next) => {
  const { doctorCode, empId, serviceId, tseCode, divisionId, requestId } =
    req.body;

  const query = `INSERT INTO tbl_doctor_services (request_id,doctor_id, service_id, tse_code, division_id,submit_status,created_by)
                  VALUES(?,?,?,?,?,?,?) `;

  const values = [
    requestId,
    doctorCode,
    serviceId,
    tseCode,
    divisionId,
    0,
    empId,
  ];

  const result = await db(query, values);

  res.status(200).json({
    status: "success",
    message: "Your Service Request Submitted Successfully",
    data: { requestId },
  });
});

exports.submitService = catchAsync(async (req, res, next) => {
  const { requestId } = req.body;
  const today = moment().format("YYYY-MM-DD HH:mm:ss");

  const insertQuery = `
      UPDATE tbl_doctor_services 
      SET submit_status = 1  ,submit_on = ? , approval_status = 1,submited_by = ?
      WHERE request_id = ?`;
  await db(insertQuery, [today, req.user.emp_code, requestId]);
  res.status(200).json({
    status: "success",
    message: "Your Service Request Submitted Successfully",
    data: { requestId },
  });
  next();
});

exports.addNewService = catchAsync(async (req, res, next) => {
  const { doctorCode, serviceId, tseCode, requestId, divisionId } = req.body;

  const today = moment().format("YYYY-MM-DD HH:mm:ss");

  const query = `INSERT INTO tbl_doctor_services (request_id,doctor_id, service_id, tse_code, 
                    division_id,submit_status,submit_on,approval_status,created_by,submited_by)
                  VALUES(?,?,?,?,?,?,?,?,?,?) `;

  const values = [
    requestId,
    doctorCode,
    serviceId,
    tseCode,
    divisionId,
    1,
    today,
    1,
    req.user.emp_code,
    req.user.emp_code,
  ];

  const result = await db(query, values);

  res.status(200).json({
    status: "success",
    message: "Your Service Request Submitted Successfully",
    data: { requestId },
  });

  next();
});

exports.addServiceTrack = async (req, res, next) => {
  const { requestId } = req.body;
  const { emp_code, mobile } = req.user;
  try {
    const fetchQuery = `
      SELECT docs.request_id,docs.service_id, ds.service_name,docs.division_id, ed.emp_name, ed.emp_code,docs.created_at
      FROM tbl_doctor_services docs
      LEFT JOIN tbl_digital_services ds ON docs.service_id = ds.id
      LEFT JOIN tbl_employees_details ed ON ed.emp_code = docs.created_by 
      WHERE docs.request_id = ? `;

    const [fetchResult] = await db(fetchQuery, [requestId]);

    if (!fetchResult) {
      return next(new AppError("Updated service record not found.", 404));
    }

    // Insert tracking entry
    const trackQuery = `
      INSERT INTO tbl_service_status_tracking (request_id, action, action_by, remarks,role)
      VALUES (?, 'service submitted', ?, 'New service initiated to doctor', 'user')`;

    await db(trackQuery, [requestId, emp_code]);

    const getAdminQuery = `
                        SELECT emp_id, emp_name, mobile, mail_id, role, divisions, services
                        FROM tbl_assign_teams
                        WHERE status = 1
                          AND (
                            divisions = 'All' OR JSON_CONTAINS(divisions, JSON_QUOTE(?), '$')
                          )
                          AND (
                            services = 'All' OR JSON_CONTAINS(services, JSON_QUOTE(?), '$')
                          )
                      `;

    const divisionId = String(fetchResult.division_id);
    const serviceId = String(fetchResult.service_id);

    const teamMembers = await db(getAdminQuery, [divisionId, serviceId]);

    const mailToList = [];
    const mailToNames = [];
    const mailCcList = [];
    let alternateTo = "";
    let alternateToName = "";

    teamMembers.forEach((member) => {
      // Safely parse divisions and service
      if (member.role === "Coordinator") {
        mailToList.push(member.mail_id);
        mailToNames.push(member.emp_name);
      } else {
        mailCcList.push(member.mail_id);
        if (member.emp_id === "11903") {
          alternateTo = member.mail_id;
          alternateToName = member.emp_name;
        }
      }
    });

    const mailTo = mailToList.length ? mailToList[0] : alternateTo;
    const mailToName = mailToNames.length ? mailToNames[0] : alternateToName;
    const ccList = [...mailCcList, ...mailToList.slice(1)];

    //  await new SMS(mobile).sendEmployee(req.user, fetchResult);
    // await new Email(mailTo, mailToName, ccList).serviceRequestSubmited(
    //   { ...fetchResult, emp_code }
    // );
  } catch (error) {}
};

exports.serviceDetails = catchAsync(async (req, res, next) => {
  const { requestId } = req.body;

  const query = `
      SELECT 
        IF(DOS.submit_status = 1, 'Submitted', 'In-progress') AS tse_status,
        IFNULL(ADSM.status_name, '') AS admin_status,
        DOS.approval_status AS admin_status_code,
        DOD.doctor_name, 
        DOD.category AS specialization,
        DATE_FORMAT(DOS.created_at, '%d-%m-%Y %H:%i:%s') AS requested_at,
        DATE_FORMAT(DOS.submit_on, '%d-%m-%Y %H:%i:%s') AS submit_on,
        DOS.request_id,
        DOS.service_id,
        DS.service_name,
        DOS.created_by,
        ED.emp_name AS created_name,
        DOS.submited_by,
        EDS.emp_name AS submited_name
      FROM tbl_doctor_services DOS
      LEFT JOIN tbl_digital_services DS ON DOS.service_id = DS.id 
      LEFT JOIN tbl_doctor_details AS DOD ON DOS.doctor_id = DOD.doctor_code
      LEFT JOIN tbl_admin_status_master ADSM ON DOS.approval_status = ADSM.status_code
      LEFT JOIN tbl_employees_details ED ON DOS.created_by = ED.emp_code
      LEFT JOIN tbl_employees_details EDS ON DOS.submited_by = EDS.emp_code
      WHERE request_id = ?  AND DOS.status = 1`;

  const [result] = await db(query, [requestId]);

  res.status(200).json({
    status: "success",
    message: "Service details fetched successfully",
    data: result || {},
  });
});

exports.getServiceHistory = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const query = `SELECT SST.tracking_id,
                    SST.action,
                    SST.action_by,
                    DATE_FORMAT(SST.action_at, '%d-%m-%Y %H:%i:%s') AS action_at,
                    SST.remarks,
                    SST.role,                   
                    CASE 
                      WHEN SST.role = 'Admin' THEN AST.emp_name 
                      ELSE ED.emp_name 
                    END AS action_by_name,
                    SST.team_name,
                    SST.person_name,
                    SST.task_status
                  FROM tbl_service_status_tracking AS SST
                    LEFT JOIN tbl_assign_teams AS AST ON SST.action_by = AST.emp_id
                    LEFT JOIN tbl_employees_details AS ED ON SST.action_by = ED.emp_code
                  WHERE SST.request_id = ? AND  SST.action <> 'Note' AND  SST.status = 1
                  ORDER BY SST.action_at ASC;`;

  const result = await db(query, [reqId]);

  res.status(200).json({
    status: "success",
    message: "Service details fetched successfully",
    data: result,
  });
});
