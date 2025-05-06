const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

exports.awardsData = catchAsync(async (req, res, next) => {
  const { awardsData, requestId, doc_id } = req.body;

  if (!Array.isArray(awardsData) || awardsData.length === 0) {
    return next(new AppError('Invalid or empty awards data', 400));
  }

  // Prepare values for batch insertion
  const values = awardsData.map((a) => [
    a.id === '' ? null : a.id,
    requestId,
    doc_id,
    a.name,
    a.excellenceIn,
    a.awardedBy,
    a.year,
    req.user.emp_code, // created_by
  ]);

  // Optimized SQL Query with ID tracking
  const query = `
    INSERT INTO tbl_awards_recognitions (id,request_id ,doc_id,award_name,
            excellence_in, awarded_by,year,create_by
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      award_name = IF(VALUES(award_name) != award_name, VALUES(award_name), award_name),
      excellence_in = IF(VALUES(excellence_in) != excellence_in, VALUES(excellence_in), excellence_in),
      awarded_by = IF(VALUES(awarded_by) != awarded_by, VALUES(awarded_by), awarded_by),
      year = IF(VALUES(year) != year, VALUES(year), year),
      update_by = VALUES(create_by);
  `;

  // Execute query with batch insertion
  const insertResult = await db(query, [values]);

  res.status(200).json({
    status: 'success',
    message:
      insertResult.affectedRows > awardsData.length
        ? 'Records updated'
        : 'Records inserted',
    data: insertResult,
  });
});

exports.getAwardsData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const query = `SELECT id,award_name,excellence_in, awarded_by,year 
                   FROM tbl_awards_recognitions
                   WHERE request_id = ? AND status = 1`;

  const awards_data = await db(query, [reqId]);

  res.status(200).json({
    status: 'success',
    message: 'Data Retrived Successfully',
    data: { fill_status: req.fill_status || null, awards_data },
  });
});

exports.deleteAward = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  const { reqId } = req.params;
  const query = `UPDATE tbl_awards_recognitions SET status = 0 WHERE request_id = ? AND id = ?`;
  const result = await db(query, [reqId, id]);
  res.status(200).json({
    status: 'success',
    message: 'Record Deleted Successfully',
    data: result.affectedRows,
  });
});
