import { authService } from '../../services/authService.js';
import { catalogService } from '../../services/catalogService.js';
import { session } from '../../state/session.js';
import { toast } from '../../components/toast.js';
import { esc, options, formToObject, firstName } from '../../components/ui.js';
import { LOGO } from '../../components/icons.js';
import { config } from '../../config.js';

export async function render(el, { query }) {
  const universities = await catalogService.universities();
  const defaultUni = universities.find((u) => u.id === config.DEFAULT_UNIVERSITY_ID) || universities[0];

  el.innerHTML = `
    <div class="auth-page">
      <div class="auth-card auth-card-wide card">
        <div class="auth-logo">${LOGO}</div>
        <h1>Create your PeerTutor account</h1>
        <p class="muted">Free for all students. Sign up with your university email.</p>
        <form id="register-form" class="stack" novalidate>
          <p class="form-error" role="alert" hidden></p>
          <div class="field">
            <label for="full_name">Full name</label>
            <input id="full_name" name="full_name" autocomplete="name" required maxlength="100">
          </div>
          <div class="grid grid-2 gap-sm">
            <div class="field">
              <label for="university_id">University</label>
              <select id="university_id" name="university_id" required>${options(universities, { selected: defaultUni?.id })}</select>
            </div>
            <div class="field">
              <label for="programme_id">Programme</label>
              <select id="programme_id" name="programme_id" required></select>
            </div>
          </div>
          <div class="grid grid-2 gap-sm">
            <div class="field">
              <label for="email">University email</label>
              <input id="email" name="email" type="email" autocomplete="email" required>
              <p class="form-hint" id="email-hint"></p>
            </div>
            <div class="field">
              <label for="year_of_study">Year of study</label>
              <select id="year_of_study" name="year_of_study">${[1, 2, 3, 4, 5].map((y) => `<option value="${y}">Year ${y}</option>`).join('')}</select>
            </div>
          </div>
          <div class="grid grid-2 gap-sm">
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="new-password" required minlength="8">
              <p class="form-hint">At least 8 characters.</p>
            </div>
            <div class="field">
              <label for="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8">
            </div>
          </div>
          <label class="check">
            <input type="checkbox" name="wants_to_tutor" value="1"${query.tutor ? ' checked' : ''}>
            <span>I would also like to apply to become a tutor</span>
          </label>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Create account</button>
        </form>
        <p class="small center">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </div>`;

  const form = el.querySelector('#register-form');
  const errorEl = form.querySelector('.form-error');
  const uniSelect = form.university_id;
  const progSelect = form.programme_id;
  const emailHint = el.querySelector('#email-hint');

  async function onUniversityChange() {
    const uni = universities.find((u) => String(u.id) === uniSelect.value);
    emailHint.textContent = uni ? `Must end in ${uni.email_domain}` : '';
    form.email.placeholder = uni ? `firstname.lastname@students.${uni.email_domain}` : '';
    const programmes = await catalogService.programmes(uniSelect.value);
    progSelect.innerHTML = options(programmes, { placeholder: 'Select your programme' });
  }
  uniSelect.addEventListener('change', onUniversityChange);
  await onUniversityChange();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    form.confirm.setCustomValidity(form.confirm.value !== form.password.value ? 'Passwords do not match.' : '');
    if (!form.reportValidity()) return;

    const data = formToObject(form);
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const { token, user } = await authService.register({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        university_id: Number(data.university_id),
        programme_id: Number(data.programme_id),
        year_of_study: Number(data.year_of_study),
      });
      session.start(token, user);
      toast(`Welcome to PeerTutor, ${firstName(user.full_name)}!`);
      location.hash = data.wants_to_tutor ? '/become-tutor' : '/learner';
    } catch (err) {
      errorEl.innerHTML = esc(err.message);
      errorEl.hidden = false;
      btn.disabled = false;
    }
  });
}
