const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, beforeEach, test } = require('node:test');
const request = require('supertest');
const { createApiApp } = require('../server/app');
const {
  normalizeSearchResult,
  normalizeSearchResponse,
  parseDailyMedLabel,
} = require('../server/services/dailyMedParser');
const {
  DailyMedServiceError,
  createDailyMedClient,
  dailyMedClient,
} = require('../server/services/dailyMedService');
const {
  buildMedicationFlashcards,
  buildMedicationQuiz,
  gradeMedicationQuiz,
  publicMedicationQuiz,
} = require('../server/services/medicationLearningEngine');
const { resetForTests } = require('../server/services/nursingPlatformStore');
const { getNursingSeedData, NURSING_ROLES } = require('../lib/nursingEducationData');

const SET_ID = '11111111-1111-4111-8111-111111111111';
const PASSWORD = 'DemoPass!2026';
const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<document xmlns="urn:hl7-org:v3">
  <id root="22222222-2222-4222-8222-222222222222"/>
  <setId root="${SET_ID}"/>
  <versionNumber value="7"/>
  <effectiveTime value="20260712"/>
  <code code="34391-3" displayName="HUMAN PRESCRIPTION DRUG LABEL"/>
  <title>CARDIOSTAT tablets</title>
  <author><assignedEntity><representedOrganization><name>DoctaRx Fixture Labeler</name></representedOrganization></assignedEntity></author>
  <component><structuredBody>
    <component><section>
      <code code="48780-1" displayName="SPL PRODUCT DATA ELEMENTS SECTION"/>
      <subject><manufacturedProduct><manufacturedProduct>
        <name>Cardiostat</name>
        <formCode code="C42931" displayName="TABLET, FILM COATED"/>
        <asEntityWithGeneric><genericMedicine><name>cardiostat sodium</name></genericMedicine></asEntityWithGeneric>
        <ingredient classCode="ACTIB"><ingredientSubstance><name>CARDIOSTAT SODIUM</name></ingredientSubstance></ingredient>
      </manufacturedProduct></manufacturedProduct></subject>
      <consumedIn><substanceAdministration><routeCode code="C38288" displayName="ORAL"/></substanceAdministration></consumedIn>
    </section></component>
    <component><section><code code="34067-9"/><title>1 INDICATIONS AND USAGE</title><text><paragraph>Cardiostat is indicated for the fixture learning condition.</paragraph><script>alert('unsafe')</script><table><tbody><tr><td>Study table</td></tr></tbody></table></text></section></component>
    <component><section><code code="34070-3"/><title>4 CONTRAINDICATIONS</title><text><paragraph>Contraindicated in the fixture exclusion group.</paragraph></text></section></component>
    <component><section><code code="43685-7"/><title>5 WARNINGS AND PRECAUTIONS</title><text><paragraph>Review the official fixture warning before administration.</paragraph></text></section></component>
    <component><section><code code="34084-4"/><title>6 ADVERSE REACTIONS</title><text><paragraph>The fixture study reported a documented adverse reaction.</paragraph></text></section></component>
    <component><section><code code="34073-7"/><title>7 DRUG INTERACTIONS</title><text><paragraph>The official fixture label contains a product interaction statement.</paragraph></text></section></component>
    <component><section><code code="34076-0"/><title>17 PATIENT COUNSELING INFORMATION</title><text><paragraph>Provide the documented fixture counseling statement.</paragraph></text></section></component>
    <component><section><code code="34069-5"/><title>16 HOW SUPPLIED/STORAGE AND HANDLING</title><text><paragraph>Store the fixture product according to the stated label conditions.</paragraph></text></section></component>
  </structuredBody></component>
