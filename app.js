const A = document.getElementById("app");
const B = document.getElementById("bar");

let token = localStorage.qtaToken || "";
let u = JSON.parse(localStorage.qtaUser || "null");

const $ = (id) => document.getElementById(id);

function esc(x) {
  return String(x ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c]));
}

function toast(message) {
  const t = $("toast");
  if (!t) {
    alert(message);
    return;
  }

  t.textContent = message;
  t.style.display = "block";

  setTimeout(() => {
    t.style.display = "none";
  }, 3000);
}

function formatDate(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function showPassword(id) {
  const input = $(id);

  if (!input) return;

  input.type =
    input.type === "password"
      ? "text"
      : "password";
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: "Bearer " + token }
        : {})
    },
    ...options
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Something went wrong"
    );
  }

  return data;
}

function saveLogin(data) {
  token = data.token;
  u = data.user;

  localStorage.qtaToken = token;
  localStorage.qtaUser = JSON.stringify(u);

  render();
}

function logout() {
  localStorage.clear();
  token = "";
  u = null;

  render();
}

/* =====================================================
   MAIN RENDER
===================================================== */

function render() {
  if (B) {
    B.innerHTML = u
      ? `
        <div class="top-user">
          <span>${esc(u.username)}</span>
          <button class="btn alt" onclick="logout()">
            Logout
          </button>
        </div>
      `
      : `
        <button class="btn alt" onclick="auth()">
          Sign in
        </button>
      `;
  }

  if (!u) {
    home();
    return;
  }

  if (u.role === "patient") patient();
  if (u.role === "nurse") nurse();
  if (u.role === "doctor") doctor();
}

/* =====================================================
   OPENING PAGE
===================================================== */

function home() {
  A.innerHTML = `
    <div class="hero">
      <small>ONE QUEUE. CLEAR CARE.</small>

      <h1>
        The calm way to get
        <i>seen.</i>
      </h1>

      <p class="muted">
        One workflow connecting patients,
        nurses and doctors.
      </p>
    </div>

    <div class="grid">
      ${[
        ["patient", "Patient"],
        ["nurse", "Nurse / Staff"],
        ["doctor", "Doctor"]
      ].map(([role, title]) => `
        <div
          class="card role"
          onclick="auth('${role}')"
        >
          <h2>${title}</h2>

          <p class="muted">
            Continue to your QTA workspace.
          </p>

          <button class="btn">
            Continue
          </button>
        </div>
      `).join("")}
    </div>

    <p class="muted disclaimer-bottom">
      QTA is a clinical decision-support
      system and does not replace
      professional clinical judgment.
    </p>
  `;
}

/* =====================================================
   LOGIN / REGISTER
===================================================== */

function roleTitle(role) {
  if (role === "nurse") return "Nurse / Staff";
  return role.charAt(0).toUpperCase() +
    role.slice(1);
}

function auth(role = "patient") {
  A.innerHTML = `
    <div class="auth card">

      <button
        class="btn alt"
        onclick="home()"
      >
        ← Back
      </button>

      <h1 class="login-title">
        ${roleTitle(role)} Login
      </h1>

      <p class="muted">
        Sign in to access your QTA account
        or create a new account.
      </p>

      <div class="auth-tabs">
        <button
          class="btn alt"
          onclick="authMode('login','${role}')"
        >
          Sign in
        </button>

        <button
          class="btn"
          onclick="authMode('register','${role}')"
        >
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

    <div class="password-wrap">
      <input
        id="${id}"
        type="password"
      >

      <button
        type="button"
        class="eye-btn"
        onclick="showPassword('${id}')"
        title="Show or hide password"
      >
        👁
      </button>
    </div>
  `;
}

