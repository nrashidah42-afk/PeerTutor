import { esc, avatar, stars, formatFee, DAYS_SHORT, WEEK_ORDER, pluralize } from './ui.js';
import { icon } from './icons.js';

export const verifiedBadge = () =>
  `<span class="verified" title="Verified by PeerTutor">${icon('shieldCheck')}<span class="sr-only">Verified tutor</span></span>`;

export function tutorCard(t) {
  const shown = t.courses.slice(0, 3);
  const extra = t.courses.length - shown.length;
  const days = WEEK_ORDER.filter((d) => t.availability_days.includes(d)).map((d) => DAYS_SHORT[d]);

  return `
    <article class="card tutor-card">
      <div class="tutor-card-head">
        ${avatar(t.full_name, 'lg')}
        <div class="min-w-0">
          <h3 class="tutor-name"><a href="#/tutors/${t.id}" class="stretched-link">${esc(t.full_name)}</a>${t.is_verified ? verifiedBadge() : ''}</h3>
          <p class="muted small truncate">${esc(t.programme)} · Year ${esc(t.year_of_study)} · ${esc(t.university)}</p>
        </div>
      </div>
      <p class="tutor-headline">${esc(t.headline)}</p>
      <div class="rating-row">
        ${stars(t.rating)}
        <strong>${t.review_count ? t.rating.toFixed(1) : 'New'}</strong>
        <span class="muted small">(${pluralize(t.review_count, 'review')})</span>
      </div>
      <div class="chips">
        ${shown.map((c) => `<span class="chip" title="${esc(c.title)}">${esc(c.code)}</span>`).join('')}
        ${extra > 0 ? `<span class="chip chip-muted">+${extra}</span>` : ''}
      </div>
      <div class="tutor-card-foot">
        <span class="fee ${t.fee ? '' : 'fee-free'}">${formatFee(t.fee)}</span>
        <span class="muted small">${icon('clock')} ${days.length ? days.join(', ') : 'No slots yet'}</span>
      </div>
    </article>`;
}
