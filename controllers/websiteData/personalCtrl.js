const AppError = require("../../Utils/appError");
const catchAsync = require("../../Utils/catchAsync");
const { generateRequestId } = require("../../Utils/generFuns");
const { multerInstance } = require("../../Utils/multer");
const { db } = require("../../dbConfig");
const sharp = require("sharp");
const fs = require("fs").promises;
const { updateotherSpeciality } = require("./specialityService");

exports.upload = multerInstance.single("profileDoc");

exports.updateStoreProfileDoc = catchAsync(async (req, res, next) => {
  const { profileDoc } = req.body;
  if (typeof profileDoc === "string") {
    let fileName = "";
    if (profileDoc !== "") {
      fileName = profileDoc.substring(profileDoc.lastIndexOf("/") + 1);
    }

    req.body.profileDoc = fileName;
    return next();
  }

  if (!req.file) {
    req.body.profileDoc = "";
    return next(); // No file uploaded and no profileDoc in body
  }

  const allowedMimeTypes = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return next(
      new AppError("Only .pdf, .doc, and .docx files are allowed", 400)
    );
  }

  const folderName = "profileDocuments";
  const fileName = `${Date.now()}-${req.file.originalname.replace(/ /g, "-")}`;

  await fs.writeFile(`uploads/${folderName}/${fileName}`, req.file.buffer);
  // .toFormat('pdf') // Optional: could validate or convert

  req.body.profileDoc = fileName;
  next();
});

exports.personalData = catchAsync(async (req, res, next) => {
  const {
    fullName,
    gender,
    doc_id,
    specialty,
    otherSpecialty,
    whyChooseTitle,
    whyChooseDescription,
    about,
    profileDoc,
    requestId,
  } = req.body;

  const { emp_code } = req.user;

  // if (!doctorCode || !empId) {
  //   return next(new AppError("doctorCode and empId are required", 400));
  // }

  // Handle specialty logic
  const finalSpecialty =
    `${specialty}` === "1"
      ? await updateotherSpeciality(specialty, otherSpecialty, emp_code)
      : specialty;

  const query = `
    INSERT INTO tbl_doc_personal_details (
      request_id,
      doc_id,
      full_name,
      gender,
      speciality_id,
      why_choose_title_id,
      why_choose_description,
      about,
      profile_doc,
      create_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      full_name = VALUES(full_name),
      gender = VALUES(gender),
      speciality_id = VALUES(speciality_id),
      why_choose_title_id = VALUES(why_choose_title_id),
      why_choose_description = VALUES(why_choose_description),
      about = VALUES(about),
      profile_doc = VALUES(profile_doc),
      update_by = VALUES(create_by);
  `;

  const values = [
    requestId,
    doc_id,
    fullName,
    gender,
    finalSpecialty,
    whyChooseTitle,
    whyChooseDescription,
    about,
    profileDoc,
    emp_code,
  ];

  const result = await db(query, values);

  // affectedRows = 1 (insert) or 2 (update)
  const action = result.affectedRows === 1 ? "inserted" : "updated";

  res.status(200).json({
    status: "success",
    message: `Record ${action}`,
  });
});

exports.getpersonalData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  const query = `SELECT  DPD.request_id,
                    doc_id,
                    full_name,
                    gender,
                    speciality_id,
                    why_choose_title_id,
                    why_choose_description,
                    about,
                     CONCAT('${req.protocol}://${req.get(
    "host"
  )}/api/docs/', profile_doc) AS profile_doc,
                    FFS.fill_status,
                    DS.spec_name,
                    WCD.title
                  FROM tbl_doc_personal_details DPD
                    LEFT JOIN tbl_service_from_fill_status FFS
                     ON FFS.form_id = 1 AND  DPD.request_id = FFS.request_id
                    LEFT JOIN tbl_doctor_specialities DS ON DPD.speciality_id =  DS.spec_id
                    LEFT JOIN tbl_why_to_choose_doctor_title WCD ON DPD.why_choose_title_id = WCD.id
                  WHERE DPD.request_id = ? AND DPD.status = 1`;

  const result = await db(query, [reqId]);
  res.status(200).json(result);
});
