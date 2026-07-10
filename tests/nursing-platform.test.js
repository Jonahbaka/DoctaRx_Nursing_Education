const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { beforeEach, test } = require('node:test');
const request = require('supertest');
const { createApiApp } = require('../server/app');
const { resetForTests } = require('../server/services/nursingPlatformStore');
const {
  NURSING_ROLES,
  canNursingRole,
  getNursingSeedData,
  getRoleDashboard,
} = require('../lib/nursingEducationData');

const PASSWORD = 'DemoPass!2026';
const accounts = {
  student: 'nursing.student.preview@uniabuja.edu.ng',
  lecturer: 'ifeoma.lecturer@uniabuja.demo',
  hod: 'hod.nursing@uniabuja.demo',
  coordinator: 'clinical.coordinator@uniabuja.demo',
  supervisor: 'preceptor.one@uniabuja.demo',
  admin: 'nursing.admin@uniabuja.demo',
  superAdmin: 'nursing.superadmin@doctarx.demo',
  support: 'nursing.support@doctarx.demo',
};

let app;

beforeEach(() => {
  resetForTests();
  app = createApiApp();
});

async function signIn(email) {
  const agent = request.agent(app);
  const response = await agent.post('/api/nursing/auth/login').send({ email, password: PASSWORD });
  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.success, true);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/i);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/i);
  return { agent, user: response.body.user, cookie: response.headers['set-cookie'][0] };
}

test('seed covers all roles, course, clinical, evidence, and reporting domains', () => {
  const seed = getNursingSeedData();
  assert.equal(new Set(seed.users.map((user) => user.role)).size, 8);
  assert.ok(seed.courses.length >= 5);
  assert.ok(seed.simulationCases.length >= 10);
  assert.ok(seed.logbookEntries.length >= 3);
  assert.ok(seed.assignments.length >= 2);
  assert.ok(seed.timelinePosts.length >= 3);
  assert.ok(seed.paymentRecords.length >= 3);
  assert.ok(seed.certificates.length >= 2);
  assert.ok(seed.reports.length >= 3);
});

test('role permissions and dashboard metrics remain role-specific', () => {
  assert.equal(canNursingRole(NURSING_ROLES.STUDENT, 'manageCourses'), false);
  assert.equal(canNursingRole(NURSING_ROLES.LECTURER, 'manageCourses'), true);
  assert.equal(canNursingRole(NURSING_ROLES.SUPERVISOR, 'reviewLogbook'), true);
  assert.equal(canNursingRole(NURSING_ROLES.HOD, 'managePayments'), true);
  assert.ok(Object.keys(getRoleDashboard(NURSING_ROLES.STUDENT).metrics).length >= 10);
  assert.ok(Object.keys(getRoleDashboard(NURSING_ROLES.HOD).metrics).length >= 10);
});

test('authentication uses an HttpOnly signed cookie and rejects tampering', async () => {
  const { agent, user, cookie } = await signIn(accounts.student);
  assert.equal(user.role, NURSING_ROLES.STUDENT);

  const session = await agent.get('/api/nursing/session');
  assert.equal(session.status, 200);
  assert.equal(session.body.user.id, user.id);

  const cookiePair = cookie.split(';')[0];
  const tampered = `${cookiePair.slice(0, -1)}${cookiePair.endsWith('a') ? 'b' : 'a'}`;
  const rejected = await request(app).get('/api/nursing/session').set('Cookie', tampered);
  assert.equal(rejected.status, 401);

  const logout = await agent.post('/api/nursing/auth/logout');
  assert.equal(logout.status, 200);
  assert.match(logout.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970|Max-Age=0/i);
});

test('all eight professional test accounts authenticate to their assigned role', async () => {
  const expected = [
    [accounts.student, NURSING_ROLES.STUDENT],
    [accounts.lecturer, NURSING_ROLES.LECTURER],
    [accounts.hod, NURSING_ROLES.HOD],
    [accounts.coordinator, NURSING_ROLES.CLINICAL_COORDINATOR],
    [accounts.supervisor, NURSING_ROLES.SUPERVISOR],
    [accounts.admin, NURSING_ROLES.INSTITUTION_ADMIN],
    [accounts.superAdmin, NURSING_ROLES.SUPER_ADMIN],
    [accounts.support, NURSING_ROLES.SUPPORT_ADMIN],
  ];
  for (const [email, role] of expected) {
    const { user } = await signIn(email);
    assert.equal(user.role, role);
    assert.equal(user.status, 'active');
    assert.ok(user.institutionId);
  }
});

