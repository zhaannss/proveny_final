// ============================================================
// Proveny SPA - Frontend Application Logic
// ============================================================

const API_BASE = "/api/v1";

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = type === "success" ? "check-circle" : type === "error" ? "x-circle" : "alert-circle";
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons({ el: toast });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================
// TOKEN MANAGEMENT
// ============================================================
const Auth = {
  getAccessToken: () => localStorage.getItem("Proveny_access_token"),
  getRefreshToken: () => localStorage.getItem("Proveny_refresh_token"),
  getUser: () => {
    const u = localStorage.getItem("Proveny_user");
    return u ? JSON.parse(u) : null;
  },
  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem("Proveny_access_token", accessToken);
    localStorage.setItem("Proveny_refresh_token", refreshToken);
    localStorage.setItem("Proveny_user", JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem("Proveny_access_token");
    localStorage.removeItem("Proveny_refresh_token");
    localStorage.removeItem("Proveny_user");
  },
  isLoggedIn: () => !!localStorage.getItem("Proveny_access_token"),
};

// ============================================================
// API CLIENT WITH AUTOMATIC TOKEN REFRESH
// ============================================================
async function apiFetch(path, options = {}, retried = false) {
  const token = Auth.getAccessToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh if 401 and we haven't already retried
  if (res.status === 401 && !retried) {
    const refreshToken = Auth.getRefreshToken();
    if (!refreshToken) { Auth.clearSession(); navigateToAuth(); return null; }
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshRes.ok) { Auth.clearSession(); navigateToAuth(); return null; }
    const data = await refreshRes.json();
    const user = Auth.getUser();
    Auth.setSession(data.accessToken, data.refreshToken, user);
    return apiFetch(path, options, true);
  }

  return res;
}

// Multipart (file upload) version - no Content-Type header (browser sets it with boundary)
async function apiUpload(path, formData, retried = false) {
  const token = Auth.getAccessToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: formData });
  if (res.status === 401 && !retried) {
    const refreshToken = Auth.getRefreshToken();
    if (!refreshToken) { Auth.clearSession(); navigateToAuth(); return null; }
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshRes.ok) { Auth.clearSession(); navigateToAuth(); return null; }
    const data = await refreshRes.json();
    Auth.setSession(data.accessToken, data.refreshToken, Auth.getUser());
    return apiUpload(path, formData, true);
  }
  return res;
}

// ============================================================
// VIEW ROUTING
// ============================================================
const VIEWS = {
  auth: "view-auth",
  student: "view-student",
  instructor: "view-instructor",
  proctor: "view-proctor",
  admin: "view-admin",
};

function showView(viewId) {
  Object.values(VIEWS).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");
}

function navigateToAuth() {
  document.getElementById("app-header").classList.add("hidden");
  showAuthForm("login");
  showView(VIEWS.auth);
  // Reset auth header text
  document.getElementById("auth-title").textContent = "Welcome Back";
  document.getElementById("auth-subtitle").textContent = "Login to access code forensics";
}

function navigateToDashboard(user) {
  const header = document.getElementById("app-header");
  header.classList.remove("hidden");
  document.getElementById("user-display-name").textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById("user-display-role").textContent = user.role;

  const roleViewMap = {
    STUDENT: VIEWS.student,
    INSTRUCTOR: VIEWS.instructor,
    PROCTOR: VIEWS.proctor,
    ADMIN: VIEWS.admin,
  };
  showView(roleViewMap[user.role] || VIEWS.student);

  // Load initial dashboard data
  if (user.role === "STUDENT") initStudentDashboard();
  if (user.role === "INSTRUCTOR") initInstructorDashboard();
  if (user.role === "PROCTOR") initProctorDashboard();
  if (user.role === "ADMIN") initAdminDashboard();
}

