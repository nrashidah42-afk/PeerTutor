-- ============================================================================
-- PeerTutor relational schema (MySQL 8 / MariaDB 10.6+)
-- Mirrors the tables used by the in-browser mock API (js/api/mock/seed.js).
-- For PostgreSQL: replace AUTO_INCREMENT with GENERATED ALWAYS AS IDENTITY,
-- ENUM columns with CHECK constraints or custom types, and DATETIME with TIMESTAMPTZ.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE universities (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  short_name    VARCHAR(10)  NOT NULL,
  email_domain  VARCHAR(100) NOT NULL,           -- students must register with this domain
  city          VARCHAR(100) NOT NULL DEFAULT '',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_universities_domain (email_domain)
) ENGINE=InnoDB;

CREATE TABLE programmes (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  university_id  INT UNSIGNED NOT NULL,
  code           VARCHAR(10)  NOT NULL,
  name           VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_programmes_code (university_id, code),
  CONSTRAINT fk_programmes_university FOREIGN KEY (university_id) REFERENCES universities(id)
) ENGINE=InnoDB;

CREATE TABLE courses (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  university_id  INT UNSIGNED NOT NULL,
  programme_id   INT UNSIGNED NULL,               -- NULL = shared across programmes (e.g. Calculus I)
  code           VARCHAR(12)  NOT NULL,
  title          VARCHAR(150) NOT NULL,
  year           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  semester       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_courses_code (university_id, code),
  KEY ix_courses_programme (programme_id),
  CONSTRAINT fk_courses_university FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_courses_programme  FOREIGN KEY (programme_id)  REFERENCES programmes(id)
) ENGINE=InnoDB;

CREATE TABLE topics (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_topics_name (course_id, name),
  CONSTRAINT fk_topics_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  university_id   INT UNSIGNED NOT NULL,
  programme_id    INT UNSIGNED NULL,
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,          -- bcrypt/argon2 hash, never plain text
  role            ENUM('learner','tutor','admin') NOT NULL DEFAULT 'learner',
  status          ENUM('active','suspended')      NOT NULL DEFAULT 'active',
  year_of_study   TINYINT UNSIGNED NULL,
  email_verified_at DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_status (role, status),
  CONSTRAINT fk_users_university FOREIGN KEY (university_id) REFERENCES universities(id),
  CONSTRAINT fk_users_programme  FOREIGN KEY (programme_id)  REFERENCES programmes(id)
) ENGINE=InnoDB;

