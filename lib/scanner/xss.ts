import { CrawlResult } from "./crawler";
import { Finding } from "./vulnerability";

export class XSSScanner {
    async scan(crawlResult: CrawlResult): Promise<Finding[]> {
        const findings: Finding[] = [];

        // Reflected XSS check in URL
        const urlObj = new URL(crawlResult.url);
        urlObj.searchParams.forEach((value, key) => {
            if (value.includes("<script>") || value.includes("alert(")) {
                findings.push({
                    vulnerability: "Reflected XSS",
                    severity: "high",
                    details: `URL parameter '${key}' contains suspicious script tags.`,
                    location: crawlResult.url,
                });
            }
        });

        // DOM Based XSS (heuristic)
        if (crawlResult.content.includes("eval(") || crawlResult.content.includes("document.write(")) {
            findings.push({
                vulnerability: "Potential DOM XSS",
                severity: "medium",
                details: "Usage of eval() or document.write() detected in page source.",
                location: crawlResult.url,
            });
        }

        return findings;
    }
}
