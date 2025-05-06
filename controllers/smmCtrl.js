const { db } = require('../dbConfig');
const sharp = require('sharp');

const { multerInstance } = require('../Utils/multer');
const { generateRequestId } = require('../Utils/generFuns');
const AppError = require('../Utils/appError');
const catchAsync = require('../Utils/catchAsync');

exports.upload = multerInstance.single('smmImage');

exports.updateStoreSmmImage = catchAsync(async (req, res, next) => {
  const { smmImage } = req.body;
  if (smmImage) {
    const imageName = smmImage.substring(smmImage.lastIndexOf('/') + 1);
    req.body.smmImage = imageName;
    next();
  } else {
    if (!req.file) {
      return next(new AppError('SMM Image Required', 400));
    }
    const folderName = 'smmImages';
    const imageName = `${Date.now()}-${req.file.originalname.replace(
      / /g,
      '-'
    )}`;
    await sharp(req.file.buffer).toFile(`uploads/${folderName}/${imageName}`);
    req.body.smmImage = imageName;
    next();
  }
});

exports.smmData = catchAsync(async (req, res, next) => {
  const {
    content,
    smmImage,
    location,
    startDate,
    endDate,
    campaignObjective,
    budget,
    doctorCode,
    tseCode,
    state,
    divisionName,
    serviceId,
    pincodes,
  } = req.body;

  // Ensure requestId exists or generate a new one
  let requestId = req.body.requestId?.trim();
  if (!requestId) {
    requestId = generateRequestId(divisionName, serviceId);
    req.body.requestId = requestId;
  }

  const values = [
    requestId,
    doctorCode,
    content,
    smmImage,
    location,
    startDate,
    endDate,
    campaignObjective,
    budget,
    tseCode,
    state,
    pincodes,
    req.user.emp_code,
  ];

  const query = `
    INSERT INTO tbl_smm_data (
      request_id,
      doctor_code,
      content,
      image,
      location,
      start_date,
      end_date,
      objective,
      budget,
      tse_code,
      state,
      pincodes,
      create_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    ON DUPLICATE KEY UPDATE
      content = VALUES(content),
      image = VALUES(image),
      location = VALUES(location),
      start_date = VALUES(start_date),
      end_date = VALUES(end_date),
      objective = VALUES(objective),
      budget = VALUES(budget),
      tse_code = VALUES(tse_code),
      state = VALUES(state),
      pincodes = VALUES(pincodes),
      update_by = VALUES(create_by);
  `;

  const result = await db(query, values);

  // Determine insert vs update based on affectedRows
  const action = result.affectedRows === 1 ? 'inserted' : 'updated';
  if (result.affectedRows === 1) return next();
  res.status(200).json({
    status: 'success',
    message: `Record ${action}`,
    data: { requestId },
  });
});

exports.getSmmData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  const query = `
      SELECT 
        doctor_code, 
        content,  
        location,  
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,  
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, 
        objective, 
        budget, 
        tse_code,
        state,
        pincodes,
        CONCAT('${req.protocol}://${req.get(
    'host'
  )}/api/images/smm/', image) AS smm_image
      FROM tbl_smm_data 
      WHERE request_id = ? AND status = 1
    `;

  const smm_data = await db(query, [reqId]);

  res.status(200).json({
    status: 'success',
    message: 'Data retrieved successfully',
    data: { fill_status: req.fill_status || null, smm_data },
  });
});
