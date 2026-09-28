-- ============================================================================
-- Minimal starter data for a fresh database (run after schema.sql).
-- The full demo dataset lives in js/api/mock/seed.js.
-- Replace the admin password hash before going live:
--   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
-- ============================================================================

INSERT INTO universities (id, name, short_name, email_domain, city, is_active) VALUES
  (1, 'Makerere University', 'MAK', 'mak.ac.ug', 'Kampala', TRUE),
  (2, 'Kyambogo University', 'KyU', 'kyu.ac.ug', 'Kampala', TRUE);

INSERT INTO programmes (id, university_id, code, name) VALUES
  (1, 1, 'BSCS',  'BSc Computer Science'),
  (2, 1, 'BSSE',  'BSc Software Engineering'),
  (3, 1, 'BCOM',  'Bachelor of Commerce'),
  (4, 1, 'BSCE',  'BSc Civil Engineering'),
  (5, 1, 'BSTAT', 'Bachelor of Science in Statistics'),
  (6, 2, 'BCS',   'BSc Computer Science');

INSERT INTO courses (id, university_id, programme_id, code, title, year, semester) VALUES
  (1,  1, 1,    'CSC 1102', 'Structured Programming', 1, 1),
  (2,  1, 1,    'CSC 1204', 'Data Structures and Algorithms', 1, 2),
  (3,  1, 1,    'CSC 2100', 'Database Systems', 2, 1),
  (4,  1, 1,    'CSC 2209', 'Operating Systems', 2, 2),
  (5,  1, 2,    'BSE 1207', 'Object-Oriented Programming', 1, 2),
  (6,  1, 2,    'BSE 2201', 'Web Application Development', 2, 2),
  (7,  1, NULL, 'MTH 1101', 'Calculus I', 1, 1),
  (8,  1, NULL, 'MTH 1203', 'Linear Algebra', 1, 2),
  (9,  1, 3,    'BAF 1101', 'Principles of Accounting', 1, 1),
  (10, 1, 3,    'ECO 1101', 'Principles of Microeconomics', 1, 1),
  (11, 1, 3,    'BAF 2201', 'Financial Management', 2, 2),
  (12, 1, 4,    'CIV 2101', 'Structural Mechanics', 2, 1),
  (13, 1, 4,    'CIV 2203', 'Fluid Mechanics', 2, 2),
  (14, 1, 5,    'STA 1101', 'Probability Theory', 1, 1),
  (15, 1, 5,    'STA 2102', 'Statistical Inference', 2, 1),
  (16, 2, 6,    'CSC 111',  'Introduction to Programming', 1, 1);

INSERT INTO topics (course_id, name) VALUES
  (2, 'Linked lists'), (2, 'Stacks & queues'), (2, 'Trees'), (2, 'Sorting'), (2, 'Recursion'),
  (3, 'ER modelling'), (3, 'Normalisation'), (3, 'SQL joins'), (3, 'Transactions'),
  (7, 'Limits'), (7, 'Differentiation'), (7, 'Integration'),
  (9, 'Double entry'), (9, 'Trial balance'), (9, 'Final accounts'),
  (14, 'Conditional probability'), (14, 'Random variables'), (14, 'Distributions');

-- Initial administrator. The hash below is a placeholder and will not work until replaced.
INSERT INTO users (university_id, programme_id, full_name, email, password_hash, role, status) VALUES
  (1, NULL, 'Platform Administrator', 'admin@mak.ac.ug', '$2b$12$REPLACE_WITH_A_REAL_BCRYPT_HASH', 'admin', 'active');
