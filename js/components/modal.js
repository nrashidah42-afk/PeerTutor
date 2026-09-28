/**
 * Accessible modal dialog with an optional form.
 * onSubmit(data, form) may be async; throw to show an error and keep the modal open.
 */
import { esc, formToObject } from './ui.js';
import { icon } from './icons.js';

export function openModal({ title, body, submitLabel = 'Save', cancelLabel = 'Cancel', onSubmit, onClose, danger = false, size = '' }) {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <form class="modal-form" novalidate>
        <header class="modal-header">
          <h2 id="modal-title">${esc(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </header>
        <div class="modal-body">
          ${body}
          <p class="form-error" role="alert" hidden></p>
        </div>
        ${onSubmit ? `<footer class="modal-footer">
          <button type="button" class="btn btn-ghost" data-close>${esc(cancelLabel)}</button>
          <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(submitLabel)}</button>
        </footer>` : ''}
      </form>
    </div>`;

  const previousFocus = document.activeElement;
  const form = wrap.querySelector('form');
  const errorEl = wrap.querySelector('.form-error');

  function close() {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('modal-open');
    previousFocus?.focus?.();
    onClose?.();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      // keep focus inside the dialog
      const focusable = [...wrap.querySelectorAll('button, [href], input, select, textarea')].filter((el) => !el.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    if (!form.reportValidity()) return;
    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.disabled = true;
    errorEl.hidden = true;
    try {
      await onSubmit(formToObject(form), form);
      close();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  root.appendChild(wrap);
  document.body.classList.add('modal-open');
  const firstField = wrap.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
  (firstField || wrap.querySelector('[data-close]')).focus();
  return { close, el: wrap };
}

/** Resolves true if the user confirms, false otherwise. */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let confirmed = false;
    openModal({
      title,
      body: `<p>${esc(message)}</p>`,
      submitLabel: confirmLabel,
      danger,
      onSubmit: () => { confirmed = true; },
      onClose: () => resolve(confirmed),
    });
  });
}
