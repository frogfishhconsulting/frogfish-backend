const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// PostgreSQL connection - graceful fallback if not available
let pool = null;
try {
  const { Pool } = require("pg");
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log("PostgreSQL pool created");
  } else {
    console.log("No DATABASE_URL - using memory storage only");
  }
} catch(e) {
  console.log("pg not available:", e.message);
}

// Initialize DB table
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Also use settings table for sentlog and seen emails (stored as JSON)
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
  if (!pool) return res.json({ saved: true, note: "no db" });
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
  if (!pool) return res.json({ keys: {} });
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
  const scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";
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
    for (const sent of (sentEmails || []).slice(0, 50)) {
      const query = `from:${sent.email} in:inbox`;
      const searchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=3`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await searchRes.json();
      if (data.messages && data.messages.length > 0) {
        // Fetch the actual message content
        for (const msg of data.messages) {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const msgData = await msgRes.json();
          // Extract subject and body
          const headers = msgData.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || sent.email;
          const date = headers.find(h => h.name === 'Date')?.value || '';
          // Get body text
          let body = '';
          const parts = msgData.payload?.parts || [msgData.payload];
          for (const part of parts) {
            if (part?.mimeType === 'text/plain' && part?.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8').slice(0, 500);
              break;
            }
          }
          if (!body && msgData.payload?.body?.data) {
            body = Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8').slice(0, 500);
          }
          replies.push({ 
            email: sent.email, 
            company: sent.company,
            contact: sent.contact,
            messageId: msg.id,
            subject, from, date,
            body: body.trim(),
            threadId: msgData.threadId
          });
        }
      }
    }
    res.json({ connected: true, replies });
  } catch(e) { 
    console.error("Reply check error:", e.message);
    res.status(500).json({ error: e.message }); 
  }
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

app.post("/search/audit", async (req, res) => {
  const { company, niche, city } = req.body;
  try {
    const nicheLabel = niche === 'legal' ? 'personal injury attorney' : niche === 'home' ? 'home services company' : 'financial advisor';
    const query = city ? `${nicheLabel} ${city}` : nicheLabel;
    // Use DuckDuckGo HTML search - more scrape friendly than Google
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(10000)
    });
    const html = await r.text();
    const companyLower = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyWords = company.toLowerCase().split(' ').filter(w => w.length > 3);
    const found = companyWords.some(word => html.toLowerCase().includes(word));
    // Extract result titles from DDG HTML
    const titleMatches = [...html.matchAll(/class="result__title"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/gs)]
      .map(m => m[1].replace(/&amp;/g,'&').replace(/&#x27;/g,"'").trim())
      .filter(t => t.length > 3 && t.length < 80);
    // Filter out ad-style titles (no fees, free, call now, etc.)
    const adPatterns = ['no fee', 'no upfront', 'free case', 'free consult', 'call now', 'call today', 'speak to', 'talk to', 'get paid', 'largest ', 'dominating', 'top 10', 'best ', 'find a', 'near me', 'find an', 'state bar', 'attorney at'];
    // Try to extract domains from DDG result URLs
    const domainMatches = [...html.matchAll(/result__url[^>]*>\s*([^<\s]+)/g)]
      .map(m => m[1].trim().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, ''))
      .filter(d => d.length > 4 && d.includes('.') && !['google','bing','yahoo','yelp','wikipedia','facebook','linkedin'].some(s => d.includes(s)))
      .filter(d => !companyWords.some(w => d.toLowerCase().includes(w)));
    const filteredTitles = titleMatches
      .filter(t => !companyWords.some(w => t.toLowerCase().includes(w)))
      .filter(t => !adPatterns.some(p => t.toLowerCase().includes(p)))
      .filter(t => /[A-Z]/.test(t) && t.split(' ').length >= 2 && t.split(' ').length <= 6)
      .slice(0, 2);
    const topCompetitors = domainMatches.length >= 2 ? domainMatches.slice(0,2) : filteredTitles;
    console.log(`Search audit for ${company} in ${city}: found=${found}, competitors=${topCompetitors.join(', ')}`);
    res.json({ found, query, topCompetitors, totalResults: titleMatches.length });
  } catch(e) {
    console.error('Search audit error:', e.message);
    res.status(500).json({ error: e.message });
  }
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

// Helper to send a single Gmail message
async function sendGmailMessage(to, subject, body) {
  const token = await getAccessToken();
  const emailLines = [
    `From: Jared Flanders <jared@frogfishconsulting.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body
  ];
  const raw = Buffer.from(emailLines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  return await sendRes.json();
}

// Schedule follow-up emails using setTimeout (persisted via DB)
async function scheduleFollowUps(to, subject, firstName, niche) {
  const nicheLabel = niche === 'legal' ? 'law firms' : niche === 'home' ? 'home service companies' : 'financial firms';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const followUp2 = `${greeting}\n\nJust wanted to make sure my last note didn't get buried.\n\nShort version: I help ${nicheLabel} figure out which ad campaigns are actually driving closed business — not just leads. Happy to show you what we've built.\n\nJared\nFrogfish Consulting`;
  const followUp3 = `${greeting}\n\nLast one from me — if the timing isn't right, no worries.\n\nIf you ever want to know how your firm shows up when someone searches in ChatGPT or Google AI, happy to run that free. Just reply and I'll send it over.\n\nJared\nFrogfish Consulting`;

  // Save follow-ups to DB
  if (pool) {
    try {
      const followUpData = JSON.stringify({ to, subject, firstName, niche, followUp2, followUp3, sentAt: new Date().toISOString() });
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [`followup_${to.replace('@','_at_').replace(/\./g,'_')}`, followUpData]
      );
    } catch(e) { console.error('Failed to save follow-up:', e.message); }
  }

  // Schedule in memory (4 days and 8 days)
  const day4 = 4 * 24 * 60 * 60 * 1000;
  const day8 = 8 * 24 * 60 * 60 * 1000;
  setTimeout(async () => {
    if (!global.gmailTokens) return;
    try {
      await sendGmailMessage(to, 'Re: ' + subject, followUp2);
      console.log(`Follow-up 1 sent to ${to}`);
    } catch(e) { console.error('Follow-up 1 failed:', e.message); }
  }, day4);
  setTimeout(async () => {
    if (!global.gmailTokens) return;
    try {
      await sendGmailMessage(to, 'Re: ' + subject, followUp3);
      console.log(`Follow-up 2 sent to ${to}`);
    } catch(e) { console.error('Follow-up 2 failed:', e.message); }
  }, day8);
}

