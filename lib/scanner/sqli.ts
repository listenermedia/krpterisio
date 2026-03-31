import { CrawlResult } from "./crawler";
import { Finding } from "./vulnerability";
import axios from "axios";

export class SQLiScanner {
    private payloads = [
        "'",
        '"',
        "1=1",
        "' OR '1'='1",
        '" OR "1"="1',
        "sleep(5)",
    ];

    async scan(crawlResult: CrawlResult): Promise<Finding[]> {
        const findings: Finding[] = [];

        // Analyze forms for potential SQLi
        for (const form of crawlResult.forms) {
            if (form.method.toLowerCase() === "get") {
                // Simple GET param fuzzing
                // Note: This is a placeholder. Real scanning requires sending requests.
                // For safety in this demo, we will just log potential vectors.
                // To make it functional, we would need to request with axios/fetch.
            }
        }

        // Analyze URL parameters
        const urlObj = new URL(crawlResult.url);
        if (urlObj.searchParams.toString().length > 0) {
            findings.push({
                vulnerability: "Potential SQL Injection Point",
                severity: "info",
                details: `URL has parameters that should be tested: ${urlObj.search}`,
                location: crawlResult.url,
            });
        }

        return findings;
    }
}