</document>`;

const fixtureLabel = parseDailyMedLabel(FIXTURE_XML, SET_ID);
const originalDailyMedMethods = {
  getMedicationLabel: dailyMedClient.getMedicationLabel,
  searchMedications: dailyMedClient.searchMedications,
  suggestMedicationNames: dailyMedClient.suggestMedicationNames,
};

function mockDailyMed() {
  dailyMedClient.getMedicationLabel = async (setId) => {
    if (setId !== SET_ID) throw new DailyMedServiceError('Not found', { statusCode: 404 });
    return fixtureLabel;
  };
  dailyMedClient.searchMedications = async ({ query, searchBy }) => ({
    query,
    searchBy,
    results: [normalizeSearchResult({
      setid: SET_ID,
      title: 'CARDIOSTAT (CARDIOSTAT SODIUM) TABLET, FILM COATED [DOCTARX FIXTURE LABELER]',
      spl_version: '7',
      published_date: 'Jul 12, 2026',
    })],
    pagination: { page: 1, pageSize: 12, totalPages: 1, totalResults: 1, hasNextPage: false },
  });
  dailyMedClient.suggestMedicationNames = async () => ['CARDIOSTAT', 'CARDIOSTAT SODIUM'];
}

async function signIn(app, email) {
  const agent = request.agent(app);
  const response = await agent.post('/api/nursing/auth/login').send({ email, password: PASSWORD });
  assert.equal(response.status, 200, response.text);
  return agent;
}

beforeEach(() => {
  resetForTests();
  mockDailyMed();
});

after(() => {
  Object.assign(dailyMedClient, originalDailyMedMethods);
});

test('search result normalization preserves official title facts and pagination', () => {
  const normalized = normalizeSearchResponse({
    data: [{ setid: SET_ID, title: 'CARDIOSTAT (CARDIOSTAT SODIUM) TABLET, FILM COATED [FIXTURE LABS]', spl_version: '7' }],
    metadata: { current_page: '2', elements_per_page: '1', total_pages: '4', total_elements: '4', next_page: '3' },
  });
  assert.equal(normalized.results[0].brandName, 'Cardiostat');
  assert.equal(normalized.results[0].genericName, 'Cardiostat Sodium');
  assert.equal(normalized.results[0].dosageForm, 'Tablet, Film Coated');
  assert.equal(normalized.results[0].labeler, 'FIXTURE LABS');
  assert.equal(normalized.pagination.page, 2);
  assert.equal(normalized.pagination.hasNextPage, true);
});

test('SPL parser extracts nursing sections, handles missing sections, and sanitizes narrative HTML', () => {
  assert.equal(fixtureLabel.drugName, 'Cardiostat');
  assert.deepEqual(fixtureLabel.activeIngredients, ['CARDIOSTAT SODIUM']);
  assert.deepEqual(fixtureLabel.routes, ['ORAL']);
  assert.ok(fixtureLabel.sections.some((section) => section.key === 'drugInteractions'));
  assert.equal(fixtureLabel.sections.some((section) => section.key === 'pregnancy'), false);
  const indications = fixtureLabel.sections.find((section) => section.key === 'indications');
  assert.match(indications.html, /<table>/);
  assert.doesNotMatch(indications.html, /<script|alert\(/i);
  assert.equal(fixtureLabel.updatedDate, '2026-07-12');
});

test('SPL parser falls back to the generic medicine name when an active ingredient node is absent', () => {
  const label = parseDailyMedLabel(`
    <document xmlns="urn:hl7-org:v3">
      <setId root="00000000-0000-0000-0000-000000000009"/>
      <versionNumber value="1"/>
      <effectiveTime value="20260714"/>
      <component><structuredBody><component><section>
        <title>Indications and Usage</title>
        <code code="34067-9"/>
        <text><paragraph>Educational fixture indication.</paragraph></text>
        <subject><manufacturedProduct><manufacturedProduct>
          <name>Fixture Brand</name>
          <formCode displayName="TABLET"/>
          <asEntityWithGeneric><genericMedicine><name>FIXTURE GENERIC</name></genericMedicine></asEntityWithGeneric>
        </manufacturedProduct></manufacturedProduct></subject>
      </section></component></structuredBody></component>
    </document>
  `, '00000000-0000-0000-0000-000000000009');

  assert.deepEqual(label.activeIngredients, ['FIXTURE GENERIC']);
});

test('DailyMed client caches repeated search responses and validates empty API data', async () => {
  let calls = 0;
  const client = createDailyMedClient({
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ data: [], metadata: { total_elements: '0', total_pages: '0' } }), { status: 200 });
    },
    retryDelayMs: 0,
  });
  const first = await client.searchMedications({ query: 'cardiostat' });
  const second = await client.searchMedications({ query: 'cardiostat' });
  assert.deepEqual(first.results, []);
  assert.deepEqual(second.results, []);
  assert.equal(calls, 1);
});

test('DailyMed client retries upstream failures and reports request timeouts', async () => {
  let calls = 0;
  const retryingClient = createDailyMedClient({
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response('unavailable', { status: 503 });
      return new Response(JSON.stringify({ data: [], metadata: {} }), { status: 200 });
    },
    retryDelayMs: 0,
    maxRetries: 1,
  });
  await retryingClient.searchMedications({ query: 'cardiostat' });
  assert.equal(calls, 2);

  const timeoutClient = createDailyMedClient({
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
    timeoutMs: 5,
    maxRetries: 0,
  });
  await assert.rejects(
    timeoutClient.searchMedications({ query: 'cardiostat' }),
    (error) => error.code === 'DAILYMED_TIMEOUT' && error.statusCode === 504
  );
});

test('quiz generation supports all question types, hides answers, and validates submitted answers', () => {
  const quiz = buildMedicationQuiz(fixtureLabel, 'advanced', '33333333-3333-4333-8333-333333333333');
  const types = new Set(quiz.questions.map((question) => question.type));
  assert.ok(types.has('multiple_choice'));
  assert.ok(types.has('true_false'));
  assert.ok(types.has('matching'));
  assert.ok(types.has('select_all'));
  const publicQuiz = publicMedicationQuiz(quiz);
  assert.equal(publicQuiz.questions.some((question) => 'correctAnswer' in question || 'source' in question), false);
  const correctAnswers = Object.fromEntries(quiz.questions.map((question) => [question.id, question.correctAnswer]));
  const grade = gradeMedicationQuiz(quiz, correctAnswers);
  assert.equal(grade.score, 100);
  assert.ok(grade.results.every((result) => result.source?.title));
});

test('flashcards are generated only from supported product facts and label sections', () => {
  const cards = buildMedicationFlashcards(fixtureLabel);
  assert.ok(cards.length >= 6);
  assert.ok(cards.every((card) => card.answer && card.source?.title && card.cardKey.startsWith('medcard-')));
  assert.ok(cards.some((card) => card.topic === 'Storage'));
  assert.equal(cards.some((card) => card.topic === 'Pregnancy'), false);
});

test('medication APIs require authentication and return mocked DailyMed content', async () => {
  const app = createApiApp();
  const unauthenticated = await request(app).get('/api/nursing/medications/search?q=cardiostat');
  assert.equal(unauthenticated.status, 401);
  const student = getNursingSeedData().users.find((user) => user.role === NURSING_ROLES.STUDENT);
  const agent = await signIn(app, student.email);
  const search = await agent.get('/api/nursing/medications/search?q=cardiostat&searchBy=generic');
  assert.equal(search.status, 200, search.text);
  assert.equal(search.body.results[0].setId, SET_ID);
  const detail = await agent.get(`/api/nursing/medications/${SET_ID}`);
  assert.equal(detail.status, 200, detail.text);
  assert.equal(detail.body.medication.drugName, 'Cardiostat');
});

test('medication note ownership and student role restrictions are enforced', async () => {
  const app = createApiApp();
  const students = getNursingSeedData().users.filter((user) => user.role === NURSING_ROLES.STUDENT);
  const studentOne = await signIn(app, students[0].email);
  const studentTwo = await signIn(app, students[1].email);
  const lecturer = getNursingSeedData().users.find((user) => user.role === NURSING_ROLES.LECTURER);
  const lecturerAgent = await signIn(app, lecturer.email);
  const noteBody = {
    dailyMedSetId: SET_ID,
    title: 'Fixture administration review',
    content: 'Educational content without patient information.',
    nursingConsiderations: 'Review the official label.',
    warnings: '',
    administrationReminders: '',
    patientEducation: '',
    confirmNoPatientInfo: true,
  };
  const denied = await lecturerAgent.post('/api/nursing/medication-notes').send(noteBody);
  assert.equal(denied.status, 403);
  const missingConfirmation = await studentOne.post('/api/nursing/medication-notes').send({ ...noteBody, confirmNoPatientInfo: false });
  assert.equal(missingConfirmation.status, 400);
  const created = await studentOne.post('/api/nursing/medication-notes').send(noteBody);
  assert.equal(created.status, 201, created.text);
  const otherList = await studentTwo.get('/api/nursing/medication-notes');
  assert.deepEqual(otherList.body.notes, []);
  const otherUpdate = await studentTwo.patch(`/api/nursing/medication-notes/${created.body.note.id}`).send({ ...noteBody, title: 'Unauthorized edit' });
  assert.equal(otherUpdate.status, 404);
  const ownerUpdate = await studentOne.patch(`/api/nursing/medication-notes/${created.body.note.id}`).send({ ...noteBody, title: 'Updated review' });
  assert.equal(ownerUpdate.status, 200, ownerUpdate.text);
  assert.equal(ownerUpdate.body.note.title, 'Updated review');
});

test('quiz attempts retain answer sources and flashcard progress is student-specific', async () => {
  const app = createApiApp();
  const student = getNursingSeedData().users.find((user) => user.role === NURSING_ROLES.STUDENT);
  const agent = await signIn(app, student.email);
  const generated = await agent.post(`/api/nursing/medications/${SET_ID}/quizzes`).send({ difficulty: 'advanced' });
  assert.equal(generated.status, 201, generated.text);
  assert.equal(generated.body.quiz.questions.some((question) => 'correctAnswer' in question), false);
  const internalQuiz = buildMedicationQuiz(fixtureLabel, 'advanced', generated.body.quiz.attemptKey);
  const answers = Object.fromEntries(internalQuiz.questions.map((question) => [question.id, question.correctAnswer]));
  const submitted = await agent.post('/api/nursing/medication-quizzes/attempts').send({
    dailyMedSetId: SET_ID,
    difficulty: 'advanced',
    attemptKey: generated.body.quiz.attemptKey,
    answers,
  });
  assert.equal(submitted.status, 201, submitted.text);
  assert.equal(submitted.body.attempt.score, 100);
  assert.ok(submitted.body.results.every((result) => result.source?.title));

  const cards = await agent.get(`/api/nursing/medications/${SET_ID}/flashcards`);
  assert.equal(cards.status, 200, cards.text);
  const invalidProgress = await agent.put('/api/nursing/medication-flashcards/progress').send({
    dailyMedSetId: SET_ID,
    medicationName: 'Tampered medication name',
    cardKey: 'medcard-00000000000000000000',
    status: 'know_it',
  });
  assert.equal(invalidProgress.status, 400);
  const progress = await agent.put('/api/nursing/medication-flashcards/progress').send({
    dailyMedSetId: SET_ID,
    medicationName: 'Tampered medication name',
    cardKey: cards.body.cards[0].cardKey,
    status: 'know_it',
  });
  assert.equal(progress.status, 200, progress.text);
  assert.equal(progress.body.progress.medicationName, 'Cardiostat');
  assert.equal(progress.body.progress.reviewCount, 1);
});

test('critical medication screens retain desktop and mobile layout contracts and generated imagery', () => {
  const root = path.join(__dirname, '..');
  const routeFiles = [
    'app/ng/education/medications/page.js',
    'app/ng/education/medication-notes/page.js',
    'app/ng/education/medication-quizzes/page.js',
    'app/ng/education/medication-flashcards/page.js',
  ];
  for (const route of routeFiles) assert.equal(fs.existsSync(path.join(root, route)), true, route);

  const shell = fs.readFileSync(path.join(root, 'components/nursing/medications/MedicationEducationShell.jsx'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'components/nursing/medications/MedicationEducationClient.jsx'), 'utf8');
  const search = fs.readFileSync(path.join(root, 'components/nursing/medications/MedicationSearchPanel.jsx'), 'utf8');
  assert.match(shell, /lg:pl-\[19rem\]/);
  assert.match(shell, /lg:hidden/);
  assert.match(shell, /<NursingFooter compact/);
  assert.match(client, /sm:min-h-\[320px\]/);
  assert.match(search, /md:grid-cols-2 xl:grid-cols-3/);

  for (const asset of [
    'public/images/nursing/medication-library-learning.webp',
    'public/images/nursing/medication-notes-study.webp',
    'public/images/nursing/medication-quiz-flashcards.webp',
  ]) {
    const file = path.join(root, asset);
    assert.equal(fs.existsSync(file), true, asset);
    assert.ok(fs.statSync(file).size > 50000, `${asset} should contain a production image`);
  }
});
