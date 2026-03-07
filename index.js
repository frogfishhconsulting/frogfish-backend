const express = require("express");
const cors = require("cors");

const fetch = global.fetch;

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/anthropic/generate", async (req, res) => {
  const { anthropicKey, prompt } = req.body;

  if (!anthropicKey) {
    return res.status(400).json({ error: "Missing Anthropic API key" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": anthropicKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...params } = req.body;

  if (!apolloKey) {
    return res.status(400).json({ error: "Missing Apollo API key" });
  }

  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apolloKey
      },
      body: JSON.stringify(params)
    });

    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/apollo/search", async (req, res) => {
  const { apolloKey, ...params } = req.body;

  if (!apolloKey) {
    return res.status(400).json({ error: "Missing Apollo API key" });
  }

  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apolloKey
      },
      body: JSON.stringify(params)
    });

    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Frogfish BD Agent running on port ${PORT}`);
});
