/** Weekly availability editor. Edits are local until "Save availability" is pressed. */
import { tutorService } from '../../services/tutorService.js';
import { dashboardShell } from '../../components/dashboardShell.js';
import { toast } from '../../components/toast.js';
import { loader, DAYS, WEEK_ORDER, options, fromMinutes } from '../../components/ui.js';
import { icon } from '../../components/icons.js';

const TIMES = Array.from({ length: (22 - 6) * 2 + 1 }, (_, i) => fromMinutes(6 * 60 + i * 30)); // 06:00–22:00

export async function render(el) {
  el.innerHTML = dashboardShell({
    role: 'tutor',
    active: '/tutor/availability',
    title: 'Weekly availability',
    subtitle: 'Learners can only request sessions inside these times.',
    content: loader(),
  });
  const content = el.querySelector('#dash-content');
  const profile = await tutorService.myProfile();
  let slots = profile.availability.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }));
  let dirty = false;

  function draw() {
    content.innerHTML = `
      <form id="slot-form" class="card toolbar" novalidate>
        <div class="field">
          <label for="s-day">Day</label>
          <select id="s-day" name="day_of_week">${options(WEEK_ORDER.map((d) => ({ id: d, name: DAYS[d] })))}</select>
        </div>
        <div class="field">
          <label for="s-start">From</label>
          <select id="s-start" name="start_time">${options(TIMES.map((t) => ({ id: t, name: t })), { selected: '14:00' })}</select>
        </div>
        <div class="field">
          <label for="s-end">To</label>
          <select id="s-end" name="end_time">${options(TIMES.map((t) => ({ id: t, name: t })), { selected: '16:00' })}</select>
        </div>
        <button class="btn btn-soft align-end" type="submit">${icon('plus')} Add slot</button>
      </form>

      <div class="card">
        <ul class="week-grid">
          ${WEEK_ORDER.map((day) => {
            const daySlots = slots.map((s, i) => ({ ...s, i })).filter((s) => s.day_of_week === day)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
            return `<li class="week-day">
              <strong>${DAYS[day]}</strong>
              <div class="week-slots">
                ${daySlots.length
                  ? daySlots.map((s) => `<span class="slot slot-removable">${s.start_time}–${s.end_time}
                      <button type="button" class="slot-remove" data-remove="${s.i}" aria-label="Remove ${DAYS[day]} ${s.start_time} to ${s.end_time}">${icon('x')}</button></span>`).join('')
                  : '<span class="muted small">Not available</span>'}
              </div>
            </li>`;
          }).join('')}
        </ul>
        <div class="form-actions">
          ${dirty ? '<span class="small muted">You have unsaved changes</span>' : ''}
          <button type="button" class="btn btn-primary" data-save${dirty ? '' : ' disabled'}>Save availability</button>
        </div>
      </div>`;
  }

  content.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const slot = {
      day_of_week: Number(form.day_of_week.value),
      start_time: form.start_time.value,
      end_time: form.end_time.value,
    };
    if (slot.start_time >= slot.end_time) return toast('The end time must be after the start time.', 'error');
    const clash = slots.some((s) => s.day_of_week === slot.day_of_week && s.start_time < slot.end_time && slot.start_time < s.end_time);
    if (clash) return toast(`That overlaps an existing ${DAYS[slot.day_of_week]} slot.`, 'error');
    slots.push(slot);
    dirty = true;
    draw();
    return undefined;
  });

  content.addEventListener('click', async (e) => {
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      slots.splice(Number(remove.dataset.remove), 1);
      dirty = true;
      return draw();
    }
    const save = e.target.closest('[data-save]');
    if (!save) return undefined;
    save.disabled = true;
    try {
      const saved = await tutorService.updateAvailability(slots);
      slots = saved.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }));
      dirty = false;
      toast('Availability saved.');
      draw();
    } catch (err) {
      toast(err.message, 'error');
      save.disabled = false;
    }
    return undefined;
  });

  draw();
}
