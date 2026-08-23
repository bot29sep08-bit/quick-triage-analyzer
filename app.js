const A = document.getElementById("app");
const B = document.getElementById("bar");

let token = localStorage.qtaToken || "";
let u = JSON.parse(localStorage.qtaUser || "null");

const $ = id => document.getElementById(id);

function toast(message) {
  const t = $("toast");
  if (!t) return;

  t.textContent = message;
  t.style.display = "block";

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    t.style.display = "none";
  }, 3500);
}

async function api(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {})
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function goHome() {
  if (u) {
    render();
  } else {
    home();
  }
}

function logout() {
  localStorage.removeItem("qtaToken");
  localStorage.removeItem("qtaUser");

  token = "";
  u = null;

  home();
}

function saveSession(data) {
  u = data.user;
  token = data.token;

  localStorage.qtaUser = JSON.stringify(u);
  localStorage.qtaToken = token;

  render();
}


/* =========================================================
   MAIN RENDER
========================================================= */

function render() {
  if (!B) return;

  if (u) {
    B.innerHTML = `
      <span>${esc(u.username || u.name || "")}</span>
      <button class="btn alt small" onclick="logout()">Logout</button>
    `;
  } else {
    B.innerHTML = `
      <button class="btn alt" onclick="auth()">Sign in</button>
    `;
  }

  if (!u) {
    home();
    return;
  }

  if (u.role === "patient") {
    patient();
  } else if (u.role === "nurse") {
    nurse();
  } else if (u.role === "doctor") {
    doctor();
  } else {
    logout();
  }
}


/* =========================================================
   OPENING PAGE
========================================================= */

function home() {
  A.innerHTML = `
    <section class="hero">
      <small>ONE QUEUE. CLEAR CARE.</small>

      <h1>
        The calm way to get <i>seen.</i>
      </h1>

      <p class="muted">
        One simple workflow connecting patients, nurses and doctors.
      </p>
    </section>

    <section class="grid">

      <div class="card role" onclick="auth('patient')">
        <h2>Patient</h2>

        <p class="muted">
          Register your visit, check your queue and manage appointments.
        </p>

        <button class="btn">
          Continue as Patient
        </button>
      </div>

      <div class="card role" onclick="auth('nurse')">
        <h2>Nurse / Staff</h2>

        <p class="muted">
          Manage patient registrations, OP queue and quick checkups.
        </p>

        <button class="btn">
          Continue as Nurse
        </button>
      </div>

      <div class="card role" onclick="auth('doctor')">
        <h2>Doctor</h2>

        <p class="muted">
          Review priority patients, manage queues and patient documents.
        </p>

        <button class="btn">
          Continue as Doctor
        </button>
      </div>

    </section>

    <p class="muted">
      QTA is a clinical workflow support tool and does not replace
      professional clinical judgment.
    </p>
  `;
}


/* =========================================================
   AUTH
========================================================= */

function auth(role = "patient") {
  const title =
    role === "nurse"
      ? "Nurse / Staff"
      : role.charAt(0).toUpperCase() + role.slice(1);

  A.innerHTML = `
    <div class="auth card">

      <button class="btn alt small" onclick="home()">
        ← Back
      </button>

      <h2 class="auth-title">
        ${title}
      </h2>

      <p class="auth-subtitle">
        Secure access to your QTA workspace.
      </p>

      <div class="auth-tabs">
        <button
          class="btn alt"
          onclick="authMode('login','${role}')">
          Sign in
        </button>

        <button
          class="btn alt"
          onclick="authMode('register','${role}')">
          New register
        </button>
      </div>

      <div id="box"></div>

    </div>
  `;

  authMode("login", role);
}


function passwordField(id, label = "Password") {
  return `
    <label>${label}</label>

    <div class="input-wrap">
      <input
        id="${id}"
        type="password"
        autocomplete="current-password"
      />

      <button
        type="button"
        class="eye-btn"
        onclick="togglePassword('${id}', this)"
        aria-label="Show password">
        👁
      </button>
    </div>
  `;
}


function togglePassword(id, button) {
  const input = $(id);

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁";
  }
}


