/** Manage universities, programmes and courses (with topics). */
import { catalogService } from '../../services/catalogService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, tabs, options, statusBadge } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { config } from '../../config.js';

const TABS = [
  { id: 'courses', label: 'Courses' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'universities', label: 'Universities' },
];

export async function render(el, { query }) {
  el.innerHTML = dashboardShell({
    role: 'admin',
    active: '/admin/catalog',
    title: 'Universities & courses',
    subtitle: 'The academic catalogue that learners search and tutors teach.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  const state = { tab: TABS.some((t) => t.id === query.tab) ? query.tab : 'courses', universityId: String(config.DEFAULT_UNIVERSITY_ID), programmeId: '' };
  let universities = [];
  let programmes = [];
  let courses = [];

  const uniFilter = () => `
    <label class="sr-only" for="cat-uni">University</label>
    <select id="cat-uni" data-filter="universityId">${options(universities, { selected: state.universityId })}</select>`;

  function universitiesView() {
    return `
      <div class="toolbar-plain"><span class="grow"></span><button type="button" class="btn btn-primary" data-action="add-university">${icon('plus')} Add university</button></div>
      <div class="card table-wrap"><table class="data-table">
        <thead><tr><th>University</th><th>Short name</th><th>Email domain</th><th>Programmes</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${universities.map((u) => `
          <tr>
            <td><strong>${esc(u.name)}</strong><p class="small muted">${esc(u.city)}</p></td>
            <td>${esc(u.short_name)}</td>
            <td><code>${esc(u.email_domain)}</code></td>
            <td>${u.programme_count}</td>
            <td>${statusBadge(u.is_active ? 'active' : 'hidden')}</td>
            <td class="actions-cell"><button type="button" class="icon-btn" data-action="edit-university" data-id="${u.id}" aria-label="Edit ${esc(u.name)}">${icon('edit')}</button></td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  }

  function programmesView() {
    return `
      <div class="toolbar-plain">${uniFilter()}<span class="grow"></span><button type="button" class="btn btn-primary" data-action="add-programme">${icon('plus')} Add programme</button></div>
      ${programmes.length ? `<div class="card table-wrap"><table class="data-table">
        <thead><tr><th>Code</th><th>Programme</th><th>Courses</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${programmes.map((p) => `
          <tr>
            <td><span class="course-code">${esc(p.code)}</span></td>
            <td><strong>${esc(p.name)}</strong></td>
            <td>${p.course_count}</td>
            <td class="actions-cell"><button type="button" class="icon-btn danger" data-action="delete-programme" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">${icon('trash')}</button></td>
          </tr>`).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'layers', title: 'No programmes yet' })}`;
  }

  function coursesView() {
    return `
      <div class="toolbar-plain">
        ${uniFilter()}
        <label class="sr-only" for="cat-prog">Programme</label>
        <select id="cat-prog" data-filter="programmeId">${options(programmes, { placeholder: 'All programmes', selected: state.programmeId })}</select>
        <span class="grow"></span>
        <button type="button" class="btn btn-primary" data-action="add-course">${icon('plus')} Add course</button>
      </div>
      ${courses.length ? `<div class="card table-wrap"><table class="data-table">
        <thead><tr><th>Code</th><th>Title</th><th>Programme</th><th>Year / Sem</th><th>Topics</th><th>Tutors</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${courses.map((c) => `
          <tr>
            <td><span class="course-code">${esc(c.code)}</span></td>
            <td><strong>${esc(c.title)}</strong></td>
            <td class="small">${esc(c.programme)}</td>
            <td class="nowrap">Y${c.year} · S${c.semester}</td>
            <td class="small muted">${c.topics.length}</td>
            <td>${c.tutor_count}</td>
            <td class="actions-cell">
              <button type="button" class="icon-btn" data-action="edit-course" data-id="${c.id}" aria-label="Edit ${esc(c.code)}">${icon('edit')}</button>
              <button type="button" class="icon-btn danger" data-action="delete-course" data-id="${c.id}" aria-label="Delete ${esc(c.code)}">${icon('trash')}</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'book', title: 'No courses found' })}`;
  }

  async function load() {
    universities = await catalogService.universities({ all: 1 });
    programmes = await catalogService.programmes(state.universityId);
    if (state.tab === 'courses') {
      courses = await catalogService.courses({ university_id: state.universityId, programme_id: state.programmeId });
    }
    const views = { universities: universitiesView, programmes: programmesView, courses: coursesView };
    content.innerHTML = `${tabs(TABS, state.tab)}${views[state.tab]()}`;
  }

  function universityModal(u) {
    openModal({
      title: u ? `Edit ${u.name}` : 'Add a university',
      body: `
        <div class="field"><label for="u-name">Name</label><input id="u-name" name="name" required value="${esc(u?.name || '')}"></div>
        <div class="grid grid-2 gap-sm">
          <div class="field"><label for="u-short">Short name</label><input id="u-short" name="short_name" required maxlength="10" value="${esc(u?.short_name || '')}"></div>
          <div class="field"><label for="u-city">City</label><input id="u-city" name="city" value="${esc(u?.city || '')}"></div>
        </div>
        <div class="field"><label for="u-domain">Student email domain</label><input id="u-domain" name="email_domain" required placeholder="mak.ac.ug" value="${esc(u?.email_domain || '')}">
          <p class="form-hint">Students must register with an email ending in this domain.</p></div>
        <label class="check"><input type="checkbox" name="is_active" value="true"${!u || u.is_active ? ' checked' : ''}><span>Open for sign-ups</span></label>`,
      onSubmit: async (data) => {
        const payload = { ...data, is_active: data.is_active === 'true' };
        if (u) await catalogService.updateUniversity(u.id, payload);
        else await catalogService.createUniversity(payload);
        toast(u ? 'University updated.' : 'University added.');
        load();
      },
    });
  }

  function courseModal(c) {
    const uni = universities.find((u) => String(u.id) === state.universityId);
    openModal({
      title: c ? `Edit ${c.code}` : `Add a course at ${uni?.short_name}`,
      size: 'modal-lg',
      body: `
        <div class="grid grid-2 gap-sm">
          <div class="field"><label for="c-code">Course code</label><input id="c-code" name="code" required maxlength="12" placeholder="CSC 1204" value="${esc(c?.code || '')}"></div>
          <div class="field"><label for="c-prog">Programme</label>
            <select id="c-prog" name="programme_id">${options(programmes, { placeholder: 'Shared (all programmes)', selected: c ? c.programme_id : state.programmeId })}</select></div>
        </div>
        <div class="field"><label for="c-title">Title</label><input id="c-title" name="title" required maxlength="120" value="${esc(c?.title || '')}"></div>
        <div class="grid grid-2 gap-sm">
          <div class="field"><label for="c-year">Year</label><select id="c-year" name="year">${[1, 2, 3, 4, 5].map((y) => `<option${c?.year === y ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
          <div class="field"><label for="c-sem">Semester</label><select id="c-sem" name="semester">${[1, 2].map((s) => `<option${c?.semester === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="c-topics">Topics</label>
          <textarea id="c-topics" name="topics" rows="3" placeholder="One per line or comma-separated">${esc((c?.topics || []).map((t) => t.name).join(', '))}</textarea></div>`,
      onSubmit: async (data) => {
        const payload = { ...data, university_id: Number(state.universityId) };
        if (c) await catalogService.updateCourse(c.id, payload);
        else await catalogService.createCourse(payload);
        toast(c ? 'Course updated.' : 'Course added.');
        load();
      },
    });
  }

  content.addEventListener('change', (e) => {
    const key = e.target.dataset.filter;
    if (!key) return;
    state[key] = e.target.value;
    if (key === 'universityId') state.programmeId = '';
    load();
  });

  content.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      state.tab = tab.dataset.tab;
      return load();
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return undefined;
    const id = btn.dataset.id;

    try {
      switch (btn.dataset.action) {
        case 'add-university': return universityModal(null);
        case 'edit-university': return universityModal(universities.find((u) => String(u.id) === id));
        case 'add-course': return courseModal(null);
        case 'edit-course': return courseModal(courses.find((c) => String(c.id) === id));
        case 'add-programme':
          return openModal({
            title: 'Add a programme',
            body: `
              <div class="field"><label for="p-code">Code</label><input id="p-code" name="code" required maxlength="10" placeholder="BSCS"></div>
              <div class="field"><label for="p-name">Name</label><input id="p-name" name="name" required placeholder="BSc Computer Science"></div>`,
            onSubmit: async (data) => {
              await catalogService.createProgramme({ ...data, university_id: Number(state.universityId) });
              toast('Programme added.');
              load();
            },
          });
        case 'delete-programme': {
          const p = programmes.find((x) => String(x.id) === id);
          if (!(await confirmDialog({ title: `Delete ${p.name}?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return undefined;
          await catalogService.deleteProgramme(id);
          toast('Programme deleted.');
          return load();
        }
        case 'delete-course': {
          const c = courses.find((x) => String(x.id) === id);
          if (!(await confirmDialog({ title: `Delete ${c.code}?`, message: 'The course and its topics will be removed. Tutors will no longer list it.', confirmLabel: 'Delete', danger: true }))) return undefined;
          await catalogService.deleteCourse(id);
          toast('Course deleted.');
          return load();
        }
        default: return undefined;
      }
    } catch (err) {
      toast(err.message, 'error');
      return undefined;
    }
  });

  await load();
}
