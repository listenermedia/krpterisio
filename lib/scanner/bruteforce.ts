import axios from "axios";

export interface Finding {
    vulnerability: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    details: string;
    location: string;
}

const COMMON_PATHS = [
    ".env",
    ".git/HEAD",
    ".git/config",
    "admin",
    "backup",
    "backup.sql",
    "config.php",
    "wp-admin",
    "phpinfo.php",
    "server-status",
    ".ds_store",
    "swagger.json",
    "api-docs"
];

export class DirectoryBruteforcer {
    async scan(targetUrl: string, onFinding?: (finding: Finding) => void): Promise<Finding[]> {
        const findings: Finding[] = [];
        const baseUrl = targetUrl.endsWith("/") ? targetUrl.slice(0, -1) : targetUrl;

        // Run checks in parallel
        const promises = COMMON_PATHS.map(async (path) => {
            const fullUrl = `${baseUrl}/${path}`;
            try {
                // Use HEAD for speed, allow a liberal timeout
                const res = await axios.head(fullUrl, {
                    validateStatus: () => true, // Make sure we handle all status codes manually
                    timeout: 3000
                });

                if (res.status === 200) {
                    const finding: Finding = {
                        vulnerability: "Sensitive File / Directory Exposed",
                        severity: path === ".env" || path.includes(".git") ? "critical" : "medium",
                        details: `Found accessible file/directory: /${path} (Status: 200)`,
                        location: fullUrl
                    };
                    findings.push(finding);
                    if (onFinding) onFinding(finding);
                }
                else if (res.status === 403) {
                    const finding: Finding = {
                        vulnerability: "Protected Directory Discovered",
                        severity: "info",
                        details: `Directory exists but is forbidden: /${path} (Status: 403)`,
                        location: fullUrl
                    };
                    findings.push(finding);
                    if (onFinding) onFinding(finding);
                }
            } catch (err) {
                // Ignore connection errors (host unreachable, etc)
            }
        });

        await Promise.all(promises);
        return findings;
    }
}
