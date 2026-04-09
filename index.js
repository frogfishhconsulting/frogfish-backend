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
    // Step 1: Get campaigns list - try both auth methods
    const campRes = await fetch(`https://api.instantly.ai/api/v1/campaign/list?api_key=${instantlyKey}&limit=10&skip=0`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const campData = await campRes.json();
    console.log("Campaigns response:", JSON.stringify(campData).slice(0, 300));
    
    const campaigns = Array.isArray(campData) ? campData : (campData.data || campData.campaigns || campData.items || []);
    
    if(campaigns.length > 0) {
      // Step 2: Add lead to first active campaign
      const campaignId = campaigns[0].id;
      console.log("Adding lead to campaign:", campaignId);
      
      const leadRes = await fetch("https://api.instantly.ai/api/v1/lead/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: instantlyKey,
          campaign_id: campaignId,
          email: to,
          first_name: to.split('@')[0],
          last_name: '',
          custom_variables: {
            subject: subject,
            email_body: body
          }
        })
      });
      const leadData = await leadRes.json();
      console.log("Lead add response:", JSON.stringify(leadData).slice(0, 200));
      
      if(leadData.error || leadData.status === 'error') {
        res.json({ error: leadData.error || leadData.message || JSON.stringify(leadData) });
      } else {
        res.json({ success: true, method: 'campaign_lead', campaign: campaignId, data: leadData });
      }
    } else {
      // No campaigns found - return helpful error
      res.json({ error: "No campaigns found in Instantly. Create a campaign first at app.instantly.ai" });
    }
  } catch (e) { 
    console.error("Instantly send error:", e.message);
    res.status(500).json({ error: e.message }); 
  }
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

app.post("/research/company", async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: "Missing domain" });
  try {
    // Fetch homepage
    const url = domain.startsWith('http') ? domain : 'https://' + domain;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await r.text();
    // Extract text content - strip tags, get first 2000 chars
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    res.json({ text, domain });
  } catch (e) {
    res.json({ text: '', domain, error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT}`));
