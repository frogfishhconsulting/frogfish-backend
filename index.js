const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize DB table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Restore gmail tokens from DB
    const result = await pool.query("SELECT value FROM settings WHERE key = 'gmail_tokens'");
    if (result.rows.length > 0) {
      const tokens = JSON.parse(result.rows[0].value);
      global.gmailTokens = tokens;
      global.gmailTokenExpiry = Date.now() + 3500000; // ~1hr, will refresh on next use
      console.log("Gmail tokens restored from DB");
    }
    console.log("DB initialized");
  } catch(e) {
    console.error("DB init error:", e.message);
  }
}
initDB();

// Save keys to DB
app.post("/settings/save", async (req, res) => {
  const { keys } = req.body;
  if (!keys) return res.status(400).json({ error: "No keys provided" });
  try {
    for (const [key, value] of Object.entries(keys)) {
      if (value) {
        await pool.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
    }
    res.json({ saved: true });
  } catch(e) {
    console.error("Save error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Load keys from DB
app.get("/settings/load", async (req, res) => {
  try {
    const result = await pool.query("SELECT key, value FROM settings");
    const keys = {};
    result.rows.forEach(row => { keys[row.key] = row.value; });
    res.json({ keys });
  } catch(e) {
    console.error("Load error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Gmail OAuth
app.get("/auth/gmail", (req, res) => {
  const clientId = req.query.clientId || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(400).send("Missing Google Client ID. Add it in Settings.");
  const redirectUri = "https://frogfish-backend-production.up.railway.app/auth/gmail/callback";
  const scope = "https://www.googleapis.com/auth/gmail.readonly";
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(clientId)}`;
  res.redirect(url);
});

app.get("/auth/gmail/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code received");
  const clientId = state || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = global.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) return res.status(400).send("Missing Google Client Secret.");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: "https://frogfish-backend-production.up.railway.app/auth/gmail/callback",
        grant_type: "authorization_code" })
    });
    const tokens = await tokenRes.json();
    if (tokens.error) return res.status(400).send("Token error: " + tokens.error_description);
    global.gmailTokens = tokens;
    global.gmailTokenExpiry = Date.now() + (tokens.expires_in * 1000);
    // Persist tokens to DB
    try {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        ['gmail_tokens', JSON.stringify(tokens)]
      );
    } catch(e) { console.error("Failed to save gmail tokens:", e.message); }
    console.log("Gmail connected");
    res.send(`<html><body style="font-family:monospace;background:#0a0f0d;color:#4ade80;padding:40px;text-align:center">
      <h2>✓ Gmail Connected</h2><p>You can close this tab.</p>
      <script>setTimeout(function(){ window.close(); }, 2000);</script>
    </body></html>`);
  } catch(e) { res.status(500).send("Error: " + e.message); }
});

async function getAccessToken() {
  if (!global.gmailTokens) return null;
  if (Date.now() < global.gmailTokenExpiry - 60000) return global.gmailTokens.access_token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: global.googleClientId || process.env.GOOGLE_CLIENT_ID,
      client_secret: global.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: global.gmailTokens.refresh_token,
      grant_type: "refresh_token"
    })
  });
  const tokens = await res.json();
  global.gmailTokens.access_token = tokens.access_token;
  global.gmailTokenExpiry = Date.now() + (tokens.expires_in * 1000);
  return tokens.access_token;
}

app.post("/gmail/check-replies", async (req, res) => {
  const { sentEmails } = req.body;
  if (!global.gmailTokens) return res.json({ connected: false });
  try {
    const token = await getAccessToken();
    const replies = [];
    for (const sent of (sentEmails || []).slice(0, 20)) {
      const query = `from:${sent.email} in:inbox`;
      const searchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await searchRes.json();
      if (data.messages && data.messages.length > 0) replies.push({ email: sent.email });
    }
    res.json({ connected: true, replies });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/gmail/status", (req, res) => {
  res.json({ connected: !!global.gmailTokens });
});

app.post("/gmail/save-credentials", (req, res) => {
  const { clientSecret } = req.body;
  if (clientSecret) global.googleClientSecret = clientSecret;
  res.json({ saved: true });
});

app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...params } = req.body;
  if (!apolloKey) return res.status(400).json({ error: "Missing Apollo API key" });
  try {
    const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apolloKey },
      body: JSON.stringify(params),
    });
    const searchData = await searchRes.json();
    if (!searchData.people || searchData.people.length === 0) return res.json(searchData);
    const enriched = await Promise.all(searchData.people.map(async (person) => {
      if (person.email) return person;
      try {
        const enrichParams = new URLSearchParams();
        if (person.id) enrichParams.append('id', person.id);
        if (person.first_name) enrichParams.append('first_name', person.first_name);
        if (person.last_name) enrichParams.append('last_name', person.last_name);
        if (person.organization && person.organization.primary_domain) enrichParams.append('domain', person.organization.primary_domain);
        enrichParams.append('reveal_personal_emails', 'false');
        enrichParams.append('reveal_phone_number', 'false');
        const enrichRes = await fetch("https://api.apollo.io/api/v1/people/match?" + enrichParams.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apolloKey },
        });
        const enrichData = await enrichRes.json();
        if (enrichData.person && enrichData.person.email) {
          return { ...person, email: enrichData.person.email, first_name: enrichData.person.first_name || person.first_name, last_name: enrichData.person.last_name || person.last_name };
        }
      } catch(e) {}
      return person;
    }));
    res.json({ ...searchData, people: enriched });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/research/company", async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: "Missing domain" });
  try {
    const url = domain.startsWith('http') ? domain : 'https://' + domain;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    res.json({ text, domain });
  } catch(e) { res.json({ text: '', domain, error: e.message }); }
});

app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, to, subject, body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const headers = { "Authorization": `Bearer ${instantlyKey}`, "Content-Type": "application/json" };
    const campRes = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=10", { headers });
    const campData = await campRes.json();
    const campList = campData.items || (Array.isArray(campData) ? campData : []);
    if (!campList.length) return res.json({ error: "No campaigns found." });
    const campaignId = campList[0].id;
    const leadRes = await fetch("https://api.instantly.ai/api/v2/leads/add", {
      method: "POST", headers,
      body: JSON.stringify({ campaign_id: campaignId, leads: [{ email: to, personalization: body, custom_variables: { subject: String(subject) } }] })
    });
    const leadData = await leadRes.json();
    if (leadData.error) return res.json({ error: JSON.stringify(leadData.error) });
    if (leadData.leads_uploaded === 0) return res.json({ error: "Lead not uploaded - " + JSON.stringify(leadData) });
    res.json({ success: true, campaign: campaignId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/webhook/instantly", (req, res) => {
  if (!global.webhookEvents) global.webhookEvents = [];
  global.webhookEvents.unshift({ ...req.body, receivedAt: new Date().toISOString() });
  global.webhookEvents = global.webhookEvents.slice(0, 100);
  res.json({ received: true });
});

app.get("/webhook/events", (req, res) => {
  res.json(global.webhookEvents || []);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
