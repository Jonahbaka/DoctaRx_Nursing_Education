const crypto = require('node:crypto');
const { pool } = require('../db');
const { mutateState, readState, tenantKeyForUser } = require('./nursingPlatformStore');

function noteFromRow(row) {
  return {
    id: row.id,
    userId: row.user_key,
    dailyMedSetId: row.daily_med_set_id,
    medicationName: row.medication_name,
    title: row.title,
    content: row.content,
    nursingConsiderations: row.nursing_considerations,
    warnings: row.warnings,
    administrationReminders: row.administration_reminders,
    patientEducation: row.patient_education,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attemptFromRow(row) {
  return {
    id: row.id,
    userId: row.user_key,
    dailyMedSetId: row.daily_med_set_id,
    medicationName: row.medication_name,
    difficulty: row.difficulty,
    score: Number(row.score),
    totalQuestions: row.total_questions,
    answers: row.answers,
    questionSources: row.question_sources,
    completionStatus: row.completion_status,
    completedAt: row.completed_at,
  };
}

function progressFromRow(row) {
  return {
    id: row.id,
    userId: row.user_key,
    dailyMedSetId: row.daily_med_set_id,
    medicationName: row.medication_name,
    cardKey: row.card_key,
    status: row.status,
    lastReviewedAt: row.last_reviewed_at,
    reviewCount: row.review_count,
  };
}

function noteMatches(note, filters) {
  if (filters.query) {
    const haystack = `${note.medicationName} ${note.title}`.toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  const createdDate = String(note.createdAt || '').slice(0, 10);
  if (filters.dateFrom && createdDate < filters.dateFrom) return false;
  if (filters.dateTo && createdDate > filters.dateTo) return false;
  return true;
}

async function listMedicationNotes(user, filters = {}) {
  const tenantKey = tenantKeyForUser(user);
  if (pool) {
    const values = [tenantKey, String(user.id)];
    const clauses = ['tenant_key = $1', 'user_key = $2'];
    if (filters.query) {
      values.push(`%${filters.query}%`);
      clauses.push(`(medication_name ILIKE $${values.length} OR title ILIKE $${values.length})`);
    }
    if (filters.dateFrom) {
      values.push(filters.dateFrom);
      clauses.push(`created_at >= $${values.length}::date`);
    }
    if (filters.dateTo) {
      values.push(filters.dateTo);
      clauses.push(`created_at < ($${values.length}::date + INTERVAL '1 day')`);
    }
    const result = await pool.query(
      `SELECT * FROM nursing_medication_notes
       WHERE ${clauses.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT 250`,
      values
    );
    return result.rows.map(noteFromRow);
  }
  const state = await readState(tenantKey);
  return (state.medicationNotes || [])
    .filter((note) => note.userId === user.id && noteMatches(note, filters))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 250);
}

async function createMedicationNote(user, input) {
  const tenantKey = tenantKeyForUser(user);
  const note = {
    id: crypto.randomUUID(),
    userId: user.id,
    dailyMedSetId: input.dailyMedSetId,
    medicationName: input.medicationName,
    title: input.title,
    content: input.content,
    nursingConsiderations: input.nursingConsiderations,
    warnings: input.warnings,
    administrationReminders: input.administrationReminders,
    patientEducation: input.patientEducation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (pool) {
    const result = await pool.query(
      `INSERT INTO nursing_medication_notes (
         id, tenant_key, user_key, daily_med_set_id, medication_name, title, content,
         nursing_considerations, warnings, administration_reminders, patient_education
       ) VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        note.id, tenantKey, String(user.id), note.dailyMedSetId, note.medicationName, note.title,
        note.content, note.nursingConsiderations, note.warnings, note.administrationReminders,
        note.patientEducation,
      ]
    );
    return noteFromRow(result.rows[0]);
  }
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state.medicationNotes)) state.medicationNotes = [];
    state.medicationNotes.unshift(note);
    return note;
  });
}

async function updateMedicationNote(user, noteId, input) {
  const tenantKey = tenantKeyForUser(user);
  if (pool) {
    const result = await pool.query(
      `UPDATE nursing_medication_notes SET
         title = $4,
         content = $5,
         nursing_considerations = $6,
         warnings = $7,
         administration_reminders = $8,
         patient_education = $9,
         updated_at = NOW()
       WHERE id = $1::uuid AND tenant_key = $2 AND user_key = $3
       RETURNING *`,
      [
        noteId, tenantKey, String(user.id), input.title, input.content, input.nursingConsiderations,
        input.warnings, input.administrationReminders, input.patientEducation,
      ]
    );
    return result.rows[0] ? noteFromRow(result.rows[0]) : null;
  }
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state.medicationNotes)) state.medicationNotes = [];
    const index = state.medicationNotes.findIndex((note) => note.id === noteId && note.userId === user.id);
    if (index < 0) return null;
    const note = { ...state.medicationNotes[index], ...input, updatedAt: new Date().toISOString() };
    state.medicationNotes[index] = note;
    return note;
  });
}

async function deleteMedicationNote(user, noteId) {
  const tenantKey = tenantKeyForUser(user);
  if (pool) {
    const result = await pool.query(
      'DELETE FROM nursing_medication_notes WHERE id = $1::uuid AND tenant_key = $2 AND user_key = $3 RETURNING id',
      [noteId, tenantKey, String(user.id)]
    );
    return Boolean(result.rows[0]);
  }
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state.medicationNotes)) state.medicationNotes = [];
    const index = state.medicationNotes.findIndex((note) => note.id === noteId && note.userId === user.id);
    if (index < 0) return false;
    state.medicationNotes.splice(index, 1);
    return true;
  });
}

async function saveMedicationQuizAttempt(user, input) {
  const tenantKey = tenantKeyForUser(user);
  const attempt = {
    id: crypto.randomUUID(),
    userId: user.id,
    dailyMedSetId: input.dailyMedSetId,
    medicationName: input.medicationName,
    difficulty: input.difficulty,
    score: input.score,
    totalQuestions: input.totalQuestions,
    answers: input.answers,
    questionSources: input.questionSources,
    completionStatus: 'completed',
    completedAt: new Date().toISOString(),
  };
  if (pool) {
    const result = await pool.query(
      `INSERT INTO nursing_medication_quiz_attempts (
         id, tenant_key, user_key, daily_med_set_id, medication_name, difficulty,
         score, total_questions, answers, question_sources, completion_status, completed_at
       ) VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)
       RETURNING *`,
      [
        attempt.id, tenantKey, String(user.id), attempt.dailyMedSetId, attempt.medicationName,
        attempt.difficulty, attempt.score, attempt.totalQuestions, JSON.stringify(attempt.answers),
        JSON.stringify(attempt.questionSources), attempt.completionStatus, attempt.completedAt,
      ]
    );
    return attemptFromRow(result.rows[0]);
  }
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state.medicationQuizAttempts)) state.medicationQuizAttempts = [];
    state.medicationQuizAttempts.unshift(attempt);
    return attempt;
  });
}

async function listMedicationQuizAttempts(user, dailyMedSetId = null) {
  const tenantKey = tenantKeyForUser(user);
  if (pool) {
    const values = [tenantKey, String(user.id)];
    const setFilter = dailyMedSetId ? 'AND daily_med_set_id = $3::uuid' : '';
    if (dailyMedSetId) values.push(dailyMedSetId);
    const result = await pool.query(
      `SELECT * FROM nursing_medication_quiz_attempts
       WHERE tenant_key = $1 AND user_key = $2 ${setFilter}
       ORDER BY completed_at DESC LIMIT 250`,
      values
    );
    return result.rows.map(attemptFromRow);
  }
  const state = await readState(tenantKey);
  return (state.medicationQuizAttempts || [])
    .filter((attempt) => attempt.userId === user.id && (!dailyMedSetId || attempt.dailyMedSetId === dailyMedSetId))
    .sort((left, right) => String(right.completedAt).localeCompare(String(left.completedAt)))
    .slice(0, 250);
}

async function listMedicationFlashcardProgress(user, dailyMedSetId = null) {
  const tenantKey = tenantKeyForUser(user);
  if (pool) {
    const values = [tenantKey, String(user.id)];
    const setFilter = dailyMedSetId ? 'AND daily_med_set_id = $3::uuid' : '';
    if (dailyMedSetId) values.push(dailyMedSetId);
    const result = await pool.query(
      `SELECT * FROM nursing_medication_flashcard_progress
       WHERE tenant_key = $1 AND user_key = $2 ${setFilter}
       ORDER BY last_reviewed_at DESC LIMIT 1000`,
      values
    );
    return result.rows.map(progressFromRow);
  }
  const state = await readState(tenantKey);
  return (state.medicationFlashcardProgress || [])
    .filter((progress) => progress.userId === user.id && (!dailyMedSetId || progress.dailyMedSetId === dailyMedSetId))
    .sort((left, right) => String(right.lastReviewedAt).localeCompare(String(left.lastReviewedAt)))
    .slice(0, 1000);
}

async function saveMedicationFlashcardProgress(user, input) {
  const tenantKey = tenantKeyForUser(user);
  const reviewedAt = new Date().toISOString();
  if (pool) {
    const result = await pool.query(
      `INSERT INTO nursing_medication_flashcard_progress (
         id, tenant_key, user_key, daily_med_set_id, medication_name, card_key,
         status, last_reviewed_at, review_count
       ) VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, 1)
       ON CONFLICT (tenant_key, user_key, daily_med_set_id, card_key)
       DO UPDATE SET
         medication_name = EXCLUDED.medication_name,
         status = EXCLUDED.status,
         last_reviewed_at = EXCLUDED.last_reviewed_at,
         review_count = nursing_medication_flashcard_progress.review_count + 1,
         updated_at = NOW()
       RETURNING *`,
      [crypto.randomUUID(), tenantKey, String(user.id), input.dailyMedSetId, input.medicationName, input.cardKey, input.status, reviewedAt]
    );
    return progressFromRow(result.rows[0]);
  }
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state.medicationFlashcardProgress)) state.medicationFlashcardProgress = [];
    const index = state.medicationFlashcardProgress.findIndex((progress) => (
      progress.userId === user.id
      && progress.dailyMedSetId === input.dailyMedSetId
      && progress.cardKey === input.cardKey
    ));
    const progress = index >= 0
      ? {
          ...state.medicationFlashcardProgress[index],
          medicationName: input.medicationName,
          status: input.status,
          lastReviewedAt: reviewedAt,
          reviewCount: Number(state.medicationFlashcardProgress[index].reviewCount || 0) + 1,
        }
      : {
          id: crypto.randomUUID(),
          userId: user.id,
          dailyMedSetId: input.dailyMedSetId,
          medicationName: input.medicationName,
          cardKey: input.cardKey,
          status: input.status,
          lastReviewedAt: reviewedAt,
          reviewCount: 1,
        };
    if (index >= 0) state.medicationFlashcardProgress[index] = progress;
    else state.medicationFlashcardProgress.unshift(progress);
    return progress;
  });
}

module.exports = {
  createMedicationNote,
  deleteMedicationNote,
  listMedicationFlashcardProgress,
  listMedicationNotes,
  listMedicationQuizAttempts,
  saveMedicationFlashcardProgress,
  saveMedicationQuizAttempt,
  updateMedicationNote,
};
