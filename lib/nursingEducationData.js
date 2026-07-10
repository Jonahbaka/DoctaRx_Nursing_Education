const NURSING_ROLES = {
  SUPER_ADMIN: 'super_admin',
  INSTITUTION_ADMIN: 'institution_admin',
  HOD: 'hod',
  LECTURER: 'lecturer',
  CLINICAL_COORDINATOR: 'clinical_coordinator',
  SUPERVISOR: 'supervisor',
  STUDENT: 'student',
  SUPPORT_ADMIN: 'support_admin',
};

const NURSING_ROLE_LABELS = {
  [NURSING_ROLES.SUPER_ADMIN]: 'Super Admin',
  [NURSING_ROLES.INSTITUTION_ADMIN]: 'Institution Admin',
  [NURSING_ROLES.HOD]: 'HOD / Department Admin',
  [NURSING_ROLES.LECTURER]: 'Lecturer',
  [NURSING_ROLES.CLINICAL_COORDINATOR]: 'Clinical Coordinator',
  [NURSING_ROLES.SUPERVISOR]: 'Clinical Supervisor / Preceptor',
  [NURSING_ROLES.STUDENT]: 'Student Nurse',
  [NURSING_ROLES.SUPPORT_ADMIN]: 'DoctaRx Support Admin',
};

const NURSING_ROLE_ROUTES = {
  [NURSING_ROLES.SUPER_ADMIN]: '/ng/nursing/admin',
  [NURSING_ROLES.INSTITUTION_ADMIN]: '/ng/nursing/admin',
  [NURSING_ROLES.HOD]: '/ng/nursing/hod',
  [NURSING_ROLES.LECTURER]: '/ng/nursing/lecturer',
  [NURSING_ROLES.CLINICAL_COORDINATOR]: '/ng/nursing/coordinator',
  [NURSING_ROLES.SUPERVISOR]: '/ng/nursing/supervisor',
  [NURSING_ROLES.STUDENT]: '/ng/nursing/student',
  [NURSING_ROLES.SUPPORT_ADMIN]: '/ng/nursing/admin',
};

const NURSING_PERMISSIONS = {
  viewInstitution: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.CLINICAL_COORDINATOR,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  manageInstitution: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  manageCourses: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  manageLessons: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  takeCourse: [NURSING_ROLES.STUDENT],
  completeLesson: [NURSING_ROLES.STUDENT],
  manageAssignments: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  submitAssignment: [NURSING_ROLES.STUDENT],
  gradeAssignments: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  createTimelinePost: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
    NURSING_ROLES.CLINICAL_COORDINATOR,
    NURSING_ROLES.SUPERVISOR,
    NURSING_ROLES.STUDENT,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  moderateTimeline: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  manageDiscussions: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  manageSimulations: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.LECTURER,
  ],
  attemptSimulation: [NURSING_ROLES.STUDENT],
  runTelehealthLab: [NURSING_ROLES.STUDENT, NURSING_ROLES.LECTURER],
  submitLogbook: [NURSING_ROLES.STUDENT],
  reviewLogbook: [
    NURSING_ROLES.SUPERVISOR,
    NURSING_ROLES.CLINICAL_COORDINATOR,
    NURSING_ROLES.HOD,
  ],
  issueCertificates: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  viewReports: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.CLINICAL_COORDINATOR,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
  managePayments: [
    NURSING_ROLES.SUPER_ADMIN,
    NURSING_ROLES.INSTITUTION_ADMIN,
    NURSING_ROLES.HOD,
    NURSING_ROLES.SUPPORT_ADMIN,
  ],
};

const institution = {
  id: 'inst-uniabuja',
  name: 'University of Abuja',
  shortName: 'UniAbuja',
  type: 'Federal University',
  country: 'Nigeria',
  state: 'FCT',
  city: 'Abuja',
  status: 'pilot_ready',
  trainingData: true,
};

const departments = [
  {
    id: 'dept-nursing-science',
    institutionId: institution.id,
    name: 'Department of Nursing Science',
    faculty: 'Faculty of Health Sciences',
    hodUserId: 'user-hod-aisha',
    trainingData: true,
  },
];

const academicSessions = [
  {
    id: 'session-next',
    institutionId: institution.id,
    departmentId: departments[0].id,
    name: 'Next Academic Session',
    status: 'planning',
    startsOn: '2026-09-15',
    endsOn: '2027-07-30',
    trainingData: true,
  },
];

const cohorts = ['100L', '200L', '300L', '400L', '500L'].map((level, index) => ({
  id: `cohort-${level.toLowerCase()}`,
  institutionId: institution.id,
  departmentId: departments[0].id,
  academicSessionId: academicSessions[0].id,
  name: level,
  level,
  studentCount: [42, 38, 35, 33, 29][index],
  trainingData: true,
}));

