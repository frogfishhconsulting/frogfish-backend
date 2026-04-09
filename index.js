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
    // Get campaigns
    const campRes = await fetch(`https://api.instantly.ai/api/v1/campaign/list?api_key=${instantlyKey}&limit=10&skip=0`);
    const campaigns = await campRes.json();
    console.log("Campaigns:", JSON.stringify(campaigns).slice(0, 200));
    
    const campList = Array.isArray(campaigns) ? campaigns : (campaigns.data || campaigns.campaigns || []);
    if (!campList.length) return res.json({ error: "No campaigns found in Instantly" });
    
    const campaignId = campList[0].id;
    
    // Add lead to campaign
    const leadRes = await fetch("https://api.instantly.ai/api/v1/lead/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: instantlyKey,
        campaign_id: campaignId,
        email: to,
        personalization: body,
        custom_variables: { subject }
      })
    });
    const leadData = await leadRes.json();
    console.log("Lead add:", JSON.stringify(leadData).slice(0, 200));
    
    if (leadData.status === 'error' || leadData.error) {
      return res.json({ error: leadData.message || leadData.error || JSON.stringify(leadData) });
    }
    res.json({ success: true, data: leadData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
