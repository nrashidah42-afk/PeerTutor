/** Public tutor profile with session booking, reviews, availability and materials. */
import { tutorService } from '../../services/tutorService.js';
import { sessionService } from '../../services/sessionService.js';
import { materialService, MATERIAL_TYPES, MATERIAL_ICONS as TYPE_ICONS } from '../../services/materialService.js';
import { session } from '../../state/session.js';
import { verifiedBadge } from '../../components/tutorCard.js';
import { openModal } from '../../components/modal.js';
import { openReportModal } from '../../components/feedbackModals.js';
import { toast } from '../../components/toast.js';
import {
  esc, avatar, stars, formatFee, formatMoney, formatDate, emptyState, options, firstName, pluralize,
  MODE_LABELS, DAYS, WEEK_ORDER, toDateInput, toMinutes, fromMinutes,
} from '../../components/ui.js';
import { icon } from '../../components/icons.js';

function availabilityTable(slots) {
  return `<table class="availability-table">
    <tbody>
      ${WEEK_ORDER.map((day) => {
        const daySlots = slots.filter((s) => s.day_of_week === day);
        return `<tr${daySlots.length ? '' : ' class="muted"'}>
          <th scope="row">${DAYS[day]}</th>
          <td>${daySlots.length ? daySlots.map((s) => `<span class="slot">${s.start_time}–${s.end_time}</span>`).join('') : 'Not available'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function reviewItem(r, canReport) {
  return `<li class="review">
    <div class="review-head">
      ${avatar(r.learner_name, 'sm')}
      <div>
        <strong>${esc(r.learner_name)}</strong>
        <p class="small muted">${esc(r.course_code)} · ${formatDate(r.created_at)}</p>
      </div>
      <span class="push-right">${stars(r.rating)}</span>
    </div>
    ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
    ${canReport ? `<button type="button" class="link-btn small muted" data-action="report-review" data-id="${r.id}">${icon('flag')} Report</button>` : ''}
  </li>`;
}

function materialItem(m) {
  return `<li class="material-mini">
    <span class="material-icon">${icon(TYPE_ICONS[m.type] || 'file')}</span>
    <div class="min-w-0">
      <button type="button" class="link-btn truncate" data-action="open-material" data-id="${m.id}">${esc(m.title)}</button>
      <p class="small muted">${esc(m.course_code)} · ${MATERIAL_TYPES[m.type]}</p>
    </div>
  </li>`;
}

function openBookingModal(tutor) {
  const today = toDateInput(new Date());
  const modes = tutor.mode === 'both' ? ['online', 'in_person'] : [tutor.mode];
  const availableDays = WEEK_ORDER.filter((d) => tutor.availability.some((s) => s.day_of_week === d)).map((d) => DAYS[d]);

  const { el: modal } = openModal({
    title: `Request a session with ${firstName(tutor.full_name)}`,
    submitLabel: 'Send request',
    body: `
      <div class="field">
        <label for="b-course">Course</label>
        <select id="b-course" name="course_id" required>${options(tutor.courses, { label: (c) => `${c.code} · ${c.title}` })}</select>
      </div>
      <div class="field">
        <label for="b-topic">Topic</label>
        <input id="b-topic" name="topic" list="b-topics" required maxlength="120" placeholder="What do you need help with?">
        <datalist id="b-topics"></datalist>
      </div>
      <div class="grid grid-2 gap-sm">
        <div class="field">
          <label for="b-date">Date</label>
          <input id="b-date" name="date" type="date" min="${today}" required>
        </div>
        <div class="field">
          <label for="b-duration">Duration</label>
          <select id="b-duration" name="duration_minutes">
            <option value="60">1 hour</option><option value="90">1½ hours</option><option value="120">2 hours</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="b-time">Start time</label>
        <select id="b-time" name="time" required><option value="">Pick a date first</option></select>
        <p class="form-hint">${availableDays.length ? `Available on ${availableDays.join(', ')}.` : 'This tutor has not added availability yet.'}</p>
      </div>
      <div class="field">
        <label for="b-mode">Mode</label>
        <select id="b-mode" name="mode">${modes.map((m) => `<option value="${m}">${MODE_LABELS[m]}</option>`).join('')}</select>
        ${tutor.location ? `<p class="form-hint">In-person sessions: ${esc(tutor.location)}</p>` : ''}
      </div>
      <div class="field">
        <label for="b-message">Message to tutor <span class="muted">(optional)</span></label>
        <textarea id="b-message" name="message" rows="3" maxlength="500" placeholder="Which lecture or question you’re stuck on, and when your test is"></textarea>
      </div>
      <div class="fee-estimate" id="b-fee"></div>`,
    onSubmit: async (data) => {
      await sessionService.request({
        tutor_id: tutor.id,
        course_id: Number(data.course_id),
        topic: data.topic,
        scheduled_at: new Date(`${data.date}T${data.time}`).toISOString(),
        duration_minutes: Number(data.duration_minutes),
        mode: data.mode,
        message: data.message,
      });
      toast(`Request sent. ${firstName(tutor.full_name)} will accept or decline it soon.`);
      location.hash = '/learner/sessions';
    },
  });

  const courseSel = modal.querySelector('#b-course');
  const topicList = modal.querySelector('#b-topics');
  const dateInput = modal.querySelector('#b-date');
  const durationSel = modal.querySelector('#b-duration');
  const timeSel = modal.querySelector('#b-time');
  const feeEl = modal.querySelector('#b-fee');

  function updateTopics() {
    const course = tutor.courses.find((c) => String(c.id) === courseSel.value);
    topicList.innerHTML = (course?.topics || []).map((t) => `<option value="${esc(t)}">`).join('');
  }

  function updateTimes() {
    const duration = Number(durationSel.value);
    if (!dateInput.value) {
      timeSel.innerHTML = '<option value="">Pick a date first</option>';
      return;
    }
    const date = new Date(`${dateInput.value}T00:00`);
    const isToday = dateInput.value === toDateInput(new Date());
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const times = [];
    for (const slot of tutor.availability.filter((s) => s.day_of_week === date.getDay())) {
      for (let t = toMinutes(slot.start_time); t + duration <= toMinutes(slot.end_time); t += 30) {
        if (!isToday || t > nowMins) times.push(fromMinutes(t));
      }
    }
    timeSel.innerHTML = times.length
      ? options(times.map((t) => ({ id: t, name: t })), { placeholder: 'Choose a start time' })
      : `<option value="">Not available on this ${DAYS[date.getDay()]}</option>`;
  }

  function updateFee() {
    const fee = Math.round((tutor.fee * Number(durationSel.value)) / 60);
    feeEl.innerHTML = tutor.fee
      ? `${icon('wallet')} Estimated fee <strong>${formatMoney(fee)}</strong>. You agree on payment directly with your tutor.`
      : `${icon('sparkle')} <strong>Free session.</strong> This tutor volunteers their time.`;
  }

  courseSel.addEventListener('change', updateTopics);
  dateInput.addEventListener('change', updateTimes);
  durationSel.addEventListener('change', () => { updateTimes(); updateFee(); });
  updateTopics();
  updateFee();
}

export async function render(el, { params }) {
  const user = session.getUser();
  const [tutor, reviews, materials] = await Promise.all([
    tutorService.get(params.id),
    tutorService.reviews(params.id),
    materialService.list({ uploader_id: params.id }),
  ]);
  const isSelf = user?.id === tutor.id;
  const canBook = !user || (user.role !== 'admin' && !isSelf);

  el.innerHTML = `
    <div class="container page">
      <nav class="breadcrumb small" aria-label="Breadcrumb"><a href="#/tutors">Find a tutor</a><span aria-hidden="true">/</span><span>${esc(tutor.full_name)}</span></nav>

      <section class="card profile-hero">
        ${avatar(tutor.full_name, 'xl')}
        <div class="profile-hero-main">
          <h1>${esc(tutor.full_name)} ${verifiedBadge()}</h1>
          <p class="muted">${esc(tutor.programme)} · Year ${esc(tutor.year_of_study)} · ${esc(tutor.university_name)}</p>
          <p class="profile-headline">${esc(tutor.headline)}</p>
          <ul class="meta-list">
            <li>${stars(tutor.rating)} <strong>${tutor.review_count ? tutor.rating.toFixed(1) : 'New'}</strong> <span class="muted">(${pluralize(tutor.review_count, 'review')})</span></li>
            <li>${icon('check')} ${pluralize(tutor.sessions_completed, 'session')} completed</li>
            <li>${icon(tutor.mode === 'in_person' ? 'pin' : 'video')} ${MODE_LABELS[tutor.mode]}</li>
            ${tutor.location ? `<li>${icon('pin')} ${esc(tutor.location)}</li>` : ''}
          </ul>
        </div>
        <div class="profile-hero-cta">
          <p class="fee-lg ${tutor.fee ? '' : 'fee-free'}">${formatFee(tutor.fee)}</p>
          ${canBook ? `<button type="button" class="btn btn-primary btn-lg btn-block" data-action="book">${icon('calendar')} Request a session</button>` : ''}
          ${isSelf ? '<a class="btn btn-soft btn-block" href="#/tutor/profile">Edit my profile</a>' : ''}
          ${user && !isSelf ? `<button type="button" class="link-btn small muted" data-action="report-tutor">${icon('flag')} Report profile</button>` : ''}
        </div>
      </section>

      <div class="profile-layout">
        <div class="stack-lg">
          <section class="card">
            <h2>About</h2>
            <p class="prewrap">${esc(tutor.bio || 'This tutor has not written a bio yet.')}</p>
          </section>
          <section class="card">
            <h2>Courses &amp; topics</h2>
            <ul class="course-list">
              ${tutor.courses.map((c) => `
                <li>
                  <div class="course-list-head">
                    <span class="course-code">${esc(c.code)}</span>
                    <strong>${esc(c.title)}</strong>
                    ${c.grade ? `<span class="badge badge-success" title="Grade obtained">Grade ${esc(c.grade)}</span>` : ''}
                  </div>
                  <div class="chips">${c.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
                </li>`).join('')}
            </ul>
          </section>
          <section class="card" id="reviews">
            <h2>Reviews <span class="muted">(${reviews.length})</span></h2>
            ${reviews.length
              ? `<ul class="review-list">${reviews.map((r) => reviewItem(r, !!user)).join('')}</ul>`
              : emptyState({ iconName: 'star', title: 'No reviews yet', text: 'Be the first to book a session and share your experience.' })}
          </section>
        </div>
        <aside class="stack-lg">
          <section class="card">
            <h2>Weekly availability</h2>
            ${availabilityTable(tutor.availability)}
          </section>
          <section class="card">
            <h2>Learning materials</h2>
            ${materials.length
              ? `<ul class="material-mini-list">${materials.map(materialItem).join('')}</ul>`
              : '<p class="muted small">No materials shared yet.</p>'}
          </section>
        </aside>
      </div>
    </div>`;

  el.firstElementChild.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, id } = target.dataset;

    if (!session.getUser()) {
      if (action === 'book') location.hash = `/login?next=${encodeURIComponent(`/tutors/${tutor.id}`)}`;
      if (action === 'open-material') toast('Log in to open learning materials.', 'info');
      return;
    }
    if (action === 'book') openBookingModal(tutor);
    if (action === 'report-tutor') openReportModal('user', tutor.id);
    if (action === 'report-review') openReportModal('review', Number(id));
    if (action === 'open-material') {
      try {
        const { url } = await materialService.open(id);
        window.open(url, '_blank', 'noopener');
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });
}
