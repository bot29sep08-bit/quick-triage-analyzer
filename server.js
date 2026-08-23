const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "qta-secret-key-change-in-production";

const DB_FILE = path.join(__dirname, "database.json");

/* =====================================================
   DATABASE
===================================================== */

function defaultDB() {
  return {
    users: [],
    cases: [],
    appointments: [],
    messages: [],
    settings: {}
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    return {
      ...defaultDB(),
      ...db,
      users: Array.isArray(db.users) ? db.users : [],
      cases: Array.isArray(db.cases) ? db.cases : [],
      appointments: Array.isArray(db.appointments) ? db.appointments : [],
      messages: Array.isArray(db.messages) ? db.messages : [],
      settings: db.settings || {}
    };
  } catch (error) {
    console.error("Database load error:", error);
    return defaultDB();
  }
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function nextId(list) {
  if (!list.length) return 1;
  return Math.max(...list.map(x => Number(x.id) || 0)) + 1;
}

/* =====================================================
   HELPERS
===================================================== */

function now() {
  return new Date().toISOString();
}

function clean(value) {
  return String(value || "").trim();
}

function randomDigits(length) {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }

  return result;
}

function isValidHospitalId(id) {
  return /^[A-Z]{2}\d{2}$/.test(id);
}

function generateUniqueId(role, hospitalId = "") {
  let id = "";

  do {
    if (role === "nurse") {
      /*
        10 digits total.
        Hospital ID is represented by its 2 numeric digits
        plus a generated numeric part.
      */
      const numericHospital = hospitalId.replace(/[A-Z]/g, "");
      id =
        randomDigits(6) +
        randomDigits(2) +
        numericHospital;
    } else if (role === "doctor") {
      /*
        Doctor ID must be 10 digits.
        We create a stable numeric prefix derived from hospital ID.
      */
      const letters = hospitalId.slice(0, 2);
      const digits = hospitalId.slice(2, 4);

      const letterNumbers =
        letters
          .split("")
          .map(letter =>
            String(letter.charCodeAt(0) - 64).padStart(2, "0")
          )
          .join("");

      id =
        (letterNumbers + digits + randomDigits(10))
          .slice(0, 10);
    } else {
      id = randomDigits(10);
    }
  } while (db.users.some(user => user.unique_id === id));

  return id;
}

function getHospitalKey(hospitalName, hospitalId) {
  const name = clean(hospitalName).toLowerCase();
  const id = clean(hospitalId).toUpperCase();

  return id || name;
}

function findUserById(uniqueId) {
  return db.users.find(user => user.unique_id === uniqueId);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    unique_id: user.unique_id,
    role: user.role,
    mobile: user.mobile || "",
    email: user.email || "",
    age: user.age || "",
    hospital_name: user.hospital_name || "",
    hospital_id: user.hospital_id || ""
  };
}

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      unique_id: user.unique_id
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const token = header.slice(7);

    const decoded = jwt.verify(token, SECRET);

    const user = db.users.find(
      item => item.id === decoded.id
    );

    if (!user) {
      return res.status(401).json({
        error: "User account not found"
      });
    }

    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired login"
    });
  }
}

function roleOnly(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission for this action"
      });
    }

    next();
  };
}

/* =====================================================
   REGISTER
===================================================== */

