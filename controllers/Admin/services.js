const { db } = require("../../dbConfig");
const AppError = require("../../Utils/appError");
const catchAsync = require("../../Utils/catchAsync");
const ExcelJS = require("exceljs");
const axios = require("axios");

exports.getServices = catchAsync(async (req, res, next) => {
  const {
    empId,
    limit,
    pageNumber = 1,
    status,
    from,
    to,
    division,
    service,
  } = req.body;

  const { divisions, services } = req.user;

  // Ensure `limit` and `offset` are valid numbers to prevent SQL injection
  const perPage = Number(limit) || 10;
  const offset = perPage * (Number(pageNumber) - 1);

  // Safely parse JSON to prevent errors
  const parseJSON = (value) => {
    try {
      return JSON.parse(value || "[]");
    } catch (error) {
      return [];
    }
  };

  const filters = ["DOCS.status = 1", "DOCS.submit_status = 1"];
  const filterValues = [];

  // Apply division filter correctly
  const parsedDivisions = divisions !== "All" && parseJSON(divisions);
  if (Array.isArray(parsedDivisions) && parsedDivisions.length > 0) {
    const placeholders = parsedDivisions.map(() => "?").join(", ");
    filters.push(`DOCS.division_id IN (${placeholders})`);
    filterValues.push(...parsedDivisions);
  }

  // Apply service filter correctly
  const parsedServices = services !== "All" && parseJSON(services);
  if (Array.isArray(parsedServices) && parsedServices.length > 0) {
    const placeholders = parsedServices.map(() => "?").join(", ");
    filters.push(`DOCS.service_id IN (${placeholders})`);
    filterValues.push(...parsedServices);
  }

  // Apply empId filter
  if (empId) {
    filters.push("(DOCS.created_by = ? OR DOCS.tse_code = ?)");
    filterValues.push(empId, empId);
  }

  // Apply service filter
  if (service) {
    filters.push("DOCS.service_id = ?");
    filterValues.push(service);
  }

  // Apply approval status filter
  if (status) {
    filters.push("DOCS.approval_status = ?");
    filterValues.push(status);
  }

  //   division: 3,

  if (division) {
    filters.push("DOCS.division_id = ?");
    filterValues.push(division);
  }

  // Date filters
  if (from && to) {
    filters.push("DATE(DOCS.created_at) BETWEEN ? AND ?");
    filterValues.push(from, to);
  } else if (from) {
    filters.push("DATE(DOCS.created_at) >= ?");
    filterValues.push(from);
  } else if (to) {
    filters.push("DATE(DOCS.created_at) <= ?");
    filterValues.push(to);
  }

  const filterQuery = filters.join(" AND ");

  // Query to fetch service data
  const servicesQuery = `
      SELECT DOCS.id,
          request_id,
          doctor_id,
          doctor_name,
          category AS specialization,
          service_id,
          DATE_FORMAT(created_at, '%d-%b-%Y/ %H:%i:%s') AS created_on,
          IF(DOCS.submit_status = 1, 'Submitted', 'In-progress') AS tse_status,
          IFNULL(ASM.status_name, '') AS admin_status,
          service_name,
          DD.division_name,
          ED.emp_name,
          ED.emp_code
      FROM tbl_doctor_services AS DOCS
        LEFT JOIN tbl_digital_services ON DOCS.service_id = tbl_digital_services.id
        LEFT JOIN tbl_doctor_details ON DOCS.doctor_id = tbl_doctor_details.doctor_code
        LEFT JOIN tbl_admin_status_master AS ASM ON DOCS.approval_status = ASM.status_code
        LEFT JOIN tbl_division_details AS DD ON DOCS.division_id = DD.division_id
        LEFT JOIN tbl_employees_details ED ON DOCS.created_by = ED.emp_code
      WHERE ${filterQuery}
      ORDER BY DOCS.created_at DESC
      LIMIT ? OFFSET ?`;

  filterValues.push(perPage, offset); // Append limit & offset at the end

  const servicesList = await db(servicesQuery, filterValues);

  // Query to get total records count
  const totalRecordsQuery = `SELECT COUNT(*) as total FROM tbl_doctor_services DOCS WHERE ${filterQuery}`;
  const [totalRecords] = await db(totalRecordsQuery, filterValues);

  res.status(200).json({
    status: "success",
    message: "Data Retrieved successfully",
    data: {
      total_records: totalRecords.total || 0,
      services_list: servicesList,
    },
  });
});

