const { db } = require('../../dbConfig'); // 🔁 Update path to your DB utility (MySQL connection wrapper)

/**
 * Checks if a specialty exists in the DB. If it exists, returns its ID.
 * If not, inserts the specialty and returns the new ID.
 *
 * @param {string|number} specialty - The selected specialty ID (use '1' for "Other")
 * @param {string} otherSpecialty - The name of the custom specialty
 * @param {string} emp_code - Employee code (who created the record)
 * @returns {Promise<number|string>} - The resolved specialty ID
 */
const updateotherSpeciality = async (specialty, otherSpecialty, emp_code) => {
  let specialtyId = specialty;

  if (`${specialty}` === '1' && otherSpecialty?.trim()) {
    const trimmedName = otherSpecialty.trim();

    // Check if the specialty already exists (case-insensitive)
    const [existing] = await db(
      'SELECT spec_id FROM tbl_doctor_specialities WHERE LOWER(spec_name) = LOWER(?) LIMIT 1',
      [trimmedName]
    );

    if (existing) {
      specialtyId = existing.spec_id;
    } else {
      const result = await db(
        'INSERT INTO tbl_doctor_specialities (spec_name, create_by) VALUES (?, ?)',
        [trimmedName, emp_code]
      );
      specialtyId = result.insertId;
    }
  }

  return specialtyId;
};

module.exports = {
  updateotherSpeciality,
};
