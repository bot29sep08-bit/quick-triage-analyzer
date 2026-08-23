const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

/* =========================
   TEMPORARY IN-MEMORY DATA
   ========================= */

let users = [];
let cases = [];
let messages = [];
let settings = {};

let nextUserId = 1;
let nextCaseId = 1;
let nextMessageId = 1;

/* =========================
   HELPER FUNCTIONS
   ========================= */

function makeToken(user) {
  return `qta-${user.id}-${Date.now()}`;
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.replace("Bearer ", "");

  return users.find(user => user.token === token) || null;
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

function generateUniqueId(role) {
  const prefix =
    role === "patient"
      ? "PAT"
      : role === "nurse"
      ? "NUR"
      : "DOC";

  return `${prefix}${String(nextUserId).padStart(4, "0")}`;
}

function hospitalSettings(hospitalId) {
  if (!settings[hospitalId]) {
    settings[hospitalId] = {
      low_max: 4,
      medium_max: 6,
      medium_review_minutes: 30
    };
  }

  return settings[hospitalId];
}

/* =========================
   HEALTH CHECK
   ========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Quick Triage Analyzer API is running"
  });
});

/* =========================
   AUTH
   ========================= */

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
        error: "Invalid role"
      });
    }

    if (users.some(user => user.username === username)) {
      return res.status(400).json({
        error: "Username already exists"
      });
    }

    if (role !== "patient") {
      if (!hospital_name || !hospital_id) {
        return res.status(400).json({
          error: "Hospital name and Hospital ID are required"
        });
      }

      if (!/^[A-Za-z]{2}\d{2}$/.test(hospital_id)) {
        return res.status(400).json({
          error: "Hospital ID must be 2 letters followed by 2 numbers, for example AB12"
        });
      }
    }

    if (role === "patient" && !age) {
      return res.status(400).json({
        error: "Age is required"
      });
    }

    const user = {
      id: nextUserId++,
      unique_id: generateUniqueId(role),
      role,
      username,
      password,
      mobile,
      email: email || "",
      age: role === "patient" ? Number(age) : null,
      hospital_name: role !== "patient" ? hospital_name : null,
      hospital_id:
        role !== "patient" ? hospital_id.toUpperCase() : null
    };

    const token = makeToken(user);
    user.token = token;

    users.push(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        unique_id: user.unique_id,
        role: user.role,
        username: user.username,
        hospital_id: user.hospital_id
      }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      error: "Server error during registration"
    });
  }
});


app.post("/api/auth/login", (req, res) => {
  try {
    const { role, username, password } = req.body;

    const user = users.find(
      user =>
        user.role === role &&
        user.username === username &&
        user.password === password
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid username, password, or role"
      });
    }

    const token = makeToken(user);
    user.token = token;

    res.json({
      token,
      user: {
        id: user.id,
        unique_id: user.unique_id,
        role: user.role,
        username: user.username,
        hospital_id: user.hospital_id
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      error: "Server error during login"
    });
  }
});


/* =========================
   PATIENT CASES
   ========================= */

app.post("/api/cases", requireAuth, (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        error: "Only patients can create registrations"
      });
    }

    const {
      patient_name,
      age,
      problem,
      location_status,
      hospital_id
    } = req.body;

    if (
      !patient_name ||
      !age ||
      !problem ||
      !location_status ||
      !hospital_id
    ) {
      return res.status(400).json({
        error: "Please fill all patient registration fields"
      });
    }

    const hospital = hospital_id.toUpperCase();

    const patientCase = {
      id: nextCaseId++,
      patient_id: req.user.unique_id,
      patient_name,
      age: Number(age),
      problem,
      location_status,
      hospital_id: hospital,
      risk_level: null,
      news_score: null,
      status: "registered",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      transferred_to_doctor: false
    };

    cases.push(patientCase);

    res.status(201).json(patientCase);

  } catch (error) {
    console.error("CASE CREATE ERROR:", error);

    res.status(500).json({
      error: "Could not create registration"
    });
  }
});


app.get("/api/cases/my", requireAuth, (req, res) => {
  const result = cases.filter(
    patientCase => patientCase.patient_id === req.user.unique_id
  );

  res.json(result);
});


app.get("/api/cases", requireAuth, (req, res) => {
  if (req.user.role !== "nurse" && req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Access denied"
    });
  }

  let result = cases;

  if (req.user.hospital_id) {
    result = cases.filter(
      patientCase =>
        patientCase.hospital_id === req.user.hospital_id
    );
  }

  res.json(result);
});


/* =========================
   TRIAGE
   ========================= */