app.post("/gmail/send", async (req, res) => {
  const { to, subject, body, firstName, company, niche } = req.body;
  if (!global.gmailTokens) return res.status(400).json({ error: "Gmail not connected. Go to Settings and connect Gmail first." });
  try {
    const sendData = await sendGmailMessage(to, subject, body);
    if (sendData.error) return res.status(400).json({ error: sendData.error.message });
    console.log(`Gmail sent to ${to}: ${sendData.id}`);
    // Schedule follow-ups
    await scheduleFollowUps(to, subject, firstName, niche);
    res.json({ success: true, messageId: sendData.id });
  } catch(e) {
    console.error('Gmail send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, to, subject, body, firstName, company, niche } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const headers = { "Authorization": `Bearer ${instantlyKey}`, "Content-Type": "application/json" };
    const campRes = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=10", { headers });
    const campData = await campRes.json();
    const campList = campData.items || (Array.isArray(campData) ? campData : []);
    if (!campList.length) return res.json({ error: "No campaigns found." });
    const campaignId = campList[0].id;

    // Build follow-up sequence personalization
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const nicheLabel = niche === 'legal' ? 'law firms' : niche === 'home' ? 'home service companies' : 'financial firms';
    const followUp2 = `${greeting}

Just wanted to make sure my last note didn't get buried.

The short version: I help ${nicheLabel} figure out which ad campaigns are actually driving closed business — not just leads. First month free to prove it.

Worth a quick call?
${process.env.CALENDLY || 'https://calendly.com/frogfishconsulting/discovery'}

Jared
Frogfish Consulting`;
    const followUp3 = `${greeting}

Last one from me — if the timing isn't right, totally understand.

If you ever want to know how your firm shows up when someone asks ChatGPT or Google AI for help in your area, I'm happy to run that for free, no call needed.

Just reply "audit" and I'll send it over.

Jared
Frogfish Consulting`;

    const leadRes = await fetch("https://api.instantly.ai/api/v2/leads/add", {
      method: "POST", headers,
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: [{
          email: to,
          personalization: body,
          custom_variables: {
            subject: String(subject),
            follow_up_2: followUp2,
            follow_up_3: followUp3
          }
        }]
      })
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

// Backend scheduler - runs autonomous scan at set time
let schedulerInterval = null;
let schedulerConfig = { enabled: false, time: '08:00', lastRun: null };

// Save/load scheduler config from DB
async function saveSchedulerConfig() {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ['scheduler_config', JSON.stringify(schedulerConfig)]
    );
  } catch(e) { console.error("Scheduler save error:", e.message); }
}

async function loadSchedulerConfig() {
  if (!pool) return;
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'scheduler_config'");
    if (result.rows.length > 0) {
      schedulerConfig = JSON.parse(result.rows[0].value);
      if (schedulerConfig.enabled) startScheduler();
      console.log("Scheduler config loaded:", schedulerConfig);
    }
  } catch(e) { console.error("Scheduler load error:", e.message); }
}

function startScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  schedulerInterval = setInterval(async () => {
    if (!schedulerConfig.enabled) return;
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const today = now.toDateString();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const endDate = schedulerConfig.endDate ? new Date(schedulerConfig.endDate) : null;
    const pastEndDate = endDate && now > endDate;
    if (timeStr === schedulerConfig.time && schedulerConfig.lastRun !== today && isWeekday && !pastEndDate) {
      console.log("Scheduler firing at", timeStr);
      schedulerConfig.lastRun = today;
      await saveSchedulerConfig();
      global.schedulerTriggered = { time: new Date().toISOString() };
    } else if (pastEndDate && schedulerConfig.enabled) {
      console.log("Scheduler end date reached - pausing autonomous mode");
      schedulerConfig.enabled = false;
      await saveSchedulerConfig();
      if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
    }
  }, 60000);
  console.log("Scheduler started, will fire daily at", schedulerConfig.time);
}

// Scheduler API endpoints
app.post("/scheduler/config", async (req, res) => {
  const { enabled, time } = req.body;
  schedulerConfig.enabled = enabled;
  if (time) schedulerConfig.time = time;
  if (req.body.endDate) schedulerConfig.endDate = req.body.endDate;
  if (enabled) startScheduler();
  else if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
  await saveSchedulerConfig();
  res.json({ saved: true, config: schedulerConfig });
});

app.get("/scheduler/status", (req, res) => {
  const triggered = global.schedulerTriggered;
  if (triggered) global.schedulerTriggered = null; // consume it
  res.json({ config: schedulerConfig, triggered });
});

// Load scheduler on startup
loadSchedulerConfig();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