function authMode(mode, role) {
  if (!$("box")) return;

  if (mode === "login") {

    $("box").innerHTML = `
      <div class="info-box">
        Your username does not have to be unique.
        Use your unique ${role} ID to identify your account.
      </div>

      <label>Username</label>
      <input
        id="username"
        autocomplete="username"
        placeholder="Enter your username"
      />

      <label>
        ${role === "patient"
          ? "Unique Patient ID"
          : role === "nurse"
            ? "Unique Nurse ID"
            : "Unique Doctor ID"}
      </label>

      <input
        id="unique_id"
        inputmode="numeric"
        placeholder="Enter your unique ID"
      />

      ${passwordField("password")}

      <div class="form-actions">
        <button class="btn" onclick="login('${role}')">
          Sign in
        </button>
      </div>
    `;

    return;
  }


  const hospitalFields = role === "patient"
    ? `
      <label>Hospital name</label>
      <input
        id="hospital_name"
        placeholder="Enter hospital name"
      />

      <label>
        Hospital ID
        <span class="muted">(optional)</span>
      </label>

      <input
        id="hospital_id"
        maxlength="4"
        placeholder="Optional"
      />
    `
    : `
      <label>Hospital name</label>
      <input
        id="hospital_name"
        placeholder="Enter working hospital name"
      />

      <label>Hospital ID</label>
      <input
        id="hospital_id"
        maxlength="4"
        placeholder="Example: AP01"
      />

      <p class="muted">
        Hospital ID must contain the first two letters of the
        hospital name followed by two digits.
      </p>
    `;


  $("box").innerHTML = `
    <label>
      ${role === "patient"
        ? "Patient name"
        : role === "nurse"
          ? "Nurse name"
          : "Doctor name"}
    </label>

    <input
      id="name"
      placeholder="Enter full name"
    />

    <label>Username</label>

    <input
      id="username"
      autocomplete="username"
      placeholder="Username can be shared by different users"
    />

    ${passwordField("password")}

    <label>Mobile</label>
    <input
      id="mobile"
      inputmode="tel"
      placeholder="Mobile number"
    />

    <label>Email <span class="muted">(optional)</span></label>
    <input
      id="email"
      type="email"
      placeholder="Email address"
    />

    ${role === "patient" ? `
      <label>Age</label>
      <input
        id="age"
        type="number"
        min="0"
        max="120"
        placeholder="Age"
      />
    ` : ""}

    ${hospitalFields}

    <div class="form-actions">
      <button class="btn" onclick="reg('${role}')">
        Create account
      </button>
    </div>
  `;
}


/* =========================================================
   LOGIN / REGISTER
========================================================= */

async function login(role) {
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        role,
        username: $("username").value.trim(),
        unique_id: $("unique_id").value.trim(),
        password: $("password").value
      })
    });

    saveSession(data);

  } catch (error) {
    toast(error.message);
  }
}


function validateHospitalId(hospitalName, hospitalId, required = true) {
  if (!hospitalId && !required) {
    return true;
  }

  if (!hospitalId) {
    toast("Hospital ID is required.");
    return false;
  }

  const cleanName = hospitalName.trim().replace(/[^A-Za-z]/g, "");

  if (cleanName.length < 2) {
    toast("Enter a valid hospital name first.");
    return false;
  }

  const expected = cleanName.substring(0, 2).toUpperCase();

  const actual = hospitalId.trim().toUpperCase();

  if (!/^[A-Z]{2}[0-9]{2}$/.test(actual)) {
    toast("Hospital ID must contain 2 letters followed by 2 digits.");
    return false;
  }

  if (actual.substring(0, 2) !== expected) {
    toast(
      `Hospital ID should start with ${expected}.`
    );
    return false;
  }

  return true;
}


