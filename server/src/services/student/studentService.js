const userRepository = require('../../repositories/userRepository');
const studentRepository = require('../../repositories/studentRepository');
const { fail } = require('../utils/authUtils');

// ── GET PROFILE ───────────────────────────────────────────────
const getProfile = async (user_id) => {
  const user = await userRepository.findById(user_id);
  if (!user) throw fail('User not found.', 404);

  if (user.role === 'student') {
    user.studentProfile = await studentRepository.findStudentByUserId(user_id);
  }

  return user;
};

module.exports = {
  getProfile,
};