const { db } = require("../../dbConfig");
const catchAsync = require("../../Utils/catchAsync");
const { hirarchyFilter } = require("../../Utils/hirarchyFilter");

const currentYear = new Date().getFullYear();

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

exports.getRequestCout = catchAsync(async (req, res, next) => {
  const { year = currentYear } = req.params;

  const { query: filterQuery, values } = await hirarchyFilter(req.user);


  const query = `
  SELECT 
    DATE_FORMAT(created_at, '%b') AS month,
    COUNT(CASE WHEN submit_status = 0 THEN 1 END) AS pending_count,
    COUNT(CASE WHEN submit_status = 1 THEN 1 END) AS complete_count
  FROM tbl_doctor_services
  WHERE status = 1 AND ${filterQuery} AND DATE_FORMAT(created_at, '%Y') = ?
  GROUP BY DATE_FORMAT(created_at, '%b'), MONTH(created_at)
  ORDER BY MONTH(created_at)
`;



  const result = await db(query, [...values, year]);

  const monthWiseCount = [];

  monthNames.forEach((m) => {
    const month = result.find((r) => r.month === m);
    if (month) {
      monthWiseCount.push(month);
    } else {
      monthWiseCount.push({
        month: m,
        pending_count: 0,
        complete_count: 0,
      });
    }
  });
  const totalCount = result.reduce(
    (acc, m) => {
      acc.total_pending_count += m.pending_count;
      acc.total_complete_count += m.complete_count;
      return acc;
    },
    {
      total_pending_count: 0,
      total_complete_count: 0,
    }
  );

  res.status(200).json({ totalCount, monthWiseCount });
});

exports.getAdminApproveCout = catchAsync(async (req, res, next) => {
  const { year = currentYear } = req.params;

  const { query: filterQuery, values } = await hirarchyFilter(req.user);
  //NOT IN (2, 15)
  const query = ` SELECT 
                    MONTH(created_at) AS month_number,
                    COUNT(CASE WHEN approval_status = 1 THEN 1 END) AS pending_count,
                    COUNT(CASE WHEN approval_status > 1 AND approval_status <> 5 THEN 1 END) AS complete_count,
                    COUNT(CASE WHEN approval_status = 5 THEN 1 END) AS rejected_count
                    FROM tbl_doctor_services
                    WHERE 
                    status = 1 AND 
                    submit_status = 1 AND 
                    ${filterQuery} AND 
                    YEAR(created_at) = ?
                    GROUP BY MONTH(created_at) WITH ROLLUP
                `;

  const result = await db(query, [...values, year]);

  let yearTotalCount = {
    pending_count: 0,
    complete_count: 0,
    rejected_count: 0,
    total_request: 0,
  };

  const monthDataMap = {};
  const YmonthNames = ["", ...monthNames];

  result.forEach((row) => {
    if (row.month_number === null) {
      yearTotalCount = {
        pending_count: row.pending_count,
        complete_count: row.complete_count,
        rejected_count: row.rejected_count,
        total_request:
          row.pending_count + row.complete_count + row.rejected_count,
      };
    } else {
      monthDataMap[row.month_number] = {
        month_number: row.month_number,
        month_name: YmonthNames[row.month_number],
        pending_count: row.pending_count,
        complete_count: row.complete_count,
        rejected_count: row.rejected_count,
        total_request:
          row.pending_count + row.complete_count + row.rejected_count,
      };
    }
  });

  const monthWiseCount = [];
  for (let i = 1; i <= 12; i++) {
    if (monthDataMap[i]) {
      monthWiseCount.push(monthDataMap[i]);
    } else {
      monthWiseCount.push({
        month_number: i,
        month_name: YmonthNames[i],
        pending_count: 0,
        complete_count: 0,
        rejected_count: 0,
        total_request: 0,
      });
    }
  }

  res.status(200).json({
    yearTotalCount,
    monthWiseCount,
  });
});

exports.serviceUsageCount = catchAsync(async (req, res, next) => {
  const { year = currentYear } = req.params;

  const { query: filterQuery, values } = await hirarchyFilter(req.user);

  const query = `
    SELECT 
      DS.service_name AS name,
       DOCS.service_id,
      COUNT(DOCS.service_id) AS value
    FROM tbl_doctor_services DOCS
    LEFT JOIN tbl_digital_services DS ON DOCS.service_id = DS.id
    WHERE  DOCS.status = 1 
      AND ${filterQuery} 
      AND YEAR(DOCS.created_at) = ?
    GROUP BY DOCS.service_id, DS.service_name
    ORDER BY  value ASC
  `;

  const result = await db(query, [...values, year]);
  res.status(200).json(result);
});
