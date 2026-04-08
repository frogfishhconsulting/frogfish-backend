const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const CALENDLY = "https://calendly.com/frogfishconsulting/discovery";

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Frogfish BD Agent 🐸</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Mono','Courier New',monospace;background:#0a0f0d;color:#e2ffe8;min-height:100vh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0f0d}::-webkit-scrollbar-thumb{background:#1a5c2e;border-radius:2px}
.header{border-bottom:1px solid #1a3320;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;background:#060c08;position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:16px}.logo-icon{width:32px;height:32px;background:#1a5c2e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px}
.logo-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#4ade80;letter-spacing:.05em}.logo-sub{font-size:9px;colo
