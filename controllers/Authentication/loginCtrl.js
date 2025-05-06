const { db } = require('../../dbConfig');
const jwt = require('jsonwebtoken');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.adminLogin = catchAsync(async (req, res, next) => {
  const { userId, password } = req.body;

  const query = `SELECT emp_id,emp_name,mobile,mail_id,
                    team_name,role,divisions,services,password
                 FROM tbl_assign_teams
                 WHERE emp_id = ? AND status = 1`;

  const [user] = await db(query, [userId]);

  if (!user) return next(new AppError('Invalid userId', 401));

  const isMatch = password === user.password;
  if (!isMatch) return next(new AppError('Invalid password', 401));

  const token = jwt.sign({ id: user.emp_id }, process.env.JWT_ADMIN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  exports.insertLoginLogs({ userId: userId, role: user.role, action: 'Login' });
  res.status(200).json({
    status: 'success',
    user,
    token,
  });
});

exports.userLogin = catchAsync(async (req, res, next) => {
  const { userId, password } = req.body;

  const query = `SELECT  emp_code, emp_name, hq, region, designation, designation_id, 
                    state, mobile, emp_type, emp_status,division_name,
                    division_id, create_by,password
                  FROM  tbl_employees_details WHERE  emp_code = ? AND status = 1
    `;
  const [user] = await db(query, [userId]);

  if (!user) return next(new AppError('Invalid userId', 401));

  const isMatch = password === user.password;
  if (!isMatch) return next(new AppError('Invalid password', 401));

  const token = jwt.sign({ id: user.emp_code }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  exports.insertLoginLogs({
    userId: userId,
    role: 'user',
    action: 'Login',
  });

  res.status(200).json({
    status: 'success',
    user,
    token,
  });
});

exports.resetPasswword = catchAsync(async (req, res, next) => {
  const { currentPasswrord, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    return next(new AppError(`password didn't matched`, 400));

  const query = `SELECT password
                 FROM tbl_assign_teams
                 WHERE emp_id = ? AND status = 1`;

  const [{ password }] = await db(query, [req.user.emp_id]);

  if (!password || password !== currentPasswrord)
    return next(new AppError(`incorrect current password`, 400));
  const result = await db(
    `UPDATE tbl_assign_teams SET password = ? WHERE  emp_id = ? `,
    [newPassword, req.user.emp_id]
  );
  exports.insertLoginLogs({
    userId: req.user.emp_id,
    role: req.user.role,
    action: 'Reset password',
  });

  const JwtToken = jwt.sign(
    { id: req.user.emp_id },
    process.env.JWT_ADMIN_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Password reset Sucessfully',
    token: JwtToken,
  });
});

exports.insertLoginLogs = async (logdata) => {
  const { userId, role, action } = logdata;
  const query =
    'INSERT INTO tbl_login_logs (emp_id, emp_role,action) VALUES (?,?, ?)';
  await db(query, [userId, role, action]);
};
