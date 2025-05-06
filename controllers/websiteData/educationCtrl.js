const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const { db } = require('../../dbConfig');

const { updateotherSpeciality } = require('./specialityService');

exports.educationData = catchAsync(async (req, res, next) => {
  const { educationalData, doc_id, requestId } = req.body;
  const { emp_code } = req.user;

  if (!requestId || requestId === '') return;
  if (!Array.isArray(educationalData) || educationalData.length === 0) {
    return next(new AppError('Invalid or empty educational credentials', 400));
  }

  const values = await Promise.all(
    educationalData.map(async (d) => {
      const specializedInId =
        `${d.specializedIn}` === '1'
          ? await updateotherSpeciality(
              d.specializedIn,
              d.otherSpecialty,
              emp_code
            )
          : d.specializedIn;

      const itemId = d.id === '' ? null : d.id;

      return [
        itemId,
        requestId,
        doc_id,
        d.degreeId,
        specializedInId,
        d.collegeName,
        d.place,
        d.year,
        emp_code,
      ];
    })
  );

  const query = `
    INSERT INTO tbl_doc_educational_details (
      id, request_id, doc_id, degree_id, specialized_in,
      college_name, place, year, created_by
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      degree_id = IF(VALUES(degree_id) != degree_id, VALUES(degree_id), degree_id),
      specialized_in = IF(VALUES(specialized_in) != specialized_in, VALUES(specialized_in), specialized_in),
      college_name = IF(VALUES(college_name) != college_name, VALUES(college_name), college_name),
      place = IF(VALUES(place) != place, VALUES(place), place),
      year = IF(VALUES(year) != year, VALUES(year), year),
      update_by = VALUES(created_by);
  `;

  const insertResult = await db(query, [values]);

  res.status(200).json({
    status: 'success',
    message:
      insertResult.affectedRows > educationalData.length
        ? 'Records updated'
        : 'Records inserted',
    data: insertResult,
  });
});



exports.getEducationData = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;

  const query = `SELECT id,doc_id, DED.degree_id, specialized_in, college_name, place, year,DS.spec_name,DD.degree_name 
                FROM  tbl_doc_educational_details DED
                LEFT JOIN tbl_doctor_degrees DD ON DED.degree_id = DD.degree_id
                LEFT JOIN tbl_doctor_specialities DS ON DED.specialized_in =  DS.spec_id
                WHERE DED.request_id = ? AND DED.status = 1; `;

  // Execute query with batch insertion
  const education_data = await db(query, [reqId]);

  res.status(200).json({
    status: 'success',
    message: 'Data Retrieved successfully',
    data: { fill_status: req.fill_status || null, education_data },
  });
});

exports.deleteEducationRecord = catchAsync(async (req, res, next) => {
  const { reqId } = req.params;
  const { id } = req.body;

  const query = `UPDATE tbl_doc_educational_details SET status = 0 WHERE  request_id = ? AND id = ? `;
  const result = await db(query, [reqId, id]);

  res.status(200).json({
    status: 'success',
    message: 'Record Deleted Successfuly',
    data: result.affectedRows,
  });
});
