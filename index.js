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
    // Step 1: Search for people
    const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apolloKey },
      body: JSON.stringify(params),
    });
    const searchData = await searchRes.json();
    
    if (!searchData.people || searchData.people.length === 0) {
      return res.json(searchData);
    }

    // Step 2: Enrich each person to get their email
    const enriched = await Promise.all(searchData.people.map(async (person) => {
      if (person.email) return person; // already has email
      try {
        const enrichParams = new URLSearchParams();
        if (person.id) enrichParams.append('id', person.id);
        if (person.first_name) enrichParams.append('first_name', person.first_name);
        if (person.last_name) enrichParams.append('last_name', person.last_name);
        if (person.organization_id) enrichParams.append('organization_id', person.organization_id);
        if (person.organization && person.organization.primary_domain) {
          enrichParams.append('domain', person.organization.primary_domain);
        }
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
      } catch(e) { /* enrichment failed, return person as-is */ }
      return person;
    }));

    res.json({ ...searchData, people: enriched });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/instantly/add-lead", async (req, res) => {
  const { instantlyKey, ...body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const r = await fetch("https://api.instantly.ai/api/v1/lead/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
      body: JSON.stringify(body),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/instantly/send", async (req, res) => {
  const { instantlyKey, to, from, subject, body, replyTo } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    // First get campaigns to find active one
    const campRes = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=5&status=1", {
      headers: { "Authorization": `Bearer ${instantlyKey}` }
    });
    const campData = await campRes.json();
    const campaigns = campData.items || campData || [];
    
    if(campaigns.length > 0) {
      // Add lead to campaign
      const campaignId = campaigns[0].id;
      const leadRes = await fetch("https://api.instantly.ai/api/v2/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
        body: JSON.stringify({
          campaign_id: campaignId,
          email: to,
          personalization: body,
          variables: { subject: subject }
        })
      });
      const leadData = await leadRes.json();
      res.json({ success: true, method: 'campaign', data: leadData });
    } else {
      // No active campaign - try direct send
      const r = await fetch("https://api.instantly.ai/api/v1/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
        body: JSON.stringify({ to, from, subject, body, replyTo }),
      });
      const data = await r.json();
      res.json(data);
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/apollo/search-enrich", async (req, res) => {
  const { apolloKey, email, domain, name } = req.body;
  if (!apolloKey) return res.status(400).json({ error: "Missing Apollo API key" });
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (domain) params.append('domain', domain);
    if (name) params.append('name', name);
    params.append('reveal_personal_emails', 'false');
    params.append('reveal_phone_number', 'false');
    const r = await fetch(`https://api.apollo.io/api/v1/people/match?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apolloKey },
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
