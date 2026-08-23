const A = document.getElementById("app");
const B = document.getElementById("bar");

let token = localStorage.qtaToken || "";
let u = JSON.parse(localStorage.qtaUser || "null");

const $ = id => document.getElementById(id);

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.style.display = "block";

  setTimeout(() => {
    t.style.display = "none";
  }, 3000);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
  }[char]));
}

function logout() {
  localStorage.clear();
  token = "";
  u = null;
  render();
}

function save(data) {
  u = data.user;
  token = data.token;

  localStorage.qtaUser = JSON.stringify(u);
  localStorage.qtaToken = token;

  render();
}

/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

function togglePassword(id, button) {
  const input = $(id);

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁";
  }
}

function passwordField(id = "password") {
  return `
    <div class="password-wrap">
      <input id="${id}" type="password" placeholder="Enter password">
      <button
        type="button"
        class="eye-btn"
        onclick="togglePassword('${id}', this)"
      >👁</button>
    </div>
  `;
}

/* =====================================================
   MAIN RENDER
===================================================== */

function render() {
  B.innerHTML = u
    ? `
      <div class="top-user">
        <span>${esc(u.username)} · ${esc(u.role)}</span>
        <button class="btn alt" onclick="logout()">Logout</button>
      </div>
    `
    : `
      <button class="btn alt" onclick="auth()">Sign in</button>
    `;

  if (!u) {
    home();
    return;
  }

  if (u.role === "patient") {
    patient();
  } else if (u.role === "nurse") {
    nurse();
  } else {
    doctor();
  }
}

/* =====================================================
   OPENING HOME PAGE
   KEEPING ORIGINAL STYLE
===================================================== */

function home() {
  A.innerHTML = `
    <div class="hero">
      <small>ONE QUEUE. CLEAR CARE.</small>

      <h1>
        The calm way to get <i>seen.</i>
      </h1>

      <p class="muted">
        One workflow connecting patients, nurses and doctors.
      </p>
    </div>

    <div class="grid">

      ${["patient", "nurse", "doctor"].map(role => `
        <div
          class="card role"
          onclick="auth('${role}')"
        >
          <h2>
            ${
              role === "nurse"
                ? "Nurse / Staff"
                : role.charAt(0).toUpperCase() + role.slice(1)
            }
          </h2>

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
      QTA is a clinical decision-support system and does not replace
      professional medical judgment or emergency medical care.
    </p>
  `;
}

/* =====================================================
   LOGIN / REGISTER PAGE
===================================================== */

function auth(role = "patient") {
  const title =
    role === "nurse"
      ? "Nurse / Staff"
      : role.charAt(0).toUpperCase() + role.slice(1);

  A.innerHTML = `
    <div class="auth card">

      <button class="btn alt" onclick="home()">
        ← Back
      </button>

      <h2 class="login-title">
        ${title} Access
      </h2>

      <p class="muted">
        Sign in to your QTA hospital workspace or create a new account.
      </p>

      <div class="auth-tabs">
        <button
          class="btn alt"
          onclick="authMode('login', '${role}')"
        >
          Sign in
        </button>

        <button
          class="btn"
          onclick="authMode('register', '${role}')"
        >
          New register
        </button>
      </div>

      <div id="box"></div>

    </div>
  `;

  authMode("login", role);
}

/* =====================================================
   LOGIN / REGISTER FORMS
===================================================== */

function authMode(mode, role) {
  const box = $("box");

  if (mode === "login") {

    const idLabel =
      role === "patient"
        ? "Unique Patient ID"
        : role === "nurse"
          ? "Unique Nurse ID"
          : "Unique Doctor ID";

    box.innerHTML = `
      <h3 class="login-title">
        ${role.charAt(0).toUpperCase() + role.slice(1)} Sign In
      </h3>

      <p class="muted">
        Enter your account details to continue.
      </p>

      <label>Username</label>

      <input
        id="username"
        placeholder="Enter username"
      >

      <label>Password</label>

      ${passwordField("password")}

      <label>${idLabel}</label>

      <input
        id="unique_id"
        placeholder="Enter your 10 digit ID"
        maxlength="10"
        inputmode="numeric"
      >

      <button
        class="btn full"
        onclick="login('${role}')"
      >
        Sign in
      </button>
    `;

    return;
  }

  let extra = "";

  if (role === "patient") {
    extra = `
      <label>Age</label>

      <input
        id="age"
        type="number"
        min="0"
        max="130"
        placeholder="Enter age"
      >
    `;
  }

  if (role === "nurse" || role === "doctor") {
    extra = `
      <label>Hospital name</label>

      <input
        id="hospital_name"
        placeholder="Enter working hospital name"
      >

      <label>
        Hospital ID
        <span class="muted small">
          (first 2 letters + 2 digits)
        </span>
      </label>

      <input
        id="hospital_id"
        maxlength="4"
        placeholder="Example: AP12"
      >
    `;
  }

  const roleTitle =
    role === "nurse"
      ? "Nurse / Staff"
      : role.charAt(0).toUpperCase() + role.slice(1);

  box.innerHTML = `
    <h3 class="register-title">
      Create ${roleTitle} Account
    </h3>

    <p class="muted">
      Your unique QTA ID will be created automatically.
    </p>

    <label>Username</label>

    <input
      id="username"
      placeholder="Choose a username"
    >

    <label>Password</label>

    ${passwordField("password")}

    <label>Mobile number</label>

    <input
      id="mobile"
      placeholder="Enter mobile number"
    >

    <label>Email (optional)</label>

    <input
      id="email"
      type="email"
      placeholder="Enter email"
    >

    ${extra}

    <button
      class="btn full"
      onclick="reg('${role}')"
    >
      Create Account
    </button>
  `;
}

/* =====================================================
   LOGIN
===================================================== */

async function login(role) {
  try {

    const data = await api("/api/auth/login", {
      method: "POST",

      body: JSON.stringify({
        role,
        username: $("username").value.trim(),
        password: $("password").value,
        unique_id: $("unique_id").value.trim()
      })
    });

    save(data);

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   REGISTER
===================================================== */

async function reg(role) {
  try {

    const body = {
      role,
      username: $("username").value.trim(),
      password: $("password").value,
      mobile: $("mobile").value.trim(),
      email: $("email").value.trim()
    };

    if (role === "patient") {
      body.age = $("age").value;
    } else {
      body.hospital_name =
        $("hospital_name").value.trim();

      body.hospital_id =
        $("hospital_id").value.trim().toUpperCase();
    }

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    });

    save(data);

    toast(
      "Account created successfully. Your ID: " +
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

      ${items.map(item => `
        <button onclick="${item[1]}">
          ${item[0]}
        </button>
      `).join("")}

    </div>
  `;
}

