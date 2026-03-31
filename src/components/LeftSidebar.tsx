"use client";

import { useState, useEffect } from "react";
import { useScanStore, ScanSession } from "../store/scanStore";
import { getSocket } from "@/lib/socket";
import {
    History, FileText, Download, Trash2, Clock, Globe, ShieldCheck,
    AlertTriangle, ChevronRight, ChevronLeft, Database, Printer, X,
    Maximize2, Zap, BarChart3, Wand2, Code2, Brain
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function LeftSidebar() {
    const {
        sessions, setSessions, loadSession, targetUrl, findings, networkLogs,
        consoleLogs, status, chatMessages, sourceAnalysis, networkAnalysis,
        sources, stats, report, setReport, sidebarTab, setSidebarTab,
        intelligenceData, setIntelligenceData
    } = useScanStore();
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isGeneratingIntel, setIsGeneratingIntel] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [width, setWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);
    const socket = getSocket();

    useEffect(() => {
        // Fetch sessions on mount
        if (socket) {
            socket.emit("session:list");
            socket.on("session:list:result", (data: ScanSession[]) => {
                setSessions(data);
            });
            socket.on("session:load:result", (data: ScanSession) => {
                loadSession(data);
            });
            socket.on("report:generate:result", (data: { markdown: string }) => {
                setReport(data.markdown);
                setIsGeneratingReport(false);
                setIsPreviewOpen(true); // Auto-open preview when ready
            });
            socket.on("intelligence:generate:result", (data: any) => {
                setIntelligenceData(data);
                setIsGeneratingIntel(false);
            });
        }

        return () => {
            if (socket) {
                socket.off("session:list:result");
                socket.off("session:load:result");
                socket.off("report:generate:result");
                socket.off("intelligence:generate:result");
            }
        };
    }, [socket]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    const handleSaveSession = () => {
        if (!targetUrl) return;
        const session: ScanSession = {
            id: targetUrl.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now(),
            url: targetUrl,
            timestamp: Date.now(),
            status,
            findings,
            stats,
            networkLogs,
            sources,
            chatHistory: chatMessages,
            consoleLogs,
            sourceAnalysis,
            networkAnalysis,
            intelligence: intelligenceData || undefined,
        };
        socket.emit("session:save", session);
    };

    const handleGenerateReport = () => {
        if (!targetUrl) return;
        setIsGeneratingReport(true);
        const sessionData = {
            url: targetUrl,
            timestamp: Date.now(),
            findings,
            networkLogs,
            consoleLogs,
            sourceAnalysis,
            networkAnalysis,
            stats
        };
        socket.emit("report:generate", sessionData);
    };


    const handleGenerateIntelligence = () => {
        if (!targetUrl) return;
        setIsGeneratingIntel(true);
        const sessionData = {
            url: targetUrl,
            findings,
            networkLogs,
            sourceAnalysis,
            networkAnalysis
        };
        socket.emit("intelligence:generate", sessionData);
    };

    const handlePrint = () => {
        if (!report) return;

        // Sanitize markdown if wrapped in code blocks
        const sanitizedContent = report.replace(/^```markdown\n/, '').replace(/\n```$/, '');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Security_Audit_Report_${targetUrl}</title>
                        <style>
                            body { font-family: 'Courier New', Courier, monospace; line-height: 1.6; padding: 40px; color: #333; max-width: 900px; margin: 0 auto; }
                            h1, h2, h3 { color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 30px; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { border: 1px solid #000; padding: 10px; text-align: left; font-size: 12px; }
                            th { background-color: #f0f0f0; }
                            pre { background: #f8f8f8; padding: 15px; border: 1px dashed #000; overflow-x: auto; font-size: 11px; }
                            code { background: #eee; padding: 2px 4px; }
                            .header { text-align: center; margin-bottom: 40px; border-bottom: 5px double #000; padding-bottom: 20px; }
                            blockquote { border-left: 5px solid #000; margin: 20px 0; padding-left: 20px; font-style: italic; }
                            @media print {
                                button { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1 style="border: none; margin: 0;">DEEP TECHNO FORENSIC INTELLIGENCE</h1>
                            <p style="margin: 5px 0;">OFFENSIVE SECURITY AUDIT REPORT</p>
                            <p style="font-size: 10px;">Target: ${targetUrl} | KRPTERISIO | Project by Team Krpterisio</p>
                        </div>
                        <div id="content"></div>
                        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                        <script>
                            document.getElementById('content').innerHTML = marked.parse(\`${sanitizedContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <>
            <div
                className={`relative flex h-full transition-all shrink-0 ${!isResizing ? "duration-300" : ""}`}
                style={{ width: isExpanded ? `${width}px` : "40px" }}
            >
                {/* Sidebar Content Area */}
                {isExpanded && (
                    <div className="flex-1 border-r border-[#003b00] bg-[#0a0a0a] flex flex-col h-full overflow-hidden">
                        {/* Sidebar Header */}
                        <div className="flex border-b border-[#003b00] bg-[#050505]">
                            <button
                                onClick={() => setSidebarTab("history")}
                                className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest transition-colors
                                    ${sidebarTab === "history" ? "bg-[#003b00] text-[#00ff41]" : "text-[#008f11] hover:bg-[#001100]"}`}
                            >
                                <History size={14} />
                                HISTORY
                            </button>
                            <button
                                onClick={() => setSidebarTab("reports")}
                                className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest transition-colors
                                    ${sidebarTab === "reports" ? "bg-[#003b00] text-[#00ff41]" : "text-[#008f11] hover:bg-[#001100]"}`}
                            >
                                <FileText size={14} />
                                REPORTS
                            </button>
                            <button
                                onClick={() => setSidebarTab("intelligence")}
                                className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest transition-colors
                                    ${sidebarTab === "intelligence" ? "bg-[#003b00] text-[#00ff41]" : "text-[#008f11] hover:bg-[#001100]"}`}
                            >
                                <Brain size={14} />
                                INTEL
                            </button>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                            {sidebarTab === "history" ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-[10px] text-[#003b00] font-bold uppercase tracking-tighter">Saved Sessions</span>
                                        <button
                                            onClick={handleSaveSession}
                                            disabled={!targetUrl}
                                            className="text-[9px] text-[#00ff41] hover:underline disabled:opacity-30"
                                        >
                                            [+] SAVE CURRENT
                                        </button>
                                    </div>
                                    {sessions.length === 0 ? (
                                        <div className="text-center py-10 text-[#003b00] italic text-[10px]">
                                            // NO_SESSIONS_FOUND
                                        </div>
                                    ) : (
                                        sessions.map((session) => (
                                            <button
                                                key={session.id}
                                                onClick={() => socket.emit("session:load", session.id)}
                                                className="w-full text-left bg-black border border-[#003b00] p-3 rounded-sm hover:border-[#00ff41] transition-all group"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Globe size={12} className="text-[#008f11]" />
                                                    <span className="text-[10px] text-[#00ff41] font-bold truncate">{session.url}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px]">
                                                    <div className="flex items-center gap-1 text-[#003b00]">
                                                        <Clock size={10} />
                                                        {new Date(session.timestamp).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[#ff003c] font-bold">{session.findings.length} VULN</span>
                                                        <span className={`px-1 rounded-xs text-[8px] bg-[#003b00] text-[#00ff41]`}>
                                                            {session.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : sidebarTab === "reports" ? (
                                <div className="space-y-4">
                                    <div className="bg-[#000] border border-[#003b00] p-4 rounded-sm">
                                        <h3 className="text-[#00ff41] text-[11px] font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={14} />
                                            Audit Report
                                        </h3>
                                        <p className="text-[10px] text-[#008f11] leading-relaxed mb-4">
                                            Generate a professional, deep-dive security audit based on current scan data.
                                        </p>
                                        <button
                                            onClick={handleGenerateReport}
                                            disabled={isGeneratingReport || !targetUrl}
                                            className={`w-full py-2 border text-[10px] font-bold tracking-widest transition-all
                                                ${isGeneratingReport
                                                    ? "border-[#003b00] text-[#003b00] animate-pulse cursor-wait"
                                                    : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black"}`}
                                        >
                                            {isGeneratingReport ? "SYNTHESIZING..." : "GENERATE_DEEP_REPORT"}
                                        </button>
                                    </div>

                                    {report && (
                                        <div className="space-y-3 animate-in fade-in duration-500">
                                            <div className="text-[10px] text-[#00ff41] font-bold uppercase tracking-tighter px-1 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={12} className="text-[#00ff41]" />
                                                    Audit Ready
                                                </div>
                                                <button
                                                    onClick={() => setIsPreviewOpen(true)}
                                                    className="text-[9px] hover:underline flex items-center gap-1"
                                                >
                                                    <Maximize2 size={10} /> OPEN_PREVIEW
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={handlePrint}
                                                    className="w-full py-3 bg-[#0a0a0a] border border-[#003b00] text-[#00ff41] text-[10px] font-bold flex flex-col items-center gap-1 hover:bg-[#003b00] transition-all"
                                                >
                                                    <Printer size={16} />
                                                    <span>PRINT_AUDIT</span>
                                                </button>

                                                <button
                                                    onClick={handleSaveSession}
                                                    className="w-full py-2 border border-[#008f11] text-[#008f11] text-[9px] font-bold tracking-widest hover:bg-[#003b00] hover:text-[#00ff41] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Database size={12} />
                                                    SAVE_AUDIT_TO_HISTORY
                                                </button>
                                            </div>
                                            <div className="p-3 bg-black border border-[#001100] rounded-sm italic text-[9px] text-[#003b00]">
                                                // SECURITY_NOTICE: This document contains full technical disclosure.
                                            </div>
                                        </div>
                                    )}

                                    {!report && !isGeneratingReport && (
                                        <div className="h-40 flex flex-col items-center justify-center text-[#003b00] italic text-[10px] space-y-2 opacity-50">
                                            <AlertTriangle size={24} />
                                            <span>No_Report_Active</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-[#000] border border-[#003b00] p-4 rounded-sm mb-4">
                                        <h3 className="text-[#00ff41] text-[11px] font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={14} />
                                            Deep Intelligence
                                        </h3>
                                        <p className="text-[10px] text-[#008f11] leading-relaxed mb-4">
                                            Predict business impact, calculate likelihood, and generate secure code rewrites.
                                        </p>
                                        <button
                                            onClick={handleGenerateIntelligence}
                                            disabled={isGeneratingIntel || !targetUrl}
                                            className={`w-full py-2 border text-[10px] font-bold tracking-widest transition-all
                                                ${isGeneratingIntel
                                                    ? "border-[#003b00] text-[#003b00] animate-pulse cursor-wait"
                                                    : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black"}`}
                                        >
                                            {isGeneratingIntel ? "PREDICTING..." : "RUN_INTELLIGENCE_ENGINE"}
                                        </button>
                                    </div>

                                    {intelligenceData && (
                                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                                            {/* Exploit Likelihood */}
                                            <div className="space-y-2 text-center py-2 border-b border-[#003b00]">
                                                <div className="flex items-center justify-center gap-2 text-[10px] text-[#00ff41] font-bold mb-1">
                                                    <BarChart3 size={12} /> Likelihood of Exploit
                                                </div>
                                                <div className="text-2xl font-black text-[#00ff41]">{intelligenceData.exploitLikelihood}%</div>
                                                <div className="w-full h-1 bg-black border border-[#003b00] overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#00ff41] transition-all duration-1000"
                                                        style={{ width: `${intelligenceData.exploitLikelihood}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Business Impact */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] text-[#00ff41] font-bold uppercase">
                                                    <Brain size={12} /> Business Impact Prediction
                                                </div>
                                                <p className="text-[10px] text-[#008f11] leading-relaxed bg-black/50 p-2 border-l-2 border-[#ff003c]">
                                                    {intelligenceData.businessImpact}
                                                </p>
                                            </div>

                                            {/* Remediation Suggestions */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] text-[#00ff41] font-bold uppercase">
                                                    <Wand2 size={12} /> Strategic Remediation
                                                </div>
                                                <ul className="space-y-1">
                                                    {intelligenceData.remediationSuggestions.map((step, i) => (
                                                        <li key={i} className="text-[9px] text-[#008f11] flex gap-2">
                                                            <span className="text-[#00ff41] opacity-50">[{i + 1}]</span>
                                                            {step}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Code Rewrites */}
                                            {intelligenceData.codeRewrites.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center gap-2 text-[10px] text-[#00ff41] font-bold uppercase">
                                                        <Code2 size={12} /> Secure Code Recommendation
                                                    </div>
                                                    {intelligenceData.codeRewrites.map((rewrite, i) => (
                                                        <div key={i} className="bg-black/80 border border-[#003b00] rounded-sm overflow-hidden">
                                                            <div className="bg-[#001a00] px-2 py-1 text-[8px] text-[#00ff41] font-bold border-b border-[#003b00] flex justify-between">
                                                                <span>{rewrite.file}</span>
                                                                <span className="opacity-50">PROPOSAL_{i + 1}</span>
                                                            </div>
                                                            <div className="p-2 space-y-2">
                                                                <div className="space-y-1">
                                                                    <div className="text-[7px] text-[#ff003c] font-bold uppercase">Target: Code Vector</div>
                                                                    <pre className="text-[8px] text-gray-500 bg-black p-1 truncate">{rewrite.original}</pre>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="text-[7px] text-[#00ff41] font-bold uppercase">Fixed: Secure Revision</div>
                                                                    <pre className="text-[9px] text-[#00ff41] bg-[#000500] p-1 border-l border-[#00ff41] whitespace-pre-wrap">{rewrite.fixed}</pre>
                                                                </div>
                                                                <div className="text-[8px] text-[#008f11] italic leading-tight pt-1">
                                                                    {rewrite.explanation}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!intelligenceData && !isGeneratingIntel && (
                                        <div className="h-40 flex flex-col items-center justify-center text-[#003b00] italic text-[10px] space-y-2 opacity-50 text-center">
                                            <Brain size={24} />
                                            <span>Intel_Standby<br />Run Engine to Analyze Risk</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-3 border-t border-[#003b00] bg-[#050505] shrink-0">
                            <div className="flex items-center justify-between text-[8px] text-[#003b00] font-bold uppercase tracking-tighter">
                                <span>System Session: {targetUrl ? "ACTIVE" : "STANDBY"}</span>
                                <span>v1.2.0</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggle Button Column (Always visible on the right of content) */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-full w-10 bg-[#0a0a0a] border-r border-[#003b00] flex flex-col items-center py-4 hover:bg-[#001a00] transition-colors group z-20"
                >
                    {isExpanded ? <ChevronLeft size={16} className="text-[#00ff41]" /> : <ChevronRight size={16} className="text-[#00ff41]" />}
                    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4">
                        <span className="[writing-mode:vertical-lr] text-[10px] font-bold tracking-[0.2em] text-[#008f11] group-hover:text-[#00ff41]">
                            SCAN_SESSIONS_HUB
                        </span>
                        <Database size={18} className="text-[#00ff41] opacity-50" />
                    </div>
                </button>

                {/* Resizer Handle (Only visible when expanded, on the right edge) */}
                {isExpanded && (
                    <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#00ff41] z-50 transition-colors"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);
                        }}
                    />
                )}
            </div>

            {/* Report Preview Modal */}
            {isPreviewOpen && report && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in zoom-in-95 duration-200">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)} />
                    <div className="relative w-full max-w-5xl h-full bg-[#050505] border border-[#00ff41]/30 shadow-[0_0_50px_rgba(0,255,65,0.15)] flex flex-col overflow-hidden rounded-sm">

                        {/* Modal Header */}
                        <div className="p-4 border-b border-[#003b00] bg-[#0a0a0a] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-[#00ff41]" size={24} />
                                <div>
                                    <h2 className="text-[#00ff41] text-sm font-bold tracking-widest uppercase">DeepTechno // Security Audit Preview</h2>
                                    <p className="text-[9px] text-[#008f11]">TARGET: {targetUrl} // AUTH_VERIFIED</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-[#003b00] text-[#00ff41] text-[10px] font-bold flex items-center gap-2 hover:bg-[#00ff41] hover:text-black transition-all"
                                >
                                    <Printer size={14} /> PRINT_NOW
                                </button>
                                <button
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="p-2 text-[#003b00] hover:text-[#ff003c] transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body (Scrollable Report) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-6 md:p-12">
                            <article className="prose prose-invert max-w-none prose-green font-mono">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-[#00ff41] border-b-2 border-[#00ff41]/20 pb-4 mb-8 uppercase tracking-tighter" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-[#00ff41] mt-10 mb-4 uppercase flex items-center gap-3 before:content-['['] before:text-[#003b00] after:content-[']'] after:text-[#003b00]" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-[#00ff41] mt-6 mb-2 opacity-80" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-[13px] text-[#00ff41]/80" {...props} />,
                                        table: ({ node, ...props }) => (
                                            <div className="my-6 overflow-x-auto border border-[#003b00] rounded-sm bg-black">
                                                <table className="w-full text-left border-collapse" {...props} />
                                            </div>
                                        ),
                                        thead: ({ node, ...props }) => <thead className="bg-[#001a00]" {...props} />,
                                        th: ({ node, ...props }) => <th className="p-3 text-[11px] font-bold uppercase border border-[#003b00] text-[#00ff41]" {...props} />,
                                        td: ({ node, ...props }) => <td className="p-3 border border-[#003b00]/50 text-[11px] text-[#00ff41]/70" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-[12px]" {...props} />,
                                        li: ({ node, ...props }) => <li className="marker:text-[#00ff41]" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-[#1a1a1a] text-[#ff9d00] px-1.5 py-0.5 rounded font-mono border border-[#003b00]" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[#00ff41] bg-[#001100] p-4 italic my-6 text-[#00ff41]/80" {...props} />,
                                    }}
                                >
                                    {report ? report.replace(/^```markdown\n/, '').replace(/\n```$/, '') : ""}
                                </ReactMarkdown>
                            </article>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 border-t border-[#003b00] bg-[#050505] flex justify-between items-center shrink-0">
                            <span className="text-[8px] text-[#003b00] font-bold uppercase tracking-widest">
                                Report Ref: {targetUrl ? targetUrl.replace(/[^a-zA-Z]/g, '_') : 'N/A'}_${Date.now()}
                            </span>
                            <span className="text-[8px] text-[#003b00] font-bold uppercase tracking-widest">
                                DeepTechno Intelligence Systems // Forensic Data
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
