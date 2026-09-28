# PeerTutor REST API contract

The frontend talks to the API only through `js/api/client.js`. Today those calls are answered by the
in-browser mock (`js/api/mock/routes/*.js`). A real backend must implement the same endpoints and
response shapes. Then set `API_MODE: 'http'` in `js/config.js`.

**Conventions**

- Base URL: `config.API_BASE_URL`, e.g. `http://localhost:4000/api`
- JSON request and response bodies. Timestamps are ISO-8601 strings in UTC.
- Auth: `Authorization: Bearer <token>` header. Login and register return `{ token, user }`.
- Errors: a non-2xx status with `{ "message": "Human readable reason" }`. The UI shows `message` directly.
  - `401` not signed in or token invalid (the client clears the session)
  - `403` signed in but not allowed
  - `404` not found · `409` conflict (duplicate, already processed) · `422` validation error
- Roles: `learner`, `tutor`, `admin`. Tutors can do everything learners can.

Mock table names match `database/schema.sql`, except the mock's `applications` table, which is
`tutor_applications` plus `application_courses` in SQL.

## Auth

| Method | Path | Access | Body / query | Returns |
|---|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` | `{ token, user }` |
| POST | `/auth/register` | public | `{ full_name, email, password, university_id, programme_id, year_of_study }` | `{ token, user }` |
| GET | `/auth/me` | signed in | | `user` |

Registration requires the email to end in the university's `email_domain`. New accounts are always `learner`.

`user` = `{ id, full_name, email, role, status, university_id, university, university_name, programme_id, programme, year_of_study, created_at }`

## Catalogue

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/stats` | public | `{ tutors, courses, sessions_completed, avg_rating, universities }` |
| GET | `/universities` | public | `?all=1` also returns inactive universities (admin only) |
| POST | `/universities` | admin | `{ name, short_name, email_domain, city, is_active }` |
| PUT | `/universities/:id` | admin | same body |
| GET | `/programmes` | public | `?university_id=` · each item includes `course_count` |
| POST | `/programmes` | admin | `{ university_id, code, name }` |
| DELETE | `/programmes/:id` | admin | 409 if courses or students still reference it |
| GET | `/courses` | public | `?university_id=&programme_id=&year=&q=&sort=popular&limit=` · filtering by programme also returns shared courses |
| GET | `/courses/:id` | public | |
| POST | `/courses` | admin | `{ university_id, programme_id?, code, title, year, semester, topics }`. `topics` is a comma- or newline-separated string, or an array |
| PUT | `/courses/:id` | admin | same body, replaces topics |
| DELETE | `/courses/:id` | admin | 409 if sessions or materials reference it |

`course` = `{ id, university_id, university, programme_id, programme, code, title, year, semester, topics: [{id, name}], tutor_count, material_count }`

## Tutors

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/tutors` | public | Filters: `q, university_id, programme_id, course_id, day (0-6), mode (online\|in_person), max_fee, free_only, sort (rating\|sessions\|fee_low\|fee_high\|newest), limit`. Only active, verified tutors |
| GET | `/tutors/:id` | public | Detail, including `bio`, `courses[{id, code, title, grade, topics[]}]` and `availability[]` |
| GET | `/tutors/:id/reviews` | public | Visible reviews. `learner_name` is shortened to "First L." |
| GET | `/me/tutor-profile` | tutor | Own profile with `courses[{course_id, grade}]` and `availability[]` |
| PUT | `/me/tutor-profile` | tutor | `{ headline, bio, fee, mode, location }` |
| PUT | `/me/tutor-courses` | tutor | `{ courses: [{ course_id, grade }] }`. Replaces the list; courses must be at the tutor's university |
| PUT | `/me/availability` | tutor | `{ slots: [{ day_of_week, start_time: "HH:MM", end_time }] }`. Replaces the list; no overlaps |

`tutorSummary` = `{ id, full_name, university_id, university, programme_id, programme, year_of_study, headline, fee, mode, location, is_verified, rating, review_count, sessions_completed, courses[{id, code, title, programme_id}], availability_days[], created_at }`

## Sessions

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/sessions` | learner, tutor | `{ tutor_id, course_id, topic, scheduled_at, duration_minutes (30/60/90/120), mode, message }` |
| GET | `/me/sessions` | signed in | `?as=learner\|tutor&status=requested,accepted` |
| PATCH | `/sessions/:id` | participant | `{ status, note }` |

Booking rules enforced by the server:

- The tutor teaches the course, is verified and active, and is not the requester.
- The time is in the future and falls **entirely inside** one of the tutor's availability slots.
- The time does not overlap the tutor's other requested or accepted sessions (409).
- `fee = tutor.fee × duration / 60`, fixed at booking time.

Status transitions:

| Actor | From | To |
|---|---|---|
| tutor | requested | accepted, declined |
| tutor | accepted | completed (only after start time), cancelled |
| learner | requested, accepted | cancelled |

`session` = session row + `{ learner_name, tutor_name, course_code, course_title, reviewed }`

## Reviews

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/reviews` | learner of the session | `{ session_id, rating (1-5), comment }`. Only for completed sessions; one per session |
| GET | `/admin/reviews` | admin | `?status=visible\|hidden` |
| PATCH | `/admin/reviews/:id` | admin | `{ status: 'visible' \| 'hidden' }` |

## Learning materials

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/materials` | public | `?course_id=&uploader_id=&type=&q=&sort=popular`. Published only. `url` is omitted for anonymous users |
| GET | `/me/materials` | tutor | Own materials, including hidden ones |
| POST | `/materials` | tutor | `{ course_id, title, type, url, description }`. Tutor must teach the course |
| DELETE | `/materials/:id` | owner or admin | |
| POST | `/materials/:id/open` | signed in | Increments `downloads` and returns `{ url }` (use signed URLs with file storage) |
| GET | `/admin/materials` | admin | All materials |
| PATCH | `/admin/materials/:id` | admin | `{ status: 'published' \| 'hidden' }` |

Types: `notes`, `past_paper`, `slides`, `video`, `link`.

## Tutor applications

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/me/application` | signed in | Latest application or `null` |
| POST | `/applications` | learner | `{ headline, motivation (≥50 chars), courses: [{course_id, grade}], evidence_url, fee, mode }`. One pending application at a time |
| GET | `/admin/applications` | admin | `?status=pending\|approved\|rejected` |
| PATCH | `/admin/applications/:id` | admin | `{ status: 'approved' \| 'rejected', admin_note }`. `admin_note` is required when rejecting |

Approving an application sets `users.role = 'tutor'`, creates or re-verifies the `tutor_profiles` row and
copies the application's courses into `tutor_courses`. Run all of this in **one transaction**.

## Administration and reports

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/admin/stats` | admin | User, session, application, report and course statistics |
| GET | `/admin/users` | admin | `?q=&role=&status=` |
| PATCH | `/admin/users/:id` | admin | `{ status: 'active' \| 'suspended' }` or `{ role: 'learner' }` (revoke tutor) or `{ role: 'tutor' }` (reinstate). Admins cannot change their own account |
| POST | `/reports` | signed in | `{ target_type: 'review' \| 'material' \| 'user', target_id, reason }` |
| GET | `/admin/reports` | admin | `?status=open\|resolved\|dismissed` |
| PATCH | `/admin/reports/:id` | admin | `{ status }` |
| POST | `/dev/reset` | mock only | Restores demo data. Do **not** implement in production |