const staffUsers = [
  {
    id: 'user-super-admin',
    email: 'nursing.superadmin@doctarx.demo',
    firstName: 'Ada',
    lastName: 'Okonkwo',
    role: NURSING_ROLES.SUPER_ADMIN,
    title: 'DoctaRx Super Admin',
  },
  {
    id: 'user-institution-admin',
    email: 'nursing.admin@uniabuja.demo',
    firstName: 'Musa',
    lastName: 'Ibrahim',
    role: NURSING_ROLES.INSTITUTION_ADMIN,
    title: 'Institution Admin',
  },
  {
    id: 'user-hod-aisha',
    email: 'hod.nursing@uniabuja.demo',
    firstName: 'Aisha',
    lastName: 'Bello',
    role: NURSING_ROLES.HOD,
    title: 'Head, Department of Nursing Science',
  },
  {
    id: 'user-lecturer-ifeoma',
    email: 'ifeoma.lecturer@uniabuja.demo',
    firstName: 'Ifeoma',
    lastName: 'Nwosu',
    role: NURSING_ROLES.LECTURER,
    title: 'Lecturer, Nursing Informatics',
  },
  {
    id: 'user-lecturer-samuel',
    email: 'samuel.lecturer@uniabuja.demo',
    firstName: 'Samuel',
    lastName: 'Danladi',
    role: NURSING_ROLES.LECTURER,
    title: 'Lecturer, Clinical Simulation',
  },
  {
    id: 'user-coordinator',
    email: 'clinical.coordinator@uniabuja.demo',
    firstName: 'Grace',
    lastName: 'Eze',
    role: NURSING_ROLES.CLINICAL_COORDINATOR,
    title: 'Clinical Coordinator',
  },
  {
    id: 'user-supervisor-1',
    email: 'preceptor.one@uniabuja.demo',
    firstName: 'Fatima',
    lastName: 'Yakubu',
    role: NURSING_ROLES.SUPERVISOR,
    title: 'Clinical Supervisor',
  },
  {
    id: 'user-supervisor-2',
    email: 'preceptor.two@uniabuja.demo',
    firstName: 'John',
    lastName: 'Odey',
    role: NURSING_ROLES.SUPERVISOR,
    title: 'Ward Preceptor',
  },
  {
    id: 'user-support-admin',
    email: 'nursing.support@doctarx.demo',
    firstName: 'Tomi',
    lastName: 'Lawal',
    role: NURSING_ROLES.SUPPORT_ADMIN,
    title: 'DoctaRx Support Admin',
  },
];

const studentNames = [
  ['Maryam', 'Usman'],
  ['Chidinma', 'Okafor'],
  ['Joshua', 'Adebayo'],
  ['Zainab', 'Aliyu'],
  ['Emeka', 'Obi'],
  ['Ruth', 'Sule'],
  ['Daniel', 'Afolayan'],
  ['Blessing', 'Udo'],
  ['Peter', 'Garba'],
  ['Halima', 'Sani'],
  ['Esther', 'Ojo'],
  ['David', 'Bassey'],
  ['Amina', 'Musa'],
  ['Favour', 'Okoro'],
  ['Khadija', 'Bala'],
  ['Tunde', 'Adeyemi'],
  ['Victoria', 'Etim'],
  ['Ibrahim', 'Nuhu'],
  ['Ngozi', 'Eze'],
  ['Caleb', 'James'],
];

const studentUsers = studentNames.map(([firstName, lastName], index) => {
  const cohort = cohorts[index % cohorts.length];
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `user-student-${number}`,
    email: index === 0 ? 'nursing.student.preview@uniabuja.edu.ng' : `student${number}.nursing@uniabuja.demo`,
    firstName,
    lastName,
    role: NURSING_ROLES.STUDENT,
    title: `Student Nurse, ${cohort.level}`,
    cohortId: cohort.id,
    matricNumber: `UAN/NUR/${cohort.level}/${String(2600 + index)}`,
    accessStatus: index % 6 === 0 ? 'sponsored' : index % 5 === 0 ? 'pending' : 'active',
  };
});

const users = [...staffUsers, ...studentUsers].map((user) => ({
  ...user,
  institutionId: institution.id,
  departmentId: departments[0].id,
  academicSessionId: academicSessions[0].id,
  status: 'active',
  trainingData: true,
}));

const userProfiles = users.map((user, index) => {
  const cohort = cohorts.find((item) => item.id === user.cohortId) || cohorts[index % cohorts.length];
  const isStudent = user.role === NURSING_ROLES.STUDENT;
  return {
    id: `profile-${user.id}`,
    userId: user.id,
    institutionId: institution.id,
    departmentId: departments[0].id,
    academicSessionId: academicSessions[0].id,
    cohortId: isStudent ? cohort.id : null,
    avatarUrl: null,
    phone: isStudent ? `+23480${String(30000000 + index).padStart(8, '0')}` : `+23480${String(70000000 + index).padStart(8, '0')}`,
    bio: isStudent
      ? 'Student nurse focused on digital health, safe clinical documentation, and community-oriented patient education.'
      : `${user.title} supporting nursing education, digital clinical training, and academic supervision.`,
    skills: isStudent
      ? ['Vital signs', 'Patient education', 'Clinical documentation', 'Telehealth triage'].slice(0, 3 + (index % 2))
      : ['Course design', 'Clinical supervision', 'Simulation review', 'Student mentoring'],
    interests: isStudent
      ? ['Maternal health', 'Primary care', 'Digital health', 'Community outreach'].slice(0, 2 + (index % 3))
      : ['Nursing education', 'Digital health', 'Clinical quality'],
    settings: {
      emailNotifications: true,
      timelineMentions: true,
      cohortDigest: true,
    },
    stats: {
      postsCreated: isStudent ? 2 + (index % 4) : 5 + (index % 5),
      commentsMade: isStudent ? 4 + (index % 7) : 8 + (index % 9),
      peerInteractions: isStudent ? 9 + (index % 11) : 14 + (index % 12),
    },
    status: 'active',
    seedSample: true,
  };
});