test('public access requests validate contact details and persist', async () => {
  const invalid = await request(app).post('/api/nursing/access-requests').send({ fullName: 'Ada' });
  assert.equal(invalid.status, 400);

  const created = await request(app).post('/api/nursing/access-requests').send({
    fullName: 'Ada Bello',
    institution: 'University of Abuja',
    department: 'Nursing Science',
    roleRequested: NURSING_ROLES.LECTURER,
    email: 'ada.bello@example.edu.ng',
    phone: '+2348012345678',
    message: 'Institution onboarding request',
  });
  assert.equal(created.status, 201, created.text);

  const { agent } = await signIn(accounts.admin);
  const list = await agent.get('/api/nursing/access-requests');
  assert.equal(list.status, 200);
  assert.equal(list.body.accessRequests[0].email, 'ada.bello@example.edu.ng');
});

test('student cannot use lecturer APIs while lecturer changes persist on readback', async () => {
  const student = await signIn(accounts.student);
  const forbidden = await student.agent.post('/api/nursing/courses').send({ title: 'Unauthorized course' });
  assert.equal(forbidden.status, 403);

  const lecturer = await signIn(accounts.lecturer);
  const course = await lecturer.agent.post('/api/nursing/courses').send({
    title: 'Advanced Community Nursing',
    code: 'NUR 510',
    description: 'Community health assessment and digital referral practice.',
  });
  assert.equal(course.status, 201, course.text);

  const lesson = await lecturer.agent.post(`/api/nursing/courses/${course.body.course.id}/lessons`).send({
    title: 'Community assessment workflow',
    contentBody: 'Structured community assessment content.',
    status: 'published',
  });
  assert.equal(lesson.status, 201, lesson.text);

  const courses = await lecturer.agent.get('/api/nursing/courses');
  const lessons = await lecturer.agent.get('/api/nursing/lessons');
  assert.ok(courses.body.courses.some((item) => item.id === course.body.course.id));
  assert.ok(lessons.body.lessons.some((item) => item.id === lesson.body.lesson.id));
});

test('institution administrators can create cohorts and students cannot', async () => {
  const student = await signIn(accounts.student);
  const admin = await signIn(accounts.admin);
  const denied = await student.agent.post('/api/nursing/cohorts').send({ name: 'Post-Basic Nursing' });
  assert.equal(denied.status, 403);
  const created = await admin.agent.post('/api/nursing/cohorts').send({ name: 'Post-Basic Nursing', level: 'Post-Basic' });
  assert.equal(created.status, 201, created.text);
  const list = await admin.agent.get('/api/nursing/cohorts');
  assert.ok(list.body.cohorts.some((cohort) => cohort.id === created.body.cohort.id));
});

test('timeline posts, comments, reactions, assignments, submissions, and grades persist', async () => {
  const seed = getNursingSeedData();
  const lecturer = await signIn(accounts.lecturer);
  const student = await signIn(accounts.student);

  const post = await student.agent.post('/api/nursing/timeline/posts').send({
    title: 'Clinical reflection',
    body: 'A structured reflection on patient education and escalation.',
    scope: 'department',
  });
  assert.equal(post.status, 201, post.text);
  assert.equal((await student.agent.post(`/api/nursing/timeline/posts/${post.body.post.id}/comments`).send({ body: 'Peer feedback' })).status, 201);
  assert.equal((await student.agent.post(`/api/nursing/timeline/posts/${post.body.post.id}/reactions`).send({ reactionType: 'helpful' })).status, 201);
  const timeline = await student.agent.get('/api/nursing/timeline');
  assert.ok(timeline.body.timeline.some((item) => item.id === post.body.post.id));

  const message = await student.agent.post('/api/nursing/messages').send({
    threadId: 'course-discussions',
    scope: 'department',
    body: 'Please confirm the documentation rubric before submission.',
  });
  assert.equal(message.status, 201, message.text);
  const messageHistory = await lecturer.agent.get('/api/nursing/messages');
  assert.ok(messageHistory.body.messages.some((item) => item.id === message.body.message.id));

  const assignment = await lecturer.agent.post('/api/nursing/assignments').send({
    courseId: seed.courses[0].id,
    title: 'Remote triage documentation',
    instructions: 'Submit a structured triage note.',
    maxScore: 100,
  });
  assert.equal(assignment.status, 201, assignment.text);
  const submission = await student.agent.post(`/api/nursing/assignments/${assignment.body.assignment.id}/submissions`).send({
    courseId: seed.courses[0].id,
    submissionText: 'Identity, consent, red flags, escalation, education, and follow-up documented.',
  });
  assert.equal(submission.status, 201, submission.text);
  const grade = await lecturer.agent.patch(`/api/nursing/submissions/${submission.body.submission.id}/grade`).send({
    score: 91,
    maxScore: 100,
    comments: 'Clear escalation and follow-up.',
  });
  assert.equal(grade.status, 200, grade.text);
  assert.equal(grade.body.grade.score, 91);
});

