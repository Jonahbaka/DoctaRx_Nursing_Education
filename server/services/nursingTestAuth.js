const {
  NURSING_ROLE_LABELS,
  NURSING_ROLE_ROUTES,
  findNursingUserByEmail,
} = require('../../lib/nursingEducationData');

function authenticateNursingTestAccount(email, password) {
  if (process.env.NODE_ENV === 'production') return null;
  const expectedPassword = process.env.NURSING_TEST_ACCOUNT_PASSWORD || 'DemoPass!2026';
  const user = findNursingUserByEmail(email);
  if (!user || password !== expectedPassword) return null;
  return {
    ...user,
    roleLabel: NURSING_ROLE_LABELS[user.role],
    route: NURSING_ROLE_ROUTES[user.role],
  };
}

module.exports = { authenticateNursingTestAccount };