exports.changeServiceStatus = catchAsync(async (req, res, next) => {
  const { requestId, status, remarks, teamName, personName, taskstatus } =
    req.body;

  const statusQuery = `UPDATE tbl_doctor_services SET approval_status = ? WHERE request_id = ?`;
  if (`${status}` !== "4") {
    const result = await db(statusQuery, [status, requestId]);

    if (result.affectedRows === 0) return next(new AppError("No Record Found"));
  }

  const logquery = `INSERT INTO tbl_service_status_tracking (request_id, action, action_by, remarks,team_name,person_name,task_status,role)
                    VALUES (?,?,?,?,?,?,?,?)`;

  const query = `SELECT status_name  FROM tbl_admin_status_master WHERE  status_code = ?`;
  const [{ status_name }] = await db(query, [status]);

  const values = [
    requestId,
    status_name,
    req.user.emp_id,
    remarks,
    teamName,
    personName,
    taskstatus,
    "Admin",
  ];

  await db(logquery, values);

  res.status(200).json({
    status: "success",
    message: "Request status Updated",
  });
});

const DoctorPortfolioQueryTemplates = {
  "Personal Details": `
      SELECT  
        doc_id AS "Doctor Code",
        full_name AS "Doctor Name",
        gender AS "Gender",
        why_choose_description AS "Why Choose Description",
        about AS "About Doctor",
        CONCAT('{{HOST}}/docs/', profile_doc) AS "Profile Document",
        DS.spec_name AS "Speciality",
        WCD.title AS "Why Choose Title"
      FROM tbl_doc_personal_details DPD
      LEFT JOIN tbl_doctor_specialities DS ON DPD.speciality_id = DS.spec_id
      LEFT JOIN tbl_why_to_choose_doctor_title WCD ON DPD.why_choose_title_id = WCD.id
      WHERE DPD.request_id = ? AND DPD.status = 1
    `,
  "Contact Details": `SELECT contact_type AS "Contact Type",
                          contact_person AS "Contact Person",
                          number AS "Contact Number",mail,
                          start_time AS "Start Time",end_time AS "End Time",
                          available_days AS "Available Days"
                        FROM tbl_contact_details
                        WHERE request_id = ? AND status = 1`,
  "Educational Details": `SELECT DD.degree_name AS "Degree Name" ,DS.spec_name AS "Specialized In",
                              college_name AS "College Name", place, year
                            FROM  tbl_doc_educational_details DED
                            LEFT JOIN tbl_doctor_degrees DD ON DED.degree_id = DD.degree_id
                            LEFT JOIN tbl_doctor_specialities DS ON DED.specialized_in =  DS.spec_id
                            WHERE DED.request_id = ? AND DED.status = 1; `,
  "Work Experience": `SELECT hospital_name AS "Hospital Name",department,designation,
                          location,DATE_FORMAT(joined_date , '%d-%m-%Y') AS "Practicing Since",
                          surgeries_count AS "Surgeries count",patients_count AS "Patients count",
                          CASE 
                            WHEN relieved_status = 0 THEN  "No" 
                          ELSE "Yes"
                          END AS "Currently Working",
                          DATE_FORMAT(relieved_date , '%d-%m-%Y') as  "Relieved Date"
                        FROM tbl_work_experience
                        WHERE request_id = ? AND status = 1`,
  "Social Media": `SELECT name AS "Social Media" , url FROM tbl_social_media WHERE request_id = ? AND status= 1`,
  "Domain URL": `SELECT domain_url AS "Domain" FROM tbl_website_domain WHERE request_id = ? AND status = 1`,
  "Website Media": `SELECT 
                    CONCAT('{{HOST}}/images/website/',image_name) AS "Image Url",image_type AS "Image Type"
                  FROM  tbl_website_images
                  WHERE request_id = ? AND status = 1`,
  "Theme Details": `SELECT WT.theme_name AS "Theme Name", 
                      CONCAT('{{HOST}}/images/themes/',WT.theme_img)  AS "Teme Images",
                        WT.theme_url AS "Preview Url"  
                      FROM tbl_doc_website_details WD
                      LEFT JOIN tbl_website_themes WT ON WD.theme_id = WT.id
                      WHERE request_id = ? `,
  "Awards & Recognitions": `SELECT award_name AS "Award Name",excellence_in AS "Excellence In", 
                                awarded_by AS "Awarded By",year 
                              FROM tbl_awards_recognitions
                              WHERE request_id = ? AND status = 1`,
};

const smmQueries = {
  "SMM Data": `
      SELECT
        DD.doctor_name AS "Doctor Name" ,
        SMD.doctor_code AS "Doctor Code", 
        content,  
        location,  
        DATE_FORMAT(start_date, '%Y-%m-%d') AS "Start Date",  
        DATE_FORMAT(end_date, '%Y-%m-%d') AS "End Date", 
        objective, 
        budget, 
        state,
        pincodes,
        CONCAT('{{HOST}}/images/smm/', image) AS "SMM image"
      FROM tbl_smm_data SMD
       LEFT JOIN tbl_doctor_details AS DD ON  SMD.doctor_code = DD.doctor_code
      WHERE SMD.request_id = ? AND SMD.status = 1
    `,
};

function applyHostToQueries(queryTemplates, host) {
  const queriesWithHost = {};
  for (const [key, query] of Object.entries(queryTemplates)) {
    queriesWithHost[key] = query.replace(/{{HOST}}/g, host);
  }
  return queriesWithHost;
}

const handleSelectedService = (val, host) => {
  switch (val) {
    case 1:
      return applyHostToQueries(DoctorPortfolioQueryTemplates, host);
    // case 2:
    //   return <HospitalWebsiteForm />;
    // case 3:
    //   return <DoctorWebinars />;
    // case 4:
    //   return <ECards />;
    // case 5:
    //   return <CustomBranding />;
    // case 6:
    //   return <SEOForm />;
    // case 7:
    //   return <SMOForm />;
    case 8:
      return applyHostToQueries(smmQueries, host);
    // case 9:
    //   return <SEMForm />;
    // case 10:
    //   return <LocalSEO />;
    // case 11:
    //   return <EmailMarketing />;
    // case 12:
    //   return <SMSMarketing />;
    // case 13:
    //   return <WhatsAppMarketing />;
    default:
      return {};
  }
};

// Helper: Download image from URL and insert into worksheet
// async function insertImageFromUrl(workbook, worksheet, imageUrl, cellAddress) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//     const imageBuffer = Buffer.from(response.data, 'binary');

//     const extension = imageUrl.split('.').pop().split('?')[0].toLowerCase();
//     const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
//     if (!validExtensions.includes(extension)) return;

//     const imageId = workbook.addImage({
//       buffer: imageBuffer,
//       extension: extension === 'jpg' ? 'jpeg' : extension,
//     });

//     // --- Calculate row and column indexes
//     const col = worksheet.getColumn(cellAddress).number - 1;
//     const row = worksheet.getRow(cellAddress).number - 1;

//     // --- Insert image
//     const IMAGE_WIDTH = 100; // Customize size
//     const IMAGE_HEIGHT = 100;

//     worksheet.addImage(imageId, {
//       tl: { col, row },
//       ext: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
//       editAs: 'oneCell', // This keeps it tight inside cell
//     });

//     // --- Set Row height and Column width to match image size
//     worksheet.getRow(row + 1).height = IMAGE_HEIGHT * 0.75; // Excel row height is in points (~0.75 pixel)
//     worksheet.getColumn(col + 1).width = IMAGE_WIDTH / 7.5; // Excel column width is approx 7.5 pixels
//   } catch (error) {
//     console.error(`Failed to insert image at ${cellAddress}:`, error.message);
//   }
// }