test('quiz, simulation, telehealth note, logbook review, payment, and certificate workflows persist', async () => {
  const seed = getNursingSeedData();
  const student = await signIn(accounts.student);
  const supervisor = await signIn(accounts.supervisor);
  const hod = await signIn(accounts.hod);

  const quiz = seed.quizzes[0];
  const quizAttempt = await student.agent.post(`/api/nursing/quizzes/${quiz.id}/attempts`).send({
    answers: quiz.questions.map((question) => question.correctIndex),
  });
  assert.equal(quizAttempt.status, 201, quizAttempt.text);
  assert.equal(quizAttempt.body.attempt.score, 100);

  const simulation = seed.simulationCases[0];
  const simulationAttempt = await student.agent.post(`/api/nursing/simulations/${simulation.id}/attempts`).send({
    selectedSteps: simulation.assessmentSteps,
    carePlan: 'Assess red flags, repeat vital signs, escalate promptly, document actions, and provide patient education with follow-up.',
  });
  assert.equal(simulationAttempt.status, 201, simulationAttempt.text);
  assert.ok(simulationAttempt.body.attempt.score >= 80);

  const telehealth = await student.agent.post('/api/nursing/telehealth-lab/notes').send({
    role: 'nurse',
    checklist: ['Identity and consent confirmed', 'Red flags screened'],
    noteText: 'Focused history, assessment, escalation advice, safety net, and follow-up documented.',
  });
  assert.equal(telehealth.status, 201, telehealth.text);

  const logbook = await student.agent.post('/api/nursing/logbook').send({
    clinicalSite: 'University of Abuja Teaching Hospital',
    wardUnit: 'Medical Ward',
    hoursCompleted: 8,
    skillsPerformed: ['Vital signs assessment'],
    reflection: 'Completed supervised assessment, patient education, documentation, and escalation review.',
  });
  assert.equal(logbook.status, 201, logbook.text);
  const reviewed = await supervisor.agent.patch(`/api/nursing/logbook/${logbook.body.entry.id}/review`).send({
    status: 'approved',
    comments: 'Evidence and reflection verified.',
  });
  assert.equal(reviewed.status, 200, reviewed.text);

  const pendingPayment = seed.paymentRecords.find((record) => record.paymentStatus === 'pending') || seed.paymentRecords[0];
  const payment = await hod.agent.patch(`/api/nursing/payments/${pendingPayment.id}/verify`).send({ reference: 'MANUAL-VERIFIED-001' });
  assert.equal(payment.status, 200, payment.text);
  assert.equal(payment.body.payment.accessStatus, 'active');

  const certificate = await hod.agent.post('/api/nursing/certificates').send({
    studentId: student.user.id,
    certificateType: 'Certificate of Completion',
    programName: 'Foundations of Telehealth Nursing',
  });
  assert.equal(certificate.status, 201, certificate.text);
  assert.match(certificate.body.certificate.verificationCode, /^DRX-NUR-/);
});