app.post("/api/cases/:id/triage", requireAuth, (req, res) => {
  try {
    if (req.user.role !== "nurse") {
      return res.status(403).json({
        error: "Only nurses can perform triage"
      });
    }

    const patientCase = cases.find(
      item => item.id === Number(req.params.id)
    );

    if (!patientCase) {
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

    let score = 0;

    const respiration = Number(rr);
    const oxygen = Number(spo2);
    const bloodPressure = Number(sbp);
    const heartRate = Number(heart_rate);
    const temp = Number(temperature);

    if (respiration <= 8 || respiration >= 25) score += 3;
    else if (respiration >= 21) score += 1;

    if (oxygen <= 91) score += 3;
    else if (oxygen <= 93) score += 2;
    else if (oxygen <= 95) score += 1;

    if (bloodPressure <= 90) score += 3;
    else if (bloodPressure <= 100) score += 2;
    else if (bloodPressure <= 110) score += 1;

    if (heartRate <= 40 || heartRate >= 131) score += 3;
    else if (heartRate >= 111) score += 2;
    else if (heartRate >= 91) score += 1;

    if (consciousness !== "Alert") score += 3;

    if (temp < 35 || temp >= 39.1) score += 3;
    else if (temp >= 38.1) score += 1;

    const currentSettings = hospitalSettings(
      patientCase.hospital_id
    );

    let risk;

    if (score <= currentSettings.low_max) {
      risk = "LOW";
    } else if (score <= currentSettings.medium_max) {
      risk = "MEDIUM";
    } else {
      risk = "HIGH";
    }

    patientCase.news_score = score;
    patientCase.risk_level = risk;
    patientCase.updated_at = new Date().toISOString();

    if (risk === "HIGH") {
      patientCase.transferred_to_doctor = true;
      patientCase.status = "high_alert";
    }

    res.json({
      score,
      risk,
      case: patientCase
    });

  } catch (error) {
    console.error("TRIAGE ERROR:", error);

    res.status(500).json({
      error: "Could not analyze patient"
    });
  }
});


/* =========================
   TRANSFER TO DOCTOR
   ========================= */

app.post("/api/cases/:id/transfer", requireAuth, (req, res) => {
  if (req.user.role !== "nurse") {
    return res.status(403).json({
      error: "Only nurses can transfer patients"
    });
  }

  const patientCase = cases.find(
    item => item.id === Number(req.params.id)
  );

  if (!patientCase) {
    return res.status(404).json({
      error: "Patient not found"
    });
  }

  patientCase.transferred_to_doctor = true;
  patientCase.status = "transferred";
  patientCase.updated_at = new Date().toISOString();

  res.json({
    message: "Patient transferred to doctor",
    case: patientCase
  });
});


/* =========================
   DOCTOR QUEUE
   ========================= */

app.get("/api/doctor/queue", requireAuth, (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Only doctors can access the priority queue"
    });
  }

  const queue = cases
    .filter(
      patientCase =>
        patientCase.hospital_id === req.user.hospital_id &&
        patientCase.transferred_to_doctor
    )
    .sort((a, b) => {
      const riskOrder = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1
      };

      return (
        (riskOrder[b.risk_level] || 0) -
        (riskOrder[a.risk_level] || 0)
      );
    });

  res.json(queue);
});


/* =========================
   CASE STATUS
   ========================= */

app.post("/api/cases/:id/status", requireAuth, (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Only doctors can update patient status"
    });
  }

  const patientCase = cases.find(
    item => item.id === Number(req.params.id)
  );

  if (!patientCase) {
    return res.status(404).json({
      error: "Patient not found"
    });
  }

  patientCase.status = req.body.status;
  patientCase.updated_at = new Date().toISOString();

  res.json(patientCase);
});


/* =========================
   MESSAGES
   ========================= */

app.post("/api/messages", requireAuth, (req, res) => {
  try {
    const { hospital_id, message } = req.body;

    if (!hospital_id || !message) {
      return res.status(400).json({
        error: "Hospital ID and message are required"
      });
    }

    const newMessage = {
      id: nextMessageId++,
      user_id: req.user.id,
      username: req.user.username,
      unique_id: req.user.unique_id,
      hospital_id: hospital_id.toUpperCase(),
      message,
      created_at: new Date().toISOString()
    };

    messages.push(newMessage);

    res.status(201).json(newMessage);

  } catch (error) {
    console.error("MESSAGE ERROR:", error);

    res.status(500).json({
      error: "Could not send message"
    });
  }
});


app.get("/api/messages", requireAuth, (req, res) => {
  if (req.user.role !== "nurse") {
    return res.status(403).json({
      error: "Only nurses can view messages"
    });
  }

  const result = messages.filter(
    message => message.hospital_id === req.user.hospital_id
  );

  res.json(result);
});


/* =========================
   HISTORY
   ========================= */

app.get("/api/history", requireAuth, (req, res) => {
  let result = [];

  if (req.user.role === "patient") {
    result = cases.filter(
      patientCase => patientCase.patient_id === req.user.unique_id
    );
  } else {
    result = cases.filter(
      patientCase =>
        patientCase.hospital_id === req.user.hospital_id
    );
  }

  result.sort(
    (a, b) =>
      new Date(b.updated_at) -
      new Date(a.updated_at)
  );

  res.json(result);
});


/* =========================
   HOSPITAL SETTINGS
   ========================= */

app.get("/api/settings", requireAuth, (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Only doctors can access hospital settings"
    });
  }

  res.json(
    hospitalSettings(req.user.hospital_id)
  );
});


app.put("/api/settings", requireAuth, (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      error: "Only doctors can change hospital settings"
    });
  }

  const {
    low_max,
    medium_max,
    medium_review_minutes
  } = req.body;

  settings[req.user.hospital_id] = {
    low_max: Number(low_max),
    medium_max: Number(medium_max),
    medium_review_minutes: Number(
      medium_review_minutes
    )
  };

  res.json(
    settings[req.user.hospital_id]
  );
});


/* =========================
   SERVE FRONTEND
   IMPORTANT: THIS MUST BE LAST
   ========================= */

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


/* =========================
   START SERVER
   ========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`QTA running on ${PORT}`);
});
