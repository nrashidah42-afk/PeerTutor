/** Small, pure HTML helpers used across pages. Always pass user data through esc(). */
import { config } from '../config.js';
import { icon } from './icons.js';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MODE_LABELS = { online: 'Online', in_person: 'In person', both: 'Online & in person' };
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const firstName = (name = '') => name.split(' ')[0];

export const formatMoney = (amount) => `${config.CURRENCY} ${Number(amount || 0).toLocaleString('en-UG')}`;
export const formatFee = (fee) => (fee ? `${formatMoney(fee)}/hr` : 'Free');

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    const n = Math.floor(Math.abs(seconds) / size);
    if (n >= 1) return seconds >= 0 ? `${n} ${unit}${n > 1 ? 's' : ''} ago` : `in ${n} ${unit}${n > 1 ? 's' : ''}`;
  }
  return 'just now';
}

/** "YYYY-MM-DD" for <input type="date"> in local time. */
export function toDateInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export function labelize(value = '') {
  const s = String(value).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function stars(rating = 0) {
  let out = '';
  for (let i = 1; i <= 5; i++) {
    const cls = rating >= i - 0.25 ? 'full' : rating >= i - 0.75 ? 'half' : 'empty';
    out += `<span class="star ${cls}">★</span>`;
  }
  return `<span class="stars" role="img" aria-label="Rated ${Number(rating).toFixed(1)} out of 5">${out}</span>`;
}

export function avatar(name = '', size = 'md') {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 0);
  return `<span class="avatar avatar-${size}" style="--avatar-hue:${hue}" aria-hidden="true">${esc(initials)}</span>`;
}

export const badge = (text, tone = 'neutral') => `<span class="badge badge-${tone}">${esc(text)}</span>`;

const STATUS_TONES = {
  requested: 'warning', accepted: 'info', completed: 'success', declined: 'danger', cancelled: 'neutral',
  pending: 'warning', approved: 'success', rejected: 'danger',
  active: 'success', suspended: 'danger',
  visible: 'success', hidden: 'neutral', published: 'success',
  open: 'warning', resolved: 'success', dismissed: 'neutral',
};
export const statusBadge = (status) => badge(labelize(status), STATUS_TONES[status] || 'neutral');

export function options(list, { value = 'id', label = 'name', selected, placeholder } = {}) {
  const sel = selected == null ? null : String(selected);
  const pick = (item, key) => (typeof key === 'function' ? key(item) : item[key]);
  const head = placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '';
  return head + list.map((item) => {
    const v = String(pick(item, value));
    return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(pick(item, label))}</option>`;
  }).join('');
}

export function formToObject(form) {
  const out = {};
  for (const [key, value] of new FormData(form).entries()) {
    out[key] = key in out ? [].concat(out[key], value) : value;
  }
  return out;
}

export function emptyState({ iconName = 'search', title, text = '', action = '' }) {
  return `<div class="empty-state">
    <span class="empty-icon">${icon(iconName)}</span>
    <h3>${esc(title)}</h3>
    ${text ? `<p class="muted">${esc(text)}</p>` : ''}
    ${action}
  </div>`;
}

export const loader = (text = 'Loading…') =>
  `<div class="loader" role="status"><span class="spinner" aria-hidden="true"></span><span>${esc(text)}</span></div>`;

export const errorState = (message) =>
  emptyState({ iconName: 'alert', title: 'Something went wrong', text: message, action: '<button class="btn btn-soft" onclick="location.reload()">Try again</button>' });

export function statCard(iconName, label, value, { tone = 'primary', href } = {}) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="stat-card tone-${tone}"${href ? ` href="#${href}"` : ''}>
    <span class="stat-icon">${icon(iconName)}</span>
    <div><p class="stat-value">${esc(value)}</p><p class="stat-label">${esc(label)}</p></div>
  </${tag}>`;
}

export function tabs(items, active) {
  return `<div class="tabs" role="tablist">${items.map((t) => `
    <button type="button" role="tab" class="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === active}">
      ${esc(t.label)}${t.count != null ? `<span class="tab-count">${t.count}</span>` : ''}
    </button>`).join('')}</div>`;
}

export const pluralize = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
