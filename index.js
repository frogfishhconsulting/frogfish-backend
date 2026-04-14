const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Gmail OAuth flow
app.get("/auth/gmail", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://frogfish-backend-production.up.railway.app/auth/gmail/callback";
  const scope = "https://www.googleapis.com/auth/gmail.readonly";
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

app.get("/auth/gmail/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code received");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://frogfish-backend-production.up.railway.app/auth/gmail/callback",
        grant_type: "authorization_code"
      })
    });
    const tokens = await tokenRes.json();
    if (tokens.error) return res.status(400).send("Token error: " + tokens.error_description);
    // Store tokens in memory (persists until Railway restarts)
    global.gmailTokens = tokens;
    global.gmailTokenExpiry = Date.now() + (tokens.expires_in * 1000);
    console.log("Gmail connected successfully");
    res.send(`<html><body style="font-family:monospace;background:#0a0f0d;color:#4ade80;padding:40px;text-align:center">
      <h2>✓ Gmail Connected</h2>
      <p>You can close this tab and return to the dashboard.</p>
      <script>setTimeout(function(){ window.close(); }, 2000);</script>
    </body></html>`);
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});

// Get fresh access token using refresh token
async function getAccessToken() {
  if (!global.gmailTokens) return null;
  if (Date.now() < global.gmailTokenExpiry - 60000) return global.gmailTokens.access_token;
  // Refresh
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: global.gmailTokens.refresh_token,
      grant_type: "refresh_token"
    })
  });
  const tokens = await res.json();
  global.gmailTokens.access_token = tokens.access_token;
  global.gmailTokenExpiry = Date.now() + (tokens.expires_in * 1000);
  return tokens.access_token;
}

// Check Gmail for replies to sent emails
app.post("/gmail/check-replies", async (req, res) => {
  const { sentEmails } = req.body; // array of {email, subject, sentAt}
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
      if (data.messages && data.messages.length > 0) {
        replies.push({ email: sent.email, messageId: data.messages[0].id });
      }
    }
    res.json({ connected: true, replies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/gmail/status", (req, res) => {
  res.json({ connected: !!global.gmailTokens });
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    res.json({ text, domain });
  } catch (e) {
    res.json({ text: '', domain, error: e.message });
  }
});

app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, to, subject, body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const headers = { "Authorization": `Bearer ${instantlyKey}`, "Content-Type": "application/json" };
    const campRes = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=10", { headers });
    const campData = await campRes.json();
    console.log("campaigns:", JSON.stringify(campData).slice(0, 300));
    const campList = campData.items || (Array.isArray(campData) ? campData : []);
    if (!campList.length) return res.json({ error: "No campaigns found. Check API key has campaigns:all scope." });
    const campaignId = campList[0].id;
    const leadRes = await fetch("https://api.instantly.ai/api/v2/leads/add", {
      method: "POST",
      headers,
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: [{ email: to, personalization: body, custom_variables: { subject: String(subject) } }]
      })
    });
    const leadData = await leadRes.json();
    console.log("lead result:", JSON.stringify(leadData).slice(0, 300));
    if (leadData.error) return res.json({ error: JSON.stringify(leadData.error) });
    if (leadData.leads_uploaded === 0) return res.json({ error: "Lead not uploaded - " + JSON.stringify(leadData) });
    res.json({ success: true, campaign: campaignId, result: leadData });
  } catch (e) {
    console.error("Instantly error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/webhook/instantly", async (req, res) => {
  const event = req.body;
  if (!global.webhookEvents) global.webhookEvents = [];
  global.webhookEvents.unshift({ ...event, receivedAt: new Date().toISOString() });
  global.webhookEvents = global.webhookEvents.slice(0, 100);
  res.json({ received: true });
});

app.get("/webhook/events", (req, res) => {
  res.json(global.webhookEvents || []);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
