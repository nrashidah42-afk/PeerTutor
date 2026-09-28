import { esc, statusBadge, formatDateTime, formatMoney, MODE_LABELS } from './ui.js';

/**
 * One tutoring session row.
 * @param {object} s     session from the API
 * @param {object} opts  { as: 'learner'|'tutor', actions: html }
 */
export function sessionItem(s, { as = 'learner', actions = '' } = {}) {
  const d = new Date(s.scheduled_at);
  const other = as === 'learner'
    ? `with <a href="#/tutors/${s.tutor_id}">${esc(s.tutor_name)}</a>`
    : `with ${esc(s.learner_name)}`;

  return `
    <li class="session-item" data-id="${s.id}">
      <div class="date-block" aria-hidden="true">
        <span class="date-month">${d.toLocaleString('en-GB', { month: 'short' })}</span>
        <span class="date-day">${d.getDate()}</span>
      </div>
      <div class="session-body">
        <div class="session-title">
          <strong>${esc(s.course_code)}</strong><span>${esc(s.topic || s.course_title)}</span>
          ${statusBadge(s.status)}
        </div>
        <p class="small muted">
          ${other} · ${formatDateTime(s.scheduled_at)} · ${s.duration_minutes} min · ${MODE_LABELS[s.mode] || ''} · ${s.fee ? formatMoney(s.fee) : 'Free'}
        </p>
        ${s.message ? `<p class="session-note"><span class="muted">${as === 'learner' ? 'Your message' : 'Learner’s message'}:</span> ${esc(s.message)}</p>` : ''}
        ${s.tutor_note ? `<p class="session-note"><span class="muted">Tutor’s note:</span> ${esc(s.tutor_note)}</p>` : ''}
      </div>
      ${actions ? `<div class="session-actions">${actions}</div>` : ''}
    </li>`;
}

export const sessionList = (sessions, opts) =>
  `<ul class="session-list">${sessions.map((s) => sessionItem(s, typeof opts === 'function' ? opts(s) : opts)).join('')}</ul>`;
