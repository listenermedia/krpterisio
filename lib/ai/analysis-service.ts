import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.0-flash";

const systemInstruction = `You are an Agent AI Bot of 'Krpterisio'.
You are 'Deep Techno' from the secret world, an expert security researcher and penetration tester.
Developed as part of project Krpterisio.
Analyze the provided source code for vulnerabilities. Focus on:
1. Hardcoded credentials, API keys, or secrets.
2. Hidden admin panels or bypass routes.
3. Insecure data handling or storage.
4. XSS, Injection points, or other common JS vulnerabilities.
Deeply search for hidden vulnerabilities that a hacker can exploit.`;

const chatSystemInstruction = `You are 'Deep Techno', an elite AI security agent from the secret world.
You were developed for the Krpterisio project.
You have FULL ACCESS to real-time scan data and can EXECUTE ACTIONS on behalf of the user.

You MUST respond with valid JSON in this exact format:
{
  "response": "Your text response here (supports markdown)",
  "actions": []
}

AVAILABLE ACTIONS you can include in the actions array:
1. {"type": "browse_external", "url": "https://example.com"} — Opens a URL in a NEW browser tab (use ONLY if user explicitly says "open in browser" or "new tab")
2. {"type": "start_scan", "url": "https://example.com"} — Sets the target system URL in the search box and starts a scan (DEFAULT for "open this link", "scan this", "go to this site")
3. {"type": "switch_tab", "tab": "network"} — Switches view to: dashboard, findings, network, or settings
4. {"type": "inject_js", "code": "console.log('test')"} — Injects and executes JavaScript in the target page
5. {"type": "execute_curl", "command": "curl -I https://example.com"} — Executes a curl command on the server
6. {"type": "generate_report"} — Synthesizes a full technical security report for the CURRENT scan session.

WHEN TO USE EACH ACTION:
- "open the link X" or "go to X" or "scan X" or "analyze X" → ALWAYS use start_scan action
- "open in new tab" or "open in browser" → use browse_external action
- "show me network requests" or "go to findings" or "open console" → use switch_tab action
- "inject script to X" or "run this code: X" or "change background to red" → use inject_js action
  *Technical Tip for inject_js:* For visual changes (background/colors), injecting a global style tag is most reliable as it applies to all elements. Example:
  \`const style = document.createElement('style'); style.innerHTML = '* { background: black !important; color: #00ff41 !important; }'; document.head.appendChild(style);\`
  Check the console logs context to verify execution. \`RESULT: undefined\` is normal for these calls.
- "send a curl to X" or "test this endpoint" or "check site headers" → use execute_curl action
  *Technical Tip for execute_curl:* Use flags like \`-I\` for headers, \`-L\` for redirects, or \`-X POST -d 'data'\` for API testing. Resulting output will appear in the system terminal.
- "generate a report" or "create a security summary" or "build technical report" → ALWAYS use generate_report action.
  *CRITICAL WARNING:* When using generate_report, do NOT include the report content in the JSON "response" field. Only confirm that the report is being generated.
- If user just asks questions, return response only with empty actions array

Your analysis capabilities:
1. **Scan Analysis**: Analyze ALL findings — explain each vulnerability, severity, impact, and fixes.
2. **Network Analysis**: Analyze URLs, methods, status codes, and RESPONSE BODIES. Extract API endpoints, data structures, tokens.
3. **Response Analysis**: Deeply analyze JSON/HTML structure, identify sensitive data, API keys, user data patterns.
4. **Source Analysis**: List source files organized by type, identify interesting ones.
5. **Console Analysis**: Review browser console logs (errors, warnings, logs) to understand execution flow or find vulnerabilities like XSS.
6. **URL Extraction**: Format found URLs as clickable markdown links.
7. **General Knowledge**: When no scan is running, answer security questions and help users.

Response formatting:
- Use markdown with tables, code blocks, and lists
- When listing network requests, use tables
- Format found URLs as: [text](url)
- Be technical and detailed. Reference specific data from the context.
- When executing an action, confirm what you're doing in the response text.

CRITICAL: Always respond with valid JSON. The response field supports full markdown.`;

