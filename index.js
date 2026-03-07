const express = require("express");
const cors = require("cors");
const fetch = global.fetch;
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const CALENDLY = "https://calendly.com/frogfishconsulting/discovery";

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Frogfish Test</title>
      </head>
      <body style="background:black;color:white;font-family:Arial;padding:40px">
        <h1>Frogfish is live</h1>
        <p>If you can see this, Railway is fine and the bug is inside the big inline script.</p>
      </body>
    </html>
  `);
});

app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...params } = req.body;
  if (!apolloKey) return res.status(400).json({ error: "Missing Apollo API key" });
  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apolloKey },
      body: JSON.stringify({ api_key: apolloKey, ...params }),
    });
    res.json(await r.json());
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
  const { instantlyKey, ...body } = req.body;
  if (!instantlyKey) return res.status(400).json({ error: "Missing Instantly key" });
  try {
    const r = await fetch("https://api.instantly.ai/api/v1/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${instantlyKey}` },
      body: JSON.stringify(body),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frogfish BD Agent running on port ${PORT} 🐸`));
