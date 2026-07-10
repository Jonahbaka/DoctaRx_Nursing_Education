/**
 * Seed DoctaRx Nursing Education & Clinical Training Platform test accounts and training data.
 *
 * Requires server/db/migrations/1100_nursing_education_platform.sql to be applied.
 */

require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getNursingMetrics, getNursingSeedData } = require('../../lib/nursingEducationData');

const seed = getNursingSeedData();
const metrics = getNursingMetrics();
const TEST_ACCOUNT_PASSWORD = process.env.NURSING_TEST_ACCOUNT_PASSWORD || 'DemoPass!2026';

function uuidFromKey(key) {
  const hash = crypto.createHash('sha1').update(`doctarx-nursing:${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function idOf(externalKey) {
  return uuidFromKey(externalKey);
}

function json(value) {
  return JSON.stringify(value || {});
}

async function run() {
  const client = await db.getClient();
  const passwordHash = await bcrypt.hash(TEST_ACCOUNT_PASSWORD, 10);

  try {
    await client.query('BEGIN');

    const institutionId = idOf(seed.institution.id);
    await client.query(
      `INSERT INTO nursing_institutions (
        id, external_key, name, short_name, institution_type, country, state, city, status, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (external_key) DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        institution_type = EXCLUDED.institution_type,
        country = EXCLUDED.country,
        state = EXCLUDED.state,
        city = EXCLUDED.city,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()`,
      [
        institutionId,
        seed.institution.id,
        seed.institution.name,
        seed.institution.shortName,
        seed.institution.type,
        seed.institution.country,
        seed.institution.state,
        seed.institution.city,
        seed.institution.status,
        json({ trainingData: true, source: 'seed-nursing-platform' }),
      ]
    );

    for (const department of seed.departments) {
      await client.query(
        `INSERT INTO nursing_departments (
          id, external_key, institution_id, name, faculty, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (external_key) DO UPDATE SET
          institution_id = EXCLUDED.institution_id,
          name = EXCLUDED.name,
          faculty = EXCLUDED.faculty,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(department.id),
          department.id,
          institutionId,
          department.name,
          department.faculty,
          'active',
          json({ trainingData: true, hodUserKey: department.hodUserId }),
        ]
      );
    }

    for (const session of seed.academicSessions) {
      await client.query(
        `INSERT INTO nursing_academic_sessions (
          id, external_key, institution_id, department_id, name, status, starts_on, ends_on, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (external_key) DO UPDATE SET
          institution_id = EXCLUDED.institution_id,
          department_id = EXCLUDED.department_id,
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(session.id),
          session.id,
          institutionId,
          idOf(session.departmentId),
          session.name,
          session.status,
          session.startsOn,
          session.endsOn,
          json({ trainingData: true }),
        ]
      );
    }

    for (const cohort of seed.cohorts) {
      await client.query(
        `INSERT INTO nursing_cohorts (
          id, external_key, institution_id, department_id, academic_session_id,
          name, level, student_count, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          student_count = EXCLUDED.student_count,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(cohort.id),
          cohort.id,
          institutionId,
          idOf(cohort.departmentId),
          idOf(cohort.academicSessionId),
          cohort.name,
          cohort.level,
          cohort.studentCount,
          'active',
          json({ trainingData: true }),
        ]
      );
    }

    for (const user of seed.users) {
      await client.query(
        `INSERT INTO nursing_users (
          id, external_key, institution_id, department_id, academic_session_id, cohort_id,
          email, password_hash, first_name, last_name, title, matric_number,
          primary_role, status, access_status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (external_key) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          title = EXCLUDED.title,
          matric_number = EXCLUDED.matric_number,
          primary_role = EXCLUDED.primary_role,
          status = EXCLUDED.status,
          access_status = EXCLUDED.access_status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(user.id),
          user.id,
          institutionId,
          idOf(user.departmentId),
          idOf(user.academicSessionId),
          user.cohortId ? idOf(user.cohortId) : null,
          user.email,
          passwordHash,
          user.firstName,
          user.lastName,
          user.title,
          user.matricNumber || null,
          user.role,
          user.status,
          user.accessStatus || 'active',
          json({ trainingData: true }),
        ]
      );

      await client.query(
        `INSERT INTO nursing_user_roles (user_id, institution_id, department_id, role, status)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id, role, institution_id, department_id) DO UPDATE SET
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [idOf(user.id), institutionId, idOf(user.departmentId), user.role, 'active']
      );
    }

    for (const profile of seed.userProfiles) {
      const user = seed.users.find((item) => item.id === profile.userId);
      if (!user) continue;
      await client.query(
        `INSERT INTO nursing_user_profiles (
          id, user_id, institution_id, department_id, academic_session_id, cohort_id,
          phone, bio, skills, interests, settings, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (user_id) DO UPDATE SET
          phone = EXCLUDED.phone,
          bio = EXCLUDED.bio,
          skills = EXCLUDED.skills,
          interests = EXCLUDED.interests,
          settings = EXCLUDED.settings,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(profile.id),
          idOf(profile.userId),
          institutionId,
          idOf(user.departmentId),
          idOf(user.academicSessionId),
          user.cohortId ? idOf(user.cohortId) : null,
          profile.phone || null,
          profile.bio || null,
          json(profile.skills || []),
          json(profile.interests || []),
          json(profile.settings || {}),
          profile.status || 'active',
        ]
      );
    }

    for (const course of seed.courses) {
      await client.query(
        `INSERT INTO nursing_courses (
          id, external_key, institution_id, department_id, academic_session_id, lecturer_id,
          code, title, status, adoption_rate, completion_rate, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (external_key) DO UPDATE SET
          lecturer_id = EXCLUDED.lecturer_id,
          code = EXCLUDED.code,
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          adoption_rate = EXCLUDED.adoption_rate,
          completion_rate = EXCLUDED.completion_rate,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(course.id),
          course.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(seed.academicSessions[0].id),
          idOf(course.lecturerId),
          course.code,
          course.title,
          course.status,
          course.adoptionRate,
          course.completionRate,
          json({ trainingData: true, modules: course.modules }),
        ]
      );

      for (const [index, moduleTitle] of course.modules.entries()) {
        const moduleKey = `${course.id}-module-${index + 1}`;
        await client.query(
          `INSERT INTO nursing_course_modules (
            id, external_key, course_id, institution_id, department_id, title, sequence, status, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (external_key) DO UPDATE SET
            title = EXCLUDED.title,
            sequence = EXCLUDED.sequence,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()`,
          [
            idOf(moduleKey),
            moduleKey,
            idOf(course.id),
            institutionId,
            idOf(seed.departments[0].id),
            moduleTitle,
            index + 1,
            'ready',
            json({ trainingData: true }),
          ]
        );
      }
    }

    for (const lesson of seed.lessons) {
      await client.query(
        `INSERT INTO nursing_lessons (
          id, external_key, course_id, course_module_id, institution_id, department_id,
          title, content_type, content_body, estimated_minutes, sequence, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          content_type = EXCLUDED.content_type,
          content_body = EXCLUDED.content_body,
          estimated_minutes = EXCLUDED.estimated_minutes,
          sequence = EXCLUDED.sequence,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(lesson.id),
          lesson.id,
          idOf(lesson.courseId),
          idOf(`${lesson.courseId}-module-1`),
          institutionId,
          idOf(seed.departments[0].id),
          lesson.title,
          lesson.contentType,
          `Training material for ${lesson.title}. Fictional clinical content only.`,
          lesson.estimatedMinutes,
          lesson.sequence,
          lesson.materialStatus,
          json({ trainingData: true }),
        ]
      );
    }

    for (const section of seed.courseSections) {
      await client.query(
        `INSERT INTO nursing_course_sections (
          id, external_key, course_id, institution_id, department_id, title, sequence, status, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          sequence = EXCLUDED.sequence,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          updated_at = NOW()`,
        [
          idOf(section.id),
          section.id,
          idOf(section.courseId),
          institutionId,
          idOf(seed.departments[0].id),
          section.title,
          section.sequence || section.sortOrder || 1,
          section.status || 'published',
          idOf(seed.courses.find((course) => course.id === section.courseId)?.lecturerId || 'user-lecturer-ifeoma'),
        ]
      );
    }

    for (const lesson of seed.lessons) {
      await client.query(
        `INSERT INTO nursing_lesson_resources (
          id, lesson_id, institution_id, uploaded_by, resource_type, title, resource_url, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          resource_url = EXCLUDED.resource_url,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(`${lesson.id}-resource-1`),
          idOf(lesson.id),
          institutionId,
          idOf(seed.courses.find((course) => course.id === lesson.courseId)?.lecturerId || 'user-lecturer-ifeoma'),
          lesson.contentType === 'video' ? 'video' : 'document',
          `${lesson.title} resource`,
          lesson.resourceUrl || `demo://nursing/${lesson.id}.pdf`,
          'available',
        ]
      );
    }

    for (const enrollment of seed.courseEnrollments) {
      const student = seed.users.find((user) => user.id === enrollment.studentId);
      await client.query(
        `INSERT INTO nursing_course_enrollments (
          id, external_key, institution_id, department_id, academic_session_id, cohort_id,
          course_id, student_id, status, progress_percent, enrolled_at, completed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (course_id, student_id) DO UPDATE SET
          status = EXCLUDED.status,
          progress_percent = EXCLUDED.progress_percent,
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW()`,
        [
          idOf(enrollment.id),
          enrollment.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(seed.academicSessions[0].id),
          student?.cohortId ? idOf(student.cohortId) : null,
          idOf(enrollment.courseId),
          idOf(enrollment.studentId),
          enrollment.status || 'active',
          enrollment.progressPercent || 0,
          enrollment.enrolledAt || new Date().toISOString(),
          enrollment.completedAt || null,
        ]
      );
    }

    for (const progress of seed.lessonProgress) {
      const enrollmentKey = `${progress.studentId}-${progress.courseId}`;
      const enrollment = seed.courseEnrollments.find((item) => item.studentId === progress.studentId && item.courseId === progress.courseId);
      await client.query(
        `INSERT INTO nursing_lesson_progress (
          id, enrollment_id, institution_id, course_id, lesson_id, student_id,
          status, progress_percent, completed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (lesson_id, student_id) DO UPDATE SET
          status = EXCLUDED.status,
          progress_percent = EXCLUDED.progress_percent,
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW()`,
        [
          idOf(progress.id),
          idOf(enrollment?.id || `enrollment-${enrollmentKey}`),
          institutionId,
          idOf(progress.courseId),
          idOf(progress.lessonId),
          idOf(progress.studentId),
          progress.status || 'in_progress',
          progress.progressPercent || 0,
          progress.completedAt || null,
        ]
      );
    }

    for (const quiz of seed.quizzes) {
      await client.query(
        `INSERT INTO nursing_quizzes (
          id, external_key, course_id, institution_id, department_id, title, status, average_score, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          average_score = EXCLUDED.average_score,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(quiz.id),
          quiz.id,
          idOf(quiz.courseId),
          institutionId,
          idOf(seed.departments[0].id),
          quiz.title,
          'ready',
          quiz.averageScore,
          json({ trainingData: true }),
        ]
      );

      for (const [index, question] of quiz.questions.entries()) {
        const questionKey = `${quiz.id}-question-${index + 1}`;
        await client.query(
          `INSERT INTO nursing_quiz_questions (
            id, external_key, quiz_id, institution_id, department_id,
            question_type, prompt, options, correct_answer, points, sequence
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (external_key) DO UPDATE SET
            prompt = EXCLUDED.prompt,
            options = EXCLUDED.options,
            correct_answer = EXCLUDED.correct_answer,
            updated_at = NOW()`,
          [
            idOf(questionKey),
            questionKey,
            idOf(quiz.id),
            institutionId,
            idOf(seed.departments[0].id),
            'multiple_choice',
            question.prompt,
            json(question.options),
            json({ correctIndex: question.correctIndex }),
            1,
            index + 1,
          ]
        );
      }
    }

    for (const assignment of seed.assignments) {
      await client.query(
        `INSERT INTO nursing_assignments (
          id, external_key, institution_id, department_id, course_id, created_by,
          title, instructions, due_date, max_score, rubric, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          instructions = EXCLUDED.instructions,
          due_date = EXCLUDED.due_date,
          max_score = EXCLUDED.max_score,
          rubric = EXCLUDED.rubric,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(assignment.id),
          assignment.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(assignment.courseId),
          idOf(assignment.createdBy || 'user-lecturer-ifeoma'),
          assignment.title,
          assignment.instructions,
          assignment.dueDate || null,
          assignment.maxScore || 100,
          json(assignment.rubric || []),
          assignment.status || 'published',
        ]
      );
    }

    for (const submission of seed.assignmentSubmissions) {
      await client.query(
        `INSERT INTO nursing_assignment_submissions (
          id, external_key, institution_id, department_id, course_id, assignment_id,
          student_id, submission_text, status, submitted_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          submission_text = EXCLUDED.submission_text,
          status = EXCLUDED.status,
          submitted_at = EXCLUDED.submitted_at,
          updated_at = NOW()`,
        [
          idOf(submission.id),
          submission.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(submission.courseId),
          idOf(submission.assignmentId),
          idOf(submission.studentId),
          submission.submissionText || submission.body || '',
          submission.status || 'submitted',
          submission.submittedAt || new Date().toISOString(),
        ]
      );
    }

    for (const grade of seed.grades) {
      await client.query(
        `INSERT INTO nursing_grades (
          id, external_key, institution_id, department_id, course_id, student_id,
          assignment_id, submission_id, grade_type, score, max_score, status,
          graded_by, graded_at, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (external_key) DO UPDATE SET
          score = EXCLUDED.score,
          max_score = EXCLUDED.max_score,
          status = EXCLUDED.status,
          graded_by = EXCLUDED.graded_by,
          graded_at = EXCLUDED.graded_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(grade.id),
          grade.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(grade.courseId),
          idOf(grade.studentId),
          idOf(grade.assignmentId),
          idOf(grade.submissionId),
          grade.gradeType || 'assignment',
          grade.score,
          grade.maxScore || 100,
          grade.status || 'draft',
          grade.gradedBy ? idOf(grade.gradedBy) : null,
          grade.gradedAt || null,
          json({ letterGrade: grade.letterGrade, feedback: grade.feedback }),
        ]
      );
    }

    for (const comment of seed.gradeComments) {
      await client.query(
        `INSERT INTO nursing_grade_comments (id, grade_id, author_id, body, created_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET
          body = EXCLUDED.body,
          updated_at = NOW()`,
        [
          idOf(comment.id),
          idOf(comment.gradeId),
          idOf(comment.authorId),
          comment.body,
          comment.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const discussion of seed.courseDiscussions) {
      await client.query(
        `INSERT INTO nursing_course_discussions (
          id, external_key, institution_id, department_id, course_id, author_id,
          title, body, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(discussion.id),
          discussion.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(discussion.courseId),
          idOf(discussion.authorId),
          discussion.title,
          discussion.body,
          discussion.status || 'open',
          discussion.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const reply of seed.courseDiscussionReplies) {
      await client.query(
        `INSERT INTO nursing_course_discussion_replies (
          id, discussion_id, author_id, body, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO UPDATE SET
          body = EXCLUDED.body,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(reply.id),
          idOf(reply.discussionId),
          idOf(reply.authorId),
          reply.body,
          reply.status || 'published',
          reply.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const post of seed.timelinePosts) {
      await client.query(
        `INSERT INTO nursing_timeline_posts (
          id, external_key, institution_id, department_id, cohort_id, course_id,
          author_id, scope, post_type, title, body, pinned, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          pinned = EXCLUDED.pinned,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(post.id),
          post.id,
          institutionId,
          post.departmentId ? idOf(post.departmentId) : idOf(seed.departments[0].id),
          post.cohortId ? idOf(post.cohortId) : null,
          post.courseId ? idOf(post.courseId) : null,
          idOf(post.authorId),
          post.scope || 'department',
          post.type || post.postType || 'post',
          post.title || null,
          post.body,
          Boolean(post.pinned),
          post.status || 'published',
          post.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const comment of seed.timelineComments) {
      await client.query(
        `INSERT INTO nursing_timeline_comments (
          id, post_id, author_id, parent_comment_id, body, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET
          body = EXCLUDED.body,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(comment.id),
          idOf(comment.postId),
          idOf(comment.authorId),
          comment.parentCommentId ? idOf(comment.parentCommentId) : null,
          comment.body,
          comment.status || 'published',
          comment.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const reaction of seed.timelineReactions) {
      await client.query(
        `INSERT INTO nursing_timeline_reactions (id, post_id, user_id, reaction_type, created_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING`,
        [
          idOf(reaction.id),
          idOf(reaction.postId),
          idOf(reaction.userId),
          reaction.reactionType || 'like',
          reaction.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const attachment of seed.timelineAttachments) {
      await client.query(
        `INSERT INTO nursing_timeline_attachments (
          id, post_id, uploaded_by, file_name, mime_type, file_url, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET
          file_name = EXCLUDED.file_name,
          file_url = EXCLUDED.file_url,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(attachment.id),
          idOf(attachment.postId),
          idOf(attachment.uploadedBy || attachment.authorId || 'user-hod-aisha'),
          attachment.fileName || 'timeline-resource.pdf',
          attachment.mimeType || 'application/pdf',
          attachment.fileUrl || 'demo://nursing/timeline-resource.pdf',
          attachment.status || 'available',
        ]
      );
    }

    for (const report of seed.timelineReports) {
      await client.query(
        `INSERT INTO nursing_timeline_reports (
          id, post_id, reported_by, reason, status, reviewed_by, resolution, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          reason = EXCLUDED.reason,
          status = EXCLUDED.status,
          reviewed_by = EXCLUDED.reviewed_by,
          resolution = EXCLUDED.resolution,
          updated_at = NOW()`,
        [
          idOf(report.id),
          idOf(report.postId),
          idOf(report.reportedBy),
          report.reason,
          report.status || 'open',
          report.reviewedBy ? idOf(report.reviewedBy) : null,
          report.resolution || null,
          report.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const notification of seed.notifications) {
      await client.query(
        `INSERT INTO nursing_notifications (
          id, institution_id, user_id, notification_type, title, body, action_url, is_read, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          action_url = EXCLUDED.action_url,
          is_read = EXCLUDED.is_read,
          updated_at = NOW()`,
        [
          idOf(notification.id),
          institutionId,
          idOf(notification.userId),
          notification.notificationType || notification.type || 'academic',
          notification.title,
          notification.body,
          notification.actionUrl || null,
          Boolean(notification.isRead),
          notification.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const simulation of seed.simulationCases) {
      await client.query(
        `INSERT INTO nursing_simulation_cases (
          id, external_key, institution_id, department_id, created_by, title,
          patient_name, patient_age, patient_sex, setting, chief_complaint,
          vital_signs, assessment_steps, red_flags, expected_actions, feedback, score, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          patient_name = EXCLUDED.patient_name,
          patient_age = EXCLUDED.patient_age,
          patient_sex = EXCLUDED.patient_sex,
          setting = EXCLUDED.setting,
          chief_complaint = EXCLUDED.chief_complaint,
          vital_signs = EXCLUDED.vital_signs,
          assessment_steps = EXCLUDED.assessment_steps,
          red_flags = EXCLUDED.red_flags,
          expected_actions = EXCLUDED.expected_actions,
          feedback = EXCLUDED.feedback,
          score = EXCLUDED.score,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(simulation.id),
          simulation.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf('user-lecturer-samuel'),
          simulation.chiefComplaint,
          simulation.patientName,
          simulation.age || null,
          simulation.sex,
          simulation.setting,
          simulation.chiefComplaint,
          json({ display: simulation.vitalSigns }),
          json(simulation.assessmentSteps),
          json(simulation.redFlags),
          json(simulation.expectedActions),
          simulation.feedback,
          simulation.score,
          'active',
          json({ trainingData: true, questions: simulation.questions, fictional: true }),
        ]
      );

      for (const [index, step] of simulation.assessmentSteps.entries()) {
        await client.query(
          `INSERT INTO nursing_simulation_steps (
            id, simulation_case_id, institution_id, step_type, title, body, sequence, scoring_metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            scoring_metadata = EXCLUDED.scoring_metadata,
            updated_at = NOW()`,
          [
            idOf(`${simulation.id}-step-${index + 1}`),
            idOf(simulation.id),
            institutionId,
            'assessment',
            step,
            'Fictional scenario step for clinical reasoning practice.',
            index + 1,
            json({ points: 5 }),
          ]
        );
      }
    }

    for (const skill of seed.clinicalSkills) {
      await client.query(
        `INSERT INTO nursing_clinical_skills (
          id, external_key, institution_id, department_id, name, category, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (external_key) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(`skill-${skill}`),
          `skill-${skill}`,
          institutionId,
          idOf(seed.departments[0].id),
          skill,
          'clinical_practice',
          'active',
          json({ trainingData: true }),
        ]
      );
    }

    for (const entry of seed.logbookEntries) {
      await client.query(
        `INSERT INTO nursing_clinical_logbook_entries (
          id, external_key, institution_id, department_id, academic_session_id, cohort_id,
          student_id, supervisor_id, clinical_site, ward_unit, posting_date,
          hours_completed, encounter_category, reflection, status, supervisor_comments, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (external_key) DO UPDATE SET
          status = EXCLUDED.status,
          supervisor_comments = EXCLUDED.supervisor_comments,
          reflection = EXCLUDED.reflection,
          updated_at = NOW()`,
        [
          idOf(entry.id),
          entry.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(seed.academicSessions[0].id),
          idOf(seed.users.find((user) => user.id === entry.studentId)?.cohortId || seed.cohorts[0].id),
          idOf(entry.studentId),
          idOf(entry.supervisorId),
          entry.clinicalSite,
          entry.wardUnit,
          entry.date,
          entry.hoursCompleted,
          entry.encounterCategory,
          entry.reflection,
          entry.status,
          entry.supervisorComments,
          json({ trainingData: true }),
        ]
      );

      for (const skill of entry.skillsPerformed) {
        await client.query(
          `INSERT INTO nursing_logbook_skill_entries (
            logbook_entry_id, clinical_skill_id, institution_id, supervisor_id, status, signed_off_at
          ) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (logbook_entry_id, clinical_skill_id) DO UPDATE SET
            status = EXCLUDED.status,
            signed_off_at = EXCLUDED.signed_off_at,
            updated_at = NOW()`,
          [
            idOf(entry.id),
            idOf(`skill-${skill}`),
            institutionId,
            idOf(entry.supervisorId),
            entry.status === 'approved' ? 'signed_off' : 'pending',
            entry.status === 'approved' ? new Date().toISOString() : null,
          ]
        );
      }

      if (entry.status !== 'pending') {
        await client.query(
          `INSERT INTO nursing_supervisor_reviews (
            id, logbook_entry_id, supervisor_id, institution_id, status, comments
          ) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            comments = EXCLUDED.comments,
            updated_at = NOW()`,
          [
            idOf(`review-${entry.id}`),
            idOf(entry.id),
            idOf(entry.supervisorId),
            institutionId,
            entry.status,
            entry.supervisorComments,
          ]
        );
      }
    }

    for (const lab of seed.telehealthLabSessions) {
      await client.query(
        `INSERT INTO nursing_telehealth_lab_sessions (
          id, external_key, institution_id, department_id, student_id, lecturer_id,
          simulation_case_id, role_play_mode, status, rubric_score, feedback, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (external_key) DO UPDATE SET
          status = EXCLUDED.status,
          rubric_score = EXCLUDED.rubric_score,
          feedback = EXCLUDED.feedback,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(lab.id),
          lab.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(lab.studentId),
          idOf('user-lecturer-ifeoma'),
          idOf(lab.caseId),
          lab.role,
          lab.status,
          lab.rubricScore,
          lab.feedback,
          json({ trainingData: true }),
        ]
      );

      await client.query(
        `INSERT INTO nursing_telehealth_lab_notes (
          id, session_id, institution_id, student_id, triage_checklist,
          communication_checklist, documentation_note, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          documentation_note = EXCLUDED.documentation_note,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(`${lab.id}-note`),
          idOf(lab.id),
          institutionId,
          idOf(lab.studentId),
          json(['Identity checked', 'Red flags screened']),
          json(['Introduced self', 'Used teach-back']),
          'Demo telehealth consultation note for nursing skills review.',
          lab.status,
        ]
      );
    }

    for (const payment of seed.paymentRecords) {
      await client.query(
        `INSERT INTO nursing_payment_records (
          id, external_key, institution_id, department_id, academic_session_id, student_id,
          payment_status, access_status, amount_expected, amount_paid, currency,
          payment_reference, receipt_status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (external_key) DO UPDATE SET
          payment_status = EXCLUDED.payment_status,
          access_status = EXCLUDED.access_status,
          amount_expected = EXCLUDED.amount_expected,
          amount_paid = EXCLUDED.amount_paid,
          receipt_status = EXCLUDED.receipt_status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(payment.id),
          payment.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(seed.academicSessions[0].id),
          idOf(payment.studentId),
          payment.paymentStatus,
          payment.accessStatus,
          payment.amountExpected,
          payment.amountPaid,
          'NGN',
          payment.paymentReference,
          payment.receiptStatus,
          json({ trainingData: true }),
        ]
      );
    }

    for (const certificate of seed.certificates) {
      await client.query(
        `INSERT INTO nursing_certificates (
          id, external_key, institution_id, department_id, academic_session_id, student_id,
          certificate_type, program_name, status, issue_date, verification_code, verification_url, issued_by, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (external_key) DO UPDATE SET
          status = EXCLUDED.status,
          issue_date = EXCLUDED.issue_date,
          verification_code = EXCLUDED.verification_code,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(certificate.id),
          certificate.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(seed.academicSessions[0].id),
          idOf(certificate.studentId),
          certificate.certificateType,
          certificate.programName,
          certificate.status,
          certificate.issueDate,
          certificate.verificationCode,
          `/ng/nursing/certificates/${certificate.verificationCode}`,
          idOf('user-hod-aisha'),
          json({ trainingData: true, noLicensure: true }),
        ]
      );
    }

    for (const announcement of seed.announcements) {
      await client.query(
        `INSERT INTO nursing_announcements (
          id, external_key, institution_id, department_id, created_by, audience, title, body, status, published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          audience = EXCLUDED.audience,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          idOf(announcement.id),
          announcement.id,
          institutionId,
          idOf(seed.departments[0].id),
          idOf(announcement.createdBy),
          announcement.audience,
          announcement.title,
          announcement.body,
          'published',
          announcement.createdAt,
        ]
      );
    }

    for (const report of seed.reports) {
      await client.query(
        `INSERT INTO nursing_reports (
          id, external_key, institution_id, department_id, report_type, title, status, summary, data, generated_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          summary = EXCLUDED.summary,
          data = EXCLUDED.data,
          updated_at = NOW()`,
        [
          idOf(report.id),
          report.id,
          institutionId,
          idOf(seed.departments[0].id),
          report.id.replace('report-', ''),
          report.title,
          report.status,
          report.summary,
          json({ trainingData: true, metrics }),
          idOf('user-hod-aisha'),
        ]
      );
    }

    for (let index = 0; index < 5; index += 1) {
      const student = seed.users.find((user) => user.id === `user-student-${String(index + 1).padStart(2, '0')}`);
      const quiz = seed.quizzes[index % seed.quizzes.length];
      const attemptKey = `quiz-attempt-${student.id}-${quiz.id}`;
      await client.query(
        `INSERT INTO nursing_quiz_attempts (
          id, external_key, quiz_id, student_id, institution_id, department_id, cohort_id, score, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (external_key) DO UPDATE SET
          score = EXCLUDED.score,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
        [
          idOf(attemptKey),
          attemptKey,
          idOf(quiz.id),
          idOf(student.id),
          institutionId,
          idOf(seed.departments[0].id),
          idOf(student.cohortId),
          70 + index * 4,
          'submitted',
          json({ trainingData: true }),
        ]
      );

      const questionKey = `${quiz.id}-question-1`;
      await client.query(
        `INSERT INTO nursing_quiz_answers (
          id, attempt_id, question_id, institution_id, answer, is_correct, points_awarded
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET
          answer = EXCLUDED.answer,
          is_correct = EXCLUDED.is_correct,
          points_awarded = EXCLUDED.points_awarded,
          updated_at = NOW()`,
        [
          idOf(`${attemptKey}-answer-1`),
          idOf(attemptKey),
          idOf(questionKey),
          institutionId,
          json({ selectedIndex: 0 }),
          true,
          1,
        ]
      );
    }

    await client.query(
      `INSERT INTO nursing_files_or_uploads (
        id, institution_id, department_id, uploaded_by, related_resource_type,
        related_resource_id, original_name, stored_name, mime_type, size_bytes,
        storage_path, status, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        original_name = EXCLUDED.original_name,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()`,
      [
        idOf('file-telehealth-rubric'),
        institutionId,
        idOf(seed.departments[0].id),
        idOf('user-lecturer-ifeoma'),
        'telehealth_lab',
        idOf(seed.telehealthLabSessions[0].id),
        'fictional-telehealth-rubric.pdf',
        'fictional-telehealth-rubric.pdf',
        'application/pdf',
        0,
        'demo://nursing/fictional-telehealth-rubric.pdf',
        'available',
        json({ trainingData: true, noRealFile: true }),
      ]
    );

    await client.query(
      `INSERT INTO nursing_audit_logs (
        id, institution_id, department_id, user_id, action, resource_type, resource_id,
        new_values, success
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`,
      [
        idOf('audit-seed-nursing-platform'),
        institutionId,
        idOf(seed.departments[0].id),
        idOf('user-super-admin'),
        'seed_demo_data',
        'nursing_platform',
        institutionId,
        json({ trainingData: true, seededAt: new Date().toISOString() }),
        true,
      ]
    );

    await client.query('COMMIT');
    console.log('Nursing education platform demo seed complete.');
    console.log(`Demo users: ${seed.users.length}; courses: ${seed.courses.length}; simulations: ${seed.simulationCases.length}`);
    console.log('Credentials are documented in docs/nursing-platform-demo-credentials.md.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Nursing education seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.close();
  }
}

run();