exports.getServiceRequestDetails = catchAsync(async (req, res, next) => {
  const { requestId, serviceId } = req.body;

  if (!requestId) {
    return res.status(400).json({ message: "Missing requestId in body" });
  }

  const host = `${req.protocol}://${req.get("host")}/api`;
  const serviceQueries = handleSelectedService(serviceId, host);

  const tableQueries = {
    "Request Details": `SELECT  DOS.request_id AS "Request Id",DS.service_name AS service,
                  DOD.doctor_name AS "Doctor Name",DOD.category AS specialization, 
                  IF(DOS.submit_status = 1, 'Submitted', 'In-progress') AS "Request status",
                  IFNULL(ADSM.status_name, '') AS "Current status",
                  ED.emp_name AS "Requested By",
                  DATE_FORMAT(DOS.created_at, '%d-%m-%Y %H:%i:%s') AS "Requested On",             
                  EDS.emp_name AS "Submited By",
                  DATE_FORMAT(DOS.submit_on, '%d-%m-%Y %H:%i:%s') AS "Submit On"
                FROM tbl_doctor_services DOS
                  LEFT JOIN tbl_digital_services DS ON DOS.service_id = DS.id 
                  LEFT JOIN tbl_doctor_details AS DOD ON DOS.doctor_id = DOD.doctor_code
                  LEFT JOIN tbl_admin_status_master ADSM ON DOS.approval_status = ADSM.status_code
                  LEFT JOIN tbl_employees_details ED ON DOS.created_by = ED.emp_code
                  LEFT JOIN tbl_employees_details EDS ON DOS.submited_by = EDS.emp_code
                WHERE request_id = ?  AND DOS.status = 1`,
    ...serviceQueries,
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Your App";
  workbook.created = new Date();
  try {
    for (const [sheetName, query] of Object.entries(tableQueries)) {
      const result = await db(query, [requestId]);
      const rows = Array.isArray(result) ? result : result ? [result] : [];

      const sheet = workbook.addWorksheet(sheetName);
      sheet.properties.defaultColWidth = 25;

      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        sheet.columns = headers.map((header) => ({
          header,
          key: header,
        }));

        // Apply bold only to the header row
        sheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        rows.forEach((row) => {
          const addedRow = sheet.addRow(row);

          Object.entries(row).forEach(([key, value], colIdx) => {
            const cell = addedRow.getCell(colIdx + 1); // ExcelJS uses 1-based indexing

            // Detect URL-like fields (e.g., fields with 'http', 'https', or filenames)
            const isUrl =
              typeof value === "string" &&
              (value.startsWith("http") ||
                value.match(/\.(pdf|png|jpg|jpeg|webp)$/i));

            if (isUrl) {
              cell.value = {
                text: "Open Link",
                hyperlink: value,
              };
              cell.font = { color: { argb: "FF0000FF" }, underline: true }; // Style like link
            } else {
              cell.value = value;
            }
          });
        });

        // Auto-width adjustment (optional)
        sheet.columns.forEach((col) => {
          let maxLength = col.header.length;
          col.eachCell({ includeEmpty: true }, (cell) => {
            const val = cell.value ? cell.value.toString() : "";
            if (val.length > maxLength) {
              maxLength = val.length;
            }
          });
          col.width = maxLength + 5;
        });
      } else {
        sheet.addRow(["No data found for this sheet."]).font = { italic: true };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Request_${requestId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error("Excel generation failed:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error. Failed to generate Excel." });
  }
});

// try {
//   for (const [sheetName, query] of Object.entries(tableQueries)) {
//     const result = await db(query, [requestId]);
//     const rows = Array.isArray(result) ? result : result ? [result] : [];

//     const sheet = workbook.addWorksheet(sheetName);
//     sheet.properties.defaultColWidth = 25;

//     if (rows.length > 0) {
//       const headers = Object.keys(rows[0]);
//       sheet.columns = headers.map((header) => ({
//         header,
//         key: header,
//       }));

//       // Bold and center header row
//       sheet.getRow(1).eachCell((cell) => {
//         cell.font = { bold: true };
//         cell.alignment = { vertical: 'middle', horizontal: 'center' };
//       });

//       for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
//         const rowData = rows[rowIndex];
//         const addedRow = sheet.addRow(rowData);

//         let colIdx = 1;
//         for (const [key, value] of Object.entries(rowData)) {
//           const cell = addedRow.getCell(colIdx);

//           const isUrl = typeof value === 'string' && value.startsWith('http');

//           if (isUrl) {
//             const isImage = value.match(/\.(jpg|jpeg|png|webp)$/i);
//             if (isImage) {
//               // // Insert image directly into cell
//               // await insertImageFromUrl(workbook, sheet, value, cell.address);
//               // Insert image into cell
//               await insertImageFromUrl(workbook, sheet, value, cell.address);

//               // 🔥 Important: Clear cell value after inserting image
//               cell.value = null; // ✅ clear text
//             } else {
//               // Insert hyperlink for PDFs or other URLs
//               cell.value = { text: 'Open Link', hyperlink: value };
//               cell.font = { color: { argb: 'FF0000FF' }, underline: true };
//             }
//           } else {
//             cell.value = value;✅
//           }
//
//         }
//       }

//       // Auto-adjust column widths
//       sheet.columns.forEach((col) => {
//         let maxLength = col.header.length;
//         col.eachCell({ includeEmpty: true }, (cell) => {
//           const val = cell.value
//             ? typeof cell.value === 'object'
//               ? cell.value.text
//               : cell.value.toString()
//             : '';
//           if (val.length > maxLength) {
//             maxLength = val.length;
//           }
//         });
//         col.width = maxLength + 5;
//       });
//     } else {
//       sheet.addRow(['No data found for this sheet.']).font = {
//         italic: true,
//       };
//     }
//   }

//   const buffer = await workbook.xlsx.writeBuffer();

//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename=Request_${requestId}.xlsx`
//   );
//   res.setHeader(
//     'Content-Type',
//     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//   );
//   res.send(buffer);
// } catch (err) {
//   console.error('Excel generation failed:', err);
//   return res
//     .status(500)
//     .json({ message: 'Internal Server Error. Failed to generate Excel.' });
// }
