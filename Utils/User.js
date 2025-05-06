const db = require('../Database/dbconfig');

module.exports = class User {
  constructor(userId) {
    this.userId = userId;
    this.userDetails = {};
    this.autoInitialize(); // Automatically fetch user details
  }

  async autoInitialize() {
    if (this.userId) {
      this.userDetails = await User.fetchUserDetails(this.userId);
    }
  }

  static async fetchUserDetails(userId) {
    const query = `
      SELECT *,
      CONCAT(azst_customer_fname, ' ', azst_customer_lname) AS user_name
      FROM azst_customers_tbl
      WHERE azst_customer_id = ?`;
    const [customer] = await db(query, [userId]);
    return customer ?? {};
  }
};

// id,
//   emp_code,
//   emp_name,
//   hq,
//   region,
//   designation,
//   designation_id,
//   state,
//   mobile,
//   emp_type,
//   emp_status,
//   sales_hq,
//   division_name,
//   division_id,
//   create_by,
//   create_at,
//   update_by,
//   update_at,
//   status,
//   remarks;