// ============================================================
// AUTH FORM SWITCHER
// ============================================================
function showAuthForm(form) {
  const forms = ["form-login", "form-register", "form-forgot", "form-reset-password"];
  forms.forEach((id) => document.getElementById(id).classList.add("hidden"));
  document.getElementById("auth-verification-banner").classList.add("hidden");
  document.getElementById(`form-${form}`).classList.remove("hidden");
}

// ============================================================
// AUTH HANDLERS
// ============================================================
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 403 && data.message?.toLowerCase().includes("verif")) {
        showAuthForm("login"); // keep login form
        document.getElementById("auth-verification-banner").classList.remove("hidden");
      }
      showToast(data.message || "Login failed", "error");
      return;
    }

    Auth.setSession(data.accessToken, data.refreshToken, data.user);
    showToast(`Welcome back, ${data.user.firstName}!`, "success");
    navigateToDashboard(data.user);
  } catch {
    showToast("Network error — is the backend running?", "error");
  }
});

document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    firstName: document.getElementById("reg-first-name").value.trim(),
    lastName: document.getElementById("reg-last-name").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    password: document.getElementById("reg-password").value,
  };
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Registration failed", "error"); return; }

    showToast("Registration successful! Check your email for a verification link.", "success");
    document.getElementById("auth-title").textContent = "Verify Your Email";
    document.getElementById("auth-subtitle").textContent = "Click the link sent to your inbox";
    showAuthForm("login");
    document.getElementById("auth-verification-banner").classList.remove("hidden");
  } catch {
    showToast("Network error", "error");
  }
});

document.getElementById("form-forgot").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Error", "error"); return; }
    showToast("Password reset link sent! Check your email.", "success");
    showAuthForm("reset-password");
  } catch {
    showToast("Network error", "error");
  }
});

document.getElementById("form-reset-password").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = document.getElementById("reset-token").value.trim();
  const newPassword = document.getElementById("reset-new-password").value;
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Reset failed", "error"); return; }
    showToast("Password updated! You can now login.", "success");
    showAuthForm("login");
  } catch {
    showToast("Network error", "error");
  }
});

document.getElementById("btn-submit-verification").addEventListener("click", async () => {
  const token = document.getElementById("verify-token-input").value.trim();
  if (!token) { showToast("Paste the verification token", "warning"); return; }
  try {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Verification failed", "error"); return; }
    showToast("Email verified! You may now login.", "success");
    document.getElementById("auth-verification-banner").classList.add("hidden");
  } catch {
    showToast("Network error", "error");
  }
});

// Link toggles
document.getElementById("link-to-register").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("auth-title").textContent = "Create Account"; document.getElementById("auth-subtitle").textContent = "Join Proveny forensics platform"; showAuthForm("register"); });
document.getElementById("link-to-login").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("auth-title").textContent = "Welcome Back"; document.getElementById("auth-subtitle").textContent = "Login to access code forensics"; showAuthForm("login"); });
document.getElementById("link-forgot-pw").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("auth-title").textContent = "Reset Password"; document.getElementById("auth-subtitle").textContent = "We'll email you a reset link"; showAuthForm("forgot"); });
document.getElementById("link-forgot-to-login").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("login"); });
document.getElementById("link-reset-to-login").addEventListener("click", (e) => { e.preventDefault(); showAuthForm("login"); });

document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch { /* ignore network errors on logout */ }
  Auth.clearSession();
  showToast("Logged out successfully", "success");
  navigateToAuth();
});

// ============================================================
// TAB SWITCHERS (Generic)
// ============================================================
function initTabs(containerSelector, tabBtnClass, tabContentClass) {
  const container = typeof containerSelector === "string"
    ? document.querySelector(containerSelector)
    : containerSelector;
  if (!container) return;

  const buttons = container.querySelectorAll(`.${tabBtnClass}`);
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.target;
      container.querySelectorAll(`.${tabContentClass}`).forEach((c) => c.classList.add("hidden"));
      const panel = document.getElementById(target);
      if (panel) panel.classList.remove("hidden");
    });
  });
}

function initSideTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const buttons = container.querySelectorAll(".side-tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.target;
      document.querySelectorAll(".inst-panel").forEach((p) => p.classList.add("hidden"));
      const panel = document.getElementById(target);
      if (panel) panel.classList.remove("hidden");
    });
  });
}

// ============================================================
// ========== STUDENT DASHBOARD ==========
// ============================================================
let studentCourses = [];
let studentAssignments = [];

async function initStudentDashboard() {
  initTabs("#view-student .workspace-card", "tab-btn", "tab-content");
  await loadStudentCourses();
  populateStudentCourseDropdowns();
}

async function loadStudentCourses() {
  const res = await apiFetch("/courses?enrolled=true");
  if (!res || !res.ok) return;
  const data = await res.json();
  studentCourses = data.data || data || [];
  renderStudentCoursesSidebar();
}

function renderStudentCoursesSidebar() {
  const list = document.getElementById("student-courses-list");
  if (!studentCourses.length) { list.innerHTML = `<p class="text-muted">No courses enrolled.</p>`; return; }
  list.innerHTML = studentCourses.map((c) => `
    <div class="list-item" data-course-id="${c.id}" onclick="selectStudentCourse('${c.id}')">
      <div>
        <div style="font-weight:600">${c.name}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">${c.code}</div>
      </div>
      <i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--text-muted)"></i>
    </div>
  `).join("");
  lucide.createIcons({ el: list });
}

function populateStudentCourseDropdowns() {
  const baselineSel = document.getElementById("baseline-course-id");
  baselineSel.innerHTML = studentCourses.map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`).join("");
}

async function selectStudentCourse(courseId) {
  document.querySelectorAll("#student-courses-list .list-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.courseId === courseId);
  });
  // Load assignments for this course
  const res = await apiFetch(`/assignments?courseId=${courseId}`);
  if (!res || !res.ok) return;
  const data = await res.json();
  studentAssignments = data.data || data || [];

  const sel = document.getElementById("submit-assignment-id");
  sel.innerHTML = studentAssignments.map((a) => `<option value="${a.id}">${a.title} (Week ${a.weekNumber})</option>`).join("");

  await loadStudentHistory(courseId);
}

async function loadStudentHistory(courseId) {
  const user = Auth.getUser();
  const res = await apiFetch(`/submissions?studentId=${user.id}&courseId=${courseId}`);
  if (!res || !res.ok) return;
  const data = await res.json();
  const submissions = data.data || data || [];
  const tbody = document.getElementById("student-history-rows");
  if (!submissions.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No submissions yet for this course</td></tr>`;
    return;
  }
  tbody.innerHTML = submissions.map((s) => {
    const risk = s.analysisResult?.riskLevel || "PENDING";
    const badgeClass = `badge-${risk.toLowerCase()}`;
    return `<tr>
      <td>${s.assignment?.title || "—"}</td>
      <td>${new Date(s.submittedAt).toLocaleString()}</td>
      <td style="font-family:var(--font-mono)">${(s.sophisticationScore || 0).toFixed(2)}</td>
      <td><span class="badge ${badgeClass}">${risk}</span></td>
      <td>${s.analysisResult?.interviewOutcome || "—"}</td>
      <td><button class="btn btn-secondary" style="padding:0.4rem 0.75rem;font-size:0.8rem" onclick="viewStudentAnalysis('${s.id}')">View</button></td>
    </tr>`;
  }).join("");
}

