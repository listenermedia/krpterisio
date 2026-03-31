import { Crawler } from "../lib/scanner/crawler";
import { VulnerabilityEngine } from "../lib/scanner/vulnerability";

async function runTest() {
    const url = "https://example.com";
    console.log(`Starting test scan for ${url}...`);

    const crawler = new Crawler();
    try {
        console.log("[*] Initializing crawler...");
        const result = await crawler.crawl(url);
        console.log(`[+] Crawl complete: ${result.links.length} links, ${result.forms.length} forms.`);

        const engine = new VulnerabilityEngine();
        console.log("[*] Analyzing...");
        const findings = await engine.analyze(result);

        console.log(`[+] Findings: ${findings.length}`);
        findings.forEach((f) => {
            console.log(` - [${f.severity}] ${f.vulnerability}: ${f.details}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await crawler.close();
    }
}

runTest();