/* =====================================================
   PATIENT ACCOUNT
===================================================== */

function patient() {

  A.innerHTML = `
    ${nav([
      ["Home", "pform()"],
      ["Take Appointment", "appointment()"],
      ["History", "phistory()"],
      ["Help", "help()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  pform();
}

/* =====================================================
   PATIENT QUICK REGISTRATION
===================================================== */

function pform() {

  $("c").innerHTML = `
    <div class="panel">

      <h2>Quick Registration</h2>

      <p class="muted">
        Register your health concern for hospital assessment.
      </p>

      <label>Patient name</label>

      <input
        id="pn"
        value="${esc(u.username)}"
        placeholder="Enter patient name"
      >

      <label>Age</label>

      <input
        id="pa"
        type="number"
        value="${esc(u.age || "")}"
        min="0"
        max="130"
      >

      <label>Describe your problem</label>

      <textarea
        id="pp"
        placeholder="Describe your symptoms or health problem"
      ></textarea>

      <label>Hospital name</label>

      <input
        id="phname"
        placeholder="Enter hospital name"
      >

      <label>
        Hospital ID
        <span class="muted small">(optional)</span>
      </label>

      <input
        id="ph"
        maxlength="4"
        placeholder="Optional hospital ID"
      >

      <label>Your current location</label>

      <select id="pl" onchange="locationNotice()">
        <option value="in_hospital">
          I am currently at the hospital
        </option>

        <option value="away">
          I am away from the hospital
        </option>
      </select>

      <div id="awayNotice"></div>

      <button
        class="btn full"
        onclick="pcase()"
      >
        Submit Registration
      </button>

    </div>
  `;

  locationNotice();
}

function locationNotice() {

  const location = $("pl").value;

  $("awayNotice").innerHTML =
    location === "away"
      ? `
        <div class="notice">
          <b>Important:</b>
          This registration does not replace emergency care.
          If your symptoms are severe, worsening, or you are not fully
          conscious, go to the hospital or seek emergency medical help
          immediately.
        </div>
      `
      : "";
}

async function pcase() {

  try {

    await api("/api/cases", {
      method: "POST",

      body: JSON.stringify({
        patient_name: $("pn").value.trim(),
        age: $("pa").value,
        problem: $("pp").value.trim(),
        hospital_name: $("phname").value.trim(),
        hospital_id: $("ph").value.trim().toUpperCase(),
        location_status: $("pl").value
      })
    });

    toast("Registration saved successfully");

    phistory();

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   APPOINTMENT
===================================================== */

function appointment() {

  $("c").innerHTML = `
    <div class="panel">

      <h2>Take Appointment</h2>

      <p class="muted">
        Request a future hospital visit and receive an estimated queue time.
      </p>

      <label>Hospital name</label>

      <input
        id="aphname"
        placeholder="Enter hospital name"
      >

      <label>
        Hospital ID
        <span class="muted small">(optional)</span>
      </label>

      <input
        id="aphid"
        maxlength="4"
        placeholder="Optional hospital ID"
      >

      <button
        class="btn full"
        onclick="loadAppointmentQueue()"
      >
        Check Queue
      </button>

      <div id="appointmentBox"></div>

    </div>
  `;
}

async function loadAppointmentQueue() {

  try {

    const hospitalName =
      $("aphname").value.trim();

    const hospitalId =
      $("aphid").value.trim().toUpperCase();

    if (!hospitalName) {
      toast("Please enter hospital name");
      return;
    }

    const data = await api(
      `/api/appointments/queue?hospital_name=${encodeURIComponent(hospitalName)}&hospital_id=${encodeURIComponent(hospitalId)}`
    );

    $("appointmentBox").innerHTML = `
      <hr>

      <div class="card appointment-card">

        <h3>Current Queue</h3>

        <p>
          There are
          <b>${data.before || 0}</b>
          appointments before you.
        </p>

        <label>Preferred date</label>

        <input
          id="appointment_date"
          type="date"
        >

        <label>Preferred time</label>

        <input
          id="appointment_time"
          type="time"
        >

        <div class="notice">
          Appointment time is an estimate only and may change depending
          on patient conditions and hospital workflow.
        </div>

        <button
          class="btn full"
          onclick="createAppointment('${esc(hospitalName)}','${esc(hospitalId)}')"
        >
          Confirm Appointment Request
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function createAppointment(hospitalName, hospitalId) {

  try {

    const data = await api("/api/appointments", {
      method: "POST",

      body: JSON.stringify({
        hospital_name: hospitalName,
        hospital_id: hospitalId,
        preferred_date: $("appointment_date").value,
        preferred_time: $("appointment_time").value
      })
    });

    $("c").innerHTML = `
      <div class="panel appointment-result">

        <h2>Appointment Created</h2>

        <p class="muted">
          Your appointment queue number is
        </p>

        <div class="big-op">
          OP ${data.op_number}
        </div>

        <p>
          Patients before you:
          <b>${data.before}</b>
        </p>

        <p>
          Estimated waiting time:
          <b>${data.estimated_minutes} minutes</b>
        </p>

        <div class="notice">
          This time is an estimation. High-risk patients may be
          prioritised and actual waiting time can change.
        </div>

        <button
          class="btn"
          onclick="phistory()"
        >
          View History
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   PATIENT HISTORY
===================================================== */

async function phistory() {

  try {

    const data = await api("/api/cases/my");

    const registrations =
      data.filter(x => x.type !== "appointment");

    const appointments =
      data.filter(x => x.type === "appointment");

    $("c").innerHTML = `
      <div class="history-head">
        <div>
          <h2>My History</h2>
          <p class="muted">
            View your registrations and appointments.
          </p>
        </div>
      </div>

      <div class="history-tabs">

        <button
          class="btn alt"
          onclick="showHistoryRegistrations()"
        >
          Registrations
        </button>

        <button
          class="btn alt"
          onclick="showHistoryAppointments('remaining')"
        >
          Remaining OPs
        </button>

        <button
          class="btn alt"
          onclick="showHistoryAppointments('completed')"
        >
          Completed Checkups
        </button>

      </div>

      <div id="historyContent"></div>
    `;

    window.qtaRegistrations = registrations;
    window.qtaAppointments = appointments;

    showHistoryRegistrations();

  } catch (error) {
    toast(error.message);
  }
}

function formatDate(value) {

  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

function showHistoryRegistrations() {

  const list = window.qtaRegistrations || [];

  $("historyContent").innerHTML =
    list.length
      ? list.map(x => `
        <div
          class="card case-card clickable"
          onclick="caseDetails(${x.id})"
        >

          <div class="case-row">

            <div>
              <h3>${esc(x.patient_name)}</h3>

              <p class="muted">
                ${esc(x.hospital_name || "Hospital not available")}
              </p>
            </div>

            ${
              x.risk_level
                ? `<span class="risk ${x.risk_level}">
                    ${x.risk_level} RISK
                  </span>`
                : `<span class="status-pill">
                    Waiting for checkup
                  </span>`
            }

          </div>

          <div class="details-grid">

            <span>
              <b>Age:</b> ${esc(x.age)}
            </span>

            <span>
              <b>Status:</b>
              ${esc(x.status || "Registered")}
            </span>

            ${
              formatDate(x.updated_at)
                ? `
                  <span>
                    <b>Registered:</b>
                    ${formatDate(x.updated_at)}
                  </span>
                `
                : ""
            }

          </div>

        </div>
      `).join("")
      : `
        <div class="card">
          No registrations yet.
        </div>
      `;
}

function showHistoryAppointments(type) {

  const list = (window.qtaAppointments || []).filter(x => {

    if (type === "remaining") {
      return !["completed", "cancelled"].includes(x.status);
    }

    return ["completed", "admitted"].includes(x.status);
  });

  $("historyContent").innerHTML =
    list.length
      ? list.map(x => `
        <div class="card appointment-card clickable">

          <div class="case-row">

            <div>
              <h3>OP ${x.op_number}</h3>

              <p class="muted">
                ${esc(x.hospital_name)}
              </p>
            </div>

            <span class="status-pill">
              ${esc(x.status)}
            </span>

          </div>

          <div class="details-grid">

            <span>
              <b>Queue:</b>
              ${esc(x.op_number)}
            </span>

            <span>
              <b>Date:</b>
              ${esc(x.preferred_date || "-")}
            </span>

            <span>
              <b>Time:</b>
              ${esc(x.preferred_time || "-")}
            </span>

          </div>

        </div>
      `).join("")
      : `
        <div class="card">
          No appointments in this section.
        </div>
      `;
}

/* =====================================================
   REGISTRATION DETAILS
===================================================== */

async function caseDetails(id) {

  try {

    const x = await api(`/api/cases/${id}`);

    $("c").innerHTML = `
      <button
        class="btn alt"
        onclick="phistory()"
      >
        ← Back to History
      </button>

      <div class="panel section-gap">

        <h2>Registration Details</h2>

        <div class="details-grid large">

          <span>
            <b>Patient:</b>
            ${esc(x.patient_name)}
          </span>

          <span>
            <b>Age:</b>
            ${esc(x.age)}
          </span>

          <span>
            <b>Hospital:</b>
            ${esc(x.hospital_name || "-")}
          </span>

          <span>
            <b>Hospital ID:</b>
            ${esc(x.hospital_id || "-")}
          </span>

          <span>
            <b>Location:</b>
            ${esc(x.location_status)}
          </span>

          <span>
            <b>Status:</b>
            ${esc(x.status || "Registered")}
          </span>

        </div>

        <label>Problem</label>

        <div class="card">
          ${esc(x.problem)}
        </div>

        <hr>

        <h3>Need Help?</h3>

        <p class="muted">
          Get help related to this registration without entering the
          hospital details again.
        </p>

        <button
          class="btn"
          onclick="caseHelp(${x.id})"
        >
          Get Help for this Registration
        </button>

      </div>
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   HELP
===================================================== */

function help() {

  $("c").innerHTML = `
    <div class="panel">

      <h2>Help</h2>

      <p class="muted">
        Ask a question or request assistance.
      </p>

      <label>Hospital name</label>

      <input
        id="helpHospital"
        placeholder="Enter hospital name"
      >

      <label>Your message</label>

      <textarea
        id="helpMessage"
        placeholder="Write your question or request"
      ></textarea>

      <button
        class="btn full"
        onclick="message()"
      >
        Send Help Request
      </button>

    </div>
  `;
}

function caseHelp(caseId) {

  $("c").innerHTML = `
    <button
      class="btn alt"
      onclick="caseDetails(${caseId})"
    >
      ← Back
    </button>

    <div class="panel section-gap">

      <h2>Help for Registration</h2>

      <p class="muted">
        Your hospital information is already linked to this registration.
      </p>

      <label>Your message</label>

      <textarea
        id="helpMessage"
        placeholder="Describe what help you need"
      ></textarea>

      <button
        class="btn full"
        onclick="message(${caseId})"
      >
        Send Help Request
      </button>

    </div>
  `;
}

async function message(caseId = null) {

  try {

    await api("/api/messages", {
      method: "POST",

      body: JSON.stringify({
        hospital_name:
          $("helpHospital")
            ? $("helpHospital").value.trim()
            : null,

        message:
          $("helpMessage").value.trim(),

        case_id: caseId
      })
    });

    toast("Help request sent");

    if (caseId) {
      caseDetails(caseId);
    } else {
      help();
    }

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   PROFILE
===================================================== */

function profile() {

  const hospitalDetails =
    u.role !== "patient"
      ? `
        <label>Hospital name</label>

        <input
          id="profile_hospital_name"
          value="${esc(u.hospital_name || "")}"
        >

        <label>Hospital ID</label>

        <input
          id="profile_hospital_id"
          value="${esc(u.hospital_id || "")}"
          maxlength="4"
        >
      `
      : `
        <label>Age</label>

        <input
          id="profile_age"
          type="number"
          value="${esc(u.age || "")}"
          min="0"
          max="130"
        >
      `;

  $("c").innerHTML = `
    <div class="panel">

      <h2>My Profile</h2>

      <p class="muted">
        You can update your basic account information.
      </p>

      <div class="card">

        <p>
          <b>QTA ID:</b>
          ${esc(u.unique_id)}
        </p>

        <p>
          <b>Role:</b>
          ${esc(u.role)}
        </p>

      </div>

      <label>Username</label>

      <input
        id="profile_username"
        value="${esc(u.username || "")}"
      >

      <label>Mobile</label>

      <input
        id="profile_mobile"
        value="${esc(u.mobile || "")}"
      >

      <label>Email</label>

      <input
        id="profile_email"
        type="email"
        value="${esc(u.email || "")}"
      >

      ${hospitalDetails}

      <button
        class="btn full"
        onclick="saveProfile()"
      >
        Save Changes
      </button>

      <p class="muted small">
        Your unique QTA ID cannot be changed.
      </p>

    </div>
  `;
}

async function saveProfile() {

  try {

    const body = {
      username:
        $("profile_username").value.trim(),

      mobile:
        $("profile_mobile").value.trim(),

      email:
        $("profile_email").value.trim()
    };

    if (u.role === "patient") {
      body.age = $("profile_age").value;
    } else {
      body.hospital_name =
        $("profile_hospital_name").value.trim();

      body.hospital_id =
        $("profile_hospital_id").value.trim().toUpperCase();
    }

    const data = await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify(body)
    });

    u = data.user;

    localStorage.qtaUser = JSON.stringify(u);

    toast("Profile updated");

    profile();

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NURSE ACCOUNT
===================================================== */

function nurse() {

  A.innerHTML = `
    ${nav([
      ["Patient Registrations", "nlist()"],
      ["Appointments / OPs", "nappointments()"],
      ["Messages", "nmsg()"],
      ["History", "nhistory()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  nlist();
}

/* =====================================================
   NURSE PATIENT REGISTRATIONS
===================================================== */

async function nlist() {

  try {

    const list = await api("/api/cases");

    $("c").innerHTML = `
      <h2>Patient Registrations</h2>

      ${
        list.length
          ? list.map(v => `
            <div class="card case-card">

              <div class="case-row">

                <div>
                  <h3>${esc(v.patient_name)}</h3>

                  <p class="muted">
                    Patient ID: ${esc(v.patient_id)}
                  </p>
                </div>

                ${
                  v.risk_level
                    ? `
                      <span class="risk ${v.risk_level}">
                        ${v.risk_level} RISK
                      </span>
                    `
                    : `
                      <span class="status-pill">
                        Waiting
                      </span>
                    `
                }

              </div>

              <p>
                ${esc(v.problem)}
              </p>

              <button
                class="btn"
                onclick="check(${v.id})"
              >
                Quick Checkup
              </button>

            </div>
          `).join("")
          : `
            <div class="card">
              No patient registrations.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NURSE APPOINTMENTS
===================================================== */

async function nappointments() {

  try {

    const list = await api("/api/appointments");

    $("c").innerHTML = `
      <h2>Appointments / OP Queue</h2>

      ${
        list.length
          ? list.map(x => `
            <div class="card appointment-card">

              <div class="case-row">

                <div>
                  <h3>OP ${esc(x.op_number)}</h3>

                  <p class="muted">
                    Patient: ${esc(x.patient_name || x.patient_id)}
                  </p>
                </div>

                <span class="status-pill">
                  ${esc(x.status)}
                </span>

              </div>

              <div class="details-grid">

                <span>
                  <b>Date:</b>
                  ${esc(x.preferred_date || "-")}
                </span>

                <span>
                  <b>Time:</b>
                  ${esc(x.preferred_time || "-")}
                </span>

              </div>

              <button
                class="btn"
                onclick="checkAppointment(${x.id})"
              >
                Check Patient
              </button>

            </div>
          `).join("")
          : `
            <div class="card">
              No appointments waiting.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NURSE VITAL CHECKUP
===================================================== */

async function check(id) {

  $("c").innerHTML = `
    <div class="panel">

      <button
        class="btn alt"
        onclick="nlist()"
      >
        ← Back
      </button>

      <h2>Six Vital Measurements</h2>

      <label>Respiration rate</label>
      <input id="rr" type="number">

      <label>SpO₂</label>
      <input id="spo2" type="number">

      <label>Systolic blood pressure</label>
      <input id="sbp" type="number">

      <label>Heart rate</label>
      <input id="hr" type="number">

      <label>Consciousness</label>

      <select id="con">
        <option>Alert</option>
        <option>Voice</option>
        <option>Pain</option>
        <option>Unresponsive</option>
        <option>New confusion</option>
      </select>

      <label>Temperature °C</label>

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

async function checkAppointment(id) {
  check(id);
}

/* =====================================================
   TRIAGE
===================================================== */

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

    $("result").innerHTML = `
      <div class="card result-card case ${data.risk}">

        <h2>
          <span class="risk ${data.risk}">
            ${data.risk} RISK
          </span>
        </h2>

        <p>
          <b>Risk Score:</b>
          ${data.score}
        </p>

        <p>
          ${
            data.risk === "LOW"
              ? "Routine monitoring and standard clinical assessment."
              : data.risk === "MEDIUM"
                ? "Urgent clinical review is recommended."
                : "High-risk alert. Patient should be prioritised for doctor review."
          }
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
            : `
              <p class="notice">
                High-risk patient has been prioritised for doctor review.
              </p>
            `
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

    toast("Patient transferred to doctor");

    nlist();

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   NURSE MESSAGES / HISTORY
===================================================== */

async function nmsg() {

  try {

    const list = await api("/api/messages");

    $("c").innerHTML = `
      <h2>Patient Help Requests</h2>

      ${
        list.length
          ? list.map(m => `
            <div class="card">

              <b>
                ${esc(m.username || "Patient")}
              </b>

              <p class="muted">
                ${esc(m.unique_id || "")}
              </p>

              <p>
                ${esc(m.message)}
              </p>

            </div>
          `).join("")
          : `
            <div class="card">
              No messages.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

async function nhistory() {

  try {

    const list = await api("/api/history");

    $("c").innerHTML = `
      <h2>Hospital History</h2>

      ${
        list.length
          ? list.map(caseCard).join("")
          : `
            <div class="card">
              No history.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR ACCOUNT
===================================================== */

function doctor() {

  A.innerHTML = `
    ${nav([
      ["High Risk Queue", "dqueue('high')"],
      ["Normal Queue", "dqueue('normal')"],
      ["Hospital Risk Settings", "dsettings()"],
      ["History", "dhistory()"],
      ["Profile", "profile()"]
    ])}

    <div id="c"></div>
  `;

  dqueue("high");
}

/* =====================================================
   DOCTOR QUEUE
===================================================== */

async function dqueue(type = "high") {

  try {

    const list = await api(
      `/api/doctor/queue?type=${type}`
    );

    const title =
      type === "high"
        ? "High Risk Patient Queue"
        : "Normal Patient Queue";

    $("c").innerHTML = `
      <h2>${title}</h2>

      ${
        list.length
          ? list.map(v => `
            <div class="card doctor-case">

              <div class="case-row">

                <div>
                  <h3>${esc(v.patient_name)}</h3>

                  <p class="muted">
                    Patient ID: ${esc(v.patient_id)}
                  </p>
                </div>

                ${
                  v.risk_level
                    ? `
                      <span class="risk ${v.risk_level}">
                        ${v.risk_level} RISK
                      </span>
                    `
                    : ""
                }

              </div>

              <p>
                ${esc(v.problem)}
              </p>

              <p>
                <b>Risk Score:</b>
                ${esc(v.news_score ?? "-")}
              </p>

              <label>Patient Status</label>

              <select id="s${v.id}">

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

              <label>Doctor Notes</label>

              <textarea
                id="notes${v.id}"
                placeholder="Add clinical notes"
              ></textarea>

              <label>Medical Slip / Prescription</label>

              <textarea
                id="slip${v.id}"
                placeholder="Enter medication or treatment instructions"
              ></textarea>

              <button
                class="btn"
                onclick="doctorUpdate(${v.id})"
              >
                Save Patient Update
              </button>

            </div>
          `).join("")
          : `
            <div class="card">
              No patients waiting.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR UPDATE
===================================================== */

async function doctorUpdate(id) {

  try {

    await api(
      "/api/cases/" + id + "/status",
      {
        method: "POST",

        body: JSON.stringify({
          status: $("s" + id).value,

          doctor_notes:
            $("notes" + id).value.trim(),

          medical_slip:
            $("slip" + id).value.trim()
        })
      }
    );

    toast("Patient record updated");

    dqueue("high");

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR RISK SETTINGS
===================================================== */

async function dsettings() {

  try {

    const s = await api("/api/settings");

    $("c").innerHTML = `
      <div class="panel">

        <h2>Hospital Risk Settings</h2>

        <p class="muted">
          These settings apply only to your hospital.
          Only doctors can modify them.
        </p>

        <label>Low risk maximum score</label>

        <input
          id="low"
          value="${esc(s.low_max)}"
          type="number"
        >

        <label>Medium risk maximum score</label>

        <input
          id="med"
          value="${esc(s.medium_max)}"
          type="number"
        >

        <label>
          Medium risk review time (minutes)
        </label>

        <input
          id="min"
          value="${esc(s.medium_review_minutes)}"
          type="number"
        >

        <button
          class="btn full"
          onclick="saveset()"
        >
          Save Hospital Settings
        </button>

        <p class="muted small">
          Default values: Low ≤ 4, Medium 5–6, High ≥ 7.
        </p>

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
        low_max: $("low").value,
        medium_max: $("med").value,
        medium_review_minutes: $("min").value
      })
    });

    toast("Hospital risk settings saved");

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   DOCTOR HISTORY
===================================================== */

async function dhistory() {

  try {

    const list = await api("/api/history");

    $("c").innerHTML = `
      <h2>Hospital History</h2>

      ${
        list.length
          ? list.map(caseCard).join("")
          : `
            <div class="card">
              No history available.
            </div>
          `
      }
    `;

  } catch (error) {
    toast(error.message);
  }
}

/* =====================================================
   COMMON CASE CARD
===================================================== */

function caseCard(x) {

  return `
    <div class="card case-card">

      <div class="case-row">

        <div>
          <h3>
            ${esc(x.patient_name || "Patient")}
          </h3>

          <p class="muted">
            ${esc(x.hospital_name || "")}
          </p>
        </div>

        ${
          x.risk_level
            ? `
              <span class="risk ${x.risk_level}">
                ${x.risk_level} RISK
              </span>
            `
            : `
              <span class="status-pill">
                ${esc(x.status || "Registered")}
              </span>
            `
        }

      </div>

      ${
        x.problem
          ? `
            <p>
              ${esc(x.problem)}
            </p>
          `
          : ""
      }

      ${
        x.updated_at && formatDate(x.updated_at)
          ? `
            <small>
              ${formatDate(x.updated_at)}
            </small>
          `
          : ""
      }

    </div>
  `;
}

/* =====================================================
   START APP
===================================================== */

render();