function authMode(mode, role) {
  const box = $("box");

  if (mode === "login") {
    box.innerHTML = `
      <div class="form-section">

        <h2>
          Welcome back
        </h2>

        <label>Username</label>
        <input id="username">

        <label>
          Unique ${roleTitle(role)} ID
        </label>

        <input
          id="unique_id"
          placeholder="Enter your Unique ID"
        >

        ${passwordField("password")}

        <button
          class="btn full"
          onclick="login('${role}')"
        >
          Sign in
        </button>

      </div>
    `;

    return;
  }

  box.innerHTML = `
    <div class="form-section">

      <h2 class="register-title">
        Create your ${roleTitle(role)} account
      </h2>

      <p class="muted">
        Your username does not need to be unique.
        Your Unique ID identifies your account.
      </p>

      <label>Username</label>
      <input id="username">

      ${passwordField("password")}

      <label>Mobile number</label>
      <input
        id="mobile"
        inputmode="numeric"
      >

      <label>
        Email (optional)
      </label>

      <input
        id="email"
        type="email"
      >

      ${
        role === "patient"
          ? `
            <label>Age</label>
            <input
              id="age"
              type="number"
              min="1"
            >
          `
          : `
            <label>Hospital name</label>

            <input
              id="hospital_name"
              placeholder="Enter your working hospital"
            >

            <label>
              Hospital ID
            </label>

            <input
              id="hospital_id"
              maxlength="4"
              placeholder="Example: AP12"
            >

            <p class="muted small">
              Hospital ID format:
              first 2 letters of hospital name +
              2 numbers.
            </p>
          `
      }

      <button
        class="btn full"
        onclick="reg('${role}')"
      >
        Create account
      </button>

    </div>
  `;
}

async function login(role) {
  try {
    const data = await api(
      "/api/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          role,
          username: $("username").value.trim(),
          unique_id: $("unique_id").value.trim(),
          password: $("password").value
        })
      }
    );

    saveLogin(data);

  } catch (error) {
    toast(error.message);
  }
}