async function viewStudentAnalysis(submissionId) {
  const res = await apiFetch(`/analysis/${submissionId}`);
  if (!res || !res.ok) { showToast("Analysis not available yet", "warning"); return; }
  const d = await res.json();
  document.getElementById("student-det-z").textContent = d.trajectoryZScore?.toFixed(4) ?? "—";
  document.getElementById("student-det-genealogy").textContent = d.genealogyPenalty?.toFixed(4) ?? "—";
  document.getElementById("student-det-cohort").textContent = d.cohortOutlierScore?.toFixed(4) ?? "—";
  document.getElementById("student-det-ensemble").textContent = d.ensembleScore?.toFixed(4) ?? "—";
  document.getElementById("student-det-guidance").textContent = d.llmGuidance || "No guidance generated.";
  document.getElementById("student-forensic-details").classList.remove("hidden");
}

// Student Baseline Submission
document.getElementById("form-student-baseline").addEventListener("submit", async (e) => {
  e.preventDefault();
  const courseId = document.getElementById("baseline-course-id").value;
  const sessionCode = document.getElementById("baseline-session-code").value.trim().toUpperCase();
  const file = document.getElementById("baseline-file").files[0];
  if (!file) { showToast("Please select a source code file", "warning"); return; }

  const fd = new FormData();
  fd.append("sessionCode", sessionCode);
  fd.append("file", file);

  const res = await apiUpload("/baselines", fd);
  if (!res) return;
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Baseline submission failed", "error"); return; }
  showToast(`Baseline captured! Sophistication score: ${data.sophisticationScore?.toFixed(2)}`, "success");
  e.target.reset();
});

// Student Assignment Submission
document.getElementById("form-student-submit").addEventListener("submit", async (e) => {
  e.preventDefault();
  const assignmentId = document.getElementById("submit-assignment-id").value;
  const file = document.getElementById("submit-file").files[0];
  if (!file) { showToast("Please select a source code file", "warning"); return; }

  const fd = new FormData();
  fd.append("assignmentId", assignmentId);
  fd.append("file", file);

  const res = await apiUpload("/submissions", fd);
  if (!res) return;
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Submission failed", "error"); return; }
  showToast("Submission received! Analysis queued — check back shortly.", "success");
  e.target.reset();
});

// ============================================================
// ========== INSTRUCTOR DASHBOARD ==========
// ============================================================
let instructorCourses = [];
let instructorStudents = [];

async function initInstructorDashboard() {
  initSideTabs("#view-instructor .instructor-container");
  await loadInstructorCourses();
  populateInstructorDropdowns();
  await loadSubmissionQueue();
  await loadInstructorStudents();
}

async function loadInstructorCourses() {
  const res = await apiFetch("/courses");
  if (!res || !res.ok) return;
  const data = await res.json();
  instructorCourses = data.data || data || [];
}

function populateInstructorDropdowns() {
  const courseSelectors = ["enroll-course-id", "assign-course-id", "oneshot-course-id", "queue-filter-course", "report-course-id"];
  courseSelectors.forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    if (id === "queue-filter-course") {
      sel.innerHTML = `<option value="">All Courses</option>` + instructorCourses.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    } else {
      sel.innerHTML = instructorCourses.map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`).join("");
    }
  });
}

async function loadInstructorStudents() {
  const res = await apiFetch("/users?role=STUDENT");
  if (!res || !res.ok) return;
  const data = await res.json();
  instructorStudents = data.data || data || [];
  const sel = document.getElementById("oneshot-student-id");
  if (sel) sel.innerHTML = instructorStudents.map((s) => `<option value="${s.id}">${s.firstName} ${s.lastName} (${s.email})</option>`).join("");
}

// Create Course
document.getElementById("form-inst-create-course").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("course-name").value.trim();
  const code = document.getElementById("course-code").value.trim();
  let weeklyTargets;
  try { weeklyTargets = JSON.parse(document.getElementById("course-targets").value); }
  catch { showToast("Invalid JSON for weekly targets", "error"); return; }

  const res = await apiFetch("/courses", { method: "POST", body: JSON.stringify({ name, code, weeklyTargets }) });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Create course failed", "error"); return; }
  showToast(`Course "${name}" created!`, "success");
  e.target.reset();
  await loadInstructorCourses();
  populateInstructorDropdowns();
});

// Enroll Student
document.getElementById("form-inst-enroll").addEventListener("submit", async (e) => {
  e.preventDefault();
  const courseId = document.getElementById("enroll-course-id").value;
  const email = document.getElementById("enroll-student-email").value.trim();

  // First find student by email
  const userRes = await apiFetch(`/users?email=${encodeURIComponent(email)}`);
  if (!userRes || !userRes.ok) { showToast("Could not find user", "error"); return; }
  const userData = await userRes.json();
  const students = userData.data || userData || [];
  if (!students.length) { showToast("No user found with that email", "error"); return; }
  const studentId = students[0].id;

  const res = await apiFetch(`/courses/${courseId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Enrollment failed", "error"); return; }
  showToast("Student enrolled successfully!", "success");
  e.target.reset();
});

// Create Assignment
document.getElementById("form-inst-create-assignment").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    courseId: document.getElementById("assign-course-id").value,
    title: document.getElementById("assign-title").value.trim(),
    weekNumber: parseInt(document.getElementById("assign-week").value),
    expectedScore: parseFloat(document.getElementById("assign-expected").value),
    dueDate: document.getElementById("assign-duedate").value,
  };
  const res = await apiFetch("/assignments", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Create assignment failed", "error"); return; }
  showToast(`Assignment "${body.title}" created!`, "success");
  e.target.reset();
});

