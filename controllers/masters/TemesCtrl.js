const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

const multerInstance = require('../../Utils/multer');

exports.upload = multerInstance.single('themeImage');

exports.updateStoreSmmImage = catchAsync(async (req, res, next) => {
  const { themeImage } = req.body;
  if (themeImage) {
    const imageName = themeImage.substring(themeImage.lastIndexOf('/') + 1);
    req.body.themeImage = imageName;
    next();
  } else {
    if (!req.file) {
      return next(new AppError('SMM Image Required', 400));
    }
    const folderName = 'websiteThemes';
    const imageName = `${Date.now()}-${req.file.originalname.replace(
      / /g,
      '-'
    )}`;
    await sharp(req.file.buffer).toFile(`uploads/${folderName}/${imageName}`);
    req.body.themeImage = imageName;
    next();
  }
});

exports.AddWebsiteThem = catchAsync(async (req, res, next) => {
  const { themeImage, name, url } = req.body;
  const query = `INSERT INTO  tbl_website_themes (theme_img,theme_name, theme_url) VALUES(?,?,?) `;
  const values = [themeImage, name, url];
  const result = await db(query, values);

  res
    .status(200)
    .json({ id: result.insertId, message: 'Theme Added Successfuly' });
});