async function reg(role) {
  try {

    const hospitalName =
      $("hospital_name")?.value.trim() || "";

    const hospitalId =
      $("hospital_id")?.value.trim().toUpperCase() || "";

    if (
      !validateHospitalId(
        hospitalName,
        hospitalId,
        role !== "patient"
      )
    ) {
      return;
    }

    const data = await api("/api/auth/register", {
      method: "POST",

      body: JSON.stringify({
        role,

        name: $("name").value.trim(),

        username: $("username").value.trim(),

        password: $("password").value,

        mobile: $("mobile").value.trim(),

        email: $("email").value.trim(),

        age:
          role === "patient"
            ? $("age").value
            : null,

        hospital_name: hospitalName,

        hospital_id:
          hospitalId || null
      })
    });

    saveSession(data);

    toast(
      `Account created. Your ${role} ID is ${data.user.unique_id}`
    );

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

function nav(items) {
  return `
    <div class="nav">

      ${items.map(item => `
        <button onclick="${item[1]}">
          ${item[0]}
        </button>
      `).join("")}

    </div>
  `;
}


/* =========================================================
   PATIENT
========================================================= */

function patient() {

  A.innerHTML =
    nav([
      ["Home", "pHome()"],
      ["New registration", "pform()"],
      ["Take appointment", "appointment()"],
      ["History", "phistory()"],
      ["Help", "help()"],
      ["Profile", "profile()"]
    ]) +
    `<div id="c"></div>`;

  pHome();
}


function pHome() {

  $("c").innerHTML = `
    <section class="hero">

      <small>PATIENT WORKSPACE</small>

      <h1>
        Welcome, ${esc(u.name || u.username)}.
      </h1>

      <p class="muted">
        Register for care, check your queue or plan an appointment.
      </p>

    </section>

    <div class="grid">

      <div class="card role" onclick="pform()">
        <h2>Quick registration</h2>
        <p class="muted">
          Register for today's hospital visit.
        </p>
        <button class="btn">
          Register
        </button>
      </div>

      <div class="card role" onclick="appointment()">
        <h2>Take appointment</h2>
        <p class="muted">
          Join the estimated OP queue and wait at home.
        </p>
        <button class="btn">
          Take appointment
        </button>
      </div>

      <div class="card role" onclick="phistory()">
        <h2>My history</h2>
        <p class="muted">
          View registrations, appointments and completed checkups.
        </p>
        <button class="btn">
          View history
        </button>
      </div>

    </div>
  `;
}


/* =========================================================
   PATIENT REGISTRATION
========================================================= */

function pform() {

  $("c").innerHTML = `
    <div class="panel">

      <h2>Quick registration</h2>

      <p class="muted">
        Enter the basic information needed for your hospital visit.
      </p>

      <label>Patient name</label>
      <input
        id="pn"
        value="${esc(u.name || "")}"
        placeholder="Patient name"
      />

      <div class="form-row">

        <div>
          <label>Age</label>
          <input
            id="pa"
            type="number"
            min="0"
            max="120"
            value="${esc(u.age || "")}"
          />
        </div>

        <div>
          <label>Hospital name</label>
          <input
            id="phn"
            value="${esc(u.hospital_name || "")}"
            placeholder="Hospital name"
          />
        </div>

      </div>

      <label>Problem / reason for visit</label>
      <textarea
        id="pp"
        placeholder="Briefly describe the problem"
      ></textarea>

      <label>Location</label>

      <select id="pl" onchange="toggleAwayDisclaimer()">

        <option value="in_hospital">
          In hospital
        </option>

        <option value="away">
          Away from hospital
        </option>

      </select>

      <div id="awayNotice" class="notice">

        <b>Important:</b><br>

        If you are away from the hospital and have severe pain,
        are not fully conscious, or feel that your condition is
        getting worse, seek immediate medical assessment.

      </div>

      <label>
        Hospital ID
        <span class="muted">(optional)</span>
      </label>

      <input
        id="ph"
        maxlength="4"
        value="${esc(u.hospital_id || "")}"
        placeholder="Optional hospital ID"
      />

      <div class="form-actions">

        <button class="btn" onclick="pcase()">
          Submit registration
        </button>

        <button class="btn alt" onclick="pHome()">
          Cancel
        </button>

      </div>

    </div>
  `;
}


function toggleAwayDisclaimer() {

  const select = $("pl");
  const notice = $("awayNotice");

  if (!select || !notice) return;

  notice.classList.toggle(
    "show",
    select.value === "away"
  );
}


async function pcase() {

  try {

    const hospitalName =
      $("phn").value.trim();

    if (!hospitalName) {
      toast("Please enter hospital name.");
      return;
    }

    const data = await api("/api/cases", {
      method: "POST",

      body: JSON.stringify({

        patient_name:
          $("pn").value.trim(),

        age:
          $("pa").value,

        problem:
          $("pp").value.trim(),

        location_status:
          $("pl").value,

        hospital_name:
          hospitalName,

        hospital_id:
          $("ph").value.trim() || null
      })
    });

    toast("Registration saved.");

    phistory();

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   PATIENT HISTORY
========================================================= */

async function phistory() {

  try {

    const data = await api("/api/cases/my");

    const remaining =
      data.filter(x =>
        !["completed", "cancelled"].includes(
          String(x.status || "").toLowerCase()
        )
      );

    const completed =
      data.filter(x =>
        ["completed", "cancelled"].includes(
          String(x.status || "").toLowerCase()
        )
      );

    $("c").innerHTML = `

      <h2>My history</h2>

      <p class="muted">
        Select a registration to see its full details.
      </p>

      <div class="queue-section">

        <h2 class="normal-title">
          Remaining / Active
        </h2>

        ${
          remaining.length
            ? remaining.map(historyCard).join("")
            : emptyState(
                "No active registrations",
                "Your current registrations will appear here."
              )
        }

      </div>

      <div class="queue-section">

        <h2>
          Completed / Checkups
        </h2>

        ${
          completed.length
            ? completed.map(historyCard).join("")
            : emptyState(
                "No completed visits",
                "Completed checkups will appear here."
              )
        }

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


function historyCard(item) {

  const date =
    formatDate(
      item.created_at ||
      item.registration_date ||
      item.updated_at
    );

  const status =
    item.status ||
    "Waiting";

  return `
    <div
      class="card case ${esc(item.risk_level || "")}"
      onclick="showPatientCase(${Number(item.id)})"
      style="cursor:pointer"
    >

      <div class="case-header">

        <div>

          <div class="case-title">
            ${esc(item.patient_name || u.name)}
          </div>

          <div class="case-meta">

            <span>
              Hospital:
              <b>${esc(
                item.hospital_name ||
                u.hospital_name ||
                "Not specified"
              )}</b>
            </span>

            <span>
              Registered:
              ${esc(date)}
            </span>

          </div>

        </div>

        ${
          item.risk_level
            ? `
              <span class="risk ${esc(item.risk_level)}">
                ${esc(item.risk_level)} RISK
              </span>
            `
            : ""
        }

      </div>

      <p class="case-description">
        ${esc(item.problem || "No problem description")}
      </p>

      <div class="case-meta">

        <span>
          Status:
          <b>${esc(status)}</b>
        </span>

        ${
          item.op_number
            ? `
              <span>
                OP:
                <b>#${esc(item.op_number)}</b>
              </span>
            `
            : ""
        }

      </div>

    </div>
  `;
}


async function showPatientCase(id) {

  try {

    const item = await api(`/api/cases/${id}`);

    $("c").innerHTML = `

      <button
        class="btn alt small"
        onclick="phistory()">
        ← Back to history
      </button>

      <div class="panel" style="margin-top:18px">

        <div class="case-header">

          <div>
            <h2>
              Registration details
            </h2>

            <p class="muted">
              Complete information for this visit.
            </p>
          </div>

          ${
            item.risk_level
              ? `
                <span class="risk ${esc(item.risk_level)}">
                  ${esc(item.risk_level)} RISK
                </span>
              `
              : ""
          }

        </div>

        <div class="profile-grid">

          <div class="profile-item">
            <small>Patient</small>
            <b>${esc(item.patient_name || u.name)}</b>
          </div>

          <div class="profile-item">
            <small>Age</small>
            <b>${esc(item.age || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Hospital</small>
            <b>${esc(item.hospital_name || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Hospital ID</small>
            <b>${esc(item.hospital_id || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Registration date</small>
            <b>${esc(
              formatDate(
                item.created_at ||
                item.registration_date
              )
            )}</b>
          </div>

          <div class="profile-item">
            <small>Status</small>
            <b>${esc(item.status || "Waiting")}</b>
          </div>

          ${
            item.op_number
              ? `
                <div class="profile-item">
                  <small>OP number</small>
                  <b>#${esc(item.op_number)}</b>
                </div>
              `
              : ""
          }

          ${
            item.news_score !== undefined &&
            item.news_score !== null
              ? `
                <div class="profile-item">
                  <small>Triage score</small>
                  <b>${esc(item.news_score)}</b>
                </div>
              `
              : ""
          }

        </div>

        <label>Problem / reason</label>

        <div class="info-box">
          ${esc(item.problem || "Not provided")}
        </div>

        <div class="form-actions">

          <button
            class="btn"
            onclick="caseHelp(${Number(item.id)})">
            Help for this registration
          </button>

        </div>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   PATIENT HELP
========================================================= */

function help() {

  $("c").innerHTML = `

    <div class="panel">

      <h2>Help</h2>

      <p class="muted">
        Choose how you need help.
      </p>

      <div class="grid">

        <div class="card role" onclick="generalHelp()">

          <h2>Hospital help</h2>

          <p class="muted">
            Ask a general question about a hospital.
          </p>

          <button class="btn">
            Get help
          </button>

        </div>

        <div class="card role" onclick="phistory()">

          <h2>Registration help</h2>

          <p class="muted">
            Open one of your registrations and ask for help
            directly about that visit.
          </p>

          <button class="btn">
            Choose registration
          </button>

        </div>

      </div>

    </div>
  `;
}


function generalHelp() {

  $("c").innerHTML = `

    <div class="panel">

      <h2>Hospital help</h2>

      <label>Hospital name</label>

      <input
        id="helpHospital"
        placeholder="Enter hospital name"
      />

      <label>Your question</label>

      <textarea
        id="helpMessage"
        placeholder="How can we help?"
      ></textarea>

      <div class="form-actions">

        <button
          class="btn"
          onclick="sendGeneralHelp()">
          Send help request
        </button>

        <button
          class="btn alt"
          onclick="help()">
          Back
        </button>

      </div>

    </div>
  `;
}


async function sendGeneralHelp() {

  try {

    await api("/api/messages", {
      method: "POST",

      body: JSON.stringify({

        hospital_name:
          $("helpHospital").value.trim(),

        message:
          $("helpMessage").value.trim()
      })
    });

    toast("Help request sent.");

    help();

  } catch (error) {
    toast(error.message);
  }
}


async function caseHelp(caseId) {

  try {

    const item =
      await api(`/api/cases/${caseId}`);

    $("c").innerHTML = `

      <div class="panel">

        <button
          class="btn alt small"
          onclick="showPatientCase(${Number(caseId)})">
          ← Back
        </button>

        <h2 style="margin-top:18px">
          Help for this registration
        </h2>

        <div class="info-box">

          <b>Hospital:</b>
          ${esc(item.hospital_name || "-")}

          <br>

          <b>Registration:</b>
          ${esc(
            formatDate(
              item.created_at ||
              item.registration_date
            )
          )}

        </div>

        <label>Your message</label>

        <textarea
          id="caseHelpMessage"
          placeholder="Describe what you need help with"
        ></textarea>

        <div class="form-actions">

          <button
            class="btn"
            onclick="sendCaseHelp(${Number(caseId)})">
            Send help request
          </button>

        </div>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


async function sendCaseHelp(caseId) {

  try {

    await api("/api/messages", {
      method: "POST",

      body: JSON.stringify({

        case_id: caseId,

        message:
          $("caseHelpMessage").value.trim()
      })
    });

    toast("Help request sent.");

    showPatientCase(caseId);

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   PATIENT APPOINTMENT
========================================================= */

async function appointment() {

  try {

    const queue =
      await api("/api/appointments/estimate");

    $("c").innerHTML = `

      <div class="appointment-card">

        <h2>Take appointment</h2>

        <p class="muted">
          You can take an OP appointment and wait at home.
        </p>

        <label>Hospital name</label>

        <input
          id="appHospital"
          value="${esc(u.hospital_name || "")}"
          placeholder="Enter hospital name"
        />

        <label>
          Hospital ID
          <span class="muted">(optional)</span>
        </label>

        <input
          id="appHospitalId"
          value="${esc(u.hospital_id || "")}"
          maxlength="4"
          placeholder="Optional"
        />

        <div class="queue-info">

          <div class="queue-stat">
            <small>Patients before you</small>
            <b>${esc(queue.before_you ?? 0)}</b>
          </div>

          <div class="queue-stat">
            <small>Estimated wait</small>
            <b>${esc(queue.estimated_minutes ?? 0)} min</b>
          </div>

          <div class="queue-stat">
            <small>Next OP number</small>
            <b>#${esc(queue.next_op_number ?? "-")}</b>
          </div>

        </div>

        <div class="info-box">

          The waiting time is an <b>estimate</b>, not an exact
          appointment time. Patient conditions and hospital
          workload can change the actual waiting time.

        </div>

        <label>Preferred date</label>

        <input
          id="appDate"
          type="date"
        />

        <label>Preferred time</label>

        <input
          id="appTime"
          type="time"
        />

        <div class="form-actions">

          <button
            class="btn"
            onclick="createAppointment()">
            Confirm appointment
          </button>

        </div>

      </div>
    `;

    setMinimumAppointmentDate();

  } catch (error) {
    toast(error.message);
  }
}


function setMinimumAppointmentDate() {

  const input = $("appDate");

  if (!input) return;

  const now = new Date();

  const yyyy =
    now.getFullYear();

  const mm =
    String(now.getMonth() + 1).padStart(2, "0");

  const dd =
    String(now.getDate()).padStart(2, "0");

  input.min =
    `${yyyy}-${mm}-${dd}`;

  input.value =
    `${yyyy}-${mm}-${dd}`;
}


async function createAppointment() {

  try {

    const date =
      $("appDate").value;

    const time =
      $("appTime").value;

    if (!date || !time) {
      toast("Please choose date and time.");
      return;
    }

    const data =
      await api("/api/appointments", {
        method: "POST",

        body: JSON.stringify({

          hospital_name:
            $("appHospital").value.trim(),

          hospital_id:
            $("appHospitalId").value.trim() || null,

          requested_date:
            date,

          requested_time:
            time
        })
      });

    $("c").innerHTML = `

      <div class="appointment-card">

        <div class="success-box">

          <h2>Appointment created</h2>

          <p>
            Your OP number is:
          </p>

          <div class="queue-number">
            #${esc(data.op_number)}
          </div>

          <p>
            Patients before you:
            <b>${esc(data.before_you)}</b>
          </p>

          <p>
            Estimated waiting time:
            <b>${esc(data.estimated_minutes)} minutes</b>
          </p>

        </div>

        <div class="warning-box">

          The displayed time is only an estimate.
          Actual waiting time may change depending on
          patient conditions and hospital workload.

        </div>

        <button
          class="btn"
          onclick="phistory()">
          View history
        </button>

      </div>
    `;

    toast("Appointment created.");

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   PATIENT PROFILE
========================================================= */

async function profile() {

  try {

    const data =
      await api("/api/profile");

    const profileData =
      data.user || data;

    $("c").innerHTML = `

      <div class="panel">

        <h2>My profile</h2>

        <p class="muted">
          Review your details. Your unique ID cannot be changed.
        </p>

        <div class="profile-grid">

          <div class="profile-item">
            <small>Unique ID</small>
            <b>${esc(profileData.unique_id || u.unique_id)}</b>
          </div>

          <div class="profile-item">
            <small>Role</small>
            <b>${esc(profileData.role || u.role)}</b>
          </div>

        </div>

        <label>Name</label>

        <input
          id="profileName"
          value="${esc(profileData.name || u.name || "")}"
        />

        <label>Username</label>

        <input
          id="profileUsername"
          value="${esc(profileData.username || u.username || "")}"
        />

        <label>Mobile</label>

        <input
          id="profileMobile"
          value="${esc(profileData.mobile || u.mobile || "")}"
        />

        <label>Email</label>

        <input
          id="profileEmail"
          type="email"
          value="${esc(profileData.email || u.email || "")}"
        />

        ${
          u.role === "patient"
            ? `
              <label>Age</label>
              <input
                id="profileAge"
                type="number"
                min="0"
                max="120"
                value="${esc(profileData.age || u.age || "")}"
              />
            `
            : ""
        }

        <label>Hospital name</label>

        <input
          id="profileHospital"
          value="${esc(
            profileData.hospital_name ||
            u.hospital_name ||
            ""
          )}"
        />

        <label>
          Hospital ID
          ${
            u.role === "patient"
              ? `<span class="muted">(optional)</span>`
              : ""
          }
        </label>

        <input
          id="profileHospitalId"
          maxlength="4"
          value="${esc(
            profileData.hospital_id ||
            u.hospital_id ||
            ""
          )}"
          ${u.role !== "patient" ? "readonly" : ""}
        />

        <div class="form-actions">

          <button
            class="btn"
            onclick="saveProfile()">
            Save changes
          </button>

        </div>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


async function saveProfile() {

  try {

    const hospitalName =
      $("profileHospital").value.trim();

    const hospitalId =
      $("profileHospitalId").value.trim().toUpperCase();

    if (
      u.role !== "patient" &&
      !validateHospitalId(
        hospitalName,
        hospitalId,
        true
      )
    ) {
      return;
    }

    const data =
      await api("/api/profile", {
        method: "PUT",

        body: JSON.stringify({

          name:
            $("profileName").value.trim(),

          username:
            $("profileUsername").value.trim(),

          mobile:
            $("profileMobile").value.trim(),

          email:
            $("profileEmail").value.trim(),

          age:
            $("profileAge")?.value || null,

          hospital_name:
            hospitalName,

          hospital_id:
            hospitalId || null
        })
      });

    u = data.user || data;

    localStorage.qtaUser =
      JSON.stringify(u);

    toast("Profile updated.");

    profile();

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   NURSE
========================================================= */

function nurse() {

  A.innerHTML =
    nav([
      ["Patient registrations", "nlist()"],
      ["OP queue", "nopqueue()"],
      ["Messages", "nmsg()"],
      ["History", "nhistory()"],
      ["Profile", "profile()"]
    ]) +
    `<div id="c"></div>`;

  nlist();
}


async function nlist() {

  try {

    const data =
      await api("/api/cases");

    $("c").innerHTML = `

      <h2>Patient registrations</h2>

      <p class="muted">
        New and active patient registrations.
      </p>

      ${
        data.length
          ? data.map(nurseCaseCard).join("")
          : emptyState(
              "No registrations",
              "New patient registrations will appear here."
            )
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}


function nurseCaseCard(item) {

  return `
    <div class="card case ${esc(item.risk_level || "")}">

      <div class="case-header">

        <div>

          <div class="case-title">
            ${esc(item.patient_name)}
          </div>

          <div class="case-meta">

            <span>
              Patient ID:
              <b>${esc(item.patient_id || item.unique_id || "-")}</b>
            </span>

            <span>
              Hospital:
              <b>${esc(item.hospital_name || "-")}</b>
            </span>

          </div>

        </div>

        ${
          item.risk_level
            ? `
              <span class="risk ${esc(item.risk_level)}">
                ${esc(item.risk_level)} RISK
              </span>
            `
            : ""
        }

      </div>

      <p class="case-description">
        ${esc(item.problem)}
      </p>

      <div class="case-actions">

        <button
          class="btn"
          onclick="check(${Number(item.id)})">
          Quick checkup
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   NURSE OP QUEUE
========================================================= */

async function nopqueue() {

  try {

    const data =
      await api("/api/nurse/op-queue");

    $("c").innerHTML = `

      <h2>OP queue</h2>

      <p class="muted">
        Appointment patients waiting for their turn.
      </p>

      ${
        data.length
          ? data.map(opCard).join("")
          : emptyState(
              "No OP patients",
              "Appointment patients will appear here."
            )
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}


function opCard(item) {

  return `
    <div class="card case ${esc(item.risk_level || "")}">

      <div class="case-header">

        <div>

          <div class="queue-number">
            #${esc(item.op_number)}
          </div>

          <div class="case-meta">

            <span>
              Patient:
              <b>${esc(item.patient_name || "Patient")}</b>
            </span>

            <span>
              Patient ID:
              <b>${esc(item.patient_id || "-")}</b>
            </span>

          </div>

        </div>

        ${
          item.risk_level
            ? `
              <span class="risk ${esc(item.risk_level)}">
                ${esc(item.risk_level)} RISK
              </span>
            `
            : ""
        }

      </div>

      <div class="case-actions">

        <button
          class="btn"
          onclick="check(${Number(item.id)})">
          Quick checkup
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   NURSE CHECKUP
========================================================= */

async function check(id) {

  $("c").innerHTML = `

    <div class="panel">

      <h2>Quick checkup</h2>

      <p class="muted">
        Enter the six vital measurements.
      </p>

      <div class="form-row">

        <div>
          <label>Respiration rate</label>
          <input
            id="rr"
            type="number"
            min="0"
          />
        </div>

        <div>
          <label>SpO₂ (%)</label>
          <input
            id="spo2"
            type="number"
            min="0"
            max="100"
          />
        </div>

      </div>

      <div class="form-row">

        <div>
          <label>Systolic BP</label>
          <input
            id="sbp"
            type="number"
            min="0"
          />
        </div>

        <div>
          <label>Heart rate</label>
          <input
            id="hr"
            type="number"
            min="0"
          />
        </div>

      </div>

      <label>Consciousness</label>

      <select id="con">

        <option value="Alert">
          Alert
        </option>

        <option value="Voice">
          Voice
        </option>

        <option value="Pain">
          Pain
        </option>

        <option value="Unresponsive">
          Unresponsive
        </option>

        <option value="New confusion">
          New confusion
        </option>

      </select>

      <label>Temperature °C</label>

      <input
        id="temp"
        type="number"
        step="0.1"
      />

      <div class="form-actions">

        <button
          class="btn"
          onclick="triage(${Number(id)})">
          Analyze
        </button>

        <button
          class="btn alt"
          onclick="nlist()">
          Cancel
        </button>

      </div>

      <div id="result"></div>

    </div>
  `;
}


async function triage(id) {

  try {

    const data =
      await api(`/api/cases/${id}/triage`, {
        method: "POST",

        body: JSON.stringify({

          rr: $("rr").value,

          spo2: $("spo2").value,

          sbp: $("sbp").value,

          heart_rate: $("hr").value,

          consciousness:
            $("con").value,

          temperature:
            $("temp").value
        })
      });

    $("result").innerHTML = `

      <div class="card case ${esc(data.risk)}">

        <h2>
          <span class="risk ${esc(data.risk)}">
            ${esc(data.risk)} RISK
          </span>
        </h2>

        <p>
          Triage score:
          <b>${esc(data.score)}</b>
        </p>

        ${
          data.risk === "LOW"
            ? `
              <div class="success-box">
                Routine clinical monitoring.
              </div>
            `
            : data.risk === "MEDIUM"
              ? `
                <div class="warning-box">
                  Clinical review should be arranged promptly.
                </div>
              `
              : `
                <div class="warning-box">
                  High-risk result. Doctor review is required.
                </div>
              `
        }

        ${
          data.risk !== "HIGH"
            ? `
              <button
                class="btn"
                onclick="transfer(${Number(id)})">
                Transfer to doctor
              </button>
            `
            : ""
        }

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


async function transfer(id) {

  try {

    await api(`/api/cases/${id}/transfer`, {
      method: "POST"
    });

    toast("Patient transferred to doctor.");

    nlist();

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   NURSE MESSAGES
========================================================= */

async function nmsg() {

  try {

    const data =
      await api("/api/messages");

    $("c").innerHTML = `

      <h2>Patient messages</h2>

      ${
        data.length
          ? data.map(m => `
              <div class="card">

                <div class="case-title">
                  ${esc(m.username || m.name || "Patient")}
                </div>

                <div class="case-meta">
                  ID: ${esc(m.unique_id || m.patient_id || "-")}
                </div>

                <p class="case-description">
                  ${esc(m.message)}
                </p>

              </div>
            `).join("")
          : emptyState(
              "No messages",
              "Patient help requests will appear here."
            )
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}


async function nhistory() {

  try {

    const data =
      await api("/api/history");

    $("c").innerHTML = `

      <h2>Nurse history</h2>

      ${
        data.length
          ? data.map(historyCard).join("")
          : emptyState(
              "No history",
              "Completed patient records will appear here."
            )
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   DOCTOR
========================================================= */

function doctor() {

  A.innerHTML =
    nav([
      ["High risk queue", "dHighQueue()"],
      ["Normal queue", "dNormalQueue()"],
      ["History", "dhistory()"],
      ["Hospital settings", "dsettings()"],
      ["Profile", "profile()"]
    ]) +
    `<div id="c"></div>`;

  dHighQueue();
}


async function dHighQueue() {

  try {

    const data =
      await api("/api/doctor/queue");

    const high =
      data.filter(
        x => String(x.risk_level).toUpperCase() === "HIGH"
      );

    $("c").innerHTML = `

      <div class="queue-section">

        <h2 class="priority-title">
          High risk patients
        </h2>

        ${
          high.length
            ? high.map(doctorCard).join("")
            : emptyState(
                "No high-risk patients",
                "High-priority patients will appear here."
              )
        }

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


async function dNormalQueue() {

  try {

    const data =
      await api("/api/doctor/queue");

    const normal =
      data.filter(
        x => String(x.risk_level).toUpperCase() !== "HIGH"
      );

    $("c").innerHTML = `

      <div class="queue-section">

        <h2 class="normal-title">
          Normal queue
        </h2>

        ${
          normal.length
            ? normal.map(doctorCard).join("")
            : emptyState(
                "No patients waiting",
                "Normal and medium-risk patients will appear here."
              )
        }

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


function doctorCard(item) {

  return `
    <div class="card case ${esc(item.risk_level || "")}">

      <div class="case-header">

        <div>

          <div class="case-title">
            ${esc(item.patient_name)}
          </div>

          <div class="case-meta">

            <span>
              Patient ID:
              <b>${esc(item.patient_id || "-")}</b>
            </span>

            <span>
              Hospital:
              <b>${esc(item.hospital_name || "-")}</b>
            </span>

          </div>

        </div>

        <span class="risk ${esc(item.risk_level || "LOW")}">
          ${esc(item.risk_level || "WAITING")}
        </span>

      </div>

      <p class="case-description">
        ${esc(item.problem)}
      </p>

      <div class="case-meta">

        ${
          item.news_score !== undefined
            ? `
              <span>
                Score:
                <b>${esc(item.news_score)}</b>
              </span>
            `
            : ""
        }

      </div>

      <div class="case-actions">

        <button
          class="btn"
          onclick="doctorPatient(${Number(item.id)})">
          Open patient
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   DOCTOR PATIENT PAGE
========================================================= */

async function doctorPatient(id) {

  try {

    const item =
      await api(`/api/cases/${id}`);

    $("c").innerHTML = `

      <button
        class="btn alt small"
        onclick="dHighQueue()">
        ← Back
      </button>

      <div class="panel" style="margin-top:18px">

        <div class="case-header">

          <div>
            <h2>
              Patient details
            </h2>

            <p class="muted">
              Patient ID:
              <b>${esc(item.patient_id || "-")}</b>
            </p>
          </div>

          ${
            item.risk_level
              ? `
                <span class="risk ${esc(item.risk_level)}">
                  ${esc(item.risk_level)} RISK
                </span>
              `
              : ""
          }

        </div>

        <div class="profile-grid">

          <div class="profile-item">
            <small>Patient name</small>
            <b>${esc(item.patient_name || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Age</small>
            <b>${esc(item.age || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Hospital</small>
            <b>${esc(item.hospital_name || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Hospital ID</small>
            <b>${esc(item.hospital_id || "-")}</b>
          </div>

          <div class="profile-item">
            <small>OP number</small>
            <b>${esc(item.op_number || "-")}</b>
          </div>

          <div class="profile-item">
            <small>Triage score</small>
            <b>${esc(item.news_score ?? "-")}</b>
          </div>

        </div>

        <label>Problem</label>

        <div class="info-box">
          ${esc(item.problem || "-")}
        </div>

        <div class="document-box">

          <h2>
            Patient documents
          </h2>

          <label>Doctor note</label>

          <textarea
            id="doctorNote"
            placeholder="Enter doctor note"
          ></textarea>

          <label>Medical slip</label>

          <textarea
            id="medicalSlip"
            placeholder="Enter medical slip / instructions"
          ></textarea>

          <div class="form-actions">

            <button
              class="btn"
              onclick="saveDoctorDocuments(${Number(id)})">
              Save documents
            </button>

          </div>

        </div>

        <div class="document-box">

          <h2>
            Patient status
          </h2>

          <select id="doctorStatus">

            <option value="under_review">
              Under review
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="admitted">
              Admitted
            </option>

            <option value="follow_up">
              Follow-up
            </option>

          </select>

          <div class="form-actions">

            <button
              class="btn"
              onclick="status(${Number(id)})">
              Update status
            </button>

          </div>

        </div>

      </div>
    `;

    if ($("doctorNote")) {
      $("doctorNote").value =
        item.doctor_note || "";
    }

    if ($("medicalSlip")) {
      $("medicalSlip").value =
        item.medical_slip || "";
    }

    if ($("doctorStatus")) {
      $("doctorStatus").value =
        item.status || "under_review";
    }

  } catch (error) {
    toast(error.message);
  }
}


async function saveDoctorDocuments(id) {

  try {

    await api(`/api/cases/${id}/documents`, {
      method: "PUT",

      body: JSON.stringify({

        doctor_note:
          $("doctorNote").value.trim(),

        medical_slip:
          $("medicalSlip").value.trim()
      })
    });

    toast("Patient documents saved.");

  } catch (error) {
    toast(error.message);
  }
}


async function status(id) {

  try {

    const value =
      $("doctorStatus")?.value ||
      $("s" + id)?.value ||
      "under_review";

    await api(`/api/cases/${id}/status`, {
      method: "POST",

      body: JSON.stringify({
        status: value
      })
    });

    toast("Patient status updated.");

    dHighQueue();

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   DOCTOR SETTINGS
========================================================= */

async function dsettings() {

  try {

    const s =
      await api("/api/settings");

    $("c").innerHTML = `

      <div class="panel">

        <h2>Hospital risk settings</h2>

        <p class="muted">
          These settings apply only to your hospital.
        </p>

        <label>Low maximum score</label>

        <input
          id="low"
          value="${esc(s.low_max)}"
          type="number"
        />

        <label>Medium maximum score</label>

        <input
          id="med"
          value="${esc(s.medium_max)}"
          type="number"
        />

        <label>Medium review time (minutes)</label>

        <input
          id="min"
          value="${esc(s.medium_review_minutes)}"
          type="number"
        />

        <div class="info-box">

          Default:
          Low ≤ 4,
          Medium 5–6,
          High ≥ 7.

        </div>

        <button
          class="btn"
          onclick="saveset()">
          Save hospital settings
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}


async function saveset() {

  try {

    await api("/api/settings", {
      method: "PUT",

      body: JSON.stringify({

        low_max:
          $("low").value,

        medium_max:
          $("med").value,

        medium_review_minutes:
          $("min").value

      })
    });

    toast("Hospital settings saved.");

  } catch (error) {
    toast(error.message);
  }
}


async function dhistory() {

  try {

    const data =
      await api("/api/history");

    $("c").innerHTML = `

      <h2>Doctor history</h2>

      ${
        data.length
          ? data.map(historyCard).join("")
          : emptyState(
              "No history",
              "Completed patient records will appear here."
            )
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {

  if (!value) {
    return "Date not available";
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function emptyState(title, message) {

  return `
    <div class="empty">

      <h3>
        ${esc(title)}
      </h3>

      <p>
        ${esc(message)}
      </p>

    </div>
  `;
}


/* =========================================================
   START
========================================================= */

render();