-- One row per tutor (created when an application is approved).
CREATE TABLE tutor_profiles (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  headline     VARCHAR(120) NOT NULL,
  bio          TEXT NULL,
  fee          INT UNSIGNED NOT NULL DEFAULT 0,  -- per hour, in UGX; 0 = free
  mode         ENUM('online','in_person','both') NOT NULL DEFAULT 'both',
  location     VARCHAR(100) NOT NULL DEFAULT '',
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at  DATETIME NULL,
  UNIQUE KEY uq_tutor_profiles_user (user_id),
  CONSTRAINT fk_tutor_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tutor_courses (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tutor_id   INT UNSIGNED NOT NULL,
  course_id  INT UNSIGNED NOT NULL,
  grade      VARCHAR(3) NOT NULL DEFAULT '',      -- grade the tutor obtained
  UNIQUE KEY uq_tutor_courses (tutor_id, course_id),
  KEY ix_tutor_courses_course (course_id),
  CONSTRAINT fk_tutor_courses_tutor  FOREIGN KEY (tutor_id)  REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_tutor_courses_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recurring weekly slots. day_of_week: 0 = Sunday … 6 = Saturday.
CREATE TABLE availability (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tutor_id     INT UNSIGNED NOT NULL,
  day_of_week  TINYINT UNSIGNED NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  KEY ix_availability_tutor_day (tutor_id, day_of_week),
  CONSTRAINT fk_availability_tutor FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_availability_day  CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT ck_availability_time CHECK (start_time < end_time)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  learner_id        INT UNSIGNED NOT NULL,
  tutor_id          INT UNSIGNED NOT NULL,
  course_id         INT UNSIGNED NOT NULL,
  topic             VARCHAR(120) NOT NULL DEFAULT '',
  scheduled_at      DATETIME NOT NULL,           -- store in UTC
  duration_minutes  SMALLINT UNSIGNED NOT NULL,
  mode              ENUM('online','in_person') NOT NULL,
  message           VARCHAR(500) NOT NULL DEFAULT '',
  fee               INT UNSIGNED NOT NULL DEFAULT 0,  -- fee agreed at booking time
  status            ENUM('requested','accepted','declined','completed','cancelled') NOT NULL DEFAULT 'requested',
  tutor_note        VARCHAR(500) NOT NULL DEFAULT '',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_sessions_tutor (tutor_id, status, scheduled_at),
  KEY ix_sessions_learner (learner_id, status, scheduled_at),
  CONSTRAINT fk_sessions_learner FOREIGN KEY (learner_id) REFERENCES users(id),
  CONSTRAINT fk_sessions_tutor   FOREIGN KEY (tutor_id)   REFERENCES users(id),
  CONSTRAINT fk_sessions_course  FOREIGN KEY (course_id)  REFERENCES courses(id)
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  INT UNSIGNED NOT NULL,
  learner_id  INT UNSIGNED NOT NULL,
  tutor_id    INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     VARCHAR(1000) NOT NULL DEFAULT '',
  status      ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reviews_session (session_id),      -- one review per session
  KEY ix_reviews_tutor (tutor_id, status),
  CONSTRAINT fk_reviews_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  CONSTRAINT fk_reviews_learner FOREIGN KEY (learner_id) REFERENCES users(id),
  CONSTRAINT fk_reviews_tutor   FOREIGN KEY (tutor_id)   REFERENCES users(id),
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE materials (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uploader_id  INT UNSIGNED NOT NULL,
  course_id    INT UNSIGNED NOT NULL,
  title        VARCHAR(150) NOT NULL,
  type         ENUM('notes','past_paper','slides','video','link') NOT NULL,
  url          VARCHAR(500) NOT NULL,              -- external link or object-storage key
  description  VARCHAR(500) NOT NULL DEFAULT '',
  downloads    INT UNSIGNED NOT NULL DEFAULT 0,
  status       ENUM('published','hidden') NOT NULL DEFAULT 'published',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_materials_course (course_id, status),
  CONSTRAINT fk_materials_uploader FOREIGN KEY (uploader_id) REFERENCES users(id),
  CONSTRAINT fk_materials_course   FOREIGN KEY (course_id)   REFERENCES courses(id)
) ENGINE=InnoDB;

CREATE TABLE tutor_applications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  headline      VARCHAR(120) NOT NULL,
  motivation    TEXT NOT NULL,
  evidence_url  VARCHAR(500) NOT NULL,             -- results slip / transcript
  fee           INT UNSIGNED NOT NULL DEFAULT 0,
  mode          ENUM('online','in_person','both') NOT NULL DEFAULT 'both',
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_note    VARCHAR(1000) NOT NULL DEFAULT '',
  reviewed_by   INT UNSIGNED NULL,
  reviewed_at   DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_applications_status (status, created_at),
  CONSTRAINT fk_applications_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Courses listed on an application (the mock API stores these inline as `courses`).
CREATE TABLE application_courses (
  application_id  INT UNSIGNED NOT NULL,
  course_id       INT UNSIGNED NOT NULL,
  grade           VARCHAR(3) NOT NULL DEFAULT '',
  PRIMARY KEY (application_id, course_id),
  CONSTRAINT fk_app_courses_application FOREIGN KEY (application_id) REFERENCES tutor_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_courses_course      FOREIGN KEY (course_id)      REFERENCES courses(id)
) ENGINE=InnoDB;

CREATE TABLE reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id  INT UNSIGNED NOT NULL,
  target_type  ENUM('review','material','user') NOT NULL,
  target_id    INT UNSIGNED NOT NULL,              -- polymorphic reference, validated in the API
  reason       VARCHAR(500) NOT NULL,
  status       ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  resolved_by  INT UNSIGNED NULL,
  resolved_at  DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_reports_status (status, created_at),
  KEY ix_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Handy read model for tutor search results.
CREATE OR REPLACE VIEW tutor_ratings AS
SELECT tutor_id,
       ROUND(AVG(rating), 1) AS rating,
       COUNT(*)              AS review_count
FROM reviews
WHERE status = 'visible'
GROUP BY tutor_id;
