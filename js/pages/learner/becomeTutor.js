import { applicationService } from '../../services/applicationService.js';
import { catalogService } from '../../services/catalogService.js';
import { authService } from '../../services/authService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { coursePicker, readCoursePicker } from '../../components/coursePicker.js';
import { toast } from '../../components/toast.js';
import { esc, loader, emptyState, formToObject, formatDate, statusBadge, formatFee, MODE_LABELS } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

function applicationSummary(app) {
  return `
    <section class="card">
      <div class="card-head"><h2>Your application</h2>${statusBadge(app.status)}</div>
      <dl class="detail-list">
        <div><dt>Submitted</dt><dd>${formatDate(app.created_at)}</dd></div>
        <div><dt>Headline</dt><dd>${esc(app.headline)}</dd></div>
        <div><dt>Courses</dt><dd>${app.courses.map((c) => `<span class="chip">${esc(c.code)} · ${esc(c.grade)}</span>`).join(' ')}</dd></div>
        <div><dt>Fee</dt><dd>${formatFee(app.fee)}</dd></div>
        <div><dt>Mode</dt><dd>${MODE_LABELS[app.mode]}</dd></div>
      </dl>
    </section>`;
}

export async function render(el, { user }) {
  el.innerHTML = dashboardShell({
    role: user.role,
    active: '/become-tutor',
    title: 'Become a tutor',
    subtitle: 'Share what you know, build your reputation and earn, or volunteer.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');

  if (user.role === 'tutor') {
    content.innerHTML = emptyState({
      iconName: 'shieldCheck',
      title: 'You are already a verified tutor',
      action: '<a class="btn btn-primary" href="#/tutor">Go to tutor dashboard</a>',
    });
    return;
  }

  const application = await applicationService.mine();

  if (application?.status === 'approved') {
    await authService.refresh();
    location.hash = '/tutor';
    return;
  }

  if (application?.status === 'pending') {
    content.innerHTML = `
      <div class="banner banner-info">${icon('clock')}<div><strong>Application under review.</strong> An administrator is checking your results. You can keep booking sessions as a learner in the meantime.</div></div>
      ${applicationSummary(application)}`;
    return;
  }

  const courses = await catalogService.courses({ university_id: user.university_id });

  content.innerHTML = `
    ${application?.status === 'rejected' ? `
      <div class="banner banner-danger">${icon('alert')}<div><strong>Your previous application was not approved.</strong> ${esc(application.admin_note)} You can update it and apply again.</div></div>` : ''}

    <div class="apply-layout">
      <form id="apply-form" class="card stack" novalidate>
        <p class="form-error" role="alert" hidden></p>

        <fieldset class="form-section">
          <legend>1. About you as a tutor</legend>
          <div class="field">
            <label for="a-headline">Headline</label>
            <input id="a-headline" name="headline" required maxlength="120" placeholder="e.g. Year 3 CS student · I make recursion simple" value="${esc(application?.headline || '')}">
          </div>
          <div class="field">
            <label for="a-motivation">Why do you want to tutor, and what is your experience?</label>
            <textarea id="a-motivation" name="motivation" rows="5" required minlength="50" maxlength="2000">${esc(application?.motivation || '')}</textarea>
            <p class="form-hint">At least 50 characters. This becomes the start of your profile bio.</p>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>2. Courses you can tutor</legend>
          <p class="form-hint">Select courses you have completed and the grade you obtained. Administrators check these against your results.</p>
          ${coursePicker(courses, new Map((application?.courses || []).map((c) => [c.id, c.grade])))}
        </fieldset>

        <fieldset class="form-section">
          <legend>3. Verification</legend>
          <div class="field">
            <label for="a-evidence">Link to your results slip or transcript</label>
            <input id="a-evidence" name="evidence_url" type="url" required placeholder="https://drive.google.com/…" value="${esc(application?.evidence_url || '')}">
            <p class="form-hint">Share a view-only link. Direct file upload will be available once file storage is connected.</p>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>4. Sessions</legend>
          <div class="grid grid-2 gap-sm">
            <div class="field">
              <label for="a-fee">Fee per hour (UGX)</label>
              <input id="a-fee" name="fee" type="number" min="0" max="500000" step="500" value="${esc(application?.fee ?? 0)}">
              <p class="form-hint">Enter 0 to tutor for free.</p>
            </div>
            <div class="field">
              <label for="a-mode">Session mode</label>
              <select id="a-mode" name="mode">
                ${Object.entries(MODE_LABELS).map(([id, label]) => `<option value="${id}"${(application?.mode || 'both') === id ? ' selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>
          </div>
        </fieldset>

        <label class="check">
          <input type="checkbox" name="agree" required>
          <span>I agree to the PeerTutor code of conduct: I will not complete assessed work on behalf of learners, and I will treat everyone with respect.</span>
        </label>
        <button class="btn btn-primary btn-lg" type="submit">Submit application</button>
      </form>

      <aside class="card apply-aside">
        <h2>How verification works</h2>
        <ol class="numbered-list">
          <li>Submit this application with your results.</li>
          <li>An administrator checks your grades for each course.</li>
          <li>Once approved, your profile goes live and learners can book you.</li>
        </ol>
        <p class="small muted">You can change your courses, fee and availability at any time after approval.</p>
      </aside>
    </div>`;

  const form = content.querySelector('#apply-form');
  const errorEl = form.querySelector('.form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    if (!form.reportValidity()) return;
    const courseSelection = readCoursePicker(form);
    if (!courseSelection.length) {
      errorEl.textContent = 'Select at least one course you can tutor.';
      errorEl.hidden = false;
      errorEl.scrollIntoView({ block: 'center' });
      return;
    }
    const data = formToObject(form);
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await applicationService.submit({
        headline: data.headline,
        motivation: data.motivation,
        courses: courseSelection,
        evidence_url: data.evidence_url,
        fee: Number(data.fee || 0),
        mode: data.mode,
      });
      toast('Application submitted! We will let you know once it has been reviewed.');
      render(el, { user });
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      errorEl.scrollIntoView({ block: 'center' });
      btn.disabled = false;
    }
  });
}
