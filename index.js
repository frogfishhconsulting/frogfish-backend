const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

// ─── Apollo: Search People ───────────────────────────────────────────────────
app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...searchParams } = req.body;
  if (!apolloKey) return res.status(400).json({ error: "Missing Apollo API key" });

  try {
    const response = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apolloKey,
      },
      body: JSON.stringify({ api_key: apolloKey, ...searchParams }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Instantly: Add Lead to Campaign ─────────────────────────────────────────
app.post("/instantly/add-lead", async (req, res) => {
  const { instantlyKey, ...leadData } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly API key" });

  try {
    const response = await fetch("https://api.instantly.ai/api/v1/lead/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instantlyKey}`,
      },
      body: JSON.stringify(leadData),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Instantly: Get Campaigns ─────────────────────────────────────────────────
app.post("/instantly/campaigns", async (req, res) => {
  const { instantlyKey } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly API key" });

  try {
    const response = await fetch("https://api.instantly.ai/api/v1/campaign/list?limit=20&skip=0", {
      method: "GET",
      headers: { "Authorization": `Bearer ${instantlyKey}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Instantly: Send Email ────────────────────────────────────────────────────
app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, ...emailData } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly API key" });

  try {
    const response = await fetch("https://api.instantly.ai/api/v1/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instantlyKey}`,
      },
      body: JSON.stringify(emailData),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Frogfish BD Agent backend is running 🐸", version: "1.0.0" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish server running on port ${PORT}`));
