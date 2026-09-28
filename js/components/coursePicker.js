/**
 * Checkbox list of courses (grouped by programme) with a grade select per course.
 * Used by the tutor application and the tutor profile editor.
 */
import { esc } from './ui.js';

const GRADES = ['A', 'B+', 'B', 'C+', 'C'];

/**
 * @param {Array} courses  courses from GET /courses
 * @param {Map<number,string>} selected  course_id -> grade
 */
export function coursePicker(courses, selected = new Map()) {
  const groups = new Map();
  for (const c of courses) {
    if (!groups.has(c.programme)) groups.set(c.programme, []);
    groups.get(c.programme).push(c);
  }
  return `<div class="course-picker">${[...groups].map(([programme, list]) => `
    <fieldset class="course-group">
      <legend>${esc(programme)}</legend>
      ${list.map((c) => {
        const checked = selected.has(c.id);
        const grade = selected.get(c.id) || 'A';
        return `
          <div class="course-option">
            <label class="check">
              <input type="checkbox" name="course_ids" value="${c.id}"${checked ? ' checked' : ''}>
              <span><strong>${esc(c.code)}</strong> ${esc(c.title)} <span class="muted small">· Year ${c.year}</span></span>
            </label>
            <label class="sr-only" for="grade-${c.id}">Grade obtained in ${esc(c.code)}</label>
            <select id="grade-${c.id}" name="grade_${c.id}" class="grade-select" title="Grade you obtained">
              ${GRADES.map((g) => `<option${g === grade ? ' selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>`;
      }).join('')}
    </fieldset>`).join('')}</div>`;
}

/** Returns [{course_id, grade}] from a form containing a coursePicker. */
export function readCoursePicker(form) {
  return [...form.querySelectorAll('input[name="course_ids"]:checked')].map((input) => ({
    course_id: Number(input.value),
    grade: form.querySelector(`[name="grade_${input.value}"]`)?.value || '',
  }));
}
