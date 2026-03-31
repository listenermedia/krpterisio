import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page, HTTPRequest } from "puppeteer";
import os from "os";

// Initialize Stealth Plugin
puppeteer.use(StealthPlugin());

export interface CrawlResult {
    url: string;
    links: string[];
    forms: { action: string; method: string; inputs: string[] }[];
    scripts: string[];
    networkRequests: {
        url: string;
        method: string;
        requestHeaders: Record<string, string>;
        responseHeaders: Record<string, string>;
        statusCode: number;
        contentType?: string;
        postData?: string;
        responseBody?: string;
    }[];
    content: string;
    screenshot?: string; // Base64
}

export class Crawler {
    private browser: any = null;
    public page: Page | null = null;
    private visited = new Set<string>();
    private screenshotInterval: NodeJS.Timeout | null = null;
    private isTakingScreenshot = false;

    async init() {
        this.browser = await (puppeteer as any).launch({
            headless: false, // GOD MODE: Visible browser is harder to detect
            channel: "chrome",
            protocolTimeout: 3600000, 
            args: [
                "--window-size=1280,800",
                "--disable-features=IsolateOrigins,site-per-process",
                `--user-data-dir=${os.tmpdir()}/hacker-browser-profile-stable`,
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
            defaultViewport: { width: 1280, height: 800 }
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async startStreaming(onEvent: (type: string, data: any) => void) {
        if (this.screenshotInterval) clearInterval(this.screenshotInterval);

        this.screenshotInterval = setInterval(async () => {
            if (this.page && this.browser && !this.isTakingScreenshot) {
                this.isTakingScreenshot = true;
                try {
                    const buffer = await this.page.screenshot({ encoding: "base64", type: "jpeg", quality: 40 });
                    const screenshot = `data:image/jpeg;base64,${buffer}`;
                    onEvent("screenshot", screenshot);
                } catch (e) {
                    // Ignore errors during stream (page might be closing)
                } finally {
                    this.isTakingScreenshot = false;
                }
            }
        }, 500); // 2FPS update rate
    }

    async stop() {
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
        }
        await this.close();
    }

    async crawl(url: string, onEvent?: (type: string, data: any) => void, headers?: Record<string, string>): Promise<CrawlResult> {
        if (!this.browser) await this.init();
        const page = await this.browser!.newPage();
        this.page = page; // Expose for interaction

        // Apply Custom Headers (for Auth)
        const customHeaders = headers || {};

        // Professional Stealth handles all fingerprinting automatically now.
        // We only hide the automation flag as a backup and intercept link targets.
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Ensure all navigation happens in this tab (target="_blank" bypass)
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (link && link.target === '_blank') {
                    link.target = '_self';
                }
            }, true);
            
            // Override window.open
            (window as any).open = function(url: string) {
                window.location.href = url;
                return window;
            };
        });

        // Request Interception using low-level CDP (Fetch API) instead of Puppeteer's high-level 
        // to prevent built-in interception from corrupting CORS Preflight OPTIONS requests.
        const client = await page.target().createCDPSession();
        await client.send('Fetch.enable', {
            patterns: [{ requestStage: 'Request' }]
        });

        client.on('Fetch.requestPaused', async (event: any) => {
            const { requestId, request } = event;

            if (request.method === 'OPTIONS') {
                // Let the browser handle CORS preflight naturally, no modifications.
                await client.send('Fetch.continueRequest', { requestId }).catch(() => { });
                return;
            }

            // For all other requests, merge existing headers with our custom overrides
            const headersList: any[] = [];

            // Start with base headers
            let mergedHeaders: Record<string, string> = {
                ...request.headers,
                'accept-language': 'en-US,en;q=0.9',
                ...customHeaders
            };

            // Convert to CDP array format
            for (const [name, value] of Object.entries(mergedHeaders)) {
                headersList.push({ name, value: String(value) });
            }

            await client.send('Fetch.continueRequest', {
                requestId,
                headers: headersList
            }).catch(() => { });
        });

