import { adminService } from '../../services/adminService.js';
import { session } from '../../state/session.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, avatar, statusBadge, badge, formatDate, labelize, options, pluralize } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const ROLE_TONES = { learner: 'neutral', tutor: 'info', admin: 'accent' };

export async function render(el, { query }) {
  el.innerHTML = dashboardShell({
    role: 'admin',
    active: '/admin/users',
    title: 'Users',
    subtitle: 'Search accounts, suspend misuse and manage tutor status.',
    content: `
      <form class="toolbar card" id="user-filters">
        <div class="input-icon grow">${icon('search')}<label class="sr-only" for="u-q">Search users</label><input id="u-q" name="q" type="search" placeholder="Search name or email"></div>
        <label class="sr-only" for="u-role">Role</label>
        <select id="u-role" name="role">${options(['learner', 'tutor', 'admin'].map((r) => ({ id: r, name: labelize(r) })), { placeholder: 'All roles', selected: query.role })}</select>
        <label class="sr-only" for="u-status">Status</label>
        <select id="u-status" name="status">${options(['active', 'suspended'].map((s) => ({ id: s, name: labelize(s) })), { placeholder: 'Any status' })}</select>
      </form>
      <p class="small muted" id="user-count"></p>
      <div id="user-table">${loader()}</div>`,
  });
  const form = el.querySelector('#user-filters');
  const tableEl = el.querySelector('#user-table');
  const countEl = el.querySelector('#user-count');
  const me = session.getUser();
  const filters = { q: '', role: query.role || '', status: '' };
  let users = [];

  function actions(u) {
    if (u.id === me.id) return '<span class="small muted">You</span>';
    const out = [];
    if (u.role === 'tutor') out.push(`<button type="button" class="btn btn-ghost btn-sm" data-action="revoke" data-id="${u.id}">Revoke tutor</button>`);
    out.push(u.status === 'active'
      ? `<button type="button" class="btn btn-ghost btn-sm danger-text" data-action="suspend" data-id="${u.id}">Suspend</button>`
      : `<button type="button" class="btn btn-soft btn-sm" data-action="activate" data-id="${u.id}">Reactivate</button>`);
    return out.join('');
  }

  async function load() {
    users = await adminService.users(filters);
    countEl.textContent = pluralize(users.length, 'user');
    tableEl.innerHTML = users.length
      ? `<div class="card table-wrap"><table class="data-table">
          <thead><tr><th>User</th><th>Role</th><th>University / programme</th><th>Sessions</th><th>Status</th><th>Joined</th><th><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${users.map((u) => `
            <tr>
              <td><div class="user-cell">${avatar(u.full_name, 'sm')}<div class="min-w-0"><strong>${esc(u.full_name)}</strong><p class="small muted truncate">${esc(u.email)}</p></div></div></td>
              <td>${badge(labelize(u.role), ROLE_TONES[u.role])}${u.role === 'tutor' && u.review_count ? `<p class="small muted">${u.rating}★ · ${u.review_count}</p>` : ''}</td>
              <td><span class="small">${esc(u.university)}${u.programme ? ` · ${esc(u.programme)}` : ''}</span></td>
              <td>${u.sessions_count}</td>
              <td>${statusBadge(u.status)}</td>
              <td class="nowrap small">${formatDate(u.created_at)}</td>
              <td class="actions-cell">${actions(u)}</td>
            </tr>`).join('')}</tbody>
        </table></div>`
      : emptyState({ iconName: 'users', title: 'No users match' });
  }

  let debounce;
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { filters.q = e.target.value.trim(); load(); }, 250);
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'q') return;
    filters[e.target.name] = e.target.value;
    load();
  });

  const CONFIRM = {
    suspend: (u) => ({ title: `Suspend ${u.full_name}?`, message: 'They will be logged out and unable to sign in or appear in search until reactivated.', confirmLabel: 'Suspend', danger: true, patch: { status: 'suspended' }, done: 'Account suspended.' }),
    activate: (u) => ({ title: `Reactivate ${u.full_name}?`, message: 'They will be able to sign in again.', confirmLabel: 'Reactivate', patch: { status: 'active' }, done: 'Account reactivated.' }),
    revoke: (u) => ({ title: `Revoke tutor status for ${u.full_name}?`, message: 'Their tutor profile will be hidden from search. Their past sessions and reviews are kept.', confirmLabel: 'Revoke', danger: true, patch: { role: 'learner' }, done: 'Tutor status revoked.' }),
  };

  tableEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const u = users.find((x) => String(x.id) === btn.dataset.id);
    const cfg = CONFIRM[btn.dataset.action](u);
    if (!(await confirmDialog(cfg))) return;
    try {
      await adminService.updateUser(u.id, cfg.patch);
      toast(cfg.done);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  await load();
}
