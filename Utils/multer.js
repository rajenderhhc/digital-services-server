const multer = require('multer');
const AppError = require('./appError');

// Multer configuration
const multerStorage = multer.memoryStorage();
// File size limit (e.g., 5MB per file)
const fileSizeLimit = 5 * 1024 * 1024; // 5MB in bytes
const multerFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type! Only images, PDF, and Word documents are allowed.',
        400
      ),
      false
    );
  }
};

const multerInstance = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: fileSizeLimit },
});

const sanitizeFilename = (fileName) => {
  return fileName
    .replace(/[^\w\s.-]/g, '') // Remove special characters instead of replacing them
    .replace(/\s+/g, '-'); // // Only allows alphanumeric characters, dots, dashes, and underscores
};

module.exports = { multerInstance, sanitizeFilename };
