const AppError = require('../Utils/appError');
const { db } = require('../dbConfig');

const handleDatabaseError = (err) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return new AppError(
      'Duplicate entry detected. Please use unique values.',
      400
    );
  }
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return new AppError('Invalid field provided in the request.', 400);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError(
      'Invalid reference provided, please check related fields.',
      400
    );
  }
  return new AppError('Something went wrong! Please try again later.', 500);
};

const handleJsonWebTokenError = (message) =>
  new AppError(`${message} Please Login again`, 401);

const handleTokenExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

const handleMulterError = (err) =>
  new AppError(err.message ?? 'Error while uploading files', 400);

const handleECONNRESETError = () =>
  new AppError('Connection reset by server.', 500);

const handleFileSizeError = () =>
  new AppError('File is too large Max size is 5MB.', 500);

const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong! Please try again later.',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  // console.log(err);
  const { statusCode, status, message = '' } = err;
  const errQyery = `INSERT INTO tbl_error_logs ( err_code, err_status, err_message) VALUES (?,?,?)`;
  db(errQyery, [statusCode, status, message]);

  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, res);
  } else {
    if (err.sqlState || err.code?.startsWith('ER'))
      err = handleDatabaseError(err);
    if (err.code === 'LIMIT_FILE_SIZE') err = handleFileSizeError();
    if (err.name === 'JsonWebTokenError')
      err = handleJsonWebTokenError(err.message);
    if (err.name === 'TokenExpiredError') err = handleTokenExpiredError();
    if (err.errno === -4077) err = handleECONNRESETError();
    if (err.name === 'MulterError') err = handleMulterError(err);

    sendErrProd(err, res);
  }
};
