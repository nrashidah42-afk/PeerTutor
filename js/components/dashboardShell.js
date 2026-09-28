/** Sidebar + header layout shared by the learner, tutor and admin dashboards. */
import { esc } from './ui.js';
import { icon } from './icons.js';

const NAV = {
  learner: [
    ['/learner', 'Overview', 'home'],
    ['/learner/sessions', 'My sessions', 'calendar'],
    ['/tutors', 'Find tutors', 'search'],
    ['/materials', 'Materials', 'book'],
    ['/become-tutor', 'Become a tutor', 'cap'],
  ],
  tutor: [
    ['/tutor', 'Overview', 'home'],
    ['/tutor/profile', 'Tutor profile', 'user'],
    ['/tutor/availability', 'Availability', 'clock'],
    ['/tutor/materials', 'My materials', 'file'],
    ['/learner', 'My learning', 'book'],
    ['/learner/sessions', 'Sessions I booked', 'calendar'],
  ],
  admin: [
    ['/admin', 'Overview', 'chart'],
    ['/admin/applications', 'Tutor applications', 'shieldCheck'],
    ['/admin/users', 'Users', 'users'],
    ['/admin/catalog', 'Universities & courses', 'layers'],
    ['/admin/moderation', 'Moderation', 'flag'],
  ],
};

const LABELS = { learner: 'Learner', tutor: 'Tutor', admin: 'Administration' };

export function dashboardShell({ role, active, title, subtitle = '', actions = '', content = '' }) {
  const items = NAV[role] || NAV.learner;
  return `
    <div class="container dashboard">
      <aside class="dash-nav" aria-label="${LABELS[role]} menu">
        <p class="dash-nav-label">${LABELS[role]}</p>
        <ul>
          ${items.map(([href, label, ic]) => `
            <li><a href="#${href}"${href === active ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a></li>`).join('')}
        </ul>
      </aside>
      <section class="dash-main">
        <header class="page-header">
          <div>
            <h1>${esc(title)}</h1>
            ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions">${actions}</div>` : ''}
        </header>
        <div id="dash-content">${content}</div>
      </section>
    </div>`;
}
