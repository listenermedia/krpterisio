

Krpterisio – Website Vulnerability & Security Intelligence Platform

🚨 Problem Statement

Modern web applications are increasingly complex, using SPAs, microservices, and multiple APIs. This has significantly expanded the attack surface, making them vulnerable to threats such as:

Cross-Site Scripting (XSS)
Server-Side Request Forgery (SSRF)
API misconfigurations
Broken authentication

Existing tools like OWASP ZAP and Burp Suite often:

Generate high false positives
Lack real-world context
Provide generic fixes instead of actionable solutions
Require deep security expertise

👉 There is a need for an intelligent, developer-friendly security platform that not only detects vulnerabilities but also explains and fixes them.

💡 Project Description

Krpterisio is an AI-powered cybersecurity platform that combines:

🔍 Stealth Web Crawling (via Puppeteer)
🌐 Real-time Network Interception (CDP + Socket.io)
🤖 AI-driven Vulnerability Analysis
💻 In-browser Terminal Interface (xterm.js)
⚙️ How it works:
User inputs a target URL
The stealth crawler scans the website like a real user
Network traffic, APIs, and source code are intercepted
Data is streamed live to the dashboard
AI analyzes vulnerabilities and generates:
Risk explanations
Business impact
Secure code fixes
🚀 What makes it useful:
Real-time scanning (not static reports)
AI explains vulnerabilities in plain English
Provides ready-to-use code fixes
No local setup required
Works directly in browser
🤖 Google AI Usage
🔧 Tools / Models Used
Google Gemini 2.0 Flash (via @google/genai SDK)
🧠 How Google AI Was Used

Google AI is the core intelligence layer of Krpterisio.

It is used for:

🔍 Analyzing Network Requests
Detects insecure headers, tokens, exposed APIs
📜 Source Code Analysis
Scans JavaScript bundles for secrets, vulnerabilities
⚠️ Risk Evaluation
Predicts real-world impact (data leak, account takeover, etc.)
🛠 Code Remediation
Generates secure, production-ready code fixes
💬 Conversational Security Assistant
Users can interact with AI in terminal:


HOSTED LINK: https://krpterisio-942182867605.us-central1.run.app/