app.post("/api/auth/register", (req, res) => {
  try {
    const {
      role,
      username,
      password,
      mobile,
      email,
      age,
      hospital_name,
      hospital_id
    } = req.body;

    if (!["patient", "nurse", "doctor"].includes(role)) {
      return res.status(400).json({
        error: "Invalid account type"
      });
    }

    if (!clean(username)) {
      return res.status(400).json({
        error: "Username is required"
      });
    }

    if (clean(password).length < 4) {
      return res.status(400).json({
        error: "Password must contain at least 4 characters"
      });
    }

    if (!clean(mobile)) {
      return res.status(400).json({
        error: "Mobile number is required"
      });
    }

    let finalHospitalName = "";
    let finalHospitalId = "";

    if (role === "patient") {
      const patientAge = Number(age);

      if (
        !Number.isFinite(patientAge) ||
        patientAge < 0 ||
        patientAge > 130
      ) {
        return res.status(400).json({
          error: "Please enter a valid age"
        });
      }
    } else {
      finalHospitalName = clean(hospital_name);

      finalHospitalId =
        clean(hospital_id).toUpperCase();

      if (!finalHospitalName) {
        return res.status(400).json({
          error: "Hospital name is required"
        });
      }

      if (!isValidHospitalId(finalHospitalId)) {
        return res.status(400).json({
          error:
            "Hospital ID must contain 2 letters followed by 2 digits. Example: AP12"
        });
      }
    }

    /*
      IMPORTANT:
      Username does NOT need to be unique.
      Multiple patients, nurses or doctors may use the same username.
      The unique 10 digit ID separates accounts.
    */

    const uniqueId = generateUniqueId(
      role,
      finalHospitalId
    );

    const user = {
      id: nextId(db.users),

      username: clean(username),

      password: String(password),

      unique_id: uniqueId,

      role,

      mobile: clean(mobile),

      email: clean(email),

      age:
        role === "patient"
          ? Number(age)
          : null,

      hospital_name:
        role !== "patient"
          ? finalHospitalName
          : "",

      hospital_id:
        role !== "patient"
          ? finalHospitalId
          : "",

      created_at: now()
    };

    db.users.push(user);

    saveDB();

    const token = makeToken(user);

    return res.status(201).json({
      user: publicUser(user),
      token
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to create account"
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */

app.post("/api/auth/login", (req, res) => {
  const {
    role,
    username,
    password,
    unique_id
  } = req.body;

  const user = db.users.find(item =>
    item.role === role &&
    item.username === clean(username) &&
    item.password === String(password) &&
    item.unique_id === clean(unique_id)
  );

  if (!user) {
    return res.status(401).json({
      error:
        "Username, password, unique ID or account type is incorrect"
    });
  }

  return res.json({
    user: publicUser(user),
    token: makeToken(user)
  });
});

/* =====================================================
   PROFILE
===================================================== */

app.put("/api/profile", auth, (req, res) => {
  const user = req.user;

  const {
    username,
    mobile,
    email,
    age,
    hospital_name,
    hospital_id
  } = req.body;

  if (!clean(username)) {
    return res.status(400).json({
      error: "Username cannot be empty"
    });
  }

  if (!clean(mobile)) {
    return res.status(400).json({
      error: "Mobile number cannot be empty"
    });
  }

  user.username = clean(username);
  user.mobile = clean(mobile);
  user.email = clean(email);

  if (user.role === "patient") {
    const patientAge = Number(age);

    if (
      !Number.isFinite(patientAge) ||
      patientAge < 0 ||
      patientAge > 130
    ) {
      return res.status(400).json({
        error: "Please enter a valid age"
      });
    }

    user.age = patientAge;
  } else {
    const newHospitalName = clean(hospital_name);
    const newHospitalId =
      clean(hospital_id).toUpperCase();

    if (!newHospitalName) {
      return res.status(400).json({
        error: "Hospital name cannot be empty"
      });
    }

    if (!isValidHospitalId(newHospitalId)) {
      return res.status(400).json({
        error: "Invalid hospital ID"
      });
    }

    user.hospital_name = newHospitalName;
    user.hospital_id = newHospitalId;
  }

  saveDB();

  return res.json({
    user: publicUser(user)
  });
});

/* =====================================================
   CREATE PATIENT REGISTRATION
===================================================== */

app.post(
  "/api/cases",
  auth,
  roleOnly("patient"),
  (req, res) => {
    const {
      patient_name,
      age,
      problem,
      hospital_name,
      hospital_id,
      location_status
    } = req.body;

    if (!clean(patient_name)) {
      return res.status(400).json({
        error: "Patient name is required"
      });
    }

    const patientAge = Number(age);

    if (
      !Number.isFinite(patientAge) ||
      patientAge < 0 ||
      patientAge > 130
    ) {
      return res.status(400).json({
        error: "Please enter a valid age"
      });
    }

    if (!clean(problem)) {
      return res.status(400).json({
        error: "Please describe the health problem"
      });
    }

    if (!clean(hospital_name)) {
      return res.status(400).json({
        error: "Hospital name is required"
      });
    }

    const finalHospitalId =
      clean(hospital_id).toUpperCase();

    if (
      finalHospitalId &&
      !isValidHospitalId(finalHospitalId)
    ) {
      return res.status(400).json({
        error:
          "Hospital ID must look like AP12 or can be left empty"
      });
    }

    const item = {
      id: nextId(db.cases),

      type: "registration",

      patient_id: req.user.unique_id,

      patient_name: clean(patient_name),

      age: patientAge,

      problem: clean(problem),

      hospital_name: clean(hospital_name),

      hospital_id: finalHospitalId,

      location_status:
        location_status === "away"
          ? "away"
          : "in_hospital",

      risk_level: null,

      news_score: null,

      status: "registered",

      doctor_notes: "",

      medical_slip: "",

      created_at: now(),

      updated_at: now()
    };

    db.cases.push(item);

    saveDB();

    return res.status(201).json(item);
  }
);

/* =====================================================
   PATIENT CASE HISTORY
===================================================== */

app.get(
  "/api/cases/my",
  auth,
  roleOnly("patient"),
  (req, res) => {
    const registrations =
      db.cases
        .filter(item =>
          item.patient_id === req.user.unique_id
        )
        .map(item => ({
          ...item,
          type: "registration"
        }));

    const appointments =
      db.appointments
        .filter(item =>
          item.patient_id === req.user.unique_id
        )
        .map(item => ({
          ...item,
          type: "appointment",
          updated_at:
            item.updated_at ||
            item.created_at
        }));

    const all =
      [...registrations, ...appointments]
        .sort((a, b) =>
          new Date(b.updated_at) -
          new Date(a.updated_at)
        );

    return res.json(all);
  }
);

/* =====================================================
   GET ONE CASE
===================================================== */

app.get("/api/cases/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const item = db.cases.find(
    x => x.id === id
  );

  if (!item) {
    return res.status(404).json({
      error: "Registration not found"
    });
  }

  if (
    req.user.role === "patient" &&
    item.patient_id !== req.user.unique_id
  ) {
    return res.status(403).json({
      error: "You cannot access this registration"
    });
  }

  return res.json(item);
});

/* =====================================================
   NURSE CASE LIST
===================================================== */

app.get(
  "/api/cases",
  auth,
  roleOnly("nurse"),
  (req, res) => {
    const list =
      db.cases
        .filter(item => {
          if (!item.hospital_id) {
            return (
              clean(item.hospital_name)
                .toLowerCase() ===
              clean(req.user.hospital_name)
                .toLowerCase()
            );
          }

          return (
            item.hospital_id ===
            req.user.hospital_id
          );
        })
        .sort((a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
        );

    return res.json(list);
  }
);

/* =====================================================
   TRIAGE CALCULATION
===================================================== */

function calculateRisk({
  rr,
  spo2,
  sbp,
  heart_rate,
  consciousness,
  temperature
}) {
  let score = 0;

  rr = Number(rr);
  spo2 = Number(spo2);
  sbp = Number(sbp);
  heart_rate = Number(heart_rate);
  temperature = Number(temperature);

  if (rr <= 8 || rr >= 25) score += 3;
  else if (rr >= 21) score += 2;
  else if (rr >= 9 && rr <= 11) score += 1;

  if (spo2 <= 91) score += 3;
  else if (spo2 <= 93) score += 2;
  else if (spo2 <= 95) score += 1;

  if (sbp <= 90) score += 3;
  else if (sbp <= 100) score += 2;

  if (heart_rate <= 40 || heart_rate >= 131) score += 3;
  else if (heart_rate >= 111) score += 2;
  else if (heart_rate >= 91) score += 1;

  if (
    consciousness !== "Alert"
  ) {
    score += 3;
  }

  if (temperature <= 35 || temperature >= 39.1) {
    score += 2;
  } else if (
    temperature >= 38.1 &&
    temperature <= 39
  ) {
    score += 1;
  }

  return score;
}

function riskFromScore(score, hospitalId) {
  const settings =
    db.settings[hospitalId] || {
      low_max: 4,
      medium_max: 6
    };

  if (score <= Number(settings.low_max)) {
    return "LOW";
  }

  if (score <= Number(settings.medium_max)) {
    return "MEDIUM";
  }

  return "HIGH";
}

/* =====================================================
   NURSE TRIAGE
===================================================== */

app.post(
  "/api/cases/:id/triage",
  auth,
  roleOnly("nurse"),
  (req, res) => {
    const id = Number(req.params.id);

    const item = db.cases.find(
      x => x.id === id
    );

    if (!item) {
      return res.status(404).json({
        error: "Patient registration not found"
      });
    }

    const required = [
      "rr",
      "spo2",
      "sbp",
      "heart_rate",
      "temperature"
    ];

    for (const field of required) {
      if (
        req.body[field] === "" ||
        req.body[field] === undefined
      ) {
        return res.status(400).json({
          error: "Please enter all six vital measurements"
        });
      }
    }

    const score =
      calculateRisk(req.body);

    const hospitalId =
      item.hospital_id ||
      req.user.hospital_id;

    const risk =
      riskFromScore(score, hospitalId);

    item.news_score = score;
    item.risk_level = risk;

    item.status =
      risk === "HIGH"
        ? "priority_doctor_review"
        : "checked";

    item.updated_at = now();

    saveDB();

    return res.json({
      score,
      risk
    });
  }
);

/* =====================================================
   NURSE TRANSFER
===================================================== */

app.post(
  "/api/cases/:id/transfer",
  auth,
  roleOnly("nurse"),
  (req, res) => {
    const item = db.cases.find(
      x => x.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    item.status = "doctor_review";
    item.updated_at = now();

    saveDB();

    return res.json({
      success: true
    });
  }
);

/* =====================================================
   APPOINTMENT QUEUE COUNT
===================================================== */

app.get(
  "/api/appointments/queue",
  auth,
  roleOnly("patient"),
  (req, res) => {
    const hospitalName =
      clean(req.query.hospital_name);

    const hospitalId =
      clean(req.query.hospital_id)
        .toUpperCase();

    if (!hospitalName) {
      return res.status(400).json({
        error: "Hospital name is required"
      });
    }

    const key =
      getHospitalKey(
        hospitalName,
        hospitalId
      );

    const active =
      db.appointments.filter(item =>
        item.hospital_key === key &&
        !["completed", "cancelled"].includes(item.status)
      );

    return res.json({
      before: active.length
    });
  }
);

/* =====================================================
   CREATE APPOINTMENT
===================================================== */

app.post(
  "/api/appointments",
  auth,
  roleOnly("patient"),
  (req, res) => {
    const {
      hospital_name,
      hospital_id,
      preferred_date,
      preferred_time
    } = req.body;

    const hospitalName =
      clean(hospital_name);

    const hospitalId =
      clean(hospital_id).toUpperCase();

    if (!hospitalName) {
      return res.status(400).json({
        error: "Hospital name is required"
      });
    }

    if (
      hospitalId &&
      !isValidHospitalId(hospitalId)
    ) {
      return res.status(400).json({
        error:
          "Invalid hospital ID"
      });
    }

    if (!clean(preferred_date)) {
      return res.status(400).json({
        error: "Please select appointment date"
      });
    }

    if (!clean(preferred_time)) {
      return res.status(400).json({
        error: "Please select appointment time"
      });
    }

    const key =
      getHospitalKey(
        hospitalName,
        hospitalId
      );

    const active =
      db.appointments
        .filter(item =>
          item.hospital_key === key &&
          !["completed", "cancelled"].includes(item.status)
        )
        .sort((a, b) =>
          Number(a.op_number) -
          Number(b.op_number)
        );

    const before = active.length;

    const opNumber =
      active.length
        ? Math.max(
            ...active.map(
              x => Number(x.op_number)
            )
          ) + 1
        : 1;

    /*
      Default estimation:
      Low/medium patient = 5 minutes
      High risk patient = 15 minutes

      At appointment creation the patient has not yet
      been triaged, so we estimate using 5 minutes each.
    */

    const estimatedMinutes =
      before * 5;

    const appointment = {
      id: nextId(db.appointments),

      type: "appointment",

      patient_id: req.user.unique_id,

      patient_name: req.user.username,

      hospital_name: hospitalName,

      hospital_id: hospitalId,

      hospital_key: key,

      op_number: opNumber,

      preferred_date:
        clean(preferred_date),

      preferred_time:
        clean(preferred_time),

      estimated_minutes:
        estimatedMinutes,

      status: "waiting",

      created_at: now(),

      updated_at: now()
    };

    db.appointments.push(appointment);

    saveDB();

    return res.status(201).json({
      op_number: opNumber,
      before,
      estimated_minutes: estimatedMinutes,
      appointment
    });
  }
);

/* =====================================================
   NURSE APPOINTMENT LIST
===================================================== */

app.get(
  "/api/appointments",
  auth,
  roleOnly("nurse"),
  (req, res) => {
    const list =
      db.appointments
        .filter(item => {
          if (item.hospital_id) {
            return (
              item.hospital_id ===
              req.user.hospital_id
            );
          }

          return (
            clean(item.hospital_name)
              .toLowerCase() ===
            clean(req.user.hospital_name)
              .toLowerCase()
          );
        })
        .sort((a, b) =>
          Number(a.op_number) -
          Number(b.op_number)
        );

    return res.json(list);
  }
);

/* =====================================================
   PATIENT HELP MESSAGE
===================================================== */

app.post(
  "/api/messages",
  auth,
  roleOnly("patient"),
  (req, res) => {
    const {
      hospital_name,
      message,
      case_id
    } = req.body;

    if (!clean(message)) {
      return res.status(400).json({
        error: "Please enter a message"
      });
    }

    let hospitalName =
      clean(hospital_name);

    let hospitalId = "";

    if (case_id) {
      const item = db.cases.find(
        x =>
          x.id === Number(case_id) &&
          x.patient_id === req.user.unique_id
      );

      if (!item) {
        return res.status(404).json({
          error: "Registration not found"
        });
      }

      hospitalName = item.hospital_name;
      hospitalId = item.hospital_id;
    }

    if (!hospitalName) {
      return res.status(400).json({
        error: "Hospital name is required"
      });
    }

    const messageItem = {
      id: nextId(db.messages),

      patient_id:
        req.user.unique_id,

      username:
        req.user.username,

      unique_id:
        req.user.unique_id,

      hospital_name:
        hospitalName,

      hospital_id:
        hospitalId,

      case_id:
        case_id
          ? Number(case_id)
          : null,

      message:
        clean(message),

      created_at:
        now()
    };

    db.messages.push(messageItem);

    saveDB();

    return res.status(201).json({
      success: true
    });
  }
);

/* =====================================================
   NURSE MESSAGES
===================================================== */

app.get(
  "/api/messages",
  auth,
  roleOnly("nurse"),
  (req, res) => {
    const list =
      db.messages
        .filter(message => {
          if (message.hospital_id) {
            return (
              message.hospital_id ===
              req.user.hospital_id
            );
          }

          return (
            clean(message.hospital_name)
              .toLowerCase() ===
            clean(req.user.hospital_name)
              .toLowerCase()
          );
        })
        .sort((a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
        );

    return res.json(list);
  }
);

/* =====================================================
   DOCTOR QUEUES
===================================================== */

app.get(
  "/api/doctor/queue",
  auth,
  roleOnly("doctor"),
  (req, res) => {
    const type =
      req.query.type || "high";

    let list =
      db.cases.filter(item => {
        const sameHospital =
          item.hospital_id
            ? item.hospital_id === req.user.hospital_id
            : clean(item.hospital_name)
                .toLowerCase() ===
              clean(req.user.hospital_name)
                .toLowerCase();

        if (!sameHospital) return false;

        if (
          ["completed", "admitted"].includes(
            item.status
          )
        ) {
          return false;
        }

        return true;
      });

    if (type === "high") {
      list = list.filter(
        item =>
          item.risk_level === "HIGH"
      );
    } else {
      list = list.filter(
        item =>
          item.risk_level !== "HIGH"
      );
    }

    list.sort((a, b) => {
      const priority = {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3
      };

      const riskCompare =
        (priority[a.risk_level] || 4) -
        (priority[b.risk_level] || 4);

      if (riskCompare !== 0) {
        return riskCompare;
      }

      return (
        new Date(a.created_at) -
        new Date(b.created_at)
      );
    });

    return res.json(list);
  }
);

/* =====================================================
   DOCTOR STATUS / NOTES / MEDICAL SLIP
===================================================== */

app.post(
  "/api/cases/:id/status",
  auth,
  roleOnly("doctor"),
  (req, res) => {
    const item = db.cases.find(
      x =>
        x.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    const allowed = [
      "under_review",
      "completed",
      "admitted",
      "follow_up"
    ];

    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({
        error: "Invalid patient status"
      });
    }

    item.status =
      req.body.status;

    item.doctor_notes =
      clean(req.body.doctor_notes);

    item.medical_slip =
      clean(req.body.medical_slip);

    item.updated_at =
      now();

    saveDB();

    return res.json({
      success: true,
      case: item
    });
  }
);

/* =====================================================
   HOSPITAL SETTINGS
===================================================== */

app.get(
  "/api/settings",
  auth,
  roleOnly("doctor"),
  (req, res) => {
    const hospitalId =
      req.user.hospital_id;

    const settings =
      db.settings[hospitalId] || {
        low_max: 4,
        medium_max: 6,
        medium_review_minutes: 30
      };

    return res.json(settings);
  }
);

app.put(
  "/api/settings",
  auth,
  roleOnly("doctor"),
  (req, res) => {
    const {
      low_max,
      medium_max,
      medium_review_minutes
    } = req.body;

    const low = Number(low_max);
    const medium = Number(medium_max);
    const minutes =
      Number(medium_review_minutes);

    if (
      !Number.isFinite(low) ||
      !Number.isFinite(medium) ||
      !Number.isFinite(minutes)
    ) {
      return res.status(400).json({
        error: "Please enter valid numbers"
      });
    }

    if (
      low < 0 ||
      medium < low ||
      minutes < 1
    ) {
      return res.status(400).json({
        error: "Please check the risk settings"
      });
    }

    db.settings[
      req.user.hospital_id
    ] = {
      low_max: low,
      medium_max: medium,
      medium_review_minutes: minutes
    };

    saveDB();

    return res.json({
      success: true
    });
  }
);

/* =====================================================
   HISTORY FOR NURSES AND DOCTORS
===================================================== */

app.get(
  "/api/history",
  auth,
  roleOnly("nurse", "doctor"),
  (req, res) => {
    const list =
      db.cases
        .filter(item => {
          if (item.hospital_id) {
            return (
              item.hospital_id ===
              req.user.hospital_id
            );
          }

          return (
            clean(item.hospital_name)
              .toLowerCase() ===
            clean(req.user.hospital_name)
              .toLowerCase()
          );
        })
        .sort((a, b) =>
          new Date(b.updated_at) -
          new Date(a.updated_at)
        );

    return res.json(list);
  }
);

/* =====================================================
   SERVE FRONTEND
===================================================== */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {
  console.log(
    `QTA server running on port ${PORT}`
  );
});