const courses = [
  {
    id: 'course-telehealth-foundations',
    code: 'NUR-DH-101',
    title: 'Foundations of Telehealth Nursing',
    description: 'Build the nursing judgment, consent workflow, and documentation habits needed for safe remote care.',
    category: 'Telehealth Nursing',
    level: 'Foundational',
    durationHours: 8,
    coverTone: 'emerald',
    lecturerId: 'user-lecturer-ifeoma',
    status: 'active',
    adoptionRate: 86,
    completionRate: 71,
    learningObjectives: [
      'Explain the nursing scope in remote care',
      'Use a safe pre-consultation checklist',
      'Document escalation and follow-up clearly',
    ],
    modules: [
      'Telehealth nursing scope in Nigeria',
      'Remote assessment workflow',
      'Privacy, consent, and documentation',
    ],
  },
  {
    id: 'course-informatics',
    code: 'NUR-DH-201',
    title: 'Nursing Informatics & Digital Health',
    description: 'Understand digital records, data quality, privacy, and clinical handoff in modern nursing practice.',
    category: 'Nursing Informatics',
    level: 'Intermediate',
    durationHours: 10,
    coverTone: 'cyan',
    lecturerId: 'user-lecturer-ifeoma',
    status: 'active',
    adoptionRate: 78,
    completionRate: 64,
    learningObjectives: [
      'Identify high-quality clinical data',
      'Use digital documentation safely',
      'Apply privacy-first informatics habits',
    ],
    modules: [
      'Electronic health record basics',
      'Data quality and clinical coding',
      'Digital safety and health communication',
    ],
  },
  {
    id: 'course-simulation',
    code: 'NUR-SIM-301',
    title: 'Virtual Clinical Simulation',
    description: 'Practice Nigerian clinical scenarios with structured reasoning, nursing interventions, and debriefing.',
    category: 'Clinical Simulation',
    level: 'Advanced',
    durationHours: 12,
    coverTone: 'indigo',
    lecturerId: 'user-lecturer-samuel',
    status: 'active',
    adoptionRate: 91,
    completionRate: 69,
    learningObjectives: [
      'Prioritize assessment actions',
      'Recognize deterioration and red flags',
      'Submit a defensible nursing care plan',
    ],
    modules: [
      'Simulation briefing and debriefing',
      'Clinical reasoning in primary care',
      'Escalation and red-flag recognition',
    ],
  },
  {
    id: 'course-logbook',
    code: 'NUR-CLG-401',
    title: 'Clinical Documentation & Digital Logbook',
    description: 'Turn clinical posting activity into structured evidence for supervision, reflection, and skills sign-off.',
    category: 'Clinical Documentation',
    level: 'Intermediate',
    durationHours: 7,
    coverTone: 'amber',
    lecturerId: 'user-lecturer-samuel',
    status: 'active',
    adoptionRate: 74,
    completionRate: 58,
    learningObjectives: [
      'Record clinical hours and skills accurately',
      'Write reflective notes that support learning',
      'Prepare entries for supervisor review',
    ],
    modules: [
      'Clinical posting records',
      'Skill sign-off standards',
      'Reflective nursing practice',
    ],
  },
  {
    id: 'course-communication',
    code: 'NUR-COM-501',
    title: 'Patient Communication and Remote Triage',
    description: 'Develop therapeutic communication and remote triage structure for low-bandwidth patient encounters.',
    category: 'Patient Communication',
    level: 'Advanced',
    durationHours: 9,
    coverTone: 'rose',
    lecturerId: 'user-lecturer-ifeoma',
    status: 'active',
    adoptionRate: 83,
    completionRate: 62,
    learningObjectives: [
      'Structure remote triage conversations',
      'Use teach-back and safety-netting',
      'Escalate urgent findings appropriately',
    ],
    modules: [
      'Therapeutic communication',
      'Telephone and video triage',
      'Patient education and safety-netting',
    ],
  },
];

const lessons = [
  ['lesson-001', 'course-telehealth-foundations', 'What telehealth changes for nurses', 18],
  ['lesson-002', 'course-telehealth-foundations', 'Consent and privacy in remote encounters', 22],
  ['lesson-003', 'course-informatics', 'Nursing data, EHRs, and clinical handoff', 25],
  ['lesson-004', 'course-informatics', 'Digital health ethics and cybersecurity basics', 20],
  ['lesson-005', 'course-simulation', 'Using simulation to build clinical judgment', 24],
  ['lesson-006', 'course-simulation', 'Recognizing urgent deterioration', 21],
  ['lesson-007', 'course-logbook', 'Documenting clinical postings correctly', 19],
  ['lesson-008', 'course-logbook', 'Reflective notes and skill evidence', 17],
  ['lesson-009', 'course-communication', 'Remote triage conversation structure', 23],
  ['lesson-010', 'course-communication', 'Patient education in low-bandwidth settings', 16],
].map(([id, courseId, title, minutes], index) => ({
  id,
  courseId,
  title,
  sequence: index + 1,
  contentType: index % 3 === 0 ? 'reading' : index % 3 === 1 ? 'slides' : 'case_note',
  estimatedMinutes: minutes,
  materialStatus: 'ready',
  trainingData: true,
}));

const courseSections = courses.flatMap((course) =>
  course.modules.map((title, index) => ({
    id: `section-${course.id}-${index + 1}`,
    courseId: course.id,
    institutionId: institution.id,
    departmentId: departments[0].id,
    title,
    sequence: index + 1,
    status: 'published',
    seedSample: true,
  }))
);

const lessonsWithStructure = lessons.map((lesson) => ({
  ...lesson,
  sectionId: courseSections.find((section) => section.courseId === lesson.courseId)?.id,
  description: `Structured nursing lesson for ${lesson.title.toLowerCase()}.`,
  contentBody: `This lesson teaches ${lesson.title.toLowerCase()} through a nursing-focused workflow, reflective questions, and applied clinical documentation practice.`,
  videoUrl: lesson.contentType === 'slides' ? 'media://nursing/lesson-preview.mp4' : null,
  resourceUrl: `resource://nursing/${lesson.id}.pdf`,
  completionRequired: true,
  seedSample: true,
}));

const courseEnrollments = studentUsers.flatMap((student, studentIndex) =>
  courses.slice(0, 4 + (studentIndex % 2)).map((course, courseIndex) => ({
    id: `enrollment-${student.id}-${course.id}`,
    studentId: student.id,
    courseId: course.id,
    institutionId: institution.id,
    departmentId: departments[0].id,
    cohortId: student.cohortId,
    status: courseIndex === 0 ? 'in_progress' : courseIndex % 3 === 0 ? 'completed' : 'active',
    progressPercent: Math.min(100, 35 + studentIndex * 3 + courseIndex * 8),
    enrolledAt: '2026-09-18',
    completedAt: courseIndex % 3 === 0 ? '2026-11-04' : null,
    seedSample: true,
  }))
);

