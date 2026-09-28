import { tutorService } from '../services/tutorService.js';
import { catalogService } from '../services/catalogService.js';
import { session } from '../state/session.js';
import { tutorCard } from '../components/tutorCard.js';
import { esc, options, pluralize } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { config } from '../config.js';
import { qs } from '../api/client.js';

function courseCard(c) {
  return `
    <a class="card course-card" href="#/tutors?course_id=${c.id}">
      <span class="course-code">${esc(c.code)}</span>
      <h3>${esc(c.title)}</h3>
      <p class="muted small">${esc(c.programme)} · Year ${c.year}</p>
      <span class="course-card-foot small">${icon('users')} ${pluralize(c.tutor_count, 'tutor')} ${icon('arrowRight', 'push-right')}</span>
    </a>`;
}

export async function render(el) {
  const [stats, tutors, courses, universities] = await Promise.all([
    catalogService.publicStats(),
    tutorService.search({ sort: 'rating', limit: 3 }),
    catalogService.courses({ university_id: config.DEFAULT_UNIVERSITY_ID, sort: 'popular', limit: 6 }),
    catalogService.universities(),
  ]);
  const user = session.getUser();
  const tutorCta = user ? '#/become-tutor' : '#/register?tutor=1';

  el.innerHTML = `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon('cap')} Now live at Makerere University</span>
          <h1>Get help from students who <span class="hl">aced your course</span>.</h1>
          <p class="lead">PeerTutor connects you with verified student tutors from your university, matched by programme, course and topic, at times that fit your timetable.</p>
          <form class="hero-search" id="hero-search" role="search">
            <div class="input-icon grow">
              ${icon('search')}
              <label class="sr-only" for="hero-q">Course, topic or tutor</label>
              <input id="hero-q" name="q" type="search" placeholder="Try “CSC 1204”, “recursion” or “accounting”">
            </div>
            <label class="sr-only" for="hero-uni">University</label>
            <select id="hero-uni" name="university_id">${options(universities, { selected: config.DEFAULT_UNIVERSITY_ID, placeholder: 'All universities' })}</select>
            <button class="btn btn-primary btn-lg" type="submit">Find a tutor</button>
          </form>
          <p class="hero-popular small">Popular: ${courses.slice(0, 4).map((c) => `<a href="#/tutors?course_id=${c.id}">${esc(c.code)}</a>`).join('')}</p>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="float-card float-card-a">
            <div class="float-row"><span class="dot dot-success"></span><strong>Session accepted</strong></div>
            <p class="small muted">CSC 1204 · Linked lists</p>
            <p class="small">Tomorrow, 2:00 PM · Main Library</p>
          </div>
          <div class="float-card float-card-b">
            <div class="float-row"><span class="stars"><span class="star full">★</span><span class="star full">★</span><span class="star full">★</span><span class="star full">★</span><span class="star full">★</span></span></div>
            <p class="small">“Finally understood recursion before my test.”</p>
          </div>
          <div class="hero-blob">
            ${icon('cap')}
            <strong>${stats.tutors}</strong>
            <span>verified tutors</span>
          </div>
        </div>
      </div>
    </section>

    <section class="stats-strip">
      <div class="container stats-strip-inner">
        <div><strong>${stats.tutors}</strong><span>Verified student tutors</span></div>
        <div><strong>${stats.courses}</strong><span>Courses covered</span></div>
        <div><strong>${stats.sessions_completed}</strong><span>Sessions completed</span></div>
        <div><strong>${stats.avg_rating ? stats.avg_rating.toFixed(1) : '–'}★</strong><span>Average tutor rating</span></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head center">
          <h2>How PeerTutor works</h2>
          <p class="muted">From “I’m lost” to “I’ve got this” in three steps.</p>
        </div>
        <ol class="steps">
          <li class="step">
            <span class="step-icon">${icon('search')}</span>
            <h3>Search by course or topic</h3>
            <p class="muted">Filter tutors by university, programme, course, topic, availability and fee.</p>
          </li>
          <li class="step">
            <span class="step-icon">${icon('calendar')}</span>
            <h3>Request a session</h3>
            <p class="muted">Pick a time from the tutor’s weekly availability, online or on campus.</p>
          </li>
          <li class="step">
            <span class="step-icon">${icon('star')}</span>
            <h3>Learn, then review</h3>
            <p class="muted">Rate your tutor afterwards so other students know who to trust.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <div class="section-head split">
          <div><h2>Top-rated tutors</h2><p class="muted">Verified by PeerTutor using their academic results.</p></div>
          <a class="btn btn-ghost" href="#/tutors">View all tutors ${icon('arrowRight')}</a>
        </div>
        <div class="grid grid-3">${tutors.map(tutorCard).join('')}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head split">
          <div><h2>Popular courses</h2><p class="muted">Where students are finding the most help.</p></div>
          <a class="btn btn-ghost" href="#/courses">All courses ${icon('arrowRight')}</a>
        </div>
        <div class="grid grid-3">${courses.map(courseCard).join('')}</div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <div class="section-head center"><h2>Built for everyone on campus</h2></div>
        <div class="grid grid-3">
          <article class="card role-card">
            <span class="role-icon tone-primary">${icon('book')}</span>
            <h3>Learners</h3>
            <ul class="check-list">
              <li>Find tutors for your exact course unit</li>
              <li>Book around your lectures</li>
              <li>Access notes and past papers</li>
              <li>Rate and review sessions</li>
            </ul>
          </article>
          <article class="card role-card">
            <span class="role-icon tone-accent">${icon('cap')}</span>
            <h3>Tutors</h3>
            <ul class="check-list">
              <li>Teach courses you excelled in</li>
              <li>Set your own availability and fee, or tutor for free</li>
              <li>Share learning materials</li>
              <li>Build a verified reputation</li>
            </ul>
          </article>
          <article class="card role-card">
            <span class="role-icon tone-info">${icon('shieldCheck')}</span>
            <h3>Administrators</h3>
            <ul class="check-list">
              <li>Verify tutors’ academic records</li>
              <li>Manage universities, programmes and courses</li>
              <li>Moderate reviews and materials</li>
              <li>Keep the community safe</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Aced a course? Help someone else ace it.</h2>
          <p>Apply to become a verified PeerTutor. Tutor for free or set a fair hourly fee.</p>
        </div>
        <a class="btn btn-accent btn-lg" href="${tutorCta}">Become a tutor</a>
      </div>
    </section>`;

  el.querySelector('#hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    location.hash = `/tutors${qs({ q: form.q.value.trim(), university_id: form.university_id.value })}`;
  });
}
