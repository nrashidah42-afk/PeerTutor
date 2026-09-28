import { session, dashboardPathFor } from '../state/session.js';
import { authService } from '../services/authService.js';
import { esc, avatar, firstName } from './ui.js';
import { icon, LOGO } from './icons.js';
import { toast } from './toast.js';

const PUBLIC_LINKS = [
  ['/tutors', 'Find tutors'],
  ['/courses', 'Courses'],
  ['/materials', 'Materials'],
];

const ROLE_LABELS = { learner: 'Learner', tutor: 'Tutor', admin: 'Administrator' };

const currentPath = () => (location.hash.slice(1) || '/').split('?')[0];

export function renderNavbar(el) {
  const user = session.getUser();
  const path = currentPath();
  const isActive = (href) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

  el.innerHTML = `
    <div class="container navbar-inner">
      <a href="#/" class="brand" aria-label="PeerTutor home">${LOGO}<span>Peer<strong>Tutor</strong></span></a>
      <button class="icon-btn nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle menu">${icon('menu')}</button>
      <nav id="nav-menu" class="nav-menu" aria-label="Main">
        <ul class="nav-links">
          ${PUBLIC_LINKS.map(([href, label]) => `<li><a href="#${href}" class="nav-link"${isActive(href) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}
          ${user?.role === 'learner' ? `<li><a href="#/become-tutor" class="nav-link"${isActive('/become-tutor') ? ' aria-current="page"' : ''}>Become a tutor</a></li>` : ''}
        </ul>
        <div class="nav-actions">
          ${user ? `
            <a class="btn btn-soft btn-sm" href="#${dashboardPathFor(user)}">${icon('home')} Dashboard</a>
            <div class="nav-user">
              ${avatar(user.full_name, 'sm')}
              <span class="nav-user-text"><span>${esc(firstName(user.full_name))}</span><small>${ROLE_LABELS[user.role] || ''}</small></span>
            </div>
            <button class="icon-btn" data-logout aria-label="Log out" title="Log out">${icon('logout')}</button>
          ` : `
            <a class="btn btn-ghost btn-sm" href="#/login">Log in</a>
            <a class="btn btn-primary btn-sm" href="#/register">Join PeerTutor</a>
          `}
        </div>
      </nav>
    </div>`;

  const toggle = el.querySelector('.nav-toggle');
  const menu = el.querySelector('.nav-menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  el.querySelector('[data-logout]')?.addEventListener('click', () => {
    authService.logout();
    toast('You have been logged out.');
    location.hash = '/';
  });
}