test('waiting-room queue, chat, escalation, WhatsApp privacy, and office hours work end to end', async () => {
  const student = await signIn(accounts.student);
  const hod = await signIn(accounts.hod);

  const overview = await student.agent.get('/api/nursing/waiting-rooms');
  const room = overview.body.waitingRooms[0];
  assert.equal(room.status, 'open');

  const joined = await student.agent.post(`/api/nursing/waiting-rooms/${room.id}/join`).send({
    reason: 'clinical_logbook_issue',
    description: 'I need clarification on a returned reflection and skills sign-off.',
  });
  assert.equal(joined.status, 201, joined.text);

  const adminQueue = await hod.agent.get('/api/nursing/waiting-rooms');
  assert.ok(adminQueue.body.queue.some((entry) => entry.id === joined.body.entry.id));
  assert.equal((await hod.agent.patch(`/api/nursing/waiting-rooms/queue/${joined.body.entry.id}`).send({ status: 'in_progress' })).status, 200);

  const studentMessage = await student.agent.post(`/api/nursing/waiting-rooms/${room.id}/messages`).send({ message: 'The entry was returned for more detail.' });
  assert.equal(studentMessage.status, 201, studentMessage.text);
  const adminMessage = await hod.agent.post(`/api/nursing/waiting-rooms/${room.id}/messages`).send({ message: 'Please add the supervised intervention and learning outcome.' });
  assert.equal(adminMessage.status, 201, adminMessage.text);
  const history = await student.agent.get(`/api/nursing/waiting-rooms/${room.id}/messages`);
  assert.equal(history.body.messages.length, 2);

  const invalidWhatsApp = await hod.agent.put('/api/nursing/support-profile').send({ whatsappAvailable: true, whatsappNumber: '123' });
  assert.equal(invalidWhatsApp.status, 400);
  const supportProfile = await hod.agent.put('/api/nursing/support-profile').send({
    whatsappNumber: '+2348012345678',
    whatsappDisplayName: 'Nursing Department Support',
    whatsappAvailable: true,
    whatsappSupportRole: 'HOD Academic Support',
    whatsappSupportHours: 'Mon-Fri, 14:00-16:00 WAT',
  });
  assert.equal(supportProfile.status, 200, supportProfile.text);
  const studentContacts = await student.agent.get('/api/nursing/waiting-rooms');
  assert.equal(studentContacts.body.supportProfiles.length, 1);
  assert.equal(studentContacts.body.supportProfiles[0].whatsappNumber, '+2348012345678');

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const officeHour = await hod.agent.post('/api/nursing/office-hours').send({
    title: 'Clinical Logbook Support Clinic',
    description: 'Review reflections, skill evidence, and supervisor sign-off requirements.',
    type: 'clinical_logbook_support',
    startsAt,
    durationMinutes: 45,
    capacity: 20,
  });
  assert.equal(officeHour.status, 201, officeHour.text);
  assert.equal((await student.agent.post(`/api/nursing/office-hours/${officeHour.body.session.id}/join`)).status, 201);
  assert.equal((await student.agent.post(`/api/nursing/office-hours/${officeHour.body.session.id}/questions`).send({ question: 'Which evidence is required for medication administration sign-off?' })).status, 201);
  const closed = await hod.agent.patch(`/api/nursing/office-hours/${officeHour.body.session.id}`).send({ status: 'closed', sessionNotes: 'Questions reviewed and follow-up assigned.' });
  assert.equal(closed.status, 200, closed.text);
  assert.equal(closed.body.session.status, 'closed');

  const escalated = await hod.agent.patch(`/api/nursing/waiting-rooms/queue/${joined.body.entry.id}`).send({ status: 'escalated', resolutionNote: 'Coordinator review required.' });
  assert.equal(escalated.status, 200, escalated.text);
  assert.equal(escalated.body.entry.status, 'escalated');
});

test('public UI has no open role dashboard selector and production guards are present', () => {
  const clientSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'nursing', 'NursingPlatformClient.jsx'), 'utf8');
  const middlewareSource = fs.readFileSync(path.join(__dirname, '..', 'middleware.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server', 'routes', 'nursing.js'), 'utf8');
  const visibleBannedTerms = ['Development Login', 'seeded workspace', 'Demo Login', 'Demo Accounts', 'Role Workspaces'];
  for (const term of visibleBannedTerms) assert.equal(clientSource.includes(term), false, term);
  assert.equal(clientSource.includes('Authorized Access'), true);
  assert.equal(clientSource.includes('Request Institutional Access'), true);
  assert.equal(clientSource.includes('validateNursingDemoLogin'), false);
  assert.equal(middlewareSource.includes('crypto.subtle.verify'), true);
  assert.equal(serverSource.includes('httpOnly: true'), true);
  assert.equal(serverSource.includes("process.env.NODE_ENV === 'production'"), true);
  assert.equal(serverSource.includes('NURSING_SESSION_SECRET is required in production'), true);
});

test('all requested nursing pages and generated visual assets exist', () => {
  const root = path.join(__dirname, '..');
  const routes = [
    'app/ng/nursing/page.js',
    'app/ng/nursing/login/page.js',
    'app/ng/nursing/student/page.js',
    'app/ng/nursing/lecturer/page.js',
    'app/ng/nursing/hod/page.js',
    'app/ng/nursing/coordinator/page.js',
    'app/ng/nursing/supervisor/page.js',
    'app/ng/nursing/admin/page.js',
    'app/ng/nursing/request-access/page.js',
    'app/ng/nursing/unauthorized/page.js',
    'app/ng/nursing/waiting-room/page.js',
    'app/ng/nursing/office-hours/page.js',
    'app/ng/nursing/admin/waiting-room/page.js',
    'app/ng/nursing/admin/office-hours/page.js',
  ];
  for (const route of routes) assert.equal(fs.existsSync(path.join(root, route)), true, route);
  for (const image of [
    'nursing-command-center-hero.png',
    'nursing-lms-telehealth-course.png',
    'nursing-logbook-profile-cover.png',
    'nursing-simulation-lab.png',
    'nursing-telehealth-skills-lab.png',
  ]) {
    const file = path.join(root, 'public', 'images', 'nursing', image);
    assert.ok(fs.statSync(file).size > 100000, image);
  }
});
