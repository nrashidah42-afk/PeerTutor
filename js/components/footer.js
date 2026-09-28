import { config } from '../config.js';
import { adminService } from '../services/adminService.js';
import { authService } from '../services/authService.js';
import { confirmDialog } from './modal.js';
import { LOGO } from './icons.js';

export function renderFooter(el) {
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="#/" class="brand">${LOGO}<span>Peer<strong>Tutor</strong></span></a>
        <p class="muted small">Student-to-student tutoring, starting at Makerere University.</p>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <div>
          <h3>Learn</h3>
          <a href="#/tutors">Find a tutor</a>
          <a href="#/courses">Browse courses</a>
          <a href="#/materials">Learning materials</a>
        </div>
        <div>
          <h3>Teach</h3>
          <a href="#/become-tutor">Become a tutor</a>
          <a href="#/tutor">Tutor dashboard</a>
        </div>
      </nav>
    </div>
    <div class="container footer-bottom small muted">
      <span>© ${year} PeerTutor. Built by students, for students.</span>
      ${config.API_MODE === 'mock' ? '<button class="link-btn" data-reset>Reset demo data</button>' : ''}
    </div>`;

  el.querySelector('[data-reset]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset demo data?',
      message: 'This restores the original sample tutors, sessions and courses and logs you out. Changes you made will be lost.',
      confirmLabel: 'Reset data',
      danger: true,
    });
    if (!ok) return;
    await adminService.resetDemoData();
    authService.logout();
    location.hash = '/';
    location.reload();
  });
}