const lessonProgress = courseEnrollments.flatMap((enrollment) =>
  lessonsWithStructure
    .filter((lesson) => lesson.courseId === enrollment.courseId)
    .map((lesson, index) => ({
      id: `progress-${enrollment.studentId}-${lesson.id}`,
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      lessonId: lesson.id,
      status: enrollment.progressPercent >= (index + 1) * 25 ? 'completed' : 'not_started',
      progressPercent: enrollment.progressPercent >= (index + 1) * 25 ? 100 : 0,
      completedAt: enrollment.progressPercent >= (index + 1) * 25 ? '2026-10-12' : null,
      seedSample: true,
    }))
);

const assignments = [
  {
    id: 'assignment-telehealth-note',
    courseId: 'course-telehealth-foundations',
    institutionId: institution.id,
    departmentId: departments[0].id,
    title: 'Remote triage documentation note',
    instructions: 'Submit a structured nursing note for a fictional fever triage call, including escalation criteria.',
    dueDate: '2026-10-20',
    maxScore: 100,
    rubric: [
      { criterion: 'Focused assessment', points: 30 },
      { criterion: 'Documentation quality', points: 30 },
      { criterion: 'Escalation and safety-netting', points: 25 },
      { criterion: 'Professional communication', points: 15 },
    ],
    status: 'published',
    seedSample: true,
  },
  {
    id: 'assignment-informatics-reflection',
    courseId: 'course-informatics',
    institutionId: institution.id,
    departmentId: departments[0].id,
    title: 'Digital clinical handoff reflection',
    instructions: 'Write a short reflection on how digital records improve nursing handoff quality.',
    dueDate: '2026-10-28',
    maxScore: 50,
    rubric: [
      { criterion: 'Clinical insight', points: 20 },
      { criterion: 'Data quality awareness', points: 15 },
      { criterion: 'Reflection clarity', points: 15 },
    ],
    status: 'published',
    seedSample: true,
  },
];

const assignmentSubmissions = studentUsers.slice(0, 8).map((student, index) => ({
  id: `submission-${String(index + 1).padStart(2, '0')}`,
  assignmentId: assignments[index % assignments.length].id,
  studentId: student.id,
  courseId: assignments[index % assignments.length].courseId,
  institutionId: institution.id,
  departmentId: departments[0].id,
  submissionText: 'Submitted nursing assignment response with structured assessment and reflection.',
  attachmentUrl: null,
  status: index % 3 === 0 ? 'graded' : 'submitted',
  submittedAt: '2026-10-16',
  seedSample: true,
}));

const grades = assignmentSubmissions.map((submission, index) => ({
  id: `grade-${submission.id}`,
  studentId: submission.studentId,
  courseId: submission.courseId,
  assignmentId: submission.assignmentId,
  submissionId: submission.id,
  institutionId: institution.id,
  departmentId: departments[0].id,
  gradeType: 'assignment',
  score: submission.status === 'graded' ? 78 + (index % 5) * 4 : null,
  maxScore: assignments.find((assignment) => assignment.id === submission.assignmentId)?.maxScore || 100,
  status: submission.status === 'graded' ? 'graded' : 'awaiting_grade',
  gradedBy: submission.status === 'graded' ? 'user-lecturer-ifeoma' : null,
  gradedAt: submission.status === 'graded' ? '2026-10-18' : null,
  seedSample: true,
}));

const gradeComments = grades
  .filter((grade) => grade.status === 'graded')
  .map((grade) => ({
    id: `comment-${grade.id}`,
    gradeId: grade.id,
    authorId: grade.gradedBy,
    body: 'Strong structure and safe escalation language. Add more detail on patient education next time.',
    createdAt: '2026-10-18',
    seedSample: true,
  }));

const courseDiscussions = [
  {
    id: 'discussion-telehealth-consent',
    courseId: 'course-telehealth-foundations',
    authorId: 'user-student-01',
    title: 'How do we explain telehealth consent in simple language?',
    body: 'I am practicing a short consent script for low-bandwidth calls. What should I include first?',
    status: 'open',
    createdAt: '2026-09-25',
    seedSample: true,
  },
  {
    id: 'discussion-logbook-evidence',
    courseId: 'course-logbook',
    authorId: 'user-student-03',
    title: 'What counts as good evidence for skills sign-off?',
    body: 'Can reflection plus supervisor comment be enough when file upload is not available?',
    status: 'answered',
    createdAt: '2026-10-02',
    seedSample: true,
  },
];

const courseDiscussionReplies = [
  {
    id: 'reply-telehealth-consent-1',
    discussionId: 'discussion-telehealth-consent',
    authorId: 'user-lecturer-ifeoma',
    body: 'Start with identity, purpose of the session, privacy limits, and what the patient should do in an emergency.',
    status: 'published',
    createdAt: '2026-09-25',
    seedSample: true,
  },
  {
    id: 'reply-logbook-evidence-1',
    discussionId: 'discussion-logbook-evidence',
    authorId: 'user-supervisor-1',
    body: 'Yes, but the reflection must be specific and the supervisor comment should name the skill observed.',
    status: 'published',
    createdAt: '2026-10-03',
    seedSample: true,
  },
];

