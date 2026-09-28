import { tutorService } from '../../services/tutorService.js';
import { catalogService } from '../../services/catalogService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { coursePicker, readCoursePicker } from '../../components/coursePicker.js';
import { toast } from '../../components/toast.js';
import { esc, loader, formToObject, MODE_LABELS } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

export async function render(el, { user }) {
  el.innerHTML = dashboardShell({
    role: 'tutor',
    active: '/tutor/profile',
    title: 'Tutor profile',
    subtitle: 'This is what learners see when they find you.',
    actions: `<a class="btn btn-ghost" href="#/tutors/${user.id}">${icon('external')} Preview</a>`,
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  const [profile, courses] = await Promise.all([
    tutorService.myProfile(),
    catalogService.courses({ university_id: user.university_id }),
  ]);

  content.innerHTML = `
    <form id="profile-form" class="card stack" novalidate>
      <p class="form-error" role="alert" hidden></p>
      <fieldset class="form-section">
        <legend>Public profile</legend>
        <div class="field">
          <label for="p-headline">Headline</label>
          <input id="p-headline" name="headline" required maxlength="120" value="${esc(profile.headline)}">
        </div>
        <div class="field">
          <label for="p-bio">About you</label>
          <textarea id="p-bio" name="bio" rows="6" maxlength="2000">${esc(profile.bio)}</textarea>
          <p class="form-hint">Describe your teaching style, experience and what learners can expect.</p>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend>Sessions &amp; fee</legend>
        <div class="grid grid-3 gap-sm">
          <div class="field">
            <label for="p-fee">Fee per hour (UGX)</label>
            <input id="p-fee" name="fee" type="number" min="0" max="500000" step="500" value="${profile.fee}">
            <p class="form-hint">0 = free tutoring</p>
          </div>
          <div class="field">
            <label for="p-mode">Mode</label>
            <select id="p-mode" name="mode">
              ${Object.entries(MODE_LABELS).map(([id, label]) => `<option value="${id}"${profile.mode === id ? ' selected' : ''}>${label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="p-location">Meeting place</label>
            <input id="p-location" name="location" maxlength="100" placeholder="e.g. Main Library" value="${esc(profile.location)}">
          </div>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend>Courses you tutor</legend>
        ${coursePicker(courses, new Map(profile.courses.map((c) => [c.course_id, c.grade])))}
      </fieldset>

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Save profile</button>
      </div>
    </form>`;

  const form = content.querySelector('#profile-form');
  const errorEl = form.querySelector('.form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    if (!form.reportValidity()) return;
    const data = formToObject(form);
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await tutorService.updateProfile({
        headline: data.headline,
        bio: data.bio,
        fee: Number(data.fee || 0),
        mode: data.mode,
        location: data.location,
      });
      await tutorService.updateCourses(readCoursePicker(form));
      toast('Profile saved.');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      errorEl.scrollIntoView({ block: 'center' });
    } finally {
      btn.disabled = false;
    }
  });
}
