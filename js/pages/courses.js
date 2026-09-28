import { catalogService } from '../services/catalogService.js';
import { esc, options, emptyState, pluralize } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { config } from '../config.js';
import { session } from '../state/session.js';

function courseCard(c) {
  return `
    <article class="card course-card-full">
      <div class="course-card-top">
        <span class="course-code">${esc(c.code)}</span>
        <span class="muted small">Year ${c.year} · Semester ${c.semester}</span>
      </div>
      <h3>${esc(c.title)}</h3>
      <p class="muted small">${esc(c.programme)} · ${esc(c.university)}</p>
      <div class="chips">${c.topics.slice(0, 4).map((t) => `<span class="chip">${esc(t.name)}</span>`).join('')}${c.topics.length > 4 ? `<span class="chip chip-muted">+${c.topics.length - 4}</span>` : ''}</div>
      <div class="course-card-actions">
        <a class="btn btn-primary btn-sm" href="#/tutors?course_id=${c.id}">${icon('users')} ${pluralize(c.tutor_count, 'tutor')}</a>
        <a class="btn btn-ghost btn-sm" href="#/materials?course_id=${c.id}">${icon('book')} ${pluralize(c.material_count, 'material')}</a>
      </div>
    </article>`;
}

export async function render(el, { query }) {
  const user = session.getUser();
  const universities = await catalogService.universities();
  const state = {
    university_id: query.university_id || String(user?.university_id || config.DEFAULT_UNIVERSITY_ID),
    programme_id: query.programme_id || '',
    year: '',
    q: query.q || '',
  };

  el.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <div>
          <h1>Courses</h1>
          <p class="muted">Browse course units and jump straight to tutors and materials.</p>
        </div>
      </header>
      <form class="toolbar card" id="course-filters">
        <div class="input-icon grow">${icon('search')}<label class="sr-only" for="c-q">Search courses</label><input id="c-q" type="search" name="q" placeholder="Search by code, title or topic" value="${esc(state.q)}"></div>
        <label class="sr-only" for="c-uni">University</label>
        <select id="c-uni" name="university_id">${options(universities, { selected: state.university_id })}</select>
        <label class="sr-only" for="c-prog">Programme</label>
        <select id="c-prog" name="programme_id"></select>
        <label class="sr-only" for="c-year">Year</label>
        <select id="c-year" name="year">${options([1, 2, 3, 4].map((y) => ({ id: y, name: `Year ${y}` })), { placeholder: 'All years' })}</select>
      </form>
      <p class="muted small" id="course-count" aria-live="polite"></p>
      <div class="grid grid-3" id="course-grid"></div>
    </div>`;

  const form = el.querySelector('#course-filters');
  const grid = el.querySelector('#course-grid');
  const count = el.querySelector('#course-count');

  async function loadProgrammes() {
    const programmes = await catalogService.programmes(state.university_id);
    form.programme_id.innerHTML = options(programmes, { placeholder: 'All programmes', selected: state.programme_id });
  }

  async function load() {
    const courses = await catalogService.courses(state);
    count.textContent = `${pluralize(courses.length, 'course')}`;
    grid.innerHTML = courses.length
      ? courses.map(courseCard).join('')
      : emptyState({ iconName: 'book', title: 'No courses found', text: 'Try a different programme or search term.' });
  }

  let debounce;
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 250);
  });
  form.addEventListener('change', async (e) => {
    if (e.target.name === 'q') return;
    state[e.target.name] = e.target.value;
    if (e.target.name === 'university_id') {
      state.programme_id = '';
      await loadProgrammes();
    }
    load();
  });

  await loadProgrammes();
  await load();
}
