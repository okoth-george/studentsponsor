// src/services/userService.js
const userRepository = require('../repositories/userRepository');
const studentRepository = require('../repositories/studentRepository');
const sponsorRepository = require('../repositories/sponsorRepository'); // Imported correctly here!
const { sanitizeUser, fail } = require('./utils/auth.utils');

const getProfile = async (user_id) => {
  // 1. Fetch base credentials from the unified users table
  const user = await userRepository.findById(user_id);
  if (!user) throw fail('User not found.', 404);

  // 2. Strip sensitive fields (passwords, tokens) using your utility
  const cleanUser = sanitizeUser(user);

  // 3. Delegate to the correct domain repository based on role
  if (user.role === 'student') {
    cleanUser.profile = await studentRepository.findStudentByUserId(user_id);
  } else if (user.role === 'sponsor') {
    cleanUser.profile = await sponsorRepository.findSponsorSummary(user_id);
  } else if (user.role === 'admin') {
    cleanUser.profile = { permissions: ['all'] }; 
  }

  return cleanUser;
};

module.exports = {
  getProfile,
};