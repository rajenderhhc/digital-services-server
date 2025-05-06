const { db } = require('../dbConfig');
const catchAsync = require('../Utils/catchAsync');

exports.getAdminNotifications = catchAsync(async (req, res, next) => {
  const { divisions, services, emp_id } = req.user;

  const filters = ['status = 1'];
  const filterValues = [];

  // Handle divisions filter
  const parsedDivisions = divisions !== 'All' ? parseJSON(divisions) : [];
  if (parsedDivisions.length) {
    filters.push(
      `division_id IN (${parsedDivisions.map(() => '?').join(', ')})`
    );
    filterValues.push(...parsedDivisions);
  }

  // Handle services filter
  const parsedServices = services !== 'All' ? parseJSON(services) : [];
  if (parsedServices.length) {
    filters.push(`service_id IN (${parsedServices.map(() => '?').join(', ')})`);
    filterValues.push(...parsedServices);
  }

  const filterQuery = filters.join(' AND ');
  req.filterQuery = filterQuery;
  req.filterValues = filterValues;
  req.emp_id = emp_id;
  next();
});

exports.userNotifications = catchAsync(async (req, res, next) => {
  const { emp_code } = req.user;

  const filterQuery = `status = 1 AND created_by = ?`;
  const filterValues = [emp_code];
  req.filterQuery = filterQuery;
  req.filterValues = filterValues;
  req.emp_id = emp_code;
  next();
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const { filterQuery, filterValues, emp_id } = req;

  // Step 1: Get tracking IDs user has access to
  const trackingRows = await db(
    `
  SELECT tracking_id
  FROM tbl_service_status_tracking
  WHERE request_id IN (
    SELECT request_id FROM tbl_doctor_services WHERE ${filterQuery}
  )
  AND action_by <> ?
  `,
    [...filterValues, emp_id]
  );

  const trackingIds = trackingRows.map((row) => row.tracking_id);
  if (!trackingIds.length) {
    return res.json({ unread_count: 0, unread_messages: [] });
  }

  const trackingPlaceholders = trackingIds.map(() => '?').join(', ');

  // Step 2: Get unread message count and last tracking ID per request
  const unreadSummary = await db(
    `
    SELECT 
      m.request_id,
      COUNT(*) AS unread_count,
      MAX(m.tracking_id) AS last_tracking_id
    FROM tbl_service_status_tracking m
    LEFT JOIN tbl_message_reads r
      ON m.tracking_id = r.tracking_id AND r.user_id = ?
    WHERE m.tracking_id IN (${trackingPlaceholders})
      AND r.tracking_id IS NULL
    GROUP BY m.request_id
    ORDER BY unread_count DESC
    `,
    [emp_id, ...trackingIds]
  );

  if (!unreadSummary.length) {
    return res.json({ unread_count: 0, unread_messages: [] });
  }

  const lastTrackingIds = unreadSummary.map((r) => r.last_tracking_id);
  const lastPlaceholders = lastTrackingIds.map(() => '?').join(', ');

  // Step 3: Get details of the last unread messages
  const lastMessages = await db(
    `
    SELECT 
      tracking_id,
      request_id,
      remarks,
      action_by,
      DATE_FORMAT(action_at, '%d-%m-%Y %H:%i:%s') AS action_at
    
    FROM tbl_service_status_tracking
    WHERE tracking_id IN (${lastPlaceholders}) ORDER BY action_at ASC
    `,
    lastTrackingIds
  );

  // Final merge of summaries and messages
  const notifications = unreadSummary.map((summary) => {
    const last = lastMessages.find(
      (msg) => msg.tracking_id === summary.last_tracking_id
    );
    return {
      request_id: summary.request_id,
      unread_count: Number(summary.unread_count),
      lastmessage: last || null,
    };
  });

  const totalUnread = notifications.reduce(
    (acc, cur) => acc + cur.unread_count,
    0
  );

  res.json({
    unread_count: totalUnread,
    unread_messages: notifications,
  });
});

exports.readNotifications = catchAsync(async (req, res, next) => {
  const { trackingIds } = req.body;
  const { emp_code = '', emp_id = '' } = req.user;

  if (!Array.isArray(trackingIds) || trackingIds.length === 0) {
    return res.status(400).json({ message: 'No trackingIds provided.' });
  }

  const values = trackingIds.map((id) => [id, emp_code || emp_id]);

  const placeholders = values.map(() => '(?, ?)').join(', ');

  const query = `INSERT IGNORE INTO tbl_message_reads (tracking_id, user_id) VALUES ${placeholders}`;

  const flatValues = values.flat();

  await db(query, flatValues);

  res.json({ message: 'Marked as read successfully.' });
});

exports.leaveaNote = catchAsync(async (req, res, next) => {
  const { requestId, message } = req.body;
  const logquery = `INSERT INTO tbl_service_status_tracking (request_id, action, action_by, remarks,role)
                    VALUES (? ,?,?,?,?)`;

  const role = req.user.emp_id ? 'Admin' : 'user';
  const values = [
    requestId,
    'Note',
    req.user.emp_id || req.user.emp_code,
    message,
    role,
  ];
  const result = await db(logquery, values);

  res.status(200).json({
    status: 'success',
    message: 'Request status Updated',
    data: result.insetId,
  });
});

exports.requestNotes = catchAsync(async (req, res, next) => {
  const { requestId } = req.body;
  const { emp_code, emp_id } = req.user;
  const ID = emp_code || emp_id;

  const logquery = `SELECT 
  SST.tracking_id,
  SST.action,
  SST.action_by,
  DATE_FORMAT(SST.action_at, '%d-%m-%Y %H:%i:%s') AS action_at,
  SST.remarks,
  SST.role,
  CASE 
    WHEN  MR.tracking_id  IS NOT NULL THEN 1 ELSE 0 
  END AS read_status,
  CASE 
    WHEN SST.role = 'Admin' THEN AST.emp_name 
    ELSE ED.emp_name 
  END AS action_by_name
FROM tbl_service_status_tracking AS SST
LEFT JOIN tbl_assign_teams AS AST ON SST.action_by = AST.emp_id
LEFT JOIN tbl_employees_details AS ED ON SST.action_by = ED.emp_code
LEFT JOIN (
  SELECT tracking_id 
  FROM tbl_message_reads 
  WHERE user_id = ?
  GROUP BY tracking_id
) AS MR ON SST.tracking_id = MR.tracking_id
WHERE SST.request_id = ? AND SST.status = 1 
ORDER BY SST.action_at ASC;
`;

  const result = await db(logquery, [ID, requestId]);

  res.status(200).json({
    status: 'success',
    message: 'Request status Updated',
    data: result,
  });
});
