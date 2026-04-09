const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
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

// Gmail SMTP send
app.post("/send/gmail", async (req, res) => {
  const { gmailUser, gmailPass, to, subject, body } = req.body;
  if (!gmailUser || !gmailPass) return res.status(400).json({ error: "Missing Gmail credentials" });
  if (!to || !subject || !body) return res.status(400).json({ error: "Missing to, subject, or body" });
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });
    await transporter.sendMail({
      from: `"Jared Flanders - Frogfish Consulting" <${gmailUser}>`,
      to: to,
      subject: subject,
      text: body,
      replyTo: gmailUser
    });
    res.json({ success: true, message: `Email sent to ${to}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
