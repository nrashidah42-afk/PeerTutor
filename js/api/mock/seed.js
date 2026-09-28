/**
 * Demo data for the mock API. Course codes and people are illustrative sample data.
 * Dates are generated relative to "now" so the demo always has upcoming and past sessions.
 */
const DEMO_PASSWORD = 'password123'; // mock only – a real backend stores password hashes

function at(days, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeed() {
  const universities = [
    { id: 1, name: 'Makerere University', short_name: 'MAK', email_domain: 'mak.ac.ug', city: 'Kampala', is_active: true },
    { id: 2, name: 'Kyambogo University', short_name: 'KyU', email_domain: 'kyu.ac.ug', city: 'Kampala', is_active: true },
  ];

  const programmes = [
    { id: 1, university_id: 1, code: 'BSCS', name: 'BSc Computer Science' },
    { id: 2, university_id: 1, code: 'BSSE', name: 'BSc Software Engineering' },
    { id: 3, university_id: 1, code: 'BCOM', name: 'Bachelor of Commerce' },
    { id: 4, university_id: 1, code: 'BSCE', name: 'BSc Civil Engineering' },
    { id: 5, university_id: 1, code: 'BSTAT', name: 'Bachelor of Science in Statistics' },
    { id: 6, university_id: 2, code: 'BCS', name: 'BSc Computer Science' },
  ];

  // [university_id, programme_id (null = shared across programmes), code, title, year, semester, topics]
  const courseDefs = [
    [1, 1, 'CSC 1102', 'Structured Programming', 1, 1, ['Variables & data types', 'Control flow', 'Functions', 'Arrays', 'Pointers']],
    [1, 1, 'CSC 1204', 'Data Structures and Algorithms', 1, 2, ['Linked lists', 'Stacks & queues', 'Trees', 'Sorting', 'Recursion', 'Big-O analysis']],
    [1, 1, 'CSC 2100', 'Database Systems', 2, 1, ['ER modelling', 'Normalisation', 'SQL joins', 'Transactions']],
    [1, 1, 'CSC 2209', 'Operating Systems', 2, 2, ['Processes & threads', 'CPU scheduling', 'Memory management', 'Deadlocks']],
    [1, 2, 'BSE 1207', 'Object-Oriented Programming', 1, 2, ['Classes & objects', 'Inheritance', 'Polymorphism', 'Java collections']],
    [1, 2, 'BSE 2201', 'Web Application Development', 2, 2, ['HTML & CSS', 'JavaScript', 'REST APIs', 'Authentication']],
    [1, null, 'MTH 1101', 'Calculus I', 1, 1, ['Limits', 'Differentiation', 'Integration', 'Applications of derivatives']],
    [1, null, 'MTH 1203', 'Linear Algebra', 1, 2, ['Matrices', 'Determinants', 'Vector spaces', 'Eigenvalues']],
    [1, 3, 'BAF 1101', 'Principles of Accounting', 1, 1, ['Double entry', 'Trial balance', 'Final accounts', 'Bank reconciliation']],
    [1, 3, 'ECO 1101', 'Principles of Microeconomics', 1, 1, ['Demand & supply', 'Elasticity', 'Market structures', 'Consumer theory']],
    [1, 3, 'BAF 2201', 'Financial Management', 2, 2, ['Time value of money', 'Capital budgeting', 'Cost of capital', 'Working capital']],
    [1, 4, 'CIV 2101', 'Structural Mechanics', 2, 1, ['Shear force & bending moment', 'Trusses', 'Stress & strain', 'Deflection']],
    [1, 4, 'CIV 2203', 'Fluid Mechanics', 2, 2, ['Fluid statics', "Bernoulli's equation", 'Pipe flow', 'Open channels']],
    [1, 5, 'STA 1101', 'Probability Theory', 1, 1, ['Counting', 'Conditional probability', 'Random variables', 'Distributions']],
    [1, 5, 'STA 2102', 'Statistical Inference', 2, 1, ['Estimation', 'Confidence intervals', 'Hypothesis testing', 'Regression']],
    [2, 6, 'CSC 111', 'Introduction to Programming', 1, 1, ['Python basics', 'Loops', 'Functions', 'File handling']],
  ];

  const courses = courseDefs.map(([university_id, programme_id, code, title, year, semester], i) => ({
    id: i + 1, university_id, programme_id, code, title, year, semester,
  }));

  let topicId = 0;
  const topics = courseDefs.flatMap((def, i) => def[6].map((name) => ({ id: ++topicId, course_id: i + 1, name })));

  const user = (id, university_id, programme_id, full_name, email, role, year_of_study, daysAgo) => ({
    id, university_id, programme_id, full_name, email, password: DEMO_PASSWORD, role, status: 'active', year_of_study, created_at: at(-daysAgo, 9),
  });

  const users = [
    user(1, 1, null, 'Sarah Nakato', 'admin@mak.ac.ug', 'admin', null, 200),
    user(2, 1, 1, 'Brian Okello', 'learner@students.mak.ac.ug', 'learner', 1, 40),
    user(3, 1, 3, 'Aisha Namuli', 'aisha.namuli@students.mak.ac.ug', 'learner', 1, 35),
    user(4, 1, 4, 'Daniel Ssempala', 'daniel.ssempala@students.mak.ac.ug', 'learner', 2, 30),
    user(5, 1, 1, 'Grace Atim', 'tutor@students.mak.ac.ug', 'tutor', 3, 150),
    user(6, 1, 2, 'Joseph Mugisha', 'joseph.mugisha@students.mak.ac.ug', 'tutor', 3, 140),
    user(7, 1, 3, 'Patricia Nansubuga', 'patricia.nansubuga@students.mak.ac.ug', 'tutor', 3, 120),
    user(8, 1, 4, 'Ivan Kato', 'ivan.kato@students.mak.ac.ug', 'tutor', 4, 110),
    user(9, 1, 5, 'Esther Akello', 'esther.akello@students.mak.ac.ug', 'tutor', 3, 100),
    user(10, 1, 1, 'Moses Wanyama', 'moses.wanyama@students.mak.ac.ug', 'tutor', 4, 90),
    user(11, 2, 6, 'Ruth Achieng', 'ruth.achieng@kyu.ac.ug', 'tutor', 3, 60),
    user(12, 1, 1, 'Collins Tumusiime', 'collins.tumusiime@students.mak.ac.ug', 'learner', 2, 20),
  ];

  const profile = (id, user_id, headline, bio, fee, mode, location) => ({
    id, user_id, headline, bio, fee, mode, location, is_verified: true, verified_at: at(-80, 10),
  });

  const tutor_profiles = [
    profile(1, 5, "Year 3 CS · Dean's list · I make data structures click",
      'I scored an A in Data Structures and Database Systems and have helped classmates since first year. I like working through past papers together and drawing things out until they make sense.',
      10000, 'both', 'Main Library or CoCIS labs'),
    profile(2, 6, 'OOP and web development, explained with real projects',
      'I build web apps in my free time and teach object-oriented programming through small, practical projects. Bring your coursework and we will debug it together.',
      15000, 'online', ''),
    profile(3, 7, 'Accounting and economics without the panic',
      'Accounting is all about practice. I share worked examples, then we solve past questions step by step. I tutor for free because seniors helped me in first year.',
      0, 'in_person', 'CoBAMS study rooms'),
    profile(4, 8, 'Final-year civil engineer · mechanics made visual',
      'Structural and fluid mechanics become easier when you can see them. Expect lots of sketches, free-body diagrams and exam technique.',
      20000, 'in_person', 'CEDAT engineering library'),
    profile(5, 9, 'Stats and probability tutor · past-paper specialist',
      'I have collected and annotated four years of probability and inference past papers. Sessions focus on understanding the method, not memorising formulas.',
      8000, 'both', 'CoBAMS or online'),
    profile(6, 10, 'Operating systems and maths for computing students',
      'Final-year CS student. I cover OS concepts with simulations and help first years with calculus and linear algebra.',
      12000, 'online', ''),
    profile(7, 11, 'Beginner-friendly Python tutor at Kyambogo',
      'New to programming? I will help you get comfortable with Python, one small exercise at a time.',
      0, 'both', 'KyU ICT labs'),
  ];

  const tutor_courses = [
    [5, 2, 'A'], [5, 3, 'A'], [5, 1, 'A'], [5, 7, 'B+'],
    [6, 5, 'A'], [6, 6, 'A'],
    [7, 9, 'A'], [7, 10, 'B+'], [7, 11, 'A'],
    [8, 12, 'A'], [8, 13, 'B+'], [8, 7, 'A'],
    [9, 14, 'A'], [9, 15, 'A'], [9, 8, 'B+'],
    [10, 4, 'A'], [10, 7, 'A'], [10, 8, 'A'],
    [11, 16, 'A'],
  ].map(([tutor_id, course_id, grade], i) => ({ id: i + 1, tutor_id, course_id, grade }));

  // day_of_week: 0 = Sunday … 6 = Saturday. Times are local "HH:MM".
  const availability = [
    [5, 1, '14:00', '17:00'], [5, 3, '14:00', '17:00'], [5, 6, '09:00', '12:00'],
    [6, 2, '18:00', '21:00'], [6, 4, '18:00', '21:00'], [6, 0, '15:00', '18:00'],
    [7, 1, '10:00', '12:00'], [7, 4, '14:00', '16:00'],
    [8, 3, '16:00', '18:00'], [8, 5, '14:00', '18:00'],
    [9, 2, '10:00', '13:00'], [9, 5, '10:00', '13:00'], [9, 6, '14:00', '17:00'],
    [10, 1, '19:00', '21:00'], [10, 3, '19:00', '21:00'], [10, 6, '10:00', '13:00'],
    [11, 2, '14:00', '16:00'], [11, 4, '14:00', '16:00'],
  ].map(([tutor_id, day_of_week, start_time, end_time], i) => ({ id: i + 1, tutor_id, day_of_week, start_time, end_time }));

  const feeOf = (tutorId, minutes) => Math.round((tutor_profiles.find((p) => p.user_id === tutorId).fee * minutes) / 60);
  const session = (id, learner_id, tutor_id, course_id, topic, days, hour, status, duration_minutes = 60, mode = 'online', message = '', tutor_note = '') => ({
    id, learner_id, tutor_id, course_id, topic, scheduled_at: at(days, hour), duration_minutes, mode, message,
    fee: feeOf(tutor_id, duration_minutes), status, tutor_note, created_at: at(Math.min(days, 0) - 2, 8), updated_at: at(Math.min(days, 0) - 1, 8),
  });

  const sessions = [
    session(1, 2, 5, 2, 'Linked lists', -14, 14, 'completed', 60, 'in_person'),
    session(2, 3, 7, 9, 'Trial balance', -10, 10, 'completed', 90, 'in_person'),
    session(3, 4, 8, 12, 'Shear force & bending moment', -7, 16, 'completed', 120, 'in_person'),
    session(4, 2, 9, 14, 'Conditional probability', -5, 10, 'completed', 60, 'online'),
    session(5, 2, 5, 3, 'SQL joins', 2, 14, 'accepted', 60, 'online', 'Struggling with LEFT vs INNER joins before the coursework deadline.'),
    session(6, 3, 5, 7, 'Limits', 3, 15, 'requested', 60, 'online', 'I have a test next week and limits at infinity confuse me.'),
    session(7, 12, 5, 1, 'Pointers', 4, 9, 'requested', 90, 'in_person', 'Can we go through the pointer questions in last year\'s paper?'),
    session(8, 4, 6, 6, 'REST APIs', -3, 18, 'declined', 60, 'online', '', 'Sorry, this clashes with my exams. Please try next week.'),
    session(9, 2, 10, 7, 'Differentiation', -20, 19, 'completed', 60, 'online'),
    session(10, 3, 5, 2, 'Sorting', -21, 14, 'completed', 60, 'online'),
    session(11, 4, 9, 15, 'Hypothesis testing', -12, 10, 'completed', 90, 'online'),
    session(12, 12, 6, 5, 'Inheritance', -9, 18, 'completed', 60, 'online'),
    session(13, 2, 8, 7, 'Integration', -18, 16, 'completed', 60, 'in_person'),
    session(14, 4, 10, 4, 'CPU scheduling', -25, 19, 'completed', 60, 'online'),
    session(15, 12, 9, 14, 'Distributions', 1, 11, 'accepted', 60, 'online'),
  ];

  const review = (id, session_id, rating, comment) => {
    const s = sessions.find((x) => x.id === session_id);
    const created = new Date(s.scheduled_at);
    created.setDate(created.getDate() + 1);
    return { id, session_id, learner_id: s.learner_id, tutor_id: s.tutor_id, rating, comment, status: 'visible', created_at: created.toISOString() };
  };

  const reviews = [
    review(1, 1, 5, 'Grace explained linked lists with drawings and it finally clicked. We also did two past paper questions.'),
    review(2, 2, 4, 'Very patient and clear. I would have liked a few more practice questions.'),
    review(3, 3, 5, 'Ivan is brilliant. His sketches of bending moment diagrams saved my test.'),
    review(4, 9, 4, 'Good pace and lots of worked examples.'),
    review(5, 10, 5, 'Best tutor for DSA. Always prepared.'),
    review(6, 11, 5, 'Hypothesis testing finally makes sense. Highly recommend Esther.'),
    review(7, 12, 5, 'Joseph uses real code examples. Loved it.'),
    review(8, 13, 3, 'Helpful, but the session started late.'),
    review(9, 14, 1, 'Waste of time!!! Call 0700 000000 for better and cheaper help.'),
  ];

  const material = (id, uploader_id, course_id, title, type, url, description, downloads, daysAgo) => ({
    id, uploader_id, course_id, title, type, url, description, downloads, status: 'published', created_at: at(-daysAgo, 12),
  });

  const materials = [
    material(1, 5, 2, 'DSA cheat sheet: linked lists to trees', 'notes', 'https://example.org/peertutor/dsa-cheatsheet.pdf', 'Two-page summary with diagrams and complexity tables.', 48, 30),
    material(2, 5, 3, 'SQL joins practice set with solutions', 'notes', 'https://example.org/peertutor/sql-joins.pdf', '20 questions from easy to exam level.', 27, 21),
    material(3, 7, 9, 'Final accounts worked examples', 'notes', 'https://example.org/peertutor/final-accounts.pdf', 'Income statement and balance sheet walkthroughs.', 31, 25),
    material(4, 8, 12, 'Bending moment diagrams, step by step', 'video', 'https://example.org/peertutor/bending-moments', '18-minute walkthrough recorded after a group session.', 22, 14),
    material(5, 9, 14, 'Probability past papers 2021 to 2024 (annotated)', 'past_paper', 'https://example.org/peertutor/sta1101-past-papers.pdf', 'Annotated with the method for each question.', 64, 40),
    material(6, 6, 6, 'REST API starter project', 'link', 'https://example.org/peertutor/rest-starter', 'Starter code used in our sessions.', 19, 12),
    material(7, 10, 4, 'CPU scheduling slides', 'slides', 'https://example.org/peertutor/cpu-scheduling.pdf', 'FCFS, SJF, Round Robin with Gantt charts.', 12, 8),
    material(8, 11, 16, 'Python basics exercises', 'notes', 'https://example.org/peertutor/python-basics.pdf', 'Short exercises with answers.', 9, 5),
  ];

  const applications = [
    {
      id: 1, user_id: 12,
      headline: 'Year 2 CS · strong in programming fundamentals',
      motivation: 'I got an A in Structured Programming and a B+ in Data Structures. I already help my roommates debug their C code and would like to support more first-year students.',
      courses: [{ course_id: 1, grade: 'A' }, { course_id: 2, grade: 'B+' }],
      evidence_url: 'https://example.org/peertutor/results/collins-y1.pdf',
      fee: 5000, mode: 'online', status: 'pending', admin_note: '', reviewed_by: null, reviewed_at: null, created_at: at(-2, 11),
    },
  ];

  const reports = [
    {
      id: 1, reporter_id: 10, target_type: 'review', target_id: 9,
      reason: 'This review advertises a phone number and is not about our session.',
      status: 'open', resolved_by: null, resolved_at: null, created_at: at(-1, 15),
    },
  ];

  return { universities, programmes, courses, topics, users, tutor_profiles, tutor_courses, availability, sessions, reviews, materials, applications, reports };
}