// Load Submission Queue
async function loadSubmissionQueue(courseId = "", riskLevel = "") {
  let url = "/queue";
  const params = [];
  if (courseId) params.push(`courseId=${courseId}`);
  if (riskLevel) params.push(`riskLevel=${riskLevel}`);
  if (params.length) url += "?" + params.join("&");

  const res = await apiFetch(url);
  if (!res || !res.ok) return;
  const data = await res.json();
  const items = data.data || data || [];
  const tbody = document.getElementById("instructor-queue-rows");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No flagged submissions in queue</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((item) => {
    const risk = item.riskLevel || "NORMAL";
    return `<tr>
      <td>${item.student?.firstName || "?"} ${item.student?.lastName || ""}</td>
      <td>${item.course?.name || "—"}</td>
      <td>${item.assignment?.title || "—"}</td>
      <td style="font-family:var(--font-mono)">${(item.ensembleScore || 0).toFixed(4)}</td>
      <td><span class="badge badge-${risk.toLowerCase()}">${risk}</span></td>
      <td><span class="badge badge-secondary">${item.interviewOutcome || "PENDING"}</span></td>
      <td><button class="btn btn-secondary" style="padding:0.4rem 0.75rem;font-size:0.8rem" onclick="openEvalPanel('${item.submissionId}', '${item.student?.firstName} ${item.student?.lastName}', '${item.assignment?.title}')">Evaluate</button></td>
    </tr>`;
  }).join("");
}

document.getElementById("queue-filter-course").addEventListener("change", () => {
  const c = document.getElementById("queue-filter-course").value;
  const r = document.getElementById("queue-filter-risk").value;
  loadSubmissionQueue(c, r);
});
document.getElementById("queue-filter-risk").addEventListener("change", () => {
  const c = document.getElementById("queue-filter-course").value;
  const r = document.getElementById("queue-filter-risk").value;
  loadSubmissionQueue(c, r);
});

