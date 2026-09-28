# PeerTutor

A student-to-student tutoring web application. Learners find verified student tutors by university,
programme, course, topic, availability and fee, then request sessions, open learning materials and
leave reviews. Students can apply to become tutors, and administrators verify tutors, manage users and
the course catalogue, and moderate content. The first target is Makerere University, and the data model
supports many universities.

The frontend uses plain HTML, CSS and JavaScript (ES modules), with **no build step**. Until a backend is
ready, a **mock REST API that runs in the browser** serves realistic demo data from `localStorage`.

## Run it

ES modules need to be served over HTTP. Opening `index.html` directly with `file://` will not work.

**VS Code:** install the recommended *Live Server* extension, right-click `index.html`, then choose **Open with Live Server**.

**Or from a terminal** (Node.js 18+):

```bash
npm start
```

Then open http://localhost:8080.

### Demo accounts (mock mode)

The password for every demo account is `password123`. The login page also has buttons that fill these in.

| Role | Email |
|---|---|
| Learner | learner@students.mak.ac.ug |
| Tutor | tutor@students.mak.ac.ug |
| Admin | admin@mak.ac.ug |

To restore the original data, use **Reset demo data** in the footer.

## What's included

| Area | Features |
|---|---|
| Public | Home page, tutor search with filters (university, programme, course, keyword/topic, day, mode, max fee, free only, sort), tutor profiles, course catalogue, materials library |
| Learner | Dashboard, session requests only at times the tutor is available, cancel sessions, rate and review, report content, apply to become a tutor |
| Tutor | Dashboard, accept/decline/complete sessions, edit profile, fee and courses, weekly availability editor, share materials |
| Admin | Platform statistics, verify or reject tutor applications, suspend or reactivate users, revoke tutor status, manage universities, programmes, courses and topics, moderate reports, reviews and materials |

## Project structure

```
peertutor/
├── index.html              App shell (navbar, <main>, footer, modal and toast roots)
├── assets/                 Static files (favicon)
├── css/
│   ├── base.css            Design tokens (colours, fonts, radii), reset, utilities
│   ├── layout.css          Container, navbar, footer, dashboard shell, sections
│   ├── components.css      Buttons, cards, forms, badges, tables, tabs, modal, toast…
│   └── pages.css           Page-specific styles
├── js/
│   ├── app.js              Entry point: restores the session, renders the shell, starts the router
│   ├── config.js           API_MODE ('mock' | 'http'), API_BASE_URL, currency, demo accounts
│   ├── router.js           Hash router with role-based guards
│   ├── routes.js           Route table: path → page module (+ allowed roles)
│   ├── state/session.js    Signed-in user and token
│   ├── api/
│   │   ├── client.js       The only place that performs requests (mock or fetch)
│   │   └── mock/           In-browser mock backend
│   │       ├── server.js   Mini router: METHOD /path → handler
│   │       ├── db.js       localStorage-backed tables
│   │       ├── seed.js     Demo data
│   │       ├── queries.js  Joins / response shapes
│   │       └── routes/     auth, catalog, tutors, sessions, reviews, materials, applications, admin
│   ├── services/           One module per resource; pages call these, never the API directly
│   ├── components/         Reusable UI: navbar, footer, modal, toast, tutor card, session item, etc.
│   └── pages/              One module per screen, each exporting render(el, ctx)
│       ├── auth/  tutors/  learner/  tutor/  admin/
│       └── home.js  courses.js  materials.js
├── database/
│   ├── schema.sql          Relational schema (MySQL 8, with notes for PostgreSQL)
│   └── seed.sql            Starter data
└── docs/API.md             REST API contract the backend must implement
```

### How a page works

```js
// js/pages/example.js
export async function render(el, { params, query, user }) {
  el.innerHTML = `…`;                       // build the markup (pass user data through esc())
  const data = await someService.list();    // fetch through a service
  el.querySelector('…').addEventListener(…) // attach listeners to elements inside the page
}
```

To add a page, create the module and add it to `js/routes.js`, with `roles` if the page is protected.

## Connecting a real backend

1. Build an API that implements [`docs/API.md`](docs/API.md) with any stack: Node/Express, Laravel, Django, Spring, etc.
   Each file in `js/api/mock/routes/` maps one-to-one to a backend controller or router and already contains
   the validation and business rules to port.
2. Create the database from `database/schema.sql` and load `database/seed.sql`.
3. In `js/config.js`, set:
   ```js
   API_MODE: 'http',
   API_BASE_URL: 'https://your-api.example.com/api',
   ```
4. Enable CORS on the API for the frontend's origin, or serve both from the same domain.

Nothing else in the frontend needs to change.

### Backend checklist

- Hash passwords with bcrypt or argon2. Issue JWTs or HTTP-only session cookies. Rate-limit `/auth/login`.
- Verify university email addresses by sending a confirmation link before the account is activated.
- Enforce every role check on the server. Frontend route guards only improve the user experience.
- Wrap application approval in a transaction (see API.md).
- Store session times in UTC and keep tutors' availability in the university's timezone (Africa/Kampala).
- Move material uploads and results slips to object storage (S3, Cloudinary, Supabase Storage) and return signed URLs.
- Add notifications (email, SMS or in-app) for session requests, accept/decline decisions and application results.
- Payments are out of scope today. Fees are shown and agreed between students. A mobile-money integration
  (e.g. MTN MoMo or Airtel Money) could be added later, using a `payments` table linked to `sessions`.

## Roadmap ideas

- In-app messaging between learner and tutor
- Calendar export (.ics) and reminders
- Group sessions
- Tutor earnings and hours reports for admins
- Clean URLs using the History API (requires a server fallback to `index.html`)
