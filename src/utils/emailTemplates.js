function verificationEmailHtml({ firstName, verifyUrl }) {
  return `
    <h2>Verify your Proveny account</h2>
    <p>Hello ${firstName},</p>
    <p>Please verify your account before logging in.</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
  `;
}

function passwordResetEmailHtml({ firstName, resetUrl }) {
  return `
    <h2>Reset your Proveny password</h2>
    <p>Hello ${firstName},</p>
    <p>Use this link to reset your password:</p>
    <p><a href="${resetUrl}">Reset password</a></p>
  `;
}

function submissionFlaggedEmailHtml({ firstName, riskLevel, assignmentTitle, ensembleScore, submissionId }) {
  return `
    <h2>Proveny ${riskLevel} submission alert</h2>
    <p>Hello ${firstName},</p>
    <p>A submission for <strong>${assignmentTitle}</strong> was flagged.</p>
    <p>Submission: ${submissionId}</p>
    <p>Ensemble score: ${ensembleScore}</p>
  `;
}

function interviewOutcomeEmailHtml({ firstName, outcome, assignmentTitle, notes }) {
  return `
    <h2>Proveny interview outcome</h2>
    <p>Hello ${firstName},</p>
    <p>Your interview outcome for <strong>${assignmentTitle}</strong>: ${outcome}</p>
    ${notes ? `<p>Notes: ${notes}</p>` : ""}
  `;
}

function baselineCaptureEmailHtml({ firstName, courseCode, sophisticationScore }) {
  return `
    <h2>Proveny Baseline Code Captured</h2>
    <p>Hello ${firstName},</p>
    <p>Your baseline submission for course <strong>${courseCode}</strong> has been successfully captured.</p>
    <p>Sophistication score: ${sophisticationScore}</p>
  `;
}

function escalationEmailHtml({ instructorName, studentName, assignmentTitle, riskLevel, ensembleScore }) {
  return `
    <h2>Proveny Critical Risk Escalation Alert</h2>
    <p>Hello ${instructorName},</p>
    <p>A submission by student <strong>${studentName}</strong> for <strong>${assignmentTitle}</strong> has breached the critical risk threshold.</p>
    <p>Risk Level: <strong>${riskLevel}</strong></p>
    <p>Ensemble Score: <strong>${ensembleScore}</strong></p>
    <p>Immediate review is recommended.</p>
  `;
}

module.exports = {
  verificationEmailHtml,
  passwordResetEmailHtml,
  submissionFlaggedEmailHtml,
  interviewOutcomeEmailHtml,
  baselineCaptureEmailHtml,
  escalationEmailHtml,
};
