/** Modals for leaving a review and reporting content. */
import { openModal } from './modal.js';
import { toast } from './toast.js';
import { esc, firstName } from './ui.js';
import { reviewService } from '../services/reviewService.js';
import { reportService } from '../services/adminService.js';

export function openReviewModal(session, onDone) {
  const starInputs = [5, 4, 3, 2, 1]
    .map((n) => `<input type="radio" id="rate-${n}" name="rating" value="${n}" required><label for="rate-${n}" title="${n} star${n > 1 ? 's' : ''}">★</label>`)
    .join('');

  openModal({
    title: `Rate your session with ${firstName(session.tutor_name)}`,
    submitLabel: 'Submit review',
    body: `
      <p class="muted small">${esc(session.course_code)} · ${esc(session.topic || session.course_title)}</p>
      <fieldset class="rating-input">
        <legend>Your rating</legend>
        <div class="rating-stars">${starInputs}</div>
      </fieldset>
      <div class="field">
        <label for="review-comment">What was helpful? <span class="muted">(optional)</span></label>
        <textarea id="review-comment" name="comment" rows="4" maxlength="1000" placeholder="Help other students decide: explanation style, preparation, punctuality…"></textarea>
      </div>`,
    onSubmit: async (data) => {
      await reviewService.create({ session_id: session.id, rating: Number(data.rating), comment: data.comment });
      toast('Thanks! Your review has been published.');
      onDone?.();
    },
  });
}

const TARGET_LABELS = { review: 'review', material: 'learning material', user: 'profile' };

export function openReportModal(targetType, targetId) {
  openModal({
    title: `Report this ${TARGET_LABELS[targetType]}`,
    submitLabel: 'Send report',
    body: `
      <p class="muted small">Reports go to the PeerTutor administrators. Tell us what's wrong, for example harassment, spam, plagiarism or academic dishonesty.</p>
      <div class="field">
        <label for="report-reason">Reason</label>
        <textarea id="report-reason" name="reason" rows="4" required minlength="10" maxlength="500"></textarea>
      </div>`,
    onSubmit: async (data) => {
      await reportService.create({ target_type: targetType, target_id: targetId, reason: data.reason });
      toast('Report sent. Thank you for keeping PeerTutor safe.');
    },
  });
}
