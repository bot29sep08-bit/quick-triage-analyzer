const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Store data temporarily
const users = [];
const patients = [];
const nurses = [];
const doctors = [];

app.use(express.json());
app.use(express.static(__dirname));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Quick Triage Analyzer backend is running"
  });
});

// Register user
app.post("/api/register", (req, res) => {
  try {
    const {
      username,
      password,
      mobile,
      email,
      age,
      role
    } = req.body;

    if (!username || !password || !mobile || !age) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields."
      });
    }

    const user = {
      id: Date.now().toString(),
      username,
      password,
      mobile,
      email: email || "",
      age,
      role: role || "patient",
      createdAt: new Date().toISOString()
    };

    users.push(user);

    res.json({
      success: true,
      message: "Account created successfully!",
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating account."
    });
  }
});

// Login
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login."
    });
  }
});

// Get all users
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      mobile: user.mobile,
      email: user.email,
      age: user.age,
      role: user.role
    }))
  });
});

// Important: serve the main website
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`QTA running on ${PORT}`);
});
