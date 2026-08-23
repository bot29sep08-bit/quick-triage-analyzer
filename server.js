const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "5mb" }));

/* =========================================================
   TEMPORARY DATA STORE
   ========================================================= */

let users = [];
let cases = [];
let appointments = [];
let messages = [];
let documents = [];
let hospitalSettingsStore = {};

let nextUserNumber = 1;
let nextCaseId = 1;
let nextAppointmentId = 1;
let nextMessageId = 1;
let nextDocumentId = 1;

/* =========================================================
   HELPERS
   ========================================================= */

function now() {
  return new Date().toISOString();
}

function cleanHospitalId(value = "") {
  return String(value).trim().toUpperCase();
}

function makeToken(user) {
  return `qta-${user.id}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function randomSixDigits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/*
 Patient ID: 10 numeric digits

 Nurse ID: 10 characters:
 first 6 digits + last 4 = Hospital ID
 Example: 583921AP12

 Doctor ID: 10 characters:
 first 4 = Hospital ID + last 6 digits
 Example: AP12583921
*/
function createUniqueId(role, hospitalId = "") {
  if (role === "patient") {
    let id;

    do {
      id =
        String(Date.now()).slice(-6) +
        String(nextUserNumber).padStart(4, "0");
    } while (users.some((u) => u.unique_id === id));

    return id;
  }

  const six = randomSixDigits();
  const hospital = cleanHospitalId(hospitalId);

  let id =
    role === "nurse"
      ? six + hospital
      : hospital + six;

  while (users.some((u) => u.unique_id === id)) {
    const newSix = randomSixDigits();

    id =
      role === "nurse"
        ? newSix + hospital
        : hospital + newSix;
  }

  return id;
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) return null;

  const token = auth.replace("Bearer ", "");

  return users.find((user) => user.token === token) || null;
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      error: "Please sign in first"
    });
  }

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission for this action"
      });
    }

    next();
  };
}

function hospitalKey(name = "", id = "") {
  return cleanHospitalId(id) || String(name).trim().toLowerCase();
}

function getHospitalSettings(caseItem) {
  const key = hospitalKey(
    caseItem.hospital_name,
    caseItem.hospital_id
  );

  if (!hospitalSettingsStore[key]) {
    hospitalSettingsStore[key] = {
      low_max: 4,
      medium_max: 6,
      medium_review_minutes: 30
    };
  }

  return hospitalSettingsStore[key];
}

function calculateRiskMinutes(risk) {
  if (risk === "HIGH") return 15;
  if (risk === "LOW") return 5;
  if (risk === "MEDIUM") return 5;

  return 10;
}

function sortRisk(a, b) {
  const priority = {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3
  };

  return (
    (priority[a.risk_level] || 4) -
    (priority[b.risk_level] || 4)
  );
}

/* =========================================================
   HEALTH
   ========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Quick Triage Analyzer backend is running"
  });
});

/* =========================================================
   AUTH — DUPLICATE USERNAMES ALLOWED
   ========================================================= */

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

    if (!role || !username || !password || !mobile) {
      return res.status(400).json({
        error: "Please fill all required fields"
      });
    }

    if (!["patient", "nurse", "doctor"].includes(role)) {
      return res.status(400).json({
        error: "Invalid account type"
      });
    }

    if (role === "patient" && !age) {
      return res.status(400).json({
        error: "Age is required for patient registration"
      });
    }

    if (role === "nurse" || role === "doctor") {
      if (!hospital_name || !hospital_id) {
        return res.status(400).json({
          error: "Hospital name and Hospital ID are required"
        });
      }

      const hospital = cleanHospitalId(hospital_id);

      if (!/^[A-Z]{2}\d{2}$/.test(hospital)) {
        return res.status(400).json({
          error:
            "Hospital ID must contain 2 letters and 2 numbers, for example AP12"
        });
      }
    }

    const uniqueId = createUniqueId(
      role,
      role === "patient" ? "" : hospital_id
    );

    const user = {
      id: nextUserNumber++,
      unique_id: uniqueId,
      role,
      username: String(username).trim(),
      password: String(password),
      mobile: String(mobile).trim(),
      email: String(email || "").trim(),
      age:
        role === "patient"
          ? Number(age)
          : null,
      hospital_name:
        role !== "patient"
          ? String(hospital_name).trim()
          : null,
      hospital_id:
        role !== "patient"
          ? cleanHospitalId(hospital_id)
          : null,
      created_at: now(),
      token: null
    };

    const token = makeToken(user);
    user.token = token;

    users.push(user);

    res.status(201).json({
      token,
      user: publicUser(user)
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      error: "Registration failed"
    });
  }
});


app.post("/api/auth/login", (req, res) => {
  try {
    const {
      role,
      username,
      password,
      unique_id
    } = req.body;

    if (
      !role ||
      !username ||
      !password ||
      !unique_id
    ) {
      return res.status(400).json({
        error:
          "Username, Unique ID and password are required"
      });
    }

    const user = users.find(
      (item) =>
        item.role === role &&
        item.username === String(username).trim() &&
        item.unique_id ===
          String(unique_id).trim().toUpperCase() &&
        item.password === String(password)
    );

    if (!user) {
      return res.status(401).json({
        error:
          "Username, Unique ID or password is incorrect"
      });
    }

    const token = makeToken(user);
    user.token = token;

    res.json({
      token,
      user: publicUser(user)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

function publicUser(user) {
  return {
    id: user.id,
    unique_id: user.unique_id,
    role: user.role,
    username: user.username,
    mobile: user.mobile,
    email: user.email,
    age: user.age,
    hospital_name: user.hospital_name,
    hospital_id: user.hospital_id,
    created_at: user.created_at
  };
}

/* =========================================================
   PROFILE
   ========================================================= */

app.get("/api/profile", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});


app.put("/api/profile", requireAuth, (req, res) => {
  const {
    mobile,
    email,
    age
  } = req.body;

  if (mobile) {
    req.user.mobile = String(mobile).trim();
  }

  if (email !== undefined) {
    req.user.email = String(email).trim();
  }

  if (
    req.user.role === "patient" &&
    age
  ) {
    req.user.age = Number(age);
  }

  res.json(publicUser(req.user));
});


app.put("/api/profile/password", requireAuth, (req, res) => {
  const {
    current_password,
    new_password
  } = req.body;

  if (
    !current_password ||
    !new_password
  ) {
    return res.status(400).json({
      error:
        "Current password and new password are required"
    });
  }

  if (
    req.user.password !== current_password
  ) {
    return res.status(400).json({
      error: "Current password is incorrect"
    });
  }

  if (new_password.length < 4) {
    return res.status(400).json({
      error:
        "New password must contain at least 4 characters"
    });
  }

  req.user.password = new_password;

  res.json({
    message: "Password changed successfully"
  });
});

/* =========================================================
   PATIENT QUICK REGISTRATION
   ========================================================= */

app.post(
  "/api/cases",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    try {
      const {
        patient_name,
        age,
        problem,
        location_status,
        hospital_name,
        hospital_id
      } = req.body;

      if (
        !patient_name ||
        !age ||
        !problem ||
        !location_status ||
        !hospital_name
      ) {
        return res.status(400).json({
          error:
            "Please fill patient name, age, problem, location and hospital name"
        });
      }

      const patientCase = {
        id: nextCaseId++,
        patient_id: req.user.unique_id,
        patient_name: String(patient_name).trim(),
        age: Number(age),
        problem: String(problem).trim(),
        location_status,
        hospital_name:
          String(hospital_name).trim(),
        hospital_id:
          cleanHospitalId(hospital_id || ""),
        risk_level: null,
        news_score: null,
        vitals: null,
        status: "registered",
        transferred_to_doctor: false,
        doctor_notes: "",
        created_at: now(),
        updated_at: now()
      };

      cases.push(patientCase);

      res.status(201).json(patientCase);

    } catch (error) {
      console.error("CASE ERROR:", error);

      res.status(500).json({
        error: "Could not save registration"
      });
    }
  }
);


/* =========================================================
   CASE LISTS
   ========================================================= */

app.get(
  "/api/cases/my",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    const result = cases
      .filter(
        (item) =>
          item.patient_id === req.user.unique_id
      )
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

    res.json(result);
  }
);


app.get(
  "/api/cases",
  requireAuth,
  requireRole("nurse", "doctor"),
  (req, res) => {
    const result = cases
      .filter(
        (item) =>
          (
            item.hospital_id &&
            item.hospital_id ===
              req.user.hospital_id
          ) ||
          (
            !item.hospital_id &&
            item.hospital_name
              .toLowerCase() ===
              req.user.hospital_name
                .toLowerCase()
          )
      )
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

    res.json(result);
  }
);


app.get(
  "/api/cases/:id",
  requireAuth,
  (req, res) => {
    const item = cases.find(
      (caseItem) =>
        caseItem.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "Registration not found"
      });
    }

    const allowed =
      req.user.role === "patient"
        ? item.patient_id === req.user.unique_id
        : (
            item.hospital_id ===
              req.user.hospital_id ||
            item.hospital_name
              .toLowerCase() ===
              req.user.hospital_name
                .toLowerCase()
          );

    if (!allowed) {
      return res.status(403).json({
        error: "Access denied"
      });
    }

    res.json(item);
  }
);

/* =========================================================
   TRIAGE — SIX VITALS
   ========================================================= */

app.post(
  "/api/cases/:id/triage",
  requireAuth,
  requireRole("nurse"),
  (req, res) => {
    try {
      const item = cases.find(
        (caseItem) =>
          caseItem.id === Number(req.params.id)
      );

      if (!item) {
        return res.status(404).json({
          error: "Patient registration not found"
        });
      }

      const {
        rr,
        spo2,
        sbp,
        heart_rate,
        consciousness,
        temperature
      } = req.body;

      const respiration = Number(rr);
      const oxygen = Number(spo2);
      const bloodPressure = Number(sbp);
      const heartRate = Number(heart_rate);
      const temp = Number(temperature);

      if (
        !respiration ||
        !oxygen ||
        !bloodPressure ||
        !heartRate ||
        !consciousness ||
        Number.isNaN(temp)
      ) {
        return res.status(400).json({
          error:
            "Please enter all six vital measurements"
        });
      }

      let score = 0;

      if (
        respiration <= 8 ||
        respiration >= 25
      ) {
        score += 3;
      } else if (respiration >= 21) {
        score += 1;
      }

      if (oxygen <= 91) {
        score += 3;
      } else if (oxygen <= 93) {
        score += 2;
      } else if (oxygen <= 95) {
        score += 1;
      }

      if (bloodPressure <= 90) {
        score += 3;
      } else if (bloodPressure <= 100) {
        score += 2;
      } else if (bloodPressure <= 110) {
        score += 1;
      }

      if (
        heartRate <= 40 ||
        heartRate >= 131
      ) {
        score += 3;
      } else if (heartRate >= 111) {
        score += 2;
      } else if (heartRate >= 91) {
        score += 1;
      }

      if (
        consciousness !== "Alert"
      ) {
        score += 3;
      }

      if (
        temp < 35 ||
        temp >= 39.1
      ) {
        score += 3;
      } else if (temp >= 38.1) {
        score += 1;
      }

      const setting =
        getHospitalSettings(item);

      let risk;

      if (score <= setting.low_max) {
        risk = "LOW";
      } else if (
        score <= setting.medium_max
      ) {
        risk = "MEDIUM";
      } else {
        risk = "HIGH";
      }

      item.news_score = score;
      item.risk_level = risk;

      item.vitals = {
        respiration_rate: respiration,
        spo2: oxygen,
        systolic_bp: bloodPressure,
        heart_rate: heartRate,
        consciousness,
        temperature: temp
      };

      item.updated_at = now();

      if (risk === "HIGH") {
        item.transferred_to_doctor = true;
        item.status = "high_priority";
      } else {
        item.status = "triaged";
      }

      res.json({
        score,
        risk,
        case: item
      });

    } catch (error) {
      console.error("TRIAGE ERROR:", error);

      res.status(500).json({
        error:
          "Could not complete triage analysis"
      });
    }
  }
);


/* =========================================================
   TRANSFER TO DOCTOR
   ========================================================= */

app.post(
  "/api/cases/:id/transfer",
  requireAuth,
  requireRole("nurse"),
  (req, res) => {
    const item = cases.find(
      (caseItem) =>
        caseItem.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    item.transferred_to_doctor = true;
    item.status = "transferred";
    item.updated_at = now();

    res.json({
      message:
        "Patient transferred to doctor queue",
      case: item
    });
  }
);

/* =========================================================
   APPOINTMENTS / OP
   ========================================================= */

app.post(
  "/api/appointments",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    try {
      const {
        hospital_name,
        hospital_id,
        appointment_date,
        appointment_time
      } = req.body;

      if (
        !hospital_name ||
        !appointment_date ||
        !appointment_time
      ) {
        return res.status(400).json({
          error:
            "Hospital name, date and time are required"
        });
      }

      const hospitalId =
        cleanHospitalId(hospital_id || "");

      const previous = appointments
        .filter(
          (item) =>
            item.status !== "completed" &&
            item.appointment_date ===
              appointment_date &&
            (
              item.hospital_id === hospitalId ||
              (
                !hospitalId &&
                item.hospital_name
                  .toLowerCase() ===
                  hospital_name
                    .toLowerCase()
              )
            )
        )
        .sort(
          (a, b) =>
            a.op_number - b.op_number
        );

      const patientsBefore =
        previous.length;

      const totalMinutes =
        previous.reduce(
          (total, appointment) =>
            total +
            calculateRiskMinutes(
              appointment.risk_level
            ),
          0
        );

      const requestedDateTime =
        new Date(
          `${appointment_date}T${appointment_time}`
        );

      const estimatedDateTime =
        new Date(
          requestedDateTime.getTime() +
          totalMinutes * 60000
        );

      const maxOp =
        appointments
          .filter(
            (item) =>
              item.appointment_date ===
                appointment_date &&
              (
                item.hospital_id ===
                  hospitalId ||
                (
                  !hospitalId &&
                  item.hospital_name
                    .toLowerCase() ===
                    hospital_name
                      .toLowerCase()
                )
              )
          )
          .reduce(
            (max, item) =>
              Math.max(max, item.op_number),
            0
          );

      const appointment = {
        id: nextAppointmentId++,
        patient_id: req.user.unique_id,
        patient_name: req.user.username,
        hospital_name:
          String(hospital_name).trim(),
        hospital_id: hospitalId,
        appointment_date,
        requested_time: appointment_time,
        estimated_time:
          estimatedDateTime.toISOString(),
        patients_before:
          patientsBefore,
        op_number: maxOp + 1,
        risk_level: null,
        status: "remaining",
        created_at: now(),
        updated_at: now()
      };

      appointments.push(appointment);

      res.status(201).json({
        ...appointment,
        disclaimer:
          "This time is only an estimate and may change depending on patient condition, priority cases and hospital workload."
      });

    } catch (error) {
      console.error(
        "APPOINTMENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create appointment"
      });
    }
  }
);


app.get(
  "/api/appointments/my",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    const result = appointments
      .filter(
        (item) =>
          item.patient_id === req.user.unique_id
      )
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

    res.json(result);
  }
);


app.get(
  "/api/appointments",
  requireAuth,
  requireRole("nurse", "doctor"),
  (req, res) => {
    const result = appointments
      .filter(
        (item) =>
          item.hospital_id ===
            req.user.hospital_id ||
          (
            !item.hospital_id &&
            item.hospital_name
              .toLowerCase() ===
              req.user.hospital_name
                .toLowerCase()
          )
      )
      .sort(
        (a, b) =>
          a.op_number - b.op_number
      );

    res.json(result);
  }
);


app.post(
  "/api/appointments/:id/status",
  requireAuth,
  requireRole("nurse", "doctor"),
  (req, res) => {
    const item = appointments.find(
      (appointment) =>
        appointment.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "OP not found"
      });
    }

    const {
      status,
      risk_level
    } = req.body;

    if (status) {
      item.status = status;
    }

    if (risk_level) {
      item.risk_level = risk_level;
    }

    item.updated_at = now();

    res.json(item);
  }
);

/* =========================================================
   DOCTOR QUEUES
   ========================================================= */

app.get(
  "/api/doctor/high-queue",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    const result = cases
      .filter(
        (item) =>
          item.transferred_to_doctor &&
          item.risk_level === "HIGH" &&
          item.hospital_id ===
            req.user.hospital_id
      )
      .sort(
        (a, b) =>
          new Date(a.updated_at) -
          new Date(b.updated_at)
      );

    res.json(result);
  }
);


app.get(
  "/api/doctor/normal-queue",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    const result = cases
      .filter(
        (item) =>
          item.transferred_to_doctor &&
          item.risk_level !== "HIGH" &&
          item.hospital_id ===
            req.user.hospital_id
      )
      .sort(sortRisk);

    res.json(result);
  }
);


/* =========================================================
   DOCTOR CASE STATUS / NOTES
   ========================================================= */

app.post(
  "/api/cases/:id/status",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    const item = cases.find(
      (caseItem) =>
        caseItem.id === Number(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    const {
      status,
      notes
    } = req.body;

    if (status) {
      item.status = status;
    }

    if (notes !== undefined) {
      item.doctor_notes =
        String(notes);
    }

    item.updated_at = now();

    res.json(item);
  }
);

/* =========================================================
   DOCTOR MEDICAL SLIPS / DOCUMENTS
   ========================================================= */

app.post(
  "/api/documents",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    try {
      const {
        patient_id,
        title,
        type,
        content
      } = req.body;

      if (
        !patient_id ||
        !title ||
        !content
      ) {
        return res.status(400).json({
          error:
            "Patient ID, title and content are required"
        });
      }

      const document = {
        id: nextDocumentId++,
        patient_id:
          String(patient_id).trim(),
        doctor_id:
          req.user.unique_id,
        doctor_name:
          req.user.username,
        hospital_name:
          req.user.hospital_name,
        hospital_id:
          req.user.hospital_id,
        title: String(title).trim(),
        type:
          type || "medical_slip",
        content:
          String(content).trim(),
        created_at: now()
      };

      documents.push(document);

      res.status(201).json(document);

    } catch (error) {
      console.error(
        "DOCUMENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not save document"
      });
    }
  }
);


app.get(
  "/api/documents/my",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    const result = documents.filter(
      (item) =>
        item.patient_id ===
          req.user.unique_id
    );

    res.json(result);
  }
);

/* =========================================================
   MESSAGES / HELP
   ========================================================= */

app.post(
  "/api/messages",
  requireAuth,
  requireRole("patient"),
  (req, res) => {
    const {
      hospital_name,
      hospital_id,
      message,
      case_id
    } = req.body;

    if (
      !hospital_name ||
      !message
    ) {
      return res.status(400).json({
        error:
          "Hospital name and message are required"
      });
    }

    const item = {
      id: nextMessageId++,
      patient_id:
        req.user.unique_id,
      username:
        req.user.username,
      hospital_name:
        String(hospital_name).trim(),
      hospital_id:
        cleanHospitalId(
          hospital_id || ""
        ),
      case_id:
        case_id || null,
      message:
        String(message).trim(),
      created_at: now()
    };

    messages.push(item);

    res.status(201).json(item);
  }
);


app.get(
  "/api/messages",
  requireAuth,
  requireRole("nurse"),
  (req, res) => {
    const result = messages.filter(
      (item) =>
        item.hospital_id ===
          req.user.hospital_id ||
        (
          !item.hospital_id &&
          item.hospital_name
            .toLowerCase() ===
            req.user.hospital_name
              .toLowerCase()
        )
    );

    res.json(result);
  }
);

/* =========================================================
   HISTORY
   ========================================================= */

app.get(
  "/api/history",
  requireAuth,
  (req, res) => {
    if (
      req.user.role === "patient"
    ) {
      const registrations =
        cases
          .filter(
            (item) =>
              item.patient_id ===
                req.user.unique_id
          )
          .map((item) => ({
            ...item,
            history_type:
              "registration"
          }));

      const ops =
        appointments
          .filter(
            (item) =>
              item.patient_id ===
                req.user.unique_id
          )
          .map((item) => ({
            ...item,
            history_type:
              "appointment"
          }));

      const combined =
        [...registrations, ...ops]
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ) -
              new Date(
                a.created_at
              )
          );

      return res.json(combined);
    }

    const result = cases
      .filter(
        (item) =>
          item.hospital_id ===
            req.user.hospital_id ||
          (
            !item.hospital_id &&
            item.hospital_name
              .toLowerCase() ===
              req.user.hospital_name
                .toLowerCase()
          )
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at) -
          new Date(a.updated_at)
      );

    res.json(result);
  }
);

/* =========================================================
   HOSPITAL RISK SETTINGS
   ========================================================= */

app.get(
  "/api/settings",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    const key = hospitalKey(
      req.user.hospital_name,
      req.user.hospital_id
    );

    if (!hospitalSettingsStore[key]) {
      hospitalSettingsStore[key] = {
        low_max: 4,
        medium_max: 6,
        medium_review_minutes: 30
      };
    }

    res.json(
      hospitalSettingsStore[key]
    );
  }
);


app.put(
  "/api/settings",
  requireAuth,
  requireRole("doctor"),
  (req, res) => {
    const {
      low_max,
      medium_max,
      medium_review_minutes
    } = req.body;

    if (
      Number(low_max) >
      Number(medium_max)
    ) {
      return res.status(400).json({
        error:
          "Low maximum cannot be greater than Medium maximum"
      });
    }

    const key = hospitalKey(
      req.user.hospital_name,
      req.user.hospital_id
    );

    hospitalSettingsStore[key] = {
      low_max:
        Number(low_max),
      medium_max:
        Number(medium_max),
      medium_review_minutes:
        Number(
          medium_review_minutes
        )
    };

    res.json(
      hospitalSettingsStore[key]
    );
  }
);

/* =========================================================
   FRONTEND
   THIS MUST STAY LAST
   ========================================================= */

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `QTA running on port ${PORT}`
    );
  }
);
