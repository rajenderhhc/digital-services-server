const { db } = require("../../dbConfig");
const sharp = require("sharp");

const path = require("path");
const fs = require("fs");

const { multerInstance, sanitizeFilename } = require("../../Utils/multer");
const AppError = require("../../Utils/appError");
const catchAsync = require("../../Utils/catchAsync");

exports.getWebsiteData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  if (!reqId) {
    return next(new AppError("No Request ID provided", 400));
  }
  const query = `SELECT request_id, theme_id FROM tbl_doc_website_details WHERE request_id = ? `;

  const result = await db(query, [reqId]);

  let theme_id = "";
  if (result.length > 0) {
    theme_id = result[0].theme_id;
  }
  res.status(200).json({
    status: "success",
    message: "Data retrieved successfully",
    data: {
      fill_status: req.fill_status || null,
      theme_id: theme_id || "",
    },
  });
});

exports.websiteData = catchAsync(async (req, res, next) => {
  const { requestId, themeId } = req.body;

  const values = [requestId, themeId, req.user.emp_code];

  const query = `INSERT INTO tbl_doc_website_details (request_id,theme_id,create_by) 
                 VALUES  (?,?,?) 
                 ON DUPLICATE KEY UPDATE
                 request_id = IF(VALUES(request_id) != request_id, VALUES(request_id), request_id),
                 theme_id = IF(VALUES(theme_id) != theme_id, VALUES(theme_id), theme_id),
                 update_by = VALUES(create_by);`;

  const result = await db(query, values);

  res.status(200).json({
    status: "success",
    message: result.affectedRows === 1 ? "Record inserted" : "Record updated",
    data: requestId,
  });

  // if (result.affectedRows === 1) {
  //   next();
  // } else {
  //   res.status(200).json({
  //     status: 'success',
  //     message: result.affectedRows === 1 ? 'Record inserted' : 'Record updated',
  //     data: requestId,
  //   });
  // }
});

exports.websiteDomain = catchAsync(async (req, res, next) => {
  const { domainUrl, requestId } = req.body;

  if (!domainUrl || !requestId) {
    return res
      .status(400)
      .json({ status: "fail", message: "Missing parameters" });
  }

  const values = [requestId, domainUrl, req?.user?.emp_code];

  const query = `
      INSERT INTO tbl_website_domain (request_id, domain_url, create_by) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      domain_url = VALUES(domain_url),
      update_by = VALUES(create_by);
    `;

  const result = await db(query, values);

  res.status(200).json({
    status: "success",
    message: result.affectedRows === 1 ? "Record inserted" : "Record updated",
    data: result?.insertId || null,
  });
});

exports.getWebsiteDomain = catchAsync(async (req, res, next) => {
  try {
    const { reqId } = req.params;

    const query = `SELECT domain_url FROM tbl_website_domain WHERE request_id = ? AND status = 1`;

    const result = await db(query, [reqId]);

    let domain_url = "";
    if (result.length > 0) {
      domain_url = result[0].domain_url;
    }
    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      data: {
        fill_status: req.fill_status || null,
        domain_url: domain_url || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

const uploadPath = path.join(__dirname, "../../uploads/websiteImages/");

// Ensure the upload directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

exports.upload = multerInstance.array("webImage", 10);

const processImage = async (file, folderPath) => {
  const imageName = `${Date.now()}-${sanitizeFilename(file.originalname)}`;
  const fullPath = path.join(folderPath, imageName);

  await sharp(file.buffer).toFile(fullPath);
  return imageName;
};

exports.updateStoreWebImage = catchAsync(async (req, res, next) => {
  if (
    req.files &&
    !req.files.every((file) => file.mimetype.startsWith("image"))
  ) {
    return next(new AppError("Only image files are allowed", 400));
  }

  const { imagesData } = req.body;
  if (!imagesData) {
    return next(new AppError("Missing imagesData in request body", 400));
  }

  const parsedImagesData = JSON.parse(imagesData);
  let fileIndex = 0;
  const updatedImagesData = [];

  for (let webIm of parsedImagesData) {
    if (typeof webIm.webImage === "string") {
      const imageName = path.basename(webIm.webImage);
      updatedImagesData.push({ ...webIm, webImage: imageName });
    } else {
      if (fileIndex >= req.files.length) {
        return next(new AppError("Not enough files uploaded", 400));
      }
      const imageName = await processImage(req.files[fileIndex], uploadPath);
      updatedImagesData.push({ ...webIm, webImage: imageName });
      fileIndex++;
    }
  }

  req.body.imagesData = updatedImagesData;
  next();
});

exports.websiteImages = catchAsync(async (req, res, next) => {
  const { docId, requestId, imagesData } = req.body;

  // Ensure that `id` is either `NULL` or removed if it's not provided
  const values = imagesData.map((image) => [
    image.id === "" ? null : image.id, // Set id to null if not provided
    requestId,
    image.webImage,
    image.imageType,
    docId,
    req.user.emp_code,
  ]);

  // Ensure your query syntax is correct with `ON DUPLICATE KEY UPDATE`
  const query = `
    INSERT INTO tbl_website_images (id,request_id, image_name, image_type, doc_id, create_by)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      image_name = VALUES(image_name),
      image_type = VALUES(image_type),
      update_by = VALUES(create_by)
  `;

  // Execute the query with the values
  const insertResult = await db(query, [values]);

  // Respond to the client
  res.status(200).json({
    status: "success",
    message:
      insertResult.affectedRows > 0 ? "Records updated" : "Records inserted",
    data: insertResult,
  });
});

exports.getWebsiteImages = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  const query = `SELECT id, 
                    CONCAT('${req.protocol}://${req.get(
    "host"
  )}/api/images/website/',image_name) AS webImage,image_type
                  FROM  tbl_website_images
                  WHERE request_id = ? AND status = 1`;

  const media_data = await db(query, [reqId]);

  res.status(200).json({
    status: "success",
    message: "Data Retrieved successfully",
    data: { fill_status: req.fill_status || null, media_data },
  });
});

exports.deleteImage = catchAsync(async (req, res, next) => {
  const { ids } = req.body;
  const { reqId } = req.params;

  // Parse the JSON string if necessary
  const deleteIds = Array.isArray(ids) ? ids : JSON.parse(ids);

  if (!deleteIds.length) {
    return res.status(400).json({
      status: "fail",
      message: "No IDs provided for deletion",
    });
  }

  const placeholders = deleteIds.map(() => "?").join(","); // Creates ?,?,? for query
  const query = `UPDATE tbl_website_images SET status = 0 WHERE id IN (${placeholders}) AND request_id = ?`;

  const result = await db(query, [...deleteIds, reqId]);

  res.status(200).json({
    status: "success",
    message: "Records Deleted successfully",
    data: result?.affectedRows,
  });
});
