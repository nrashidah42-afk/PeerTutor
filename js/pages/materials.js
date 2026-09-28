import { materialService, MATERIAL_TYPES, MATERIAL_ICONS as TYPE_ICONS } from '../services/materialService.js';
import { catalogService } from '../services/catalogService.js';
import { session } from '../state/session.js';
import { openReportModal } from '../components/feedbackModals.js';
import { toast } from '../components/toast.js';
import { esc, options, emptyState, timeAgo, pluralize } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { config } from '../config.js';

function materialCard(m, user) {
  return `
    <article class="card material-card">
      <div class="material-card-head">
        <span class="material-icon type-${m.type}">${icon(TYPE_ICONS[m.type] || 'file')}</span>
        <div class="min-w-0">
          <p class="small muted"><span class="course-code">${esc(m.course_code)}</span> ${MATERIAL_TYPES[m.type]}</p>
          <h3>${esc(m.title)}</h3>
        </div>
      </div>
      ${m.description ? `<p class="muted small">${esc(m.description)}</p>` : ''}
      <p class="small">Shared by <a href="#/tutors/${m.uploader_id}">${esc(m.uploader_name)}</a> · ${timeAgo(m.created_at)}</p>
      <div class="material-card-foot">
        <span class="small muted">${icon('download')} ${pluralize(m.downloads, 'open')}</span>
        <div class="row">
          ${user ? `<button type="button" class="icon-btn" data-action="report" data-id="${m.id}" aria-label="Report material" title="Report">${icon('flag')}</button>` : ''}
          <button type="button" class="btn btn-soft btn-sm" data-action="open" data-id="${m.id}">${user ? 'Open' : 'Log in to open'} ${icon('external')}</button>
        </div>
      </div>
    </article>`;
}

export async function render(el, { query }) {
  const user = session.getUser();
  const courses = await catalogService.courses({ university_id: user?.university_id || config.DEFAULT_UNIVERSITY_ID });
  const state = { course_id: query.course_id || '', type: '', q: '', sort: '' };
  // A course from another university may be linked directly
  if (state.course_id && !courses.some((c) => String(c.id) === state.course_id)) {
    courses.push(await catalogService.course(state.course_id));
  }

  el.innerHTML = `
    <div class="container page">
      <header class="page-header">
        <div>
          <h1>Learning materials</h1>
          <p class="muted">Notes, past papers and videos shared by verified tutors.</p>
        </div>
      </header>
      <form class="toolbar card" id="material-filters">
        <div class="input-icon grow">${icon('search')}<label class="sr-only" for="m-q">Search materials</label><input id="m-q" type="search" name="q" placeholder="Search materials"></div>
        <label class="sr-only" for="m-course">Course</label>
        <select id="m-course" name="course_id">${options(courses, { label: (c) => `${c.code} · ${c.title}`, placeholder: 'All courses', selected: state.course_id })}</select>
        <label class="sr-only" for="m-type">Type</label>
        <select id="m-type" name="type">${options(Object.entries(MATERIAL_TYPES).map(([id, name]) => ({ id, name })), { placeholder: 'All types' })}</select>
        <label class="sr-only" for="m-sort">Sort</label>
        <select id="m-sort" name="sort"><option value="">Newest</option><option value="popular">Most opened</option></select>
      </form>
      <div class="grid grid-3" id="material-grid"></div>
    </div>`;

  const form = el.querySelector('#material-filters');
  const grid = el.querySelector('#material-grid');

  async function load() {
    const list = await materialService.list(state);
    grid.innerHTML = list.length
      ? list.map((m) => materialCard(m, user)).join('')
      : emptyState({ iconName: 'book', title: 'No materials yet', text: 'Tutors share materials for the courses they teach. Check back soon.' });
  }

  let debounce;
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 250);
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'q') return;
    state[e.target.name] = e.target.value;
    load();
  });

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'report') return openReportModal('material', Number(btn.dataset.id));
    if (!user) {
      location.hash = `/login?next=${encodeURIComponent('/materials')}`;
      return;
    }
    try {
      const { url } = await materialService.open(btn.dataset.id);
      window.open(url, '_blank', 'noopener');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  await load();
}