async function openEvalPanel(submissionId, studentName, assignmentTitle) {
  const res = await apiFetch(`/analysis/${submissionId}`);
  if (!res || !res.ok) { showToast("Analysis not loaded yet", "warning"); return; }
  const d = await res.json();

  document.getElementById("inst-eval-student-name").textContent = studentName;
  document.getElementById("inst-eval-assignment-title").textContent = assignmentTitle;
  document.getElementById("inst-eval-ensemble").textContent = d.ensembleScore?.toFixed(4) ?? "—";
  document.getElementById("inst-eval-risk").textContent = d.riskLevel || "—";
  document.getElementById("inst-eval-risk").className = `badge badge-${(d.riskLevel || "normal").toLowerCase()}`;
  document.getElementById("inst-eval-z").textContent = d.trajectoryZScore?.toFixed(4) ?? "—";
  document.getElementById("inst-eval-genealogy").textContent = d.genealogyPenalty?.toFixed(4) ?? "—";
  document.getElementById("inst-eval-cohort").textContent = d.cohortOutlierScore?.toFixed(4) ?? "—";
  document.getElementById("inst-eval-llm-guidance").textContent = d.llmGuidance || "No suggestions.";
  document.getElementById("inst-eval-submission-id").value = submissionId;

  document.getElementById("inst-evaluation-panel").classList.remove("hidden");
  document.getElementById("inst-evaluation-panel").scrollIntoView({ behavior: "smooth" });
}

// Record Outcome
document.getElementById("form-inst-record-outcome").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submissionId = document.getElementById("inst-eval-submission-id").value;
  const outcome = document.getElementById("inst-outcome-select").value;
  const notes = document.getElementById("inst-outcome-notes").value.trim();

  const res = await apiFetch(`/analysis/${submissionId}/outcome`, {
    method: "PATCH",
    body: JSON.stringify({ outcome, notes }),
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Failed to record outcome", "error"); return; }
  showToast("Interview outcome recorded and email notification sent!", "success");
  document.getElementById("inst-evaluation-panel").classList.add("hidden");
  loadSubmissionQueue();
});

// One-Shot Analysis
document.getElementById("form-inst-oneshot").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    studentId: document.getElementById("oneshot-student-id").value,
    courseId: document.getElementById("oneshot-course-id").value,
    weekNumber: parseInt(document.getElementById("oneshot-week").value),
    rawCode: document.getElementById("oneshot-code").value,
  };
  const res = await apiFetch("/analysis/one-shot", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "One-shot failed", "error"); return; }

  document.getElementById("oneshot-res-baseline").textContent = data.baselineScore?.toFixed(4) ?? "—";
  document.getElementById("oneshot-res-current").textContent = data.currentScore?.toFixed(4) ?? "—";
  document.getElementById("oneshot-res-expected").textContent = data.expectedScore?.toFixed(4) ?? "—";
  document.getElementById("oneshot-res-z").textContent = data.trajectoryZScore?.toFixed(4) ?? "—";
  document.getElementById("oneshot-res-weeks").textContent = data.compressedWeeks?.toFixed(4) ?? "—";
  const esc = document.getElementById("oneshot-res-escalation");
  esc.textContent = data.escalation_flag ? "YES ⚠" : "No";
  esc.className = data.escalation_flag ? "badge badge-critical" : "badge badge-normal";

  document.getElementById("oneshot-result").classList.remove("hidden");
  showToast("One-shot analysis complete!", "success");
});

// Cohort Report
document.getElementById("btn-fetch-report").addEventListener("click", async () => {
  const courseId = document.getElementById("report-course-id").value;
  const weekNumber = document.getElementById("report-week").value;
  if (!courseId) { showToast("Select a course first", "warning"); return; }

  const res = await apiFetch(`/reports/cohort?courseId=${courseId}&weekNumber=${weekNumber}`);
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Failed to load report", "error"); return; }

  const stats = data.stats || data;
  document.getElementById("report-cohort-size").textContent = stats.cohortSize ?? "—";
  document.getElementById("report-avg").textContent = stats.avg?.toFixed(4) ?? "—";
  document.getElementById("report-stddev").textContent = stats.stddev?.toFixed(4) ?? "—";
  document.getElementById("report-outlier").textContent = stats.outlierThreshold?.toFixed(4) ?? "—";
  document.getElementById("report-p10").textContent = stats.p10?.toFixed(4) ?? "—";
  document.getElementById("report-p50").textContent = stats.p50?.toFixed(4) ?? "—";
  document.getElementById("report-p90").textContent = stats.p90?.toFixed(4) ?? "—";
  document.getElementById("report-data").classList.remove("hidden");
  document.getElementById("report-empty").classList.add("hidden");
  showToast("Cohort statistics loaded!", "success");
});

