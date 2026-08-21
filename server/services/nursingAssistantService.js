'use strict';

const INJECTION_PATTERNS = [
  /ignore\s+(all|any|the)?\s*(previous|prior|system|developer)\s+(instructions?|messages?)/i,
  /reveal\s+(the\s+)?(system|developer)\s+(prompt|message)/i,
  /(show|give|tell|print)\s+me\s+(the\s+)?(answer\s*key|hidden\s+answers?)/i,
  /bypass\s+(the\s+)?(rules?|guardrails?|policy)/i,
  /act\s+as\s+(an?\s+)?unrestricted/i,
];
const ANSWER_PATTERNS = [
  /(quiz|exam|assessment).{0,32}(answer|correct option|solution)/i,
  /(answer|correct option|solution).{0,32}(quiz|exam|assessment)/i,
  /which\s+(option|answer)\s+is\s+correct/i,
];
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'because', 'before', 'being', 'can',
  'course', 'does', 'for', 'from', 'have', 'how', 'into', 'lesson', 'more', 'nursing',
  'should', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'this', 'through',
  'what', 'when', 'where', 'which', 'with', 'would', 'your',
]);

class AssistantError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function cleanText(value, maximum = 12000) {
  return String(value || '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function terms(value) {
  return new Set(cleanText(value).toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !STOP_WORDS.has(word)) || []);
}

function sentenceExcerpt(value, queryTerms) {
  const sentences = cleanText(value).split(/(?<=[.!?])\s+/).filter(Boolean);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: [...terms(sentence)].filter((term) => queryTerms.has(term)).length,
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  return (ranked[0]?.sentence || '').slice(0, 420);
}

function authorizedCourseIds(state, user) {
  if (user.role !== 'student') return new Set((state.courses || []).map((course) => course.id));
  return new Set((state.courseEnrollments || [])
    .filter((enrollment) => enrollment.studentId === user.id && !['withdrawn', 'suspended'].includes(enrollment.status))
    .map((enrollment) => enrollment.courseId));
}

function buildSources(state, user, requestedCourseId) {
  const allowedIds = authorizedCourseIds(state, user);
  if (requestedCourseId && !allowedIds.has(requestedCourseId)) {
    throw new AssistantError(403, 'Assistant access is limited to courses assigned to this account.', 'ASSISTANT_COURSE_ACCESS_DENIED');
  }
  const courseIds = requestedCourseId ? new Set([requestedCourseId]) : allowedIds;
  const courses = (state.courses || []).filter((course) => courseIds.has(course.id));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const sources = [];
  for (const course of courses) {
    const content = [course.description, ...(course.learningObjectives || []), ...(course.modules || []), course.syllabus].filter(Boolean).join('. ');
    if (content) sources.push({
      id: `course:${course.id}`,
      courseId: course.id,
      title: course.title,
      kind: 'course',
      content,
    });
  }
  for (const lesson of state.lessons || []) {
    if (!courseIds.has(lesson.courseId)) continue;
    const content = [lesson.description, lesson.contentBody, lesson.transcript, lesson.captionsText, ...(lesson.objectives || [])].filter(Boolean).join('. ');
    if (!content) continue;
    sources.push({
      id: `lesson:${lesson.id}`,
      courseId: lesson.courseId,
      title: `${courseById.get(lesson.courseId)?.title || 'Course'} — ${lesson.title}`,
      kind: 'lesson',
      content,
    });
  }
  return sources;
}

function answerNursingQuestion(state, user, input = {}) {
  const question = cleanText(input.question, 2000);
  if (question.length < 5) throw new AssistantError(422, 'Ask a complete course-related question.', 'ASSISTANT_QUESTION_REQUIRED');
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(question))) {
    throw new AssistantError(422, 'That request attempts to override the learning assistant safeguards.', 'ASSISTANT_PROMPT_INJECTION_REJECTED');
  }
  if (ANSWER_PATTERNS.some((pattern) => pattern.test(question))) {
    throw new AssistantError(422, 'I cannot reveal hidden quiz or assessment answers. I can explain the relevant lesson concepts instead.', 'ASSISTANT_HIDDEN_ANSWER_REJECTED');
  }

  const queryTerms = terms(question);
  const ranked = buildSources(state, user, cleanText(input.courseId, 200) || null)
    .map((source) => ({
      ...source,
      score: [...terms(`${source.title} ${source.content}`)].filter((term) => queryTerms.has(term)).length,
    }))
    .filter((source) => source.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3);

  if (!ranked.length) {
    return {
      supported: false,
      answer: 'I could not find support for that question in the course material available to your account. Ask about an assigned lesson or contact your lecturer.',
      citations: [],
      safetyNotice: 'This learning assistant does not diagnose, prescribe, or replace a lecturer or clinical supervisor.',
    };
  }

  const citations = ranked.map((source, index) => ({
    index: index + 1,
    sourceId: source.id,
    courseId: source.courseId,
    title: source.title,
    kind: source.kind,
    excerpt: sentenceExcerpt(source.content, queryTerms),
  }));
  const evidence = citations.map((citation) => `${citation.excerpt} [${citation.index}]`).join(' ');
  return {
    supported: true,
    answer: `Based on your authorized course material: ${evidence}`,
    citations,
    safetyNotice: 'Use this as study support. Follow your institution’s protocol and escalate patient-specific or urgent concerns to a qualified clinical supervisor.',
  };
}

module.exports = { AssistantError, answerNursingQuestion, buildSources };
