import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import puppeteer from "puppeteer";

const ABSTRACT_MD_PATH = path.join("/Users/ashik/.gemini/antigravity/brain/cca8b364-9d87-4dfd-ae63-30c72f809d44/project_abstract.md");
const OUTPUT_DIR = path.join(process.cwd(), "reports");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateDocx(markdown: string) {
    console.log("[*] Generating DOCX...");
    const lines = markdown.split("\n");
    const children: any[] = [];

    for (let line of lines) {
        if (line.startsWith("# ")) {
            children.push(new Paragraph({
                text: line.substring(2),
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200, before: 400 },
            }));
        } else if (line.startsWith("## ")) {
            children.push(new Paragraph({
                text: line.substring(3),
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 150, before: 300 },
            }));
        } else if (line.startsWith("### ")) {
            children.push(new Paragraph({
                text: line.substring(4),
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 100, before: 200 },
            }));
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
            children.push(new Paragraph({
                text: line.substring(2),
                bullet: { level: 0 },
                spacing: { after: 100 },
            }));
        } else if (line.trim() === "") {
            // Skip empty lines or add spacing
        } else {
            // Handle bold text in line
            const parts = line.split("**");
            const textRuns = parts.map((part, i) => new TextRun({
                text: part,
                bold: i % 2 !== 0
            }));

            children.push(new Paragraph({
                children: textRuns,
                spacing: { after: 150 }
            }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(OUTPUT_DIR, "Project_Abstract.docx");
    fs.writeFileSync(outputPath, buffer);
    console.log(`[+] DOCX generated: ${outputPath}`);
}

async function generatePdf(markdown: string) {
    console.log("[*] Generating PDF...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Simple markdown-to-html conversion for the PDF
    let html = markdown
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<p></p>')
        .replace(/\n(?!(?:<h1>|<h2>|<h3>|<li>|<ul>|<div>|<table>))/g, '<br>');

    // Wrap list items
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    const styledHtml = `
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', sans-serif; line-height: 1.6; padding: 40px; color: #333; }
            h1 { color: #008f11; border-bottom: 2px solid #008f11; padding-bottom: 10px; }
            h2 { color: #005f0a; margin-top: 30px; }
            h3 { color: #003b00; }
            strong { color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            ul { margin-bottom: 20px; }
            li { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        ${html}
    </body>
    </html>
    `;

    await page.setContent(styledHtml);
    const outputPath = path.join(OUTPUT_DIR, "Project_Abstract.pdf");
    await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();
    console.log(`[+] PDF generated: ${outputPath}`);
}

const markdown = fs.readFileSync(ABSTRACT_MD_PATH, "utf-8");

(async () => {
    try {
        await generateDocx(markdown);
        await generatePdf(markdown);
        console.log("[SUCCESS] All files generated in /reports directory.");
    } catch (err) {
        console.error("[ERROR] Generation failed:", err);
    }
})();