// ============================================================
// ========== PROCTOR DASHBOARD ==========
// ============================================================
async function initProctorDashboard() {
  await loadProctorCourses();
  await loadProctorSessions();

  document.getElementById("form-proctor-create").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      courseId: document.getElementById("proctor-course-id").value,
      startTime: document.getElementById("proctor-start").value,
      endTime: document.getElementById("proctor-end").value,
      networkIsolated: document.getElementById("proctor-network-isolated").checked,
    };
    const res = await apiFetch("/sessions", { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "Failed to create session", "error"); return; }
    showToast(`Session created! Join code: ${data.sessionCode}`, "success");
    e.target.reset();
    await loadProctorSessions();
  });
}

async function loadProctorCourses() {
  const res = await apiFetch("/courses");
  if (!res || !res.ok) return;
  const data = await res.json();
  const courses = data.data || data || [];
  const sel = document.getElementById("proctor-course-id");
  sel.innerHTML = courses.map((c) => `<option value="${c.id}">${c.name} (${c.code})</option>`).join("");
}

async function loadProctorSessions() {
  const res = await apiFetch("/sessions");
  if (!res || !res.ok) return;
  const data = await res.json();
  const sessions = data.data || data || [];
  const tbody = document.getElementById("proctor-sessions-rows");
  if (!sessions.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No sessions scheduled yet</td></tr>`;
    return;
  }
  tbody.innerHTML = sessions.map((s) => {
    const statusBadge = { SCHEDULED: "badge-monitor", ACTIVE: "badge-normal", LOCKED: "badge-secondary", CANCELLED: "badge-critical" }[s.status] || "badge-secondary";
    const canActivate = s.status === "SCHEDULED";
    const canLock = s.status === "ACTIVE";
    return `<tr>
      <td>${s.course?.name || "—"}</td>
      <td><code style="font-family:var(--font-mono);font-size:1.1rem;letter-spacing:3px;color:var(--color-primary)">${s.sessionCode}</code></td>
      <td style="font-size:0.85rem">${new Date(s.startTime).toLocaleString()} → ${new Date(s.endTime).toLocaleString()}</td>
      <td><span class="badge ${statusBadge}">${s.status}</span></td>
      <td style="display:flex;gap:0.5rem;flex-wrap:wrap">
        ${canActivate ? `<button class="btn btn-primary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="updateSessionStatus('${s.id}','activate')">Activate</button>` : ""}
        ${canLock ? `<button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="updateSessionStatus('${s.id}','lock')">Lock & Seal</button>` : ""}
      </td>
    </tr>`;
  }).join("");
}

async function updateSessionStatus(sessionId, action) {
  const res = await apiFetch(`/sessions/${sessionId}/${action}`, { method: "PATCH" });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Action failed", "error"); return; }
  showToast(`Session ${action === "activate" ? "activated" : "locked and sealed"}!`, "success");
  await loadProctorSessions();
}

// ============================================================
// ========== ADMIN DASHBOARD ==========
// ============================================================
async function initAdminDashboard() {
  initSideTabs("#view-admin .instructor-container");
  await loadAdminUsers();
  await loadAuditLogs();

  document.getElementById("form-admin-create-user").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      firstName: document.getElementById("admin-first-name").value.trim(),
      lastName: document.getElementById("admin-last-name").value.trim(),
      email: document.getElementById("admin-email").value.trim(),
      password: document.getElementById("admin-password").value,
      role: document.getElementById("admin-role").value,
    };
    const res = await apiFetch("/users", { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || "User creation failed", "error"); return; }
    showToast(`User ${body.email} provisioned!`, "success");
    e.target.reset();
    await loadAdminUsers();
  });
}

async function loadAdminUsers() {
  const res = await apiFetch("/users");
  if (!res || !res.ok) return;
  const data = await res.json();
  const users = data.data || data || [];
  const tbody = document.getElementById("admin-users-rows");
  tbody.innerHTML = users.map((u) => {
    const roleBadge = { STUDENT: "badge-monitor", INSTRUCTOR: "badge-flagged", PROCTOR: "badge-normal", ADMIN: "badge-critical" }[u.role] || "badge-secondary";
    return `<tr>
      <td>${u.firstName} ${u.lastName}</td>
      <td style="font-size:0.9rem">${u.email}</td>
      <td><span class="badge ${roleBadge}">${u.role}</span></td>
      <td><span class="badge ${u.isActive ? "badge-normal" : "badge-critical"}">${u.isActive ? "Active" : "Disabled"}</span></td>
      <td>
        ${u.isActive
          ? `<button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="toggleUserStatus('${u.id}', false)">Disable</button>`
          : `<button class="btn btn-primary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="toggleUserStatus('${u.id}', true)">Enable</button>`}
      </td>
    </tr>`;
  }).join("");
}

async function toggleUserStatus(userId, activate) {
  const res = await apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: activate }),
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.message || "Failed", "error"); return; }
  showToast(`User ${activate ? "enabled" : "disabled"}`, "success");
  await loadAdminUsers();
}

async function loadAuditLogs() {
  const res = await apiFetch("/reports/audit");
  if (!res || !res.ok) return;
  const data = await res.json();
  const logs = data.data || data || [];
  const tbody = document.getElementById("admin-audit-rows");
  if (!logs.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No audit records found</td></tr>`; return; }
  tbody.innerHTML = logs.map((l) => `<tr>
    <td style="font-size:0.8rem">${new Date(l.createdAt).toLocaleString()}</td>
    <td style="font-family:var(--font-mono);font-size:0.8rem">${l.userId ? l.userId.slice(0, 8) + "..." : "SYSTEM"}</td>
    <td><code style="font-size:0.85rem">${l.action}</code></td>
    <td>${l.resourceType}</td>
    <td style="font-family:var(--font-mono);font-size:0.8rem">${l.resourceId.slice(0, 12)}...</td>
  </tr>`).join("");
}

