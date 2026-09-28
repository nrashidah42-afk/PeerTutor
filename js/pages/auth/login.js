import { authService } from '../../services/authService.js';
import { session, dashboardPathFor } from '../../state/session.js';
import { toast } from '../../components/toast.js';
import { esc, firstName } from '../../components/ui.js';
import { LOGO } from '../../components/icons.js';
import { config } from '../../config.js';

export function render(el, { query }) {
  const demo = config.API_MODE === 'mock'
    ? `<div class="demo-box">
        <p class="small"><strong>Demo accounts</strong>. Click one to fill in the form.</p>
        <div class="demo-buttons">
          ${config.DEMO_ACCOUNTS.map((d) => `<button type="button" class="btn btn-soft btn-sm" data-email="${esc(d.email)}">${esc(d.role)}</button>`).join('')}
        </div>
      </div>`
    : '';

  el.innerHTML = `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-logo">${LOGO}</div>
        <h1>Welcome back</h1>
        <p class="muted">Log in with your university email.</p>
        <form id="login-form" class="stack" novalidate>
          <p class="form-error" role="alert" hidden></p>
          <div class="field">
            <label for="email">University email</label>
            <input id="email" name="email" type="email" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button>
        </form>
        <p class="small center">New to PeerTutor? <a href="#/register">Create an account</a></p>
        ${demo}
      </div>
    </div>`;

  const form = el.querySelector('#login-form');
  const errorEl = form.querySelector('.form-error');

  el.querySelectorAll('[data-email]').forEach((btn) =>
    btn.addEventListener('click', () => {
      form.email.value = btn.dataset.email;
      form.password.value = config.DEMO_PASSWORD;
      form.querySelector('[type=submit]').focus();
    }),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    errorEl.hidden = true;
    try {
      const { token, user } = await authService.login(form.email.value.trim(), form.password.value);
      session.start(token, user);
      toast(`Welcome back, ${firstName(user.full_name)}!`);
      location.hash = query.next || dashboardPathFor(user);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      btn.disabled = false;
    }
  });
}