        const allRequests: CrawlResult["networkRequests"] = [];
        const requestStartTimes = new Map<string, number>();
        const requestHeadersMap = new Map<string, any>();

        // Enable Network domain for forensic capture
        await client.send('Network.enable');

        client.on('Network.requestWillBeSent', (params: any) => {
            requestStartTimes.set(params.requestId, (params.wallTime || Date.now() / 1000) * 1000);
            requestHeadersMap.set(params.requestId, params.request.headers);
        });

        page.on("response", async (res: any) => {
            const req = res.request();
            const requestId = (req as any)._requestId; // Internal identifier
            const headers = res.headers();
            const status = res.status();
            const resUrl = res.url();
            const contentType = headers['content-type'] || '';
            const startTime = requestStartTimes.get(requestId) || Date.now();
            const time = Date.now() - startTime;

            // Get the headers from our CDP map for higher accuracy (includes cookies if sent explicitly)
            // Note: browser-managed cookies might still be hidden in some environments, 
            // but CDP 'request.headers' is usually much better.
            const reqHeaders = requestHeadersMap.get(requestId) || req.headers();

            // Try to get size
            let size = 0;
            try {
                const contentLength = headers['content-length'];
                if (contentLength) size = parseInt(contentLength, 10);
            } catch (e) { }

            // Extract Post Data if available
            const postData = req.postData() || "";

            // Capture Response Body for JSON/Text (Limit 500KB)
            let responseBody = "";
            const lowerType = contentType.toLowerCase();
            const isCapturable = lowerType.includes("json") || lowerType.includes("text") || lowerType.includes("javascript") || lowerType.includes("xml");

            if (isCapturable && (size === 0 || size < 500000)) {
                try {
                    // Using text() as it was verified to work before.
                    responseBody = await res.text();
                } catch (e) {
                    // Resource gone or not text
                }
            }

            const logEntry = {
                url: resUrl,
                method: req.method(),
                requestHeaders: reqHeaders,
                responseHeaders: headers,
                statusCode: status,
                contentType: contentType,
                postData: postData,
                responseBody: responseBody
            };
            allRequests.push(logEntry);

            // Emit single complete log
            if (onEvent) {
                onEvent("log", {
                    method: req.method(),
                    url: resUrl,
                    status: status,
                    type: contentType.split(';')[0],
                    size: size,
                    time: time,
                    requestHeaders: reqHeaders,
                    responseHeaders: headers,
                    postData: postData,
                    responseBody: responseBody
                });

                // Real-time Source Discovery
                if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('css') || resUrl.endsWith('.js') || resUrl.endsWith('.css')) {
                    onEvent("source", resUrl);
                }
            }
        });

        // Capture Console Metadata (Logs, Errors, Info)
        page.on('console', (msg: any) => {
            if (onEvent) {
                onEvent("console", {
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now()
                });
            }
        });

        // Start Live Preview Streaming
        if (onEvent) this.startStreaming(onEvent);

        let data: {
            links: string[];
            scripts: string[];
            forms: { action: string; method: string; inputs: string[] }[];
            content: string;
        } = { links: [], scripts: [], forms: [], content: "" };

        let screenshot = "";

        try {
            if (onEvent) onEvent("log", { method: "INFO", url: "Navigating to: " + url, status: 0 });

            // Try to navigate
            try {
                // networkidle2 ensures background verification scripts have 'settled'
                await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
                if (onEvent) onEvent("log", { method: "SUCCESS", url: "Initial Entry - Settle Phase", status: 200 });

                // Challenge Recovery Loop
                let checkpointDetected = true;
                let attempts = 0;
                await new Promise(r => setTimeout(r, 4000)); // Increased pre-wait for gate to stabilize

                while (checkpointDetected && attempts < 15) {
                    const content = await page.content();
                    const isVercelCheckpoint = content.includes("verify your browser") ||
                        content.includes("Security Checkpoint") ||
                        content.includes("Vercel Security");

                    // SUCCESS DETECTION: If we see common site elements, break out!
                    const isPassed = !isVercelCheckpoint && (content.includes("logout") || content.includes("login") || content.length > 5000);

                    if (isVercelCheckpoint) {
                        if (onEvent) onEvent("log", { method: "WAIT", url: `Bypassing Security Gate... (${attempts + 1}/15)`, status: 0 });

                        // Human Simulation: Wiggle mouse and scroll
                        for (let i = 0; i < 5; i++) {
                            await page.mouse.move(Math.random() * 800, Math.random() * 600);
                            await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
                        }

                        // Randomized jitter wait
                        const waitTime = 2000 + Math.random() * 3000;
                        await new Promise(r => setTimeout(r, waitTime));
                        attempts++;
                    } else if (isPassed) {
                        checkpointDetected = false;
                    } else {
                        // Unknown state, wait a bit more
                        await new Promise(r => setTimeout(r, 1000));
                        attempts++;
                    }
                }

                if (attempts > 0 && !checkpointDetected) {
                    if (onEvent) onEvent("log", { method: "SUCCESS", url: "Human-like Bypass Confirmed!", status: 200 });
                }

                // Final small delay for dynamic content
                await new Promise(r => setTimeout(r, 1500));
            } catch (navErr) {
                console.log("Navigation timeout (non-fatal), proceeding to screenshot...");
                if (onEvent) onEvent("log", { method: "WARN", url: "Navigation Limit Exceeded - Proceeding", status: 0 });
            }

            // Capture High-Res Screenshot for final report
            const buffer = await page.screenshot({ encoding: "base64", type: "jpeg", quality: 50 });
            screenshot = `data:image/jpeg;base64,${buffer}`;

            // Extract data
            data = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll("a")).map((a) => (a as any).href);
                const scripts = Array.from(document.querySelectorAll("script")).map((s) => (s as any).src).filter(Boolean);
                const forms = Array.from(document.querySelectorAll("form")).map((f) => ({
                    action: f.action,
                    method: f.method,
                    inputs: Array.from(f.querySelectorAll("input")).map((i) => i.name),
                }));
                const content = document.body ? document.body.innerText : "";
                return { links, scripts, forms, content };
            });

        } catch (e: any) {
            if (e.message && (e.message.includes('TargetCloseError') || e.message.includes('Session closed'))) {
                console.log(`Scan aborted or browser closed for ${url}.`);
            } else {
                console.error(`Failed to navigate to ${url}:`, e);
            }
        }

        // Keep streaming and listeners active for interaction
        // The screenshotInterval and on("response") will continue to run.
        // They will be stopped when crawler.stop() is called.

        return {
            url,
            ...data,
            networkRequests: allRequests,
            screenshot,
        };
    }

    async evaluateJs(code: string): Promise<{ result: any; error: string | null }> {
        if (!this.page) return { result: null, error: "No active page" };
        try {
            // Ensure we are on a valid page and not stuck in a gate
            const content = await this.page.content();
            if (content.includes("Security Checkpoint") || content.includes("verify your browser")) {
                return { result: null, error: "Cannot execute: Browser is stuck at security checkpoint" };
            }

            const result = await this.page.evaluate((jsCode) => {
                try {
                    // Try to use eval for direct execution
                    const output = eval(jsCode);
                    return { success: true, data: output };
                } catch (e: any) {
                    return { success: false, error: e.message };
                }
            }, code);

            if (result.success) {
                return { result: result.data, error: null };
            } else {
                return { result: null, error: result.error };
            }
        } catch (e: any) {
            console.error("[Crawler] evaluateJs failure:", e.message);
            return { result: null, error: `Execution failed: ${e.message}` };
        }
    }
}