const quizzes = [
  {
    id: 'quiz-telehealth-basics',
    courseId: 'course-telehealth-foundations',
    title: 'Telehealth nursing basics',
    averageScore: 82,
    questions: [
      {
        prompt: 'Which item should be confirmed before a mock telehealth assessment begins?',
        options: ['Patient identity and consent', 'Ward paint color', 'Student hostel address', 'Device brand'],
        correctIndex: 0,
      },
      {
        prompt: 'A safe telehealth note should include:',
        options: ['Assessment, advice, escalation plan', 'Only the final diagnosis', 'Only payment details', 'Unverified rumors'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quiz-informatics',
    courseId: 'course-informatics',
    title: 'Nursing informatics',
    averageScore: 76,
    questions: [
      {
        prompt: 'Good clinical data should be:',
        options: ['Accurate and timely', 'Decorative', 'Anonymous guesses', 'Always handwritten'],
        correctIndex: 0,
      },
      {
        prompt: 'A digital logbook improves supervision by:',
        options: ['Making submissions visible for review', 'Removing feedback', 'Replacing all clinical posting', 'Hiding clinical hours'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quiz-documentation',
    courseId: 'course-logbook',
    title: 'Clinical documentation',
    averageScore: 79,
    questions: [
      {
        prompt: 'A logbook reflection should focus on:',
        options: ['Learning and safe practice', 'Patient gossip', 'Private identifiers', 'Unrelated tasks'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quiz-triage',
    courseId: 'course-communication',
    title: 'Triage and vital signs',
    averageScore: 81,
    questions: [
      {
        prompt: 'A red flag in an adult with headache is:',
        options: ['Severe BP elevation with neurologic symptoms', 'Preference for tea', 'Long wait time only', 'Mild hunger'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'quiz-communication',
    courseId: 'course-communication',
    title: 'Patient communication',
    averageScore: 84,
    questions: [
      {
        prompt: 'Teach-back helps the nurse confirm:',
        options: ['Patient understanding', 'The nurse spoke longest', 'The device battery level only', 'Payment reference'],
        correctIndex: 0,
      },
    ],
  },
];

const simulationCases = [
  ['sim-pih', 'Grace Musa', 29, 'Female', 'Antenatal clinic', 'Pregnant woman with high blood pressure', 'BP 168/106, HR 98, RR 20, Temp 36.8C', 88],
  ['sim-child-dehydration', 'Tobi Ahmed', 4, 'Male', 'Primary healthcare centre', 'Child with fever and dehydration', 'Temp 38.7C, HR 126, dry mucosa', 82],
  ['sim-malaria', 'Kunle Ajao', 34, 'Male', 'Community pharmacy triage desk', 'Adult with suspected malaria', 'Temp 39.1C, HR 104, BP 118/76', 79],
  ['sim-diabetes', 'Ngozi Okeke', 51, 'Female', 'Telehealth follow-up', 'Diabetic patient with poor glucose control', 'RBS 288 mg/dL, BP 146/92', 76],
  ['sim-wound-care', 'Bala Yusuf', 43, 'Male', 'Surgical ward', 'Post-operative wound care', 'Temp 37.9C, wound redness', 81],
  ['sim-emergency-triage', 'Amina Sarki', 62, 'Female', 'Primary healthcare centre', 'Emergency triage at a primary healthcare centre', 'BP 92/60, HR 122, RR 28', 85],
  ['sim-hypertension', 'Peter Essien', 56, 'Male', 'Outpatient clinic', 'Hypertensive adult with headache and dizziness', 'BP 182/112, HR 90', 83],
  ['sim-anc-follow-up', 'Rukayat Bello', 25, 'Female', 'Antenatal follow-up', 'Antenatal care follow-up', 'BP 122/78, fundal height appropriate', 80],
  ['sim-med-safety', 'Sarah John', 37, 'Female', 'Medical ward', 'Medication safety case', 'Stable vitals, new medication order', 78],
  ['sim-community-outreach', 'Community household', 0, 'Mixed', 'Community outreach', 'Community health outreach case', 'Multiple household screening findings', 74],
].map(([id, patientName, age, sex, setting, chiefComplaint, vitalSigns, score]) => ({
  id,
  patientName,
  age,
  sex,
  setting,
  chiefComplaint,
  vitalSigns,
  redFlags: [
    'Escalate if consciousness changes',
    'Escalate persistent abnormal vital signs',
    'Document advice and referral clearly',
  ],
  assessmentSteps: [
    'Confirm identity and consent',
    'Collect focused history',
    'Review vital signs',
    'Identify immediate risk',
    'Document nursing actions',
  ],
  questions: [
    'What is your first nursing priority?',
    'Which finding changes the level of urgency?',
    'What patient education is required before discharge or referral?',
  ],
  expectedActions: [
    'Use ABCDE or focused triage as appropriate',
    'Communicate red flags early',
    'Record clear escalation and safety-netting plan',
  ],
  feedback: 'Fictional training case. Strong performance requires early risk recognition, clear nursing assessment, and safe escalation.',
  score,
  trainingData: true,
}));

const telehealthLabSessions = [
  {
    id: 'lab-session-001',
    studentId: 'user-student-01',
    caseId: 'sim-malaria',
    role: 'nurse',
    status: 'submitted',
    rubricScore: 84,
    feedback: 'Good opening, focused fever history, and clear safety-netting. Add stronger medication allergy check.',
  },
  {
    id: 'lab-session-002',
    studentId: 'user-student-02',
    caseId: 'sim-hypertension',
    role: 'nurse',
    status: 'reviewed',
    rubricScore: 88,
    feedback: 'Escalation was appropriate and documentation was complete.',
  },
];

const clinicalSkills = [
  'Vital signs assessment',
  'Medication safety check',
  'Wound dressing observation',
  'Antenatal counselling',
  'Patient education',
  'Remote triage documentation',
  'Blood glucose monitoring',
  'Infection prevention practice',
];

const logbookEntries = [
  {
    id: 'logbook-001',
    studentId: 'user-student-01',
    supervisorId: 'user-supervisor-1',
    clinicalSite: 'University of Abuja Teaching Hospital',
    wardUnit: 'Antenatal Clinic',
    date: '2026-10-03',
    hoursCompleted: 6,
    encounterCategory: 'Maternal health',
    skillsPerformed: ['Vital signs assessment', 'Antenatal counselling'],
    reflection: 'Practiced respectful communication and escalation for abnormal blood pressure.',
    status: 'pending',
    supervisorComments: '',
  },
  {
    id: 'logbook-002',
    studentId: 'user-student-02',
    supervisorId: 'user-supervisor-1',
    clinicalSite: 'Gwagwalada Specialist Hospital',
    wardUnit: 'Paediatrics',
    date: '2026-10-04',
    hoursCompleted: 8,
    encounterCategory: 'Child health',
    skillsPerformed: ['Vital signs assessment', 'Patient education'],
    reflection: 'Learned dehydration assessment and caregiver education.',
    status: 'approved',
    supervisorComments: 'Clear reflection and accurate hours. Approved.',
  },
  {
    id: 'logbook-003',
    studentId: 'user-student-03',
    supervisorId: 'user-supervisor-2',
    clinicalSite: 'Kuje Primary Healthcare Centre',
    wardUnit: 'Outpatient',
    date: '2026-10-05',
    hoursCompleted: 5,
    encounterCategory: 'Community health',
    skillsPerformed: ['Remote triage documentation', 'Patient education'],
    reflection: 'Observed how documentation supports follow-up in low-resource settings.',
    status: 'returned',
    supervisorComments: 'Add more detail on the patient education points discussed.',
  },
];

const paymentRecords = studentUsers.slice(0, 12).map((student, index) => ({
  id: `payment-${String(index + 1).padStart(2, '0')}`,
  studentId: student.id,
  institutionId: institution.id,
  academicSessionId: academicSessions[0].id,
  paymentStatus: index % 6 === 0 ? 'sponsored' : index % 5 === 0 ? 'pending' : 'paid',
  accessStatus: index % 6 === 0 ? 'active' : index % 5 === 0 ? 'pending' : 'active',
  amountExpected: 15000,
  amountPaid: index % 5 === 0 ? 0 : 15000,
  paymentReference: `DRX-NUR-PILOT-${String(index + 1).padStart(4, '0')}`,
  receiptStatus: index % 5 === 0 ? 'awaiting_verification' : 'issued',
  trainingData: true,
}));

const certificates = studentUsers.slice(0, 7).map((student, index) => ({
  id: `certificate-${String(index + 1).padStart(2, '0')}`,
  studentId: student.id,
  certificateType: index % 2 === 0 ? 'Certificate of Participation' : 'Certificate of Completion',
  programName: 'DoctaRx Nursing Education & Clinical Training Platform Pilot',
  issueDate: index < 4 ? '2026-11-30' : null,
  status: index < 4 ? 'issued' : 'eligible',
  verificationCode: `DRX-NUR-${String(7000 + index)}`,
  trainingData: true,
}));

const announcements = [
  {
    id: 'announcement-001',
    audience: 'all',
    title: 'University of Abuja pilot workspace is ready',
    body: 'Courses, simulations, logbook workflows, and the telehealth skills lab are available with fictional training cases.',
    createdBy: 'user-hod-aisha',
    createdAt: '2026-09-01',
  },
  {
    id: 'announcement-002',
    audience: 'student',
    title: 'Complete at least one simulation before logbook review week',
    body: 'Students should submit one virtual case attempt and one telehealth lab note before supervisor review.',
    createdBy: 'user-lecturer-samuel',
    createdAt: '2026-09-08',
  },
  {
    id: 'announcement-003',
    audience: 'supervisor',
    title: 'Pending logbook approvals need comments',
    body: 'Please approve, return, or comment on pending entries so cohort progress reports stay current.',
    createdBy: 'user-coordinator',
    createdAt: '2026-09-12',
  },
];

const timelinePosts = [
  {
    id: 'post-welcome-pinned',
    institutionId: institution.id,
    departmentId: departments[0].id,
    cohortId: null,
    courseId: null,
    authorId: 'user-hod-aisha',
    scope: 'department',
    type: 'announcement',
    title: 'Welcome to the Nursing Education Platform',
    body: 'Use this academic feed for course questions, cohort updates, clinical posting reminders, and professional peer support.',
    pinned: true,
    status: 'published',
    createdAt: '2026-09-18',
    seedSample: true,
  },
  {
    id: 'post-study-group-100l',
    institutionId: institution.id,
    departmentId: departments[0].id,
    cohortId: 'cohort-100l',
    courseId: 'course-telehealth-foundations',
    authorId: 'user-student-01',
    scope: 'cohort',
    type: 'post',
    title: 'Study group for telehealth consent scripts',
    body: 'Can we meet after lectures to practice patient identity confirmation and consent wording?',
    pinned: false,
    status: 'published',
    createdAt: '2026-09-22',
    seedSample: true,
  },
  {
    id: 'post-simulation-debrief',
    institutionId: institution.id,
    departmentId: departments[0].id,
    cohortId: null,
    courseId: 'course-simulation',
    authorId: 'user-lecturer-samuel',
    scope: 'course',
    type: 'announcement',
    title: 'Simulation debrief notes',
    body: 'For the hypertension case, focus on escalation timing, focused history, and documentation of red flags.',
    pinned: false,
    status: 'published',
    createdAt: '2026-10-01',
    seedSample: true,
  },
];

const timelineComments = [
  {
    id: 'comment-post-study-group-1',
    postId: 'post-study-group-100l',
    authorId: 'user-student-02',
    body: 'I can join. I also want to practice teach-back before the quiz.',
    status: 'published',
    createdAt: '2026-09-22',
    seedSample: true,
  },
  {
    id: 'comment-post-study-group-2',
    postId: 'post-study-group-100l',
    authorId: 'user-lecturer-ifeoma',
    body: 'Good idea. Keep the script short, respectful, and clear about emergency escalation.',
    status: 'published',
    createdAt: '2026-09-23',
    seedSample: true,
  },
  {
    id: 'comment-simulation-debrief-1',
    postId: 'post-simulation-debrief',
    authorId: 'user-student-04',
    body: 'The red flag checklist helped me decide when to refer urgently.',
    status: 'published',
    createdAt: '2026-10-01',
    seedSample: true,
  },
];

const timelineReactions = [
  ['reaction-001', 'post-welcome-pinned', 'user-student-01', 'acknowledged'],
  ['reaction-002', 'post-study-group-100l', 'user-student-02', 'like'],
  ['reaction-003', 'post-study-group-100l', 'user-student-05', 'like'],
  ['reaction-004', 'post-simulation-debrief', 'user-student-04', 'helpful'],
].map(([id, postId, userId, reactionType]) => ({
  id,
  postId,
  userId,
  reactionType,
  createdAt: '2026-10-01',
  seedSample: true,
}));

const timelineAttachments = [
  {
    id: 'attachment-telehealth-script',
    postId: 'post-study-group-100l',
    uploadedBy: 'user-student-01',
    fileName: 'telehealth-consent-practice-outline.pdf',
    mimeType: 'application/pdf',
    fileUrl: 'resource://nursing/timeline/telehealth-consent-practice-outline.pdf',
    status: 'available',
    seedSample: true,
  },
];

const timelineReports = [
  {
    id: 'timeline-report-001',
    postId: 'post-study-group-100l',
    reportedBy: 'user-student-06',
    reason: 'Needs lecturer review for accuracy',
    status: 'reviewed',
    reviewedBy: 'user-hod-aisha',
    resolution: 'Kept published; lecturer added a clarifying comment.',
    seedSample: true,
  },
];

const notifications = [
  {
    id: 'notification-001',
    userId: 'user-student-01',
    type: 'comment',
    title: 'Lecturer replied to your post',
    body: 'Ifeoma Nwosu replied to your telehealth consent discussion.',
    isRead: false,
    createdAt: '2026-09-23',
    seedSample: true,
  },
  {
    id: 'notification-002',
    userId: 'user-supervisor-1',
    type: 'logbook',
    title: 'Logbook entry awaiting review',
    body: 'A student submitted an antenatal clinic logbook entry.',
    isRead: false,
    createdAt: '2026-10-03',
    seedSample: true,
  },
  {
    id: 'notification-003',
    userId: 'user-hod-aisha',
    type: 'moderation',
    title: 'Timeline report reviewed',
    body: 'A study group post was reviewed and remains published.',
    isRead: true,
    createdAt: '2026-10-02',
    seedSample: true,
  },
];

const reports = [
  {
    id: 'report-participation',
    title: 'Student participation report',
    status: 'ready',
    summary: '84% of pilot students have opened at least one learning module.',
  },
  {
    id: 'report-course-completion',
    title: 'Course completion report',
    status: 'ready',
    summary: 'Average course completion is 65% across five active nursing courses.',
  },
  {
    id: 'report-simulation-performance',
    title: 'Simulation performance report',
    status: 'ready',
    summary: 'Median simulation score is 81%, with strongest performance in antenatal follow-up.',
  },
  {
    id: 'report-logbook-progress',
    title: 'Logbook progress report',
    status: 'ready',
    summary: '3 training entries are present: one pending, one approved, and one returned.',
  },
  {
    id: 'report-pilot-feedback',
    title: 'Pilot feedback report',
    status: 'draft',
    summary: 'Early pilot feedback emphasizes mobile access, supervisor visibility, and low-bandwidth workflows.',
  },
];

const feeSchedule = [
  { id: 'pilot-student', label: 'Pilot all-access student fee', amount: 15000, currency: 'NGN' },
  { id: 'annual-student', label: 'Post-pilot annual student access', amount: 30000, currency: 'NGN' },
  { id: 'department-license', label: 'Department license', amount: 15000000, currency: 'NGN' },
  { id: 'certificate-course', label: 'Certificate course', amount: 35000, currency: 'NGN' },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getNursingSeedData() {
  return clone({
    roles: NURSING_ROLES,
    roleLabels: NURSING_ROLE_LABELS,
    roleRoutes: NURSING_ROLE_ROUTES,
    permissions: NURSING_PERMISSIONS,
    institution,
    departments,
    academicSessions,
    cohorts,
    users,
    userProfiles,
    courses,
    courseSections,
    lessons: lessonsWithStructure,
    courseEnrollments,
    lessonProgress,
    quizzes,
    assignments,
    assignmentSubmissions,
    grades,
    gradeComments,
    courseDiscussions,
    courseDiscussionReplies,
    simulationCases,
    telehealthLabSessions,
    clinicalSkills,
    logbookEntries,
    paymentRecords,
    certificates,
    announcements,
    timelinePosts,
    timelineComments,
    timelineReactions,
    timelineAttachments,
    timelineReports,
    notifications,
    reports,
    feeSchedule,
  });
}

function canNursingRole(role, permission) {
  return Boolean(NURSING_PERMISSIONS[permission]?.includes(role));
}

function findNursingUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === normalized) || null;
}

function getNursingMetrics() {
  const activeStudents = studentUsers.filter((student) => student.accessStatus !== 'pending').length;
  const issuedCertificates = certificates.filter((certificate) => certificate.status === 'issued').length;
  const pendingApprovals = logbookEntries.filter((entry) => entry.status === 'pending').length;
  const paidOrSponsored = paymentRecords.filter((record) =>
    ['paid', 'sponsored'].includes(record.paymentStatus)
  ).length;
  const avgQuizScore = Math.round(
    quizzes.reduce((sum, quiz) => sum + quiz.averageScore, 0) / quizzes.length
  );
  const avgSimulationScore = Math.round(
    simulationCases.reduce((sum, item) => sum + item.score, 0) / simulationCases.length
  );

  return {
    totalStudents: studentUsers.length,
    activeStudents,
    coursesActive: courses.filter((course) => course.status === 'active').length,
    quizCompletion: 68,
    averageQuizScore: avgQuizScore,
    simulationCompletion: 54,
    averageSimulationScore: avgSimulationScore,
    logbookSubmissions: logbookEntries.length,
    pendingSupervisorApprovals: pendingApprovals,
    certificatesIssued: issuedCertificates,
    paidOrSponsoredAccess: paidOrSponsored,
    timelinePosts: timelinePosts.length,
    timelineComments: timelineComments.length,
    assignmentsPublished: assignments.filter((assignment) => assignment.status === 'published').length,
    submissionsAwaitingGrade: assignmentSubmissions.filter((submission) => submission.status === 'submitted').length,
    averageAssignmentScore: Math.round(
      grades
        .filter((grade) => typeof grade.score === 'number')
        .reduce((sum, grade, _, graded) => sum + grade.score / graded.length, 0)
    ),
    reviewReadiness90Day: 72,
  };
}

function getNursingUserProfile(userId) {
  const user = users.find((item) => item.id === userId);
  if (!user) return null;

  const profile = userProfiles.find((item) => item.userId === userId);
  const studentEnrollments = courseEnrollments.filter((item) => item.studentId === userId);
  const studentCourseIds = new Set(studentEnrollments.map((item) => item.courseId));
  const studentGrades = grades.filter((item) => item.studentId === userId);

  return clone({
    ...user,
    profile,
    institution,
    department: departments.find((item) => item.id === user.departmentId),
    cohort: cohorts.find((item) => item.id === user.cohortId),
    enrollments: studentEnrollments,
    courses: courses.filter((course) => studentCourseIds.has(course.id)),
    lessonProgress: lessonProgress.filter((item) => item.studentId === userId),
    quizScores: quizzes.map((quiz, index) => ({
      quizId: quiz.id,
      title: quiz.title,
      score: Math.max(62, quiz.averageScore - (index % 3) * 4),
    })),
    grades: studentGrades,
    logbookSummary: {
      totalEntries: logbookEntries.filter((entry) => entry.studentId === userId).length,
      approved: logbookEntries.filter((entry) => entry.studentId === userId && entry.status === 'approved').length,
      pending: logbookEntries.filter((entry) => entry.studentId === userId && entry.status === 'pending').length,
    },
    certificates: certificates.filter((certificate) => certificate.studentId === userId),
    timelineActivity: timelinePosts.filter((post) => post.authorId === userId),
    comments: timelineComments.filter((comment) => comment.authorId === userId),
    notifications: notifications.filter((notification) => notification.userId === userId),
  });
}

function getRoleDashboard(role) {
  const metrics = getNursingMetrics();
  const roleLabel = NURSING_ROLE_LABELS[role] || 'Nursing User';

  const common = {
    role,
    roleLabel,
    metrics,
    announcements,
  };

  if (role === NURSING_ROLES.STUDENT) {
    return {
      ...common,
      cards: [
        ['Profile', 'Complete', 'Academic profile and settings'],
        ['Courses', `${courses.length} available`, 'Continue lessons and assignments'],
        ['Timeline', `${timelinePosts.length} posts`, 'Cohort and course activity'],
        ['Gradebook', `${studentUsers.length} learners`, 'Scores and feedback visible'],
      ],
    };
  }

  if (role === NURSING_ROLES.LECTURER) {
    return {
      ...common,
      cards: [
        ['Assigned courses', '3 active', 'Builder and lesson manager ready'],
        ['Student progress', `${metrics.quizCompletion}% quiz completion`, 'Review low performers'],
        ['Gradebook', `${metrics.submissionsAwaitingGrade} awaiting`, 'Assignments and rubrics'],
        ['Timeline Q&A', `${courseDiscussions.length} threads`, 'Course questions and replies'],
      ],
    };
  }

  if (role === NURSING_ROLES.SUPERVISOR) {
    return {
      ...common,
      cards: [
        ['Assigned students', '10', 'Across two clinical sites'],
        ['Pending logbooks', `${metrics.pendingSupervisorApprovals}`, 'Review and sign off'],
        ['Skills sign-off', '8 skill types', 'Evidence ready for review'],
        ['Approval history', '14 actions', 'Comments tracked'],
      ],
    };
  }

  if (role === NURSING_ROLES.CLINICAL_COORDINATOR) {
    return {
      ...common,
      cards: [
        ['Cohorts', `${cohorts.length}`, 'Placement coverage visible'],
        ['Clinical sites', '3 training sites', 'Supervisor load balanced'],
        ['Pending reviews', `${metrics.pendingSupervisorApprovals}`, 'Escalate delayed approvals'],
        ['Placement reports', 'Ready', 'CSV-ready summaries'],
      ],
    };
  }

  return {
    ...common,
    cards: [
      ['Total students', `${metrics.totalStudents}`, 'Pilot cohort'],
      ['Active courses', `${metrics.coursesActive}`, 'Five nursing courses live'],
      ['Community posts', `${metrics.timelinePosts}`, 'Moderated academic timeline'],
      ['90-day readiness', `${metrics.reviewReadiness90Day}%`, 'Pilot evidence dashboard'],
    ],
  };
}

module.exports = {
  NURSING_ROLES,
  NURSING_ROLE_LABELS,
  NURSING_ROLE_ROUTES,
  NURSING_PERMISSIONS,
  canNursingRole,
  findNursingUserByEmail,
  getNursingMetrics,
  getNursingSeedData,
  getNursingUserProfile,
  getRoleDashboard,
};
