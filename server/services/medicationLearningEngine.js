const crypto = require('node:crypto');
const { SECTION_DEFINITIONS } = require('./dailyMedParser');

const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function stableHash(value, length = 20) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function createRandom(seed) {
  let counter = 0;
  return () => {
    const digest = crypto.createHash('sha256').update(`${seed}:${counter}`).digest();
    counter += 1;
    return digest.readUInt32BE(0) / 0x100000000;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function excerpt(value, maximum = 260) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const firstUseful = sentences.find((sentence) => sentence.trim().length >= 35) || sentences[0];
  const clean = firstUseful.trim();
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum - 3).trim()}...`;
}

function productSource(label, value) {
  return {
    key: 'productData',
    title: 'SPL product data elements',
    code: '48780-1',
    excerpt: value,
    labelUrl: label.source?.labelUrl || null,
  };
}

function sectionSource(label, section) {
  return {
    key: section.key,
    title: section.sourceTitle || section.title,
    code: section.sourceCode || null,
    excerpt: excerpt(section.plainText),
    labelUrl: label.source?.labelUrl || null,
  };
}

function makeQuestion(type, prompt, correctAnswer, source, explanation, details = {}) {
  const identity = JSON.stringify({ type, prompt, correctAnswer, source: source?.key });
  return {
    id: `medq-${stableHash(identity)}`,
    type,
    prompt,
    correctAnswer,
    source,
    explanation,
    ...details,
  };
}

function multipleChoice(prompt, answer, distractors, source, explanation, random) {
  const options = unique([answer, ...distractors]);
  if (!answer || options.length < 2) return null;
  return makeQuestion('multiple_choice', prompt, answer, source, explanation, {
    options: shuffle(options.slice(0, 4), random),
  });
}

function buildMedicationQuiz(label, difficultyValue = 'beginner', seedValue = crypto.randomUUID()) {
  const difficulty = DIFFICULTIES.has(difficultyValue) ? difficultyValue : 'beginner';
  const seed = String(seedValue || crypto.randomUUID()).slice(0, 120);
  const random = createRandom(`${label.setId}:${difficulty}:${seed}`);
  const productFacts = unique([
    ...(label.activeIngredients || []),
    ...(label.genericNames || []),
    ...(label.dosageForms || []),
    ...(label.routes || []),
    label.labeler,
    label.drugName,
  ]);
  const candidates = [];

  const ingredient = label.activeIngredients?.[0];
  if (ingredient) {
    candidates.push(multipleChoice(
      `Which active ingredient is listed in the DailyMed product data for ${label.drugName}?`,
      ingredient,
      productFacts.filter((value) => value !== ingredient),
      productSource(label, ingredient),
      `${ingredient} is listed as an active ingredient in the official product data.`,
      random
    ));
  }

  const dosageForm = label.dosageForms?.[0];
  if (dosageForm) {
    candidates.push(multipleChoice(
      `Which dosage form is listed for ${label.drugName}?`,
      dosageForm,
      productFacts.filter((value) => value !== dosageForm),
      productSource(label, dosageForm),
      `${dosageForm} is the dosage form recorded in the official product data.`,
      random
    ));
  }

  const route = label.routes?.[0];
  if (route) {
    candidates.push(multipleChoice(
      `Which route of administration is listed for ${label.drugName}?`,
      route,
      productFacts.filter((value) => value !== route),
      productSource(label, route),
      `${route} is the route recorded in the official product data.`,
      random
    ));
    candidates.push(makeQuestion(
      'true_false',
      `True or false: the official DailyMed product data lists ${route} as a route for ${label.drugName}.`,
      'True',
      productSource(label, route),
      `True. The route field in the official product data lists ${route}.`,
      { options: ['True', 'False'] }
    ));
  } else if (dosageForm) {
    candidates.push(makeQuestion(
      'true_false',
      `True or false: the official DailyMed product data lists ${dosageForm} as a dosage form for ${label.drugName}.`,
      'True',
      productSource(label, dosageForm),
      `True. The dosage-form field in the official product data lists ${dosageForm}.`,
      { options: ['True', 'False'] }
    ));
  }

  const supportedSections = (label.sections || [])
    .map((section) => ({ section, excerpt: excerpt(section.plainText) }))
    .filter((item) => item.excerpt.length >= 35);
  const sectionTitles = unique(supportedSections.map((item) => item.section.title));

  for (const item of supportedSections.slice(0, 5)) {
    const question = multipleChoice(
      `Which official DailyMed section contains this statement? "${item.excerpt}"`,
      item.section.title,
      sectionTitles.filter((title) => title !== item.section.title),
      sectionSource(label, item.section),
      `The statement appears in the ${item.section.title} section of the selected label.`,
      random
    );
    if (question) candidates.push(question);
  }

  if (supportedSections.length >= 2) {
    const matchingItems = shuffle(supportedSections, random).slice(0, Math.min(3, supportedSections.length));
    const correctAnswer = Object.fromEntries(matchingItems.map((item) => [item.section.title, item.excerpt]));
    candidates.push(makeQuestion(
      'matching',
      'Match each official label section to the statement taken from that section.',
      correctAnswer,
      {
        key: 'multipleSections',
        title: 'Multiple official DailyMed sections',
        code: null,
        excerpt: matchingItems.map((item) => item.section.sourceTitle || item.section.title).join('; '),
        labelUrl: label.source?.labelUrl || null,
      },
      'Each statement is matched to the section from which it was parsed in the official label.',
      {
        matchingPrompts: matchingItems.map((item) => item.section.title),
        options: shuffle(matchingItems.map((item) => item.excerpt), random),
      }
    ));
  }

  if (sectionTitles.length >= 2) {
    const selectedPresent = shuffle(sectionTitles, random).slice(0, Math.min(3, sectionTitles.length));
    const absentTitles = SECTION_DEFINITIONS
      .map((definition) => definition.title)
      .filter((title) => !sectionTitles.includes(title));
    const options = unique([...selectedPresent, ...shuffle(absentTitles, random).slice(0, 2)]);
    if (options.length > selectedPresent.length) {
      candidates.push(makeQuestion(
        'select_all',
        'Which of these headings are present in this selected DailyMed label? Select all that apply.',
        selectedPresent,
        {
          key: 'sectionIndex',
          title: 'Official label section index',
          code: null,
          excerpt: selectedPresent.join('; '),
          labelUrl: label.source?.labelUrl || null,
        },
        'The correct choices are headings that are present in this specific parsed label.',
        { options: shuffle(options, random) }
      ));
    }
  }

  const validCandidates = candidates.filter(Boolean);
  const preferredTypes = difficulty === 'advanced'
    ? ['matching', 'select_all', 'multiple_choice', 'true_false']
    : difficulty === 'intermediate'
      ? ['multiple_choice', 'select_all', 'true_false', 'matching']
      : ['multiple_choice', 'true_false'];
  const maximum = difficulty === 'advanced' ? 8 : difficulty === 'intermediate' ? 7 : 5;
  const selected = [];
  for (const type of preferredTypes) {
    const candidate = validCandidates.find((question) => question.type === type && !selected.includes(question));
    if (candidate) selected.push(candidate);
  }
  for (const question of shuffle(validCandidates, random)) {
    if (selected.length >= maximum) break;
    if (!selected.includes(question)) selected.push(question);
  }

  if (!selected.length) {
    const error = new Error('This label does not contain enough supported content to generate a quiz');
    error.code = 'MEDICATION_QUIZ_CONTENT_UNAVAILABLE';
    error.statusCode = 422;
    throw error;
  }

  return {
    id: `medquiz-${stableHash(`${label.setId}:${difficulty}:${seed}`)}`,
    attemptKey: seed,
    dailyMedSetId: label.setId,
    medicationName: label.drugName,
    difficulty,
    generatedAt: new Date().toISOString(),
    questions: selected,
  };
}

function publicMedicationQuiz(quiz) {
  return {
    id: quiz.id,
    attemptKey: quiz.attemptKey,
    dailyMedSetId: quiz.dailyMedSetId,
    medicationName: quiz.medicationName,
    difficulty: quiz.difficulty,
    generatedAt: quiz.generatedAt,
    questions: quiz.questions.map(({ correctAnswer: _answer, explanation: _explanation, source: _source, ...question }) => question),
  };
}

function normalizedAnswer(value) {
  if (Array.isArray(value)) return [...value].map(String).sort();
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, answer]) => [key, String(answer)]));
  }
  return value === undefined || value === null ? '' : String(value);
}

function answersMatch(expected, actual) {
  return JSON.stringify(normalizedAnswer(expected)) === JSON.stringify(normalizedAnswer(actual));
}

function gradeMedicationQuiz(quiz, answersValue) {
  const answers = answersValue && typeof answersValue === 'object' && !Array.isArray(answersValue) ? answersValue : {};
  let correctCount = 0;
  const results = quiz.questions.map((question) => {
    const studentAnswer = answers[question.id] ?? null;
    const correct = answersMatch(question.correctAnswer, studentAnswer);
    if (correct) correctCount += 1;
    return {
      questionId: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options || null,
      matchingPrompts: question.matchingPrompts || null,
      studentAnswer,
      correctAnswer: question.correctAnswer,
      correct,
      explanation: question.explanation,
      source: question.source,
    };
  });
  return {
    correctCount,
    totalQuestions: quiz.questions.length,
    score: quiz.questions.length ? Math.round((correctCount / quiz.questions.length) * 100) : 0,
    results,
  };
}

function buildMedicationFlashcards(label) {
  const cards = [];
  function add(topic, prompt, answer, source) {
    const cleanAnswer = excerpt(answer, 420);
    if (!cleanAnswer) return;
    cards.push({
      cardKey: `medcard-${stableHash(`${label.setId}:${topic}:${cleanAnswer}`)}`,
      topic,
      prompt,
      answer: cleanAnswer,
      source,
    });
  }

  if (label.brandName || label.genericNames?.length) {
    const names = unique([label.brandName, ...(label.genericNames || [])]).join('; ');
    add('Names', `What official brand or generic names are listed for ${label.drugName}?`, names, productSource(label, names));
  }
  if (label.activeIngredients?.length) {
    const ingredients = label.activeIngredients.join('; ');
    add('Active ingredient', `Which active ingredient or ingredients are listed for ${label.drugName}?`, ingredients, productSource(label, ingredients));
  }
  if (label.routes?.length) {
    const routes = label.routes.join('; ');
    add('Route', `Which route or routes are listed for ${label.drugName}?`, routes, productSource(label, routes));
  }
  if (label.dosageForms?.length) {
    const forms = label.dosageForms.join('; ');
    add('Dosage form', `Which dosage form or forms are listed for ${label.drugName}?`, forms, productSource(label, forms));
  }

  const sectionTopics = {
    indications: ['Indication', 'What does the official indications and usage section state?'],
    contraindications: ['Contraindications', 'What does the official contraindications section state?'],
    boxedWarning: ['Major warning', 'What does the official boxed warning state?'],
    warnings: ['Warnings', 'What does the official warnings and precautions section state?'],
    adverseReactions: ['Adverse reactions', 'What does the official adverse reactions section state?'],
    patientCounseling: ['Patient counseling', 'What does the official patient counseling section state?'],
    storage: ['Storage', 'What does the official storage and handling section state?'],
  };
  for (const section of label.sections || []) {
    const topic = sectionTopics[section.key];
    if (!topic) continue;
    add(topic[0], topic[1], section.plainText, sectionSource(label, section));
  }

  return cards;
}

module.exports = {
  DIFFICULTIES,
  answersMatch,
  buildMedicationFlashcards,
  buildMedicationQuiz,
  gradeMedicationQuiz,
  publicMedicationQuiz,
};
