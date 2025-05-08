const axios = require("axios");

const getHirachyDetails = async (empId) => {
  const url = `https://apisfadoctors.heterohealthcare.com/api/MultilevelHierarchy/${empId}`;
  const response = await axios.get(url);
  const { data } = response;
  const hirarchyIds = data.map((e) => e.employeeCode);
  return hirarchyIds;
};

const hirarchyFilter = async (user, table = "") => {
  if (user.designation_id === "23") {
    const divisionIds = user.division_id.split("~");
    return { query: `${table}division_id IN (?)`, values: [divisionIds] };
  } else {
    const hirarchyIds = await getHirachyDetails(user.emp_code);
    return {
      query: `(${table}tse_code IN (?) OR ${table}created_by IN (?))`,
      values: [hirarchyIds, hirarchyIds],
    };
  }
};

module.exports = {
  getHirachyDetails,
  hirarchyFilter,
};
