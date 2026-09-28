/** Tutor search with filters kept in the URL (#/tutors?course_id=2&day=1) so results are shareable. */
import { tutorService } from '../../services/tutorService.js';
import { catalogService } from '../../services/catalogService.js';
import { tutorCard } from '../../components/tutorCard.js';
import { esc, options, emptyState, DAYS, WEEK_ORDER, pluralize } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { qs } from '../../api/client.js';

const FIELDS = ['q', 'university_id', 'programme_id', 'course_id', 'day', 'mode', 'max_fee', 'free_only', 'sort'];
const SORTS = [
  { id: 'rating', name: 'Top rated' },
  { id: 'sessions', name: 'Most sessions' },
  { id: 'fee_low', name: 'Fee: low to high' },
  { id: 'fee_high', name: 'Fee: high to low' },
  { id: 'newest', name: 'Newest tutors' },
];

const skeleton = () => Array.from({ length: 6 }, () => '<div class="card skeleton-card"></div>').join('');

export async function render(el, { query }) {
  const filters = Object.fromEntries(FIELDS.map((f) => [f, query[f] || '']));
  filters.sort ||= 'rating';
  const universities = await catalogService.universities();

  el.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <div>
          <h1>Find a tutor</h1>
          <p class="muted">Verified student tutors, filtered by what you’re studying.</p>
        </div>
        <button type="button" class="btn btn-soft filters-toggle" aria-expanded="false" aria-controls="filters-panel">${icon('filter')} Filters</button>
      </header>

      <div class="search-layout">
        <aside class="card filters" id="filters-panel" aria-label="Search filters">
          <form id="filters" class="stack">
            <div class="field">
              <label for="f-q">Keyword</label>
              <div class="input-icon">${icon('search')}<input id="f-q" name="q" type="search" value="${esc(filters.q)}" placeholder="Course, topic or name"></div>
            </div>
            <div class="field">
              <label for="f-uni">University</label>
              <select id="f-uni" name="university_id">${options(universities, { placeholder: 'All universities', selected: filters.university_id })}</select>
            </div>
            <div class="field">
              <label for="f-prog">Programme</label>
              <select id="f-prog" name="programme_id"></select>
            </div>
            <div class="field">
              <label for="f-course">Course</label>
              <select id="f-course" name="course_id"></select>
            </div>
            <div class="field">
              <label for="f-day">Available on</label>
              <select id="f-day" name="day">${options(WEEK_ORDER.map((d) => ({ id: d, name: DAYS[d] })), { placeholder: 'Any day', selected: filters.day })}</select>
            </div>
            <div class="field">
              <label for="f-mode">Session mode</label>
              <select id="f-mode" name="mode">${options([{ id: 'online', name: 'Online' }, { id: 'in_person', name: 'In person' }], { placeholder: 'Any', selected: filters.mode })}</select>
            </div>
            <div class="field">
              <label for="f-fee">Max fee per hour (UGX)</label>
              <input id="f-fee" name="max_fee" type="number" min="0" step="1000" inputmode="numeric" value="${esc(filters.max_fee)}" placeholder="No limit">
            </div>
            <label class="check"><input type="checkbox" name="free_only" value="1"${filters.free_only ? ' checked' : ''}><span>Free tutoring only</span></label>
            <button type="reset" class="btn btn-ghost btn-block">Clear filters</button>
          </form>
        </aside>

        <section class="results" aria-labelledby="result-count">
          <div class="results-bar">
            <p id="result-count" class="muted" aria-live="polite"></p>
            <label class="inline-field small">Sort by
              <select name="sort" form="filters">${options(SORTS, { selected: filters.sort })}</select>
            </label>
          </div>
          <div id="results" class="grid grid-2-lg"></div>
        </section>
      </div>
    </div>`;

  const form = el.querySelector('#filters');
  const progSelect = form.programme_id;
  const courseSelect = form.course_id;
  const sortSelect = el.querySelector('select[name="sort"]');
  const results = el.querySelector('#results');
  const count = el.querySelector('#result-count');
  const toggle = el.querySelector('.filters-toggle');
  let requestId = 0;

  toggle.addEventListener('click', () => {
    const open = el.querySelector('.filters').classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  async function loadProgrammes() {
    const list = filters.university_id ? await catalogService.programmes(filters.university_id) : [];
    progSelect.innerHTML = options(list, {
      placeholder: filters.university_id ? 'All programmes' : 'Choose a university first',
      selected: filters.programme_id,
    });
    progSelect.disabled = !filters.university_id;
  }

  async function loadCourses() {
    const list = await catalogService.courses({ university_id: filters.university_id, programme_id: filters.programme_id });
    courseSelect.innerHTML = options(list, { label: (c) => `${c.code} · ${c.title}`, placeholder: 'All courses', selected: filters.course_id });
  }

  function readForm() {
    const fd = new FormData(form); // includes the sort select via its form="filters" attribute
    for (const f of FIELDS) filters[f] = fd.get(f) || '';
    filters.sort ||= 'rating';
  }

  async function search() {
    const id = ++requestId;
    const { sort, ...rest } = filters;
    history.replaceState(null, '', `#/tutors${qs({ ...rest, sort: sort === 'rating' ? '' : sort })}`);
    results.innerHTML = skeleton();
    results.setAttribute('aria-busy', 'true');
    try {
      const list = await tutorService.search(filters);
      if (id !== requestId) return;
      count.textContent = `${pluralize(list.length, 'tutor')} found`;
      results.innerHTML = list.length
        ? list.map(tutorCard).join('')
        : emptyState({
          title: 'No tutors match those filters',
          text: 'Try another day, a higher fee limit or a broader keyword.',
          action: '<button type="button" class="btn btn-soft" data-clear>Clear filters</button>',
        });
    } catch (err) {
      results.innerHTML = emptyState({ iconName: 'alert', title: 'Could not load tutors', text: err.message });
    } finally {
      results.removeAttribute('aria-busy');
    }
  }

  let debounce;
  form.addEventListener('input', (e) => {
    if (!['q', 'max_fee'].includes(e.target.name)) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { readForm(); search(); }, 300);
  });

  async function onChange(e) {
    const name = e.target.name;
    if (['q', 'max_fee'].includes(name)) return;
    readForm();
    if (name === 'university_id') {
      filters.programme_id = '';
      filters.course_id = '';
      await loadProgrammes();
      await loadCourses();
    } else if (name === 'programme_id') {
      filters.course_id = '';
      await loadCourses();
    }
    search();
  }
  form.addEventListener('change', onChange);
  sortSelect.addEventListener('change', onChange);

  async function clearAll() {
    form.reset();
    for (const f of FIELDS) filters[f] = '';
    filters.sort = 'rating';
    sortSelect.value = 'rating';
    await loadProgrammes();
    await loadCourses();
    search();
  }
  form.addEventListener('reset', (e) => { e.preventDefault(); clearAll(); });
  results.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) clearAll(); });

  await loadProgrammes();
  await loadCourses();
  await search();
}