async function reg(role) {
  try {
    const data = await api(
      "/api/auth/register",
      {
        method: "POST",

        body: JSON.stringify({
          role,

          username:
            $("username").value.trim(),

          password:
            $("password").value,

          mobile:
            $("mobile").value.trim(),

          email:
            $("email").value.trim(),

          age:
            role === "patient"
              ? $("age").value
              : null,

          hospital_name:
            role !== "patient"
              ? $("hospital_name").value.trim()
              : null,

          hospital_id:
            role !== "patient"
              ? $("hospital_id").value
                .trim()
                .toUpperCase()
              : null
        })
      }
    );

    saveLogin(data);

    toast(
      "Account created. Your Unique ID: " +
      data.user.unique_id
    );

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NAVIGATION
===================================================== */

function nav(items) {
  return `
    <div class="nav">
      ${items.map(([name, action]) => `
        <button onclick="${action}">
          ${name}
        </button>
      `).join("")}
    </div>
  `;
}

/* =====================================================
   PATIENT
===================================================== */

function patient() {
  A.innerHTML = `
    ${nav([
      ["Home", "pform()"],
      ["Take Appointment", "appointmentForm()"],
      ["History", "phistory()"],
      ["Help", "help()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  pform();
}

/* PATIENT QUICK REGISTRATION */

function pform() {
  $("c").innerHTML = `
    <div class="panel">

      <h2>Quick Registration</h2>

      <p class="muted">
        Register your condition for a quick
        hospital assessment.
      </p>

      <label>Patient name</label>
      <input id="pn">

      <label>Age</label>
      <input
        id="pa"
        type="number"
      >

      <label>Problem</label>

      <textarea
        id="pp"
        placeholder="Briefly describe the problem"
      ></textarea>

      <label>Location</label>

      <select
        id="pl"
        onchange="locationWarning()"
      >
        <option value="in_hospital">
          In hospital
        </option>

        <option value="away">
          Away from hospital
        </option>
      </select>

      <div
        id="away-warning"
        class="notice"
        style="display:none"
      >
        ⚠️ If the patient has severe pain or is
        not fully conscious, come immediately
        to the hospital for further assessment.
      </div>

      <label>Hospital name</label>

      <input
        id="phname"
        placeholder="Hospital name"
      >

      <label>
        Hospital ID (optional)
      </label>

      <input
        id="ph"
        maxlength="4"
        placeholder="Example: AP12"
      >

      <button
        class="btn full"
        onclick="pcase()"
      >
        Submit Registration
      </button>

    </div>
  `;
}

function locationWarning() {
  const warning = $("away-warning");
  const location = $("pl");

  if (!warning || !location) return;

  warning.style.display =
    location.value === "away"
      ? "block"
      : "none";
}

async function pcase() {
  try {
    await api(
      "/api/cases",
      {
        method: "POST",

        body: JSON.stringify({
          patient_name: $("pn").value.trim(),
          age: $("pa").value,
          problem: $("pp").value.trim(),
          location_status: $("pl").value,
          hospital_name:
            $("phname").value.trim(),
          hospital_id:
            $("ph").value.trim()
        })
      }
    );

    toast(
      "Registration saved successfully"
    );

    phistory();

  } catch (error) {
    toast(error.message);
  }
}

/* PATIENT HISTORY */

function caseCard(x) {
  return `
    <div
      class="card case-card clickable"
      onclick="caseDetails(${x.id})"
    >
      <div class="case-row">

        <div>
          <h3>
            ${esc(x.patient_name)}
          </h3>

          <p class="muted">
            ${esc(x.problem)}
          </p>
        </div>

        ${
          x.risk_level
            ? `
              <span
                class="risk ${x.risk_level}"
              >
                ${x.risk_level}
              </span>
            `
            : `
              <span class="status-pill">
                Waiting
              </span>
            `
        }

      </div>

      <div class="details-grid">

        <span>
          <b>Age:</b> ${x.age}
        </span>

        <span>
          <b>Hospital:</b>
          ${esc(x.hospital_name || "-")}
        </span>

        <span>
          <b>Status:</b>
          ${esc(x.status || "registered")}
        </span>

        ${
          formatDate(x.created_at)
            ? `
              <span>
                <b>Registered:</b>
                ${formatDate(x.created_at)}
              </span>
            `
            : ""
        }

      </div>

    </div>
  `;
}

async function phistory() {
  try {
    const [casesList, ops] =
      await Promise.all([
        api("/api/cases/my"),
        api("/api/appointments/my")
      ]);

    $("c").innerHTML = `
      <div class="history-head">
        <h2>My History</h2>
      </div>

      <div class="history-tabs">
        <button
          class="btn alt"
          onclick="showPatientRegistrations()"
        >
          Registrations / Checkups
        </button>

        <button
          class="btn alt"
          onclick="showPatientOps('remaining')"
        >
          Remaining OPs
        </button>

        <button
          class="btn alt"
          onclick="showPatientOps('completed')"
        >
          Completed OPs
        </button>
      </div>

      <div id="history-content"></div>
    `;

    window.patientCases = casesList;
    window.patientOps = ops;

    showPatientRegistrations();

  } catch (error) {
    toast(error.message);
  }
}

function showPatientRegistrations() {
  const list = window.patientCases || [];

  $("history-content").innerHTML = `
    <div class="section-gap">
      <h3>
        Registrations / Checkups
      </h3>

      ${
        list.length
          ? list.map(caseCard).join("")
          : `<p class="muted">
              No registrations yet.
            </p>`
      }
    </div>
  `;
}

function showPatientOps(type) {
  const list =
    (window.patientOps || [])
      .filter((x) =>
        type === "remaining"
          ? x.status !== "completed"
          : x.status === "completed"
      );

  $("history-content").innerHTML = `
    <div class="section-gap">

      <h3>
        ${
          type === "remaining"
            ? "Remaining OPs"
            : "Completed OPs / Checkups"
        }
      </h3>

      ${
        list.length
          ? list.map((x) => `
              <div class="card appointment-card">

                <div class="case-row">
                  <h3>
                    OP Number ${x.op_number}
                  </h3>

                  <span class="status-pill">
                    ${esc(x.status)}
                  </span>
                </div>

                <div class="details-grid">
                  <span>
                    <b>Hospital:</b>
                    ${esc(x.hospital_name)}
                  </span>

                  <span>
                    <b>Date:</b>
                    ${esc(x.appointment_date)}
                  </span>

                  <span>
                    <b>Requested time:</b>
                    ${esc(x.requested_time)}
                  </span>

                  <span>
                    <b>Estimated time:</b>
                    ${formatDate(x.estimated_time)}
                  </span>

                  <span>
                    <b>OPs before you:</b>
                    ${x.patients_before}
                  </span>
                </div>

              </div>
            `).join("")
          : `
              <p class="muted">
                No OP records here.
              </p>
            `
      }

    </div>
  `;
}

/* PATIENT CASE DETAILS */

async function caseDetails(id) {
  try {
    const x = await api(
      "/api/cases/" + id
    );

    $("c").innerHTML = `
      <button
        class="btn alt"
        onclick="phistory()"
      >
        ← Back to History
      </button>

      <div class="panel">

        <h2>
          Registration Details
        </h2>

        <div class="details-grid large">

          <span>
            <b>Patient:</b>
            ${esc(x.patient_name)}
          </span>

          <span>
            <b>Age:</b>
            ${x.age}
          </span>

          <span>
            <b>Problem:</b>
            ${esc(x.problem)}
          </span>

          <span>
            <b>Hospital:</b>
            ${esc(x.hospital_name)}
          </span>

          ${
            x.hospital_id
              ? `
                <span>
                  <b>Hospital ID:</b>
                  ${esc(x.hospital_id)}
                </span>
              `
              : ""
          }

          <span>
            <b>Location:</b>
            ${esc(x.location_status)}
          </span>

          <span>
            <b>Status:</b>
            ${esc(x.status)}
          </span>

          ${
            x.risk_level
              ? `
                <span>
                  <b>Risk level:</b>
                  ${esc(x.risk_level)}
                </span>

                <span>
                  <b>Score:</b>
                  ${x.news_score}
                </span>
              `
              : ""
          }

          ${
            formatDate(x.created_at)
              ? `
                <span>
                  <b>Registered:</b>
                  ${formatDate(x.created_at)}
                </span>
              `
              : ""
          }

        </div>

        ${
          x.vitals
            ? `
              <h3>
                Vital Measurements
              </h3>

              <div class="details-grid">
                <span>
                  Respiration:
                  ${x.vitals.respiration_rate}
                </span>

                <span>
                  SpO₂:
                  ${x.vitals.spo2}%
                </span>

                <span>
                  BP:
                  ${x.vitals.systolic_bp}
                </span>

                <span>
                  Heart rate:
                  ${x.vitals.heart_rate}
                </span>

                <span>
                  Consciousness:
                  ${esc(x.vitals.consciousness)}
                </span>

                <span>
                  Temperature:
                  ${x.vitals.temperature}°C
                </span>
              </div>
            `
            : ""
        }

        <button
          class="btn full"
          onclick="caseHelp(${x.id})"
        >
          Get Help from this Hospital
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function caseHelp(id) {
  try {
    const x = await api(
      "/api/cases/" + id
    );

    $("c").innerHTML = `
      <button
        class="btn alt"
        onclick="caseDetails(${id})"
      >
        ← Back
      </button>

      <div class="panel">

        <h2>
          Help from ${esc(x.hospital_name)}
        </h2>

        <p class="muted">
          This message will be connected to
          the hospital saved in this registration.
        </p>

        <label>Message</label>

        <textarea
          id="case-help-message"
          placeholder="Describe what help you need"
        ></textarea>

        <button
          class="btn full"
          onclick="sendCaseHelp(${id})"
        >
          Send Help Request
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function sendCaseHelp(id) {
  try {
    const x = await api(
      "/api/cases/" + id
    );

    await api(
      "/api/messages",
      {
        method: "POST",

        body: JSON.stringify({
          hospital_name: x.hospital_name,
          hospital_id: x.hospital_id || "",
          case_id: x.id,
          message:
            $("case-help-message").value.trim()
        })
      }
    );

    toast(
      "Help request sent successfully"
    );

    caseDetails(id);

  } catch (error) {
    toast(error.message);
  }
}

/* PATIENT GENERAL HELP */

function help() {
  $("c").innerHTML = `
    <div class="panel">

      <h2>Help</h2>

      <p class="muted">
        Contact a hospital with your question
        or request.
      </p>

      <label>Hospital name</label>

      <input
        id="help-hospital-name"
      >

      <label>
        Hospital ID (optional)
      </label>

      <input
        id="help-hospital-id"
        maxlength="4"
      >

      <label>Message</label>

      <textarea
        id="help-message"
        placeholder="How can the hospital help you?"
      ></textarea>

      <button
        class="btn full"
        onclick="sendGeneralHelp()"
      >
        Send Request
      </button>

    </div>
  `;
}

async function sendGeneralHelp() {
  try {
    await api(
      "/api/messages",
      {
        method: "POST",

        body: JSON.stringify({
          hospital_name:
            $("help-hospital-name").value.trim(),

          hospital_id:
            $("help-hospital-id").value
              .trim(),

          message:
            $("help-message").value.trim()
        })
      }
    );

    toast("Help request sent");

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   APPOINTMENTS
===================================================== */

function appointmentForm() {
  $("c").innerHTML = `
    <div class="panel">

      <h2>Take Appointment</h2>

      <p class="muted">
        Get an estimated OP position and
        waiting time so you can plan when
        to come to the hospital.
      </p>

      <label>Hospital name</label>

      <input
        id="ahospital"
      >

      <label>
        Hospital ID (optional)
      </label>

      <input
        id="ahid"
        maxlength="4"
      >

      <label>Date</label>

      <input
        id="adate"
        type="date"
      >

      <label>Preferred time</label>

      <input
        id="atime"
        type="time"
      >

      <button
        class="btn full"
        onclick="createAppointment()"
      >
        Check Queue & Take Appointment
      </button>

    </div>
  `;
}

async function createAppointment() {
  try {
    const data = await api(
      "/api/appointments",
      {
        method: "POST",

        body: JSON.stringify({
          hospital_name:
            $("ahospital").value.trim(),

          hospital_id:
            $("ahid").value.trim(),

          appointment_date:
            $("adate").value,

          appointment_time:
            $("atime").value
        })
      }
    );

    $("c").innerHTML = `
      <div class="panel appointment-result">

        <h2>
          Appointment Confirmed
        </h2>

        <div class="big-op">
          OP ${data.op_number}
        </div>

        <div class="details-grid large">

          <span>
            <b>Patients before you:</b>
            ${data.patients_before}
          </span>

          <span>
            <b>Your requested time:</b>
            ${esc(data.requested_time)}
          </span>

          <span>
            <b>Estimated time:</b>
            ${formatDate(data.estimated_time)}
          </span>

          <span>
            <b>Hospital:</b>
            ${esc(data.hospital_name)}
          </span>

        </div>

        <div class="notice">
          ⚠️ ${esc(data.disclaimer)}
        </div>

        <button
          class="btn full"
          onclick="phistory()"
        >
          View My OP History
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   PROFILE
===================================================== */

async function profile() {
  try {
    const p = await api("/api/profile");

    $("c").innerHTML = `
      <div class="panel">

        <h2>My Profile</h2>

        <div class="details-grid large">

          <span>
            <b>Unique ID:</b>
            ${esc(p.unique_id)}
          </span>

          <span>
            <b>Username:</b>
            ${esc(p.username)}
          </span>

          <span>
            <b>Role:</b>
            ${esc(p.role)}
          </span>

          ${
            p.hospital_name
              ? `
                <span>
                  <b>Hospital:</b>
                  ${esc(p.hospital_name)}
                </span>
              `
              : ""
          }

          ${
            p.hospital_id
              ? `
                <span>
                  <b>Hospital ID:</b>
                  ${esc(p.hospital_id)}
                </span>
              `
              : ""
          }

        </div>

        <hr>

        <h3>Edit Basic Details</h3>

        <label>Mobile number</label>

        <input
          id="profile-mobile"
          value="${esc(p.mobile || "")}"
        >

        <label>Email</label>

        <input
          id="profile-email"
          type="email"
          value="${esc(p.email || "")}"
        >

        ${
          p.role === "patient"
            ? `
              <label>Age</label>

              <input
                id="profile-age"
                type="number"
                value="${p.age || ""}"
              >
            `
            : ""
        }

        <button
          class="btn full"
          onclick="saveProfile()"
        >
          Save Changes
        </button>

        <hr>

        <h3>Change Password</h3>

        ${passwordField(
          "current-password",
          "Current password"
        )}

        ${passwordField(
          "new-password",
          "New password"
        )}

        <button
          class="btn alt full"
          onclick="changePassword()"
        >
          Change Password
        </button>

        <p class="muted small">
          Unique ID and username cannot be changed.
          Hospital details are kept fixed for
          staff accounts.
        </p>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function saveProfile() {
  try {
    const data = await api(
      "/api/profile",
      {
        method: "PUT",

        body: JSON.stringify({
          mobile:
            $("profile-mobile").value.trim(),

          email:
            $("profile-email").value.trim(),

          age:
            $("profile-age")
              ? $("profile-age").value
              : undefined
        })
      }
    );

    u = data;
    localStorage.qtaUser =
      JSON.stringify(u);

    toast("Profile updated");

    render();

  } catch (error) {
    toast(error.message);
  }
}

async function changePassword() {
  try {
    await api(
      "/api/profile/password",
      {
        method: "PUT",

        body: JSON.stringify({
          current_password:
            $("current-password").value,

          new_password:
            $("new-password").value
        })
      }
    );

    toast(
      "Password changed successfully"
    );

    $("current-password").value = "";
    $("new-password").value = "";

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NURSE
===================================================== */

function nurse() {
  A.innerHTML = `
    ${nav([
      ["Patient Registrations", "nlist()"],
      ["OP Queue", "nopQueue()"],
      ["Messages", "nmsg()"],
      ["History", "nhistory()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  nlist();
}

async function nlist() {
  try {
    const list = await api("/api/cases");

    $("c").innerHTML = `
      <h2>
        Patient Registrations
      </h2>

      <p class="muted">
        Select a patient for quick checkup.
      </p>

      ${
        list.length
          ? list.map((v) => `
              <div class="card case-card">

                <div class="case-row">

                  <div>
                    <h3>
                      ${esc(v.patient_name)}
                    </h3>

                    <p class="muted">
                      ${esc(v.problem)}
                    </p>
                  </div>

                  ${
                    v.risk_level
                      ? `
                        <span class="risk ${v.risk_level}">
                          ${v.risk_level}
                        </span>
                      `
                      : `
                        <span class="status-pill">
                          Not checked
                        </span>
                      `
                  }

                </div>

                <div class="details-grid">
                  <span>
                    <b>Patient ID:</b>
                    ${esc(v.patient_id)}
                  </span>

                  <span>
                    <b>Hospital:</b>
                    ${esc(v.hospital_name)}
                  </span>

                  <span>
                    <b>Registered:</b>
                    ${formatDate(v.created_at)}
                  </span>
                </div>

                <button
                  class="btn"
                  onclick="check(${v.id})"
                >
                  Quick Checkup
                </button>

              </div>
            `).join("")
          : `
              <p class="muted">
                No patient registrations.
              </p>
            `
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}

/* NURSE TRIAGE */

async function check(id) {
  $("c").innerHTML = `
    <button
      class="btn alt"
      onclick="nlist()"
    >
      ← Back
    </button>

    <div class="panel">

      <h2>
        Six Vital Measurements
      </h2>

      <label>
        Respiration rate
      </label>

      <input
        id="rr"
        type="number"
      >

      <label>SpO₂</label>

      <input
        id="spo2"
        type="number"
      >

      <label>
        Systolic BP
      </label>

      <input
        id="sbp"
        type="number"
      >

      <label>
        Heart rate
      </label>

      <input
        id="hr"
        type="number"
      >

      <label>
        Consciousness
      </label>

      <select id="con">
        <option>Alert</option>
        <option>Voice</option>
        <option>Pain</option>
        <option>Unresponsive</option>
        <option>New confusion</option>
      </select>

      <label>
        Temperature °C
      </label>

      <input
        id="temp"
        type="number"
        step="0.1"
      >

      <button
        class="btn full"
        onclick="triage(${id})"
      >
        Analyze
      </button>

      <div id="result"></div>

    </div>
  `;
}

async function triage(id) {
  try {
    const data = await api(
      "/api/cases/" + id + "/triage",
      {
        method: "POST",

        body: JSON.stringify({
          rr: $("rr").value,
          spo2: $("spo2").value,
          sbp: $("sbp").value,
          heart_rate: $("hr").value,
          consciousness: $("con").value,
          temperature: $("temp").value
        })
      }
    );

    let advice = "";

    if (data.risk === "LOW") {
      advice =
        "Low risk: ward care and routine monitoring.";
    }

    if (data.risk === "MEDIUM") {
      advice =
        "Medium clinical risk: urgent clinical review within 30 minutes.";
    }

    if (data.risk === "HIGH") {
      advice =
        "High alert patient: automatically sent to the doctor queue.";
    }

    $("result").innerHTML = `
      <div class="card result-card">

        <h2>
          <span
            class="risk ${data.risk}"
          >
            ${data.risk} RISK
          </span>
        </h2>

        <p>
          <b>Score:</b>
          ${data.score}
        </p>

        <p>
          ${advice}
        </p>

        ${
          data.risk !== "HIGH"
            ? `
              <button
                class="btn"
                onclick="transfer(${id})"
              >
                Transfer to Doctor
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
    await api(
      "/api/cases/" + id + "/transfer",
      {
        method: "POST"
      }
    );

    toast(
      "Patient transferred to doctor queue"
    );

    nlist();

  } catch (error) {
    toast(error.message);
  }
}

/* NURSE OP QUEUE */

async function nopQueue() {
  try {
    const list = await api(
      "/api/appointments"
    );

    $("c").innerHTML = `
      <h2>
        OP Queue
      </h2>

      ${
        list.length
          ? list.map((x) => `
              <div class="card appointment-card">

                <div class="case-row">

                  <h3>
                    OP ${x.op_number}
                  </h3>

                  <span class="status-pill">
                    ${esc(x.status)}
                  </span>

                </div>

                <div class="details-grid">

                  <span>
                    <b>Patient:</b>
                    ${esc(x.patient_name)}
                  </span>

                  <span>
                    <b>Date:</b>
                    ${esc(x.appointment_date)}
                  </span>

                  <span>
                    <b>Requested:</b>
                    ${esc(x.requested_time)}
                  </span>

                  <span>
                    <b>Estimated:</b>
                    ${formatDate(x.estimated_time)}
                  </span>

                </div>

                <select id="opstatus${x.id}">
                  <option value="remaining">
                    Remaining
                  </option>

                  <option value="under_checkup">
                    Under checkup
                  </option>

                  <option value="completed">
                    Completed
                  </option>
                </select>

                <button
                  class="btn"
                  onclick="updateOp(${x.id})"
                >
                  Update OP
                </button>

              </div>
            `).join("")
          : `
              <p class="muted">
                No OP appointments.
              </p>
            `
      }

    `;

  } catch (error) {
    toast(error.message);
  }
}

async function updateOp(id) {
  try {
    await api(
      "/api/appointments/" + id + "/status",
      {
        method: "POST",

        body: JSON.stringify({
          status:
            $("opstatus" + id).value
        })
      }
    );

    toast("OP updated");

    nopQueue();

  } catch (error) {
    toast(error.message);
  }
}

/* NURSE MESSAGES */

async function nmsg() {
  try {
    const list = await api(
      "/api/messages"
    );

    $("c").innerHTML = `
      <h2>
        Patient Help Requests
      </h2>

      ${
        list.length
          ? list.map((m) => `
              <div class="card">

                <h3>
                  ${esc(m.username)}
                </h3>

                <p class="muted">
                  Patient ID:
                  ${esc(m.patient_id)}
                </p>

                <p>
                  ${esc(m.message)}
                </p>

                <small>
                  ${formatDate(m.created_at)}
                </small>

              </div>
            `).join("")
          : `
              <p class="muted">
                No messages.
              </p>
            `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function nhistory() {
  try {
    const list = await api(
      "/api/history"
    );

    $("c").innerHTML = `
      <h2>
        History by Date
      </h2>

      ${
        list.length
          ? list.map(caseCard).join("")
          : `
              <p class="muted">
                No history.
              </p>
            `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR
===================================================== */

function doctor() {
  A.innerHTML = `
    ${nav([
      ["High Risk Queue", "dHighQueue()"],
      ["Normal Queue", "dNormalQueue()"],
      ["Hospital Risk Settings", "dsettings()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  dHighQueue();
}

function doctorCaseCard(v) {
  return `
    <div class="card doctor-case">

      <div class="case-row">

        <div>
          <h3>
            ${esc(v.patient_name)}
          </h3>

          <p>
            Patient ID:
            ${esc(v.patient_id)}
          </p>
        </div>

        ${
          v.risk_level
            ? `
              <span
                class="risk ${v.risk_level}"
              >
                ${v.risk_level}
              </span>
            `
            : ""
        }

      </div>

      <p>
        <b>Problem:</b>
        ${esc(v.problem)}
      </p>

      ${
        v.vitals
          ? `
            <div class="details-grid">

              <span>
                RR:
                ${v.vitals.respiration_rate}
              </span>

              <span>
                SpO₂:
                ${v.vitals.spo2}%
              </span>

              <span>
                BP:
                ${v.vitals.systolic_bp}
              </span>

              <span>
                HR:
                ${v.vitals.heart_rate}
              </span>

              <span>
                Consciousness:
                ${esc(v.vitals.consciousness)}
              </span>

              <span>
                Temp:
                ${v.vitals.temperature}°C
              </span>

            </div>
          `
          : ""
      }

      <label>
        Patient Status
      </label>

      <select id="ds${v.id}">
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

      <label>
        Doctor Notes
      </label>

      <textarea
        id="dn${v.id}"
        placeholder="Add clinical notes"
      >${esc(v.doctor_notes || "")}</textarea>

      <button
        class="btn"
        onclick="updateDoctorCase(${v.id})"
      >
        Update Patient
      </button>

      <button
        class="btn alt"
        onclick="medicalSlip(${v.id}, '${esc(v.patient_id)}')"
      >
        Create Medical Slip
      </button>

    </div>
  `;
}

async function dHighQueue() {
  try {
    const list = await api(
      "/api/doctor/high-queue"
    );

    $("c").innerHTML = `
      <h2>
        High Risk Patients
      </h2>

      <p class="muted">
        Priority queue for high alert patients.
      </p>

      ${
        list.length
          ? list.map(doctorCaseCard).join("")
          : `
              <p class="muted">
                No high risk patients waiting.
              </p>
            `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function dNormalQueue() {
  try {
    const list = await api(
      "/api/doctor/normal-queue"
    );

    $("c").innerHTML = `
      <h2>
        Normal Queue
      </h2>

      ${
        list.length
          ? list.map(doctorCaseCard).join("")
          : `
              <p class="muted">
                No patients in the normal queue.
              </p>
            `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function updateDoctorCase(id) {
  try {
    await api(
      "/api/cases/" + id + "/status",
      {
        method: "POST",

        body: JSON.stringify({
          status:
            $("ds" + id).value,

          notes:
            $("dn" + id).value.trim()
        })
      }
    );

    toast(
      "Patient details updated"
    );

  } catch (error) {
    toast(error.message);
  }
}

/* MEDICAL SLIP */

function medicalSlip(caseId, patientId) {
  $("c").innerHTML = `
    <button
      class="btn alt"
      onclick="dHighQueue()"
    >
      ← Back
    </button>

    <div class="panel">

      <h2>
        Create Medical Slip
      </h2>

      <p>
        <b>Patient ID:</b>
        ${esc(patientId)}
      </p>

      <label>
        Slip Title
      </label>

      <input
        id="slip-title"
        placeholder="Example: Consultation Notes"
      >

      <label>
        Medical Notes / Instructions
      </label>

      <textarea
        id="slip-content"
        placeholder="Write medical notes, instructions or follow-up details"
      ></textarea>

      <button
        class="btn full"
        onclick="saveSlip('${esc(patientId)}')"
      >
        Save Medical Slip
      </button>

    </div>
  `;
}

async function saveSlip(patientId) {
  try {
    await api(
      "/api/documents",
      {
        method: "POST",

        body: JSON.stringify({
          patient_id: patientId,

          title:
            $("slip-title").value.trim(),

          type:
            "medical_slip",

          content:
            $("slip-content").value.trim()
        })
      }
    );

    toast(
      "Medical slip saved to patient ID"
    );

    dHighQueue();

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR RISK SETTINGS
===================================================== */

async function dsettings() {
  try {
    const s = await api(
      "/api/settings"
    );

    $("c").innerHTML = `
      <div class="panel">

        <h2>
          Hospital Risk Settings
        </h2>

        <p class="muted">
          These settings apply only to your hospital.
        </p>

        <label>
          Low risk maximum score
        </label>

        <input
          id="low"
          value="${s.low_max}"
          type="number"
        >

        <label>
          Medium risk maximum score
        </label>

        <input
          id="med"
          value="${s.medium_max}"
          type="number"
        >

        <label>
          Medium review time (minutes)
        </label>

        <input
          id="min"
          value="${s.medium_review_minutes}"
          type="number"
        >

        <button
          class="btn full"
          onclick="saveSettings()"
        >
          Save Hospital Settings
        </button>

        <p class="muted small">
          Default settings:
          Low ≤ 4,
          Medium 5–6,
          High ≥ 7.
        </p>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function saveSettings() {
  try {
    await api(
      "/api/settings",
      {
        method: "PUT",

        body: JSON.stringify({
          low_max:
            $("low").value,

          medium_max:
            $("med").value,

          medium_review_minutes:
            $("min").value
        })
      }
    );

    toast(
      "Hospital risk settings saved"
    );

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   START
===================================================== */

render();
