const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

exports.contactData = catchAsync(async (req, res, next) => {
  const { contactData, requestId, doc_id } = req.body;

  if (!Array.isArray(contactData) || contactData.length === 0) {
    console.error('No contact data provided');
    return next(new AppError('Invalid or empty contact data', 400));
  }

  // Prepare values for batch insertion
  const values = contactData.map((c) => [
    c.id === '' ? null : c.id,
    requestId,
    doc_id,
    c.contactType,
    c.contactPerson,
    c.number,
    c.mail,
    c.startTime,
    c.endTime,
    JSON.stringify(c.availDays), // Ensure proper storage of array
    req.user.emp_code,
  ]);

  // SQL Query with batch insert and update
  const query = `
    INSERT INTO tbl_contact_details (
      id, request_id, doc_id, contact_type, contact_person, number,
      mail, start_time, end_time, available_days, create_by
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      contact_type = VALUES(contact_type),
      contact_person = VALUES(contact_person),
      number = VALUES(number),
      mail = VALUES(mail),
      start_time = VALUES(start_time),
      end_time = VALUES(end_time),
      available_days = VALUES(available_days),
      update_by = VALUES(create_by);
  `;

  const insertResult = await db(query, [values]);

  res.status(200).json({
    status: 'success',
    message:
      insertResult.affectedRows > contactData.length
        ? 'Records updated'
        : 'Records inserted',
    data: insertResult,
  });
});

exports.getContactData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const query = `SELECT id,doc_id,contact_type,
                        contact_person,number,mail,
                        start_time,end_time, available_days
                FROM tbl_contact_details
                WHERE request_id = ? AND status = 1`;

  const contact_data = await db(query, [reqId]);

  res.status(200).json({
    status: 'success',
    message: 'Retriveed Data Successfully',
    data: { fill_status: req.fill_status || null, contact_data },
  });
});

exports.deleteContact = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const { id } = req.body;
  const query = `UPDATE tbl_contact_details SET status = 0 WHERE request_id = ? AND  id = ?`;
  const result = await db(query, [reqId, id]);
  res.status(200).json({
    status: 'success',
    message: 'Record Deleted Successfully',
    data: result?.affectedRows,
  });
});
