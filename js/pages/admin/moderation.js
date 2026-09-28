/** Reports queue, review moderation and material moderation. */
import { adminService } from '../../services/adminService.js';
import { reviewService } from '../../services/reviewService.js';
import { materialService, MATERIAL_TYPES } from '../../services/materialService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, tabs, stars, statusBadge, badge, labelize, timeAgo, formatDate } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'materials', label: 'Materials' },
];

function reportCard(r) {
  const canHide = r.status === 'open' && ((r.target_type === 'review' && r.target_status === 'visible') || (r.target_type === 'material' && r.target_status === 'published'));
  const canSuspend = r.status === 'open' && r.target_type === 'user' && r.target_status === 'active';
  return `
    <article class="card report-card">
      <header class="report-head">
        ${badge(labelize(r.target_type), 'info')} ${statusBadge(r.status)}
        <span class="small muted push-right">${timeAgo(r.created_at)}</span>
      </header>
      <p><strong>${esc(r.target_label)}</strong> ${r.target_status ? `<span class="small muted">(currently ${esc(r.target_status)})</span>` : ''}</p>
      ${r.target_excerpt ? `<blockquote class="quote">${esc(r.target_excerpt)}</blockquote>` : ''}
      <p class="small"><span class="muted">Reported by ${esc(r.reporter_name)}:</span> ${esc(r.reason)}</p>
      ${r.status === 'open' ? `
        <footer class="report-actions">
          ${canHide ? `<button type="button" class="btn btn-danger btn-sm" data-action="hide-target" data-id="${r.id}">${icon('x')} Hide ${r.target_type} &amp; resolve</button>` : ''}
          ${canSuspend ? `<button type="button" class="btn btn-danger btn-sm" data-action="suspend-target" data-id="${r.id}">Suspend user &amp; resolve</button>` : ''}
          <button type="button" class="btn btn-soft btn-sm" data-action="resolve" data-id="${r.id}">${icon('check')} Mark resolved</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="dismiss" data-id="${r.id}">Dismiss</button>
        </footer>` : ''}
    </article>`;
}

export async function render(el) {
  el.innerHTML = dashboardShell({
    role: 'admin',
    active: '/admin/moderation',
    title: 'Moderation',
    subtitle: 'Handle reports and keep reviews and materials trustworthy.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  let tab = 'reports';
  let reports = [];
  let reviews = [];
  let materials = [];

  async function load() {
    [reports, reviews, materials] = await Promise.all([
      adminService.reports(),
      reviewService.adminList(),
      materialService.adminList(),
    ]);
    const openCount = reports.filter((r) => r.status === 'open').length;
    let body = '';

    if (tab === 'reports') {
      const sorted = [...reports].sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1));
      body = sorted.length ? `<div class="stack-lg">${sorted.map(reportCard).join('')}</div>` : emptyState({ iconName: 'flag', title: 'No reports', text: 'Nothing needs your attention.' });
    }

    if (tab === 'reviews') {
      body = `<div class="card table-wrap"><table class="data-table">
        <thead><tr><th>Rating</th><th>Review</th><th>Tutor</th><th>By</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${reviews.map((r) => `
          <tr>
            <td class="nowrap">${stars(r.rating)}</td>
            <td><p class="small">${esc(r.comment) || '<span class="muted">No comment</span>'}</p><p class="small muted">${esc(r.course_code)} · ${formatDate(r.created_at)}</p></td>
            <td class="small">${esc(r.tutor_name)}</td>
            <td class="small">${esc(r.learner_name)}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="actions-cell">
              <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-review" data-id="${r.id}">${r.status === 'visible' ? 'Hide' : 'Show'}</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`;
    }

    if (tab === 'materials') {
      body = `<div class="card table-wrap"><table class="data-table">
        <thead><tr><th>Material</th><th>Course</th><th>Type</th><th>Uploaded by</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${materials.map((m) => `
          <tr>
            <td><a href="${esc(m.url)}" target="_blank" rel="noopener"><strong>${esc(m.title)}</strong></a><p class="small muted">${esc(m.description)}</p></td>
            <td><span class="course-code">${esc(m.course_code)}</span></td>
            <td class="small">${MATERIAL_TYPES[m.type]}</td>
            <td class="small">${esc(m.uploader_name)}</td>
            <td>${statusBadge(m.status)}</td>
            <td class="actions-cell">
              <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-material" data-id="${m.id}">${m.status === 'published' ? 'Hide' : 'Publish'}</button>
              <button type="button" class="icon-btn danger" data-action="delete-material" data-id="${m.id}" aria-label="Delete ${esc(m.title)}">${icon('trash')}</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`;
    }

    content.innerHTML = `${tabs(TABS.map((t) => ({ ...t, count: t.id === 'reports' ? openCount : undefined })), tab)}${body}`;
  }

  content.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      tab = tabBtn.dataset.tab;
      return load();
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return undefined;
    const id = Number(btn.dataset.id);
    const report = reports.find((r) => r.id === id);

    try {
      switch (btn.dataset.action) {
        case 'hide-target':
          if (report.target_type === 'review') await reviewService.setStatus(report.target_id, 'hidden');
          else await materialService.setStatus(report.target_id, 'hidden');
          await adminService.setReportStatus(id, 'resolved');
          toast(`${labelize(report.target_type)} hidden and report resolved.`);
          break;
        case 'suspend-target':
          if (!(await confirmDialog({ title: 'Suspend this user?', message: 'They will not be able to sign in until reactivated.', confirmLabel: 'Suspend', danger: true }))) return undefined;
          await adminService.updateUser(report.target_id, { status: 'suspended' });
          await adminService.setReportStatus(id, 'resolved');
          toast('User suspended and report resolved.');
          break;
        case 'resolve':
          await adminService.setReportStatus(id, 'resolved');
          toast('Report resolved.');
          break;
        case 'dismiss':
          await adminService.setReportStatus(id, 'dismissed');
          toast('Report dismissed.');
          break;
        case 'toggle-review': {
          const r = reviews.find((x) => x.id === id);
          await reviewService.setStatus(id, r.status === 'visible' ? 'hidden' : 'visible');
          toast(r.status === 'visible' ? 'Review hidden.' : 'Review visible again.');
          break;
        }
        case 'toggle-material': {
          const m = materials.find((x) => x.id === id);
          await materialService.setStatus(id, m.status === 'published' ? 'hidden' : 'published');
          toast(m.status === 'published' ? 'Material hidden.' : 'Material published.');
          break;
        }
        case 'delete-material': {
          const m = materials.find((x) => x.id === id);
          if (!(await confirmDialog({ title: 'Delete material?', message: `“${m.title}” will be permanently removed.`, confirmLabel: 'Delete', danger: true }))) return undefined;
          await materialService.remove(id);
          toast('Material deleted.');
          break;
        }
        default:
          return undefined;
      }
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
    return undefined;
  });

  await load();
}
