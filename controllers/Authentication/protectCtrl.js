const jwt = require('jsonwebtoken');
const { db } = require('../../dbConfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.protect = (role) => {
  return catchAsync(async (req, res, next) => {
    let token = '';
    // Check if Authorization Header exists
    if (req.headers && req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token || token === 'undefined') {
      return next(
        new AppError("You're not logged in. Please log in to get access.", 401)
      );
    }

    const tokenKey =
      role === 'user' ? process.env.JWT_SECRET : process.env.JWT_ADMIN_SECRET;

    // Verify JWT Token
    const payload = jwt.verify(token, tokenKey);
    const { id } = payload;

    // Fetch user from database
    const userQuery = `
      SELECT emp_code, emp_name, hq, region, designation, designation_id, state, 
            mobile, emp_type, emp_status, sales_hq, division_name, division_id
      FROM tbl_employees_details
      WHERE emp_code = ? AND status = 1
    `;

    // Fetch Admin from database
    const adminQuery = `SELECT emp_id,emp_name,mobile,mail_id,
                    team_name,role,divisions,services
                 FROM tbl_assign_teams
                 WHERE emp_id = ? AND status = 1`;

    const query = role === 'user' ? userQuery : adminQuery;

    const [user] = await db(query, [id]);

    // If user doesn't exist or is inactive
    if (!user) {
      return next(new AppError('User no longer exists or is inactive.', 403));
    }

    // Attach user to request
    req.user = user;
    next();
  });
};