// Safety settings OFF as requested
const safetySettings = [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }
] as any;

export interface AnalysisResult {
    vulnerability: string;
    explanation: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
    fix: string;
    lines?: string;
    file?: string;
}

export class AnalysisService {
    async analyzeSourceCode(code: string, fileName: string): Promise<AnalysisResult[]> {
        if (!process.env.GEMINI_API_KEY) {
            return [{
                vulnerability: "AI Analysis Disabled",
                explanation: "GEMINI_API_KEY is missing in .env file.",
                severity: "INFO",
                fix: "Add your Gemini API key to the .env file to enable source code analysis.",
                file: fileName
            }];
        }

        try {
            const prompt = `File: ${fileName}\n\nCode:\n${code.substring(0, 30000)}`;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 1,
                    topP: 0.95,
                    maxOutputTokens: 65535,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                vulnerability: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] },
                                fix: { type: Type.STRING },
                                lines: { type: Type.STRING, nullable: true }
                            },
                            required: ["vulnerability", "explanation", "severity", "fix"]
                        }
                    }
                }
            });

            const content = response.text;
            if (!content) return [];

            const parsed = JSON.parse(content);
            const results = Array.isArray(parsed) ? parsed : (parsed.vulnerabilities || Object.values(parsed)[0]);
            return results.map((r: any) => ({ ...r, file: fileName }));

        } catch (error) {
            console.error("AI Analysis Error:", error);
            return [{
                vulnerability: "Analysis Failed",
                explanation: "The AI service encountered an error while processing the code.",
                severity: "INFO",
                fix: "Check your API quota and network connection.",
                file: fileName
            }];
        }
    }

    async analyzeBulkSourceCode(files: { url: string, content: string, fileName: string }[]): Promise<AnalysisResult[]> {
        if (!process.env.GEMINI_API_KEY) {
            return [{
                vulnerability: "AI Analysis Disabled",
                explanation: "GEMINI_API_KEY is missing in .env file.",
                severity: "INFO",
                fix: "Add your Gemini API key to the .env file to enable source code analysis.",
                file: "Multiple Files"
            }];
        }

        try {
            let combinedCodePrompt = "Analyze the following project files:\n\n";
            for (const file of files) {
                combinedCodePrompt += `--- FILE: ${file.fileName} (${file.url}) ---\n`;
                combinedCodePrompt += `${file.content.substring(0, 15000)}\n\n`;
            }

            const response = await ai.models.generateContent({
                model: model,
                contents: combinedCodePrompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 1,
                    topP: 0.95,
                    maxOutputTokens: 65535,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                vulnerability: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] },
                                fix: { type: Type.STRING },
                                lines: { type: Type.STRING, nullable: true },
                                file: { type: Type.STRING, description: "The fileName exactly as provided in the prompt where this vulnerability was found" }
                            },
                            required: ["vulnerability", "explanation", "severity", "fix", "file"]
                        }
                    }
                }
            });

            const content = response.text;
            if (!content) return [];

            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : (parsed.vulnerabilities || Object.values(parsed)[0]);

        } catch (error) {
            console.error("AI Bulk Analysis Error:", error);
            return [{
                vulnerability: "Bulk Analysis Failed",
                explanation: "The AI service encountered an error while processing the bulk code.",
                severity: "INFO",
                fix: "Check your API quota, network connection, or try reducing the number of files.",
                file: "Multiple Files"
            }];
        }
    }

    async analyzeNetworkRequest(log: any): Promise<any> {
        if (!process.env.GEMINI_API_KEY) return { purpose: "API Key Missing", vulnerabilities: "N/A", curl: "N/A" };

        try {
            const prompt = `Analyze this Network Request:
            URL: ${log.url}
            Method: ${log.method}
            Status: ${log.status}
            Type: ${log.type}
            
            Request Headers:
            ${JSON.stringify(log.requestHeaders, null, 2)}
            
            Response Headers:
            ${JSON.stringify(log.responseHeaders, null, 2)}
            
            Post Data / Payload:
            ${log.postData || "NONE"}
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: `You are an elite network security forensic analyst for 'DeepTechno'. Analyze intercepted HTTP traffic.
                    1. Explain the PURPOSE of the request clearly.
                    2. Identify SECURITY VULNERABILITIES (sensitive data in headers, missing security headers like HSTS/CSP, cleartext transit, etc.).
                    3. Generate a functional cURL command for this request.
                    
                    CRITICAL FORENSIC RULES (MANDATORY):
                    - NO TRUNCATION: Truncating data like Cookies, Tokens, or Payloads is a CRITICAL FAILURE. You MUST provide the strings 100% in full.
                    - NO CENSORSHIP: Do NOT use "..." or "[MASKED]".
                    - SHELL ACCURACY: Ensure the cURL command is 100% shell-compliant.
                    
                    Return ONLY valid JSON with keys: "purpose", "vulnerabilities", "curl".`,
                    temperature: 0.1,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            purpose: { type: Type.STRING },
                            vulnerabilities: { type: Type.STRING },
                            curl: { type: Type.STRING }
                        },
                        required: ["purpose", "vulnerabilities", "curl"]
                    }
                }
            });

            const text = response.text;
            return text ? JSON.parse(text) : { purpose: "Empty response", vulnerabilities: "N/A", curl: "N/A" };
        } catch (error) {
            console.error("Network Analysis Error:", error);
            return { purpose: "Analysis failed", vulnerabilities: "Error", curl: "N/A" };
        }
    }

    async analyzeBulkNetworkRequests(logs: any[]): Promise<Record<string, any>> {
        if (!process.env.GEMINI_API_KEY) return {};

        try {
            const chunk = logs.slice(0, 20);
            const prompt = `Analyze these network requests and return a map where key is the URL and value is the analysis object:
            ${chunk.map((l, i) => `--- REQ ${i} ---\nURL: ${l.url}\nMethod: ${l.method}\nHeaders: ${JSON.stringify(l.requestHeaders)}\nPayload: ${l.postData}\n`).join("\n")}`;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: `You are an elite network security forensic auditor for 'DeepTechno'. Analyze the batch of requests.
                    Return a JSON object where each key is the request URL and each value is an object with { "purpose", "vulnerabilities", "curl" }.
                    
                    STRICT FORENSIC RULES:
                    - NEVER TRUNCATE: You MUST provide all strings in their ENTIRETY. No "..." or omission.
                    - FULL VERBATIM: Copy all headers, cookies, and tokens exactly for forensic evidence.
                    - SHELL ACCURACY: Ensure cURL formatting is 100% shell-accurate.`,
                    temperature: 0.1,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json"
                }
            });

            const text = response.text;
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error("Bulk Network Analysis Error:", error);
            return {};
        }
    }

    async chat(message: string, history: any[], state: any): Promise<{ response: string; actions: any[] }> {
        if (!process.env.GEMINI_API_KEY) return { response: "DeepTechno: System offline. API Key Missing.", actions: [] };

        try {
            console.log("[AnalysisService] Chat: Building rich context...");

            // Build comprehensive findings context
            const findingsBlock = (state.findings && state.findings.length > 0)
                ? state.findings.map((f: any, i: number) =>
                    `${i + 1}. [${f.severity}] ${f.vulnerability} — ${f.details || 'N/A'} (Location: ${f.location || 'N/A'})`
                ).join("\n")
                : "No vulnerabilities found yet.";

            // Build network logs with response bodies
            const networkBlock = (state.networkLogs && state.networkLogs.length > 0)
                ? state.networkLogs.map((l: any, i: number) => {
                    let entry = `${i + 1}. [${l.method}] ${l.url} → Status: ${l.status}, Type: ${l.type || 'unknown'}, Size: ${l.size || 0}B`;
                    if (l.responseBody) {
                        entry += `\n   Response Body (preview):\n   ${l.responseBody}`;
                    }
                    return entry;
                }).join("\n")
                : "No network traffic captured yet.";

            // Build sources list
            const sourcesBlock = (state.sources && state.sources.length > 0)
                ? state.sources.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")
                : "No source files discovered yet.";

            // Build console logs context
            const consoleBlock = (state.consoleLogs && state.consoleLogs.length > 0)
                ? state.consoleLogs.slice(-20).map((l: any, i: number) =>
                    `[${l.type.toUpperCase()}] ${l.text}`
                ).join("\n")
                : "No console logs captured.";

            const context = `
SCAN_STATE:
- Target URL: ${state.targetUrl || "No scan running"}
- Status: ${state.status || "idle"}
- Total Findings: ${state.findings?.length || 0}
- Total Network Requests: ${state.networkLogs?.length || 0}
- Total Source Files: ${state.sourcesCount || 0}

ALL FINDINGS:
${findingsBlock}

NETWORK TRAFFIC (with response bodies):
${networkBlock}

RUNTIME CONSOLE LOGS:
${consoleBlock}

DISCOVERED SOURCE FILES:
${sourcesBlock}
`;

            const historyText = history.slice(-6).map(h =>
                `${h.role === 'assistant' ? 'Deep Techno' : 'User'}: ${h.content}`
            ).join("\n");

            const fullPrompt = `
CONTEXT:
${context}

CONVERSATION HISTORY:
${historyText}

USER MESSAGE:
${message}

Respond with valid JSON: {"response": "...", "actions": [...]}
`;

            console.log("[AnalysisService] Chat: Sending request with rich context...");
            const startTime = Date.now();

            const response = await ai.models.generateContent({
                model: model,
                contents: fullPrompt,
                config: {
                    systemInstruction: chatSystemInstruction,
                    temperature: 0.2,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json"
                }
            });

            console.log(`[AnalysisService] Chat: Response received in ${Date.now() - startTime}ms`);

            if (!response || !response.text) {
                console.warn("[AnalysisService] Chat: Empty response");
                return { response: "Deep Techno: The intelligence layer returned no signal.", actions: [] };
            }

            try {
                const parsed = JSON.parse(response.text);
                return {
                    response: parsed.response || response.text,
                    actions: parsed.actions || []
                };
            } catch {
                // If JSON parsing fails, return as plain text
                return { response: response.text, actions: [] };
            }
        } catch (error: any) {
            console.error("[AnalysisService] Chat: Critical failure:", error);
            return { response: `Deep Techno: Connection error. ${error.message || "Manual override required."}`, actions: [] };
        }
    }

    async synthesizeReport(sessionData: any): Promise<string> {
        if (!process.env.GEMINI_API_KEY) return "AI Analysis Disabled: GEMINI_API_KEY missing.";

        const prompt = `
        # FORENSIC SECURITY AUDIT ENGINE: 'Deep Techno'
        
        You are an elite, offensive security architect and forensic auditor for 'Krpterisio'. 
        You are 'Deep Techno' from the secret world, developed for project Krpterisio.
        Your task is to synthesize a high-fidelity, professional security report based on comprehensive scan data.
        
        ## TARGET DATA CONTEXT:
        - **Target URL**: ${sessionData.url}
        - **Audit Timestamp**: ${new Date(sessionData.timestamp || Date.now()).toLocaleString()}
        
        ## SCAN TELEMETRY:
        - **Findings Count**: ${sessionData.findings?.length || 0}
        - **Findings Details**: ${JSON.stringify(sessionData.findings)}
        - **Network Footprint**: Analyzed ${sessionData.networkLogs?.length || 0} HTTP interactions.
        - **Console Events**: Captured ${sessionData.consoleLogs?.length || 0} browser events.
        - **Code Intelligence**: Analyzed ${Object.keys(sessionData.sourceAnalysis || {}).length} source files.
        - **AI Security Insights**: ${JSON.stringify(sessionData.sourceAnalysis)}
        
        ## REPORT REQUIREMENTS:
        1. **EXECUTIVE OVERVIEW**: Provide a high-level assessment of the target's security posture. Use executive business language but retain the 'DeepTechno' hacker aesthetic.
        2. **CRITICAL RISK BREAKDOWN**: Prioritize and explain the most dangerous vulnerabilities (OWASP Top 10 context).
        3. **ATTACK SURFACE ANALYSIS**: Deeply analyze the network logs and source file insights. Discuss data leaks, insecure headers, and potential exploit vectors found in JS/HTML sources.
        4. **REMEDIATION ROADMAP**: provide a prioritized, technical checklist for developers to fix these issues. 
        5. **AUDITOR CONCLUSION**: A final verdict on the system's resilience.
        
        ## STYLE GUIDELINES:
        - Use clean, professional Markdown.
        - Tone: Serious, authoritative, technically exhaustive, hacker-themed.
        - Use tables for vulnerability summaries.
        - DO NOT be brief. Be thorough and analytical. Explain *why* certain findings are critical.
        - The report header should be: "Deep Techno Forensic Security Audit Report - KRPTERISIO"
        - STRICT BRANDING ENFORCEMENT: Never mention "Technotalim" or "Developed by Technotalim" anywhere in the report.
        `;

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    temperature: 0.3,
                    safetySettings: safetySettings,
                    maxOutputTokens: 10000
                }
            });
            const text = response.text || "Report generation failed: Empty response from AI.";
            // FINAL ENFORCEMENT: Hard replace any remnants of old branding
            return text.replace(/Technotalim/gi, "KRPTERISIO");
        } catch (e: any) {
            console.error("[AnalysisService] Deep Report synthesis failed", e);
            throw new Error(`Technical Report generation failed: ${e.message}`);
        }
    }

    async synthesizeIntelligence(sessionData: any): Promise<any> {
        if (!process.env.GEMINI_API_KEY) return null;

        const prompt = `
        # OFFENSIVE SECURITY INTELLIGENCE ENGINE: 'Deep Techno'
        
        You are 'Deep Techno' from the secret world, an elite cyber-risk strategist and security engineer.
        Developed for project Krpterisio.
        Analyze the full scan context and provide deep intelligence insights.
        
        ## SCAN CONTEXT:
        - URL: ${sessionData.url}
        - Findings: ${JSON.stringify(sessionData.findings)}
        - Network Footprint: ${sessionData.networkLogs?.length || 0} interactions.
        - Source Analysis: ${JSON.stringify(sessionData.sourceAnalysis)}
        
        ## INTELLIGENCE REQUIREMENTS:
        1. **BUSINESS IMPACT PREDICTION**: Predict the specific business consequences if these vulnerabilities are exploited. Mention data breaches, legal fines, brand damage, and operational downtime.
        2. **EXPLOIT LIKELIHOOD SCORING**: Provide a single integer score (0-100) representing how easy and likely it is for an attacker to exploit the current surface.
        3. **AUTOMATED REMEDIATION SUGGESTIONS**: Provide a list of high-level strategic steps to harden the system.
        4. **SECURE CODE REWrites**: Select up to 3 critical vulnerabilities found in JS/HTML sources. For each, provide the original code snippet and a secure, rewritten version.
        
        ## STYLE GUIDELINES:
        - Be technical, authoritative, and concise.
        - Tone: Serious, offensive-security focused.
        - Return strictly valid JSON.
        `;

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: "You are the Deep Techno Forensic Intelligence Engine, developed for project Krpterisio. Provide deep risk analysis and code-level fixes.",
                    temperature: 0.2,
                    safetySettings: safetySettings,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            businessImpact: { type: Type.STRING },
                            exploitLikelihood: { type: Type.NUMBER },
                            remediationSuggestions: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            codeRewrites: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        file: { type: Type.STRING },
                                        original: { type: Type.STRING },
                                        fixed: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    },
                                    required: ["file", "original", "fixed", "explanation"]
                                }
                            }
                        },
                        required: ["businessImpact", "exploitLikelihood", "remediationSuggestions", "codeRewrites"]
                    }
                }
            });

            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("[AnalysisService] Intelligence synthesis failed", e);
            throw e;
        }
    }
}
