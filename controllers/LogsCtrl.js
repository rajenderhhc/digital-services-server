const { db } = require('../dbConfig');

exports.insertEmailLog = async (logDetails) => {
  try {
    const {
      subject,
      to,
      cc,
      status,
      request_id,
      emp_code,
      info = {},
      err = '',
    } = logDetails;

    const { message, result } = info;

    // Convert arrays to comma-separated strings, handling empty cases
    const formatArray = (arr) =>
      Array.isArray(arr) && arr.length ? arr.join(',') : null;

    let columns = ['email_status', 'request_id', 'subject', 'action_by'];
    let placeholders = ['?', '?', '?', '?'];
    let values = [status, request_id, subject, emp_code];

    if (status === 'fail') {
      columns.push('error_msg');
      placeholders.push('?');
      values.push(err || null);
    } else {
      columns.push('response', '`message`', 'to_email', 'cc_email'); // Use backticks for 'message'
      placeholders.push('?', '?', '?', '?');
      values.push(
        JSON.stringify(result) || null,
        message || null,
        to || null,
        formatArray(cc)
      );
    }

    const insertQuery = `
    INSERT INTO tbl_email_logs (${columns.join(', ')}) 
    VALUES (${placeholders.join(', ')})`;

    await db(insertQuery, values);
  } catch (error) {
    console.error('Database Insertion Error:', error);
  }
};

exports.insertSMSLogs = async (logDetails) => {
  const {
    requestId,
    templateId,
    smsId,
    statusCode,
    mobileNumber,
    message,
    action = '',
    employeeId,
    remarks = '',
  } = logDetails;

  try {
    const insertQuery = `INSERT INTO tbl_sms_logs (  request_id,
  template_id,
  sms_id,
  send_to,
  status_code,
  message,
  action,
  action_by,
  remark) VALUES(?,?,?,?,?,?,?,?,?)`;
    const values = [
      requestId,
      templateId,
      smsId,
      mobileNumber,
      statusCode,
      message,
      action,
      employeeId,
      remarks,
    ];

    const result = await db(insertQuery, values);
  } catch (error) {}
};
