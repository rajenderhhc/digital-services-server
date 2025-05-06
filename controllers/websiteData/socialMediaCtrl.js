const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

exports.socialMediaData = catchAsync(async (req, res, next) => {
  const { smData, requestId, doc_id } = req.body;

  if (!Array.isArray(smData) || smData.length === 0) {
    return next(new AppError('Invalid or empty social media data', 400));
  }

  // Prepare values for batch insertion
  const values = smData.map((sm) => [
    sm.id === '' ? null : sm.id,
    requestId,
    sm.name,
    sm.url,
    doc_id,
    req.user.emp_code, // created_by
  ]);

  // Optimized SQL Query with ID tracking
  const query = `
    INSERT INTO tbl_social_media  (id,request_id, name, url, doc_id, create_by
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      name = IF(VALUES(name) != name, VALUES(name), name),
      url = IF(VALUES(url) != url, VALUES(url), url),
      doc_id = IF(VALUES(doc_id) != doc_id, VALUES(doc_id), doc_id),
      update_by = VALUES(create_by);
  `;

  // Execute query with batch insertion
  const insertResult = await db(query, [values]);

  res.status(200).json({
    status: 'success',
    message:
      insertResult.affectedRows > smData.length
        ? 'Records updated'
        : 'Records inserted',
    data: insertResult,
  });
});

exports.getSmData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const query = `SELECT * FROM tbl_social_media WHERE request_id = ? AND status= 1`;

  const sm_data = await db(query, [reqId]);

  res.status(200).json({
    status: 'success',
    message: 'Data Retrieved successfully',
    data: { fill_status: req.fill_status || null, sm_data },
  });
});

exports.deleteSm = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const { id } = req.body;

  const query = `UPDATE tbl_social_media SET status = 0 WHERE request_id = ? AND id = ? `;

  const resuit = await db(query, [reqId, id]);
  res.status(200).json({
    status: 'success',
    message: 'Deleted successfully',
    data: resuit.affectedRows,
  });
});
