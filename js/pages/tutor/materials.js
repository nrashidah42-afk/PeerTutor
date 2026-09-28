import { materialService, MATERIAL_TYPES } from '../../services/materialService.js';
import { tutorService } from '../../services/tutorService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { openModal, confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, options, formatDate, statusBadge } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

export async function render(el) {
  el.innerHTML = dashboardShell({
    role: 'tutor',
    active: '/tutor/materials',
    title: 'My learning materials',
    subtitle: 'Share notes, past papers and links for the courses you tutor.',
    actions: `<button type="button" class="btn btn-primary" data-add>${icon('plus')} Share material</button>`,
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  const profile = await tutorService.myProfile();
  const myCourses = (await tutorService.get(profile.user_id)).courses;
  let materials = [];

  function draw() {
    content.innerHTML = materials.length
      ? `<div class="card table-wrap">
          <table class="data-table">
            <thead><tr><th>Title</th><th>Course</th><th>Type</th><th>Opens</th><th>Status</th><th>Shared</th><th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              ${materials.map((m) => `
                <tr>
                  <td><strong>${esc(m.title)}</strong>${m.description ? `<p class="small muted">${esc(m.description)}</p>` : ''}</td>
                  <td><span class="course-code">${esc(m.course_code)}</span></td>
                  <td>${MATERIAL_TYPES[m.type]}</td>
                  <td>${m.downloads}</td>
                  <td>${statusBadge(m.status)}</td>
                  <td class="nowrap">${formatDate(m.created_at)}</td>
                  <td class="actions-cell">
                    <a class="icon-btn" href="${esc(m.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(m.title)}">${icon('external')}</a>
                    <button type="button" class="icon-btn danger" data-delete="${m.id}" aria-label="Delete ${esc(m.title)}">${icon('trash')}</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      : emptyState({ iconName: 'file', title: 'You have not shared any materials yet', text: 'Materials appear on your profile and in the Materials library.', action: '<button type="button" class="btn btn-primary" data-add>Share your first material</button>' });
  }

  async function load() {
    materials = await materialService.mine();
    draw();
  }

  function openAddModal() {
    openModal({
      title: 'Share a learning material',
      submitLabel: 'Share',
      body: `
        <div class="field">
          <label for="mat-course">Course</label>
          <select id="mat-course" name="course_id" required>${options(myCourses, { label: (c) => `${c.code} · ${c.title}` })}</select>
        </div>
        <div class="field">
          <label for="mat-title">Title</label>
          <input id="mat-title" name="title" required maxlength="150" placeholder="e.g. Sorting algorithms summary">
        </div>
        <div class="field">
          <label for="mat-type">Type</label>
          <select id="mat-type" name="type">${options(Object.entries(MATERIAL_TYPES).map(([id, name]) => ({ id, name })))}</select>
        </div>
        <div class="field">
          <label for="mat-url">Link</label>
          <input id="mat-url" name="url" type="url" required placeholder="https://">
          <p class="form-hint">Paste a link to Google Drive, YouTube, GitHub, etc. File upload will be available once storage is connected.</p>
        </div>
        <div class="field">
          <label for="mat-desc">Description <span class="muted">(optional)</span></label>
          <textarea id="mat-desc" name="description" rows="3" maxlength="500"></textarea>
        </div>
        <p class="small muted">Only share your own work or openly licensed content. Never share answers to ongoing assessments.</p>`,
      onSubmit: async (data) => {
        await materialService.create({ ...data, course_id: Number(data.course_id) });
        toast('Material shared.');
        load();
      },
    });
  }

  el.querySelector('.dashboard').addEventListener('click', async (e) => {
    if (e.target.closest('[data-add]')) return openAddModal();
    const del = e.target.closest('[data-delete]');
    if (!del) return undefined;
    const m = materials.find((x) => String(x.id) === del.dataset.delete);
    const ok = await confirmDialog({ title: 'Delete material?', message: `“${m.title}” will be removed for all students.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return undefined;
    try {
      await materialService.remove(m.id);
      toast('Material deleted.');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
    return undefined;
  });

  await load();
}