// ============================================================
// URL DEEP-LINKS (email verification & password reset)
// ============================================================
async function handleEmailDeepLinks() {
  const params = new URLSearchParams(window.location.search);

  const verifyToken = params.get("verify");
  if (verifyToken) {
    navigateToAuth();
    document.getElementById("auth-title").textContent = "Verify Your Email";
    document.getElementById("auth-subtitle").textContent = "Confirming your account…";
    document.getElementById("auth-verification-banner").classList.remove("hidden");
    document.getElementById("verify-token-input").value = verifyToken;
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Verification failed", "error");
      } else {
        showToast("Email verified! You can now sign in.", "success");
        document.getElementById("auth-verification-banner").classList.add("hidden");
        showAuthForm("login");
      }
    } catch {
      showToast("Network error during verification", "error");
    }
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }

  const resetToken = params.get("reset");
  if (resetToken) {
    navigateToAuth();
    document.getElementById("auth-title").textContent = "Reset Password";
    document.getElementById("auth-subtitle").textContent = "Enter your new password";
    showAuthForm("reset-password");
    document.getElementById("reset-token").value = resetToken;
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }

  return false;
}

// ============================================================
// BOOTSTRAP: Check existing session on page load
// ============================================================
(async function initApp() {
  lucide.createIcons();

  const handledDeepLink = await handleEmailDeepLinks();
  if (handledDeepLink) return;

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user) {
      navigateToDashboard(user);
      return;
    }
  }
  navigateToAuth();
})();
