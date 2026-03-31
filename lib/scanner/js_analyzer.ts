import axios from "axios";
import { Finding } from "./vulnerability";

export class JSAnalyzer {
    async scan(scripts: string[], onFinding?: (finding: Finding) => void): Promise<Finding[]> {
        const findings: Finding[] = [];

        // Limit to first 10 scripts to avoid timeout/spam, or typical main bundles
        const targetScripts = scripts.slice(0, 10);

        for (const scriptUrl of targetScripts) {
            try {
                // Fetch the JS content
                const { data } = await axios.get(scriptUrl, { timeout: 5000, validateStatus: () => true });
                if (typeof data !== 'string') continue;

                // 1. Find Hidden API Routes
                // Look for patterns like "/api/v1/...", "/auth/..."
                const routeRegex = /["'](\/[a-zA-Z0-9_\-\/]+)["']/g;
                let match;
                const foundRoutes = new Set<string>();

                while ((match = routeRegex.exec(data)) !== null) {
                    const route = match[1];
                    // Filter noise
                    if (route.length > 4 &&
                        !route.startsWith("//") &&
                        !route.endsWith(".png") &&
                        !route.endsWith(".svg") &&
                        !route.endsWith(".css") &&
                        (route.includes("api") || route.includes("auth") || route.includes("admin") || route.includes("v1"))
                    ) {
                        foundRoutes.add(route);
                    }
                }

                if (foundRoutes.size > 0) {
                    const f: Finding = {
                        vulnerability: "Hidden API Routes Discovered (JS Analysis)",
                        severity: "info",
                        details: `Found ${foundRoutes.size} potential endpoints in ${scriptUrl.split('/').pop()}: ${Array.from(foundRoutes).join(", ")}`,
                        location: scriptUrl
                    };
                    findings.push(f);
                    if (onFinding) onFinding(f);
                }

                // 2. Secrets in JS (Double Check)
                if (data.includes("AWS_ACCESS_KEY") || data.includes("sk_live_")) {
                    const f: Finding = {
                        vulnerability: "Hardcoded Secrets in Bundle",
                        severity: "critical",
                        details: "Potential AWS or Stripe keys found in minified JS bundle.",
                        location: scriptUrl
                    };
                    findings.push(f);
                    if (onFinding) onFinding(f);
                }

            } catch (err) {
                // Ignore fetch errors
            }
        }

        return findings;
    }
}
