const messages = {
  assessment_assignment_mismatch: 'The submission belongs to a different assignment.',
  assessment_variant_missing: 'The submitted variant was not issued by this teacher key.',
  assessment_variant_mismatch: 'The submitted variant data does not match this teacher key.',
  assessment_student_mismatch: 'This variant was issued to a different student.',
  assessment_no_review_files: 'Load student work files before retrying the review.',
  assessment_review_in_progress: 'Wait for the current review to finish.',
};

export class AssessmentError extends Error {
  constructor(code, details = {}) {
    super(messages[code] || code);
    this.name = 'AssessmentError';
    this.code = code;
    Object.assign(this, details);
  }
}
