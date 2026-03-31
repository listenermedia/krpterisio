"use client";

import { useScanStore } from "../store/scanStore";
import { useState } from "react";
import { Shield, RefreshCw, Terminal, Copy, Check, ChevronDown, ChevronRight, Zap, FileDown, Table, Eye } from "lucide-react";
import { getSocket } from "@/lib/socket";
import ResponseViewer from "./ResponseViewer";

export default function NetworkTable() {
    const logs = useScanStore((state) => state.networkLogs);
    const setActiveLog = useScanStore((state) => state.setActiveNetworkLog);
    const activeLog = useScanStore((state) => state.activeNetworkLog);
    const networkAnalysis = useScanStore((state) => state.networkAnalysis);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [analyzingAll, setAnalyzingAll] = useState(false);
    const [viewingResponseLog, setViewingResponseLog] = useState<any>(null);

    const socket = getSocket();

    const handleCopy = (text: string, url: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const handleAnalyze = (log: any) => {
        if (socket) socket.emit("network:analyze", log);
    };

    const handleAnalyzeAll = () => {
        if (socket && logs.length > 0) {
            setAnalyzingAll(true);
            socket.emit("network:analyze:all", logs.slice(0, 20));
            setTimeout(() => setAnalyzingAll(false), 5000);
        }
    };

    const downloadAsCSV = (log: any) => {
        if (!log.responseBody) return;

        try {
            let data = JSON.parse(log.responseBody);
            let arrayData = Array.isArray(data) ? data : [data];

            // If it's a wrapped response like { data: [...] } or { items: [...] }
            if (!Array.isArray(data) && typeof data === 'object') {
                const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
                if (possibleArrays.length === 1) {
                    arrayData = possibleArrays[0] as any[];
                }
            }

            if (arrayData.length === 0) return;

            // Deep flatten: expands arrays into indexed columns up to maxDepth
            const flatten = (obj: any, prefix = '', depth = 0): any => {
                const result: any = {};
                const MAX_DEPTH = 3;
                for (const key in obj) {
                    const val = obj[key];
                    const name = prefix ? `${prefix}.${key}` : key;
                    if (val === null || val === undefined) {
                        result[name] = val ?? '';
                    } else if (Array.isArray(val)) {
                        if (depth >= MAX_DEPTH) {
                            // At max depth, compact JSON string
                            result[name] = JSON.stringify(val);
                        } else if (val.length === 0) {
                            result[name] = '';
                        } else if (typeof val[0] === 'object' && val[0] !== null) {
                            // Expand array of objects into indexed columns
                            val.forEach((item: any, i: number) => {
                                Object.assign(result, flatten(item, `${name}[${i}]`, depth + 1));
                            });
                        } else {
                            // Array of primitives: join with pipe separator
                            result[name] = val.join(' | ');
                        }
                    } else if (typeof val === 'object') {
                        Object.assign(result, flatten(val, name, depth));
                    } else {
                        result[name] = val;
                    }
                }
                return result;
            };

            const flattenedData = arrayData.map(item => typeof item === 'object' ? flatten(item) : { value: item });
            const headers = Array.from(new Set(flattenedData.flatMap(item => Object.keys(item))));

            const csvRows = [
                headers.join(','),
                ...flattenedData.map(row =>
                    headers.map(header => {
                        const val = row[header] !== undefined ? row[header] : '';
                        const escaped = String(val).replace(/"/g, '""');
                        return `"${escaped}"`;
                    }).join(',')
                )
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `traffic_export_${new URL(log.url).pathname.split('/').pop() || 'data'}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            const blob = new Blob([log.responseBody], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `traffic_raw_${Date.now()}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="flex flex-col h-full font-mono text-[10px] bg-[#050505] text-[#00ff41]">
            <div className="flex items-center justify-between bg-[#0a0a0a] border-b border-[#003b00] px-2 py-1">
                <div className="flex bg-[#0a0a0a] text-[#008f11] font-bold uppercase tracking-wider">
                    <div className="w-12 p-1 border-r border-[#003b00] text-center">Stat</div>
                    <div className="w-16 p-1 border-r border-[#003b00] text-center">Method</div>
                    <div className="w-20 p-1 border-r border-[#003b00] text-center">Type</div>
                    <div className="p-1 pl-2 uppercase">Traffic Flow</div>
                </div>
                <button
                    onClick={handleAnalyzeAll}
                    disabled={analyzingAll || logs.length === 0}
                    className={`flex items-center gap-1 px-2 py-0.5 border border-[#003b00] rounded text-[9px] transition-all
                        ${analyzingAll ? "opacity-50 cursor-wait" : "hover:bg-[#003b00] text-[#00ff41] hover:shadow-[0_0_10px_rgba(0,255,65,0.3)]"}
                    `}
                >
                    <Zap size={10} className={analyzingAll ? "animate-spin" : ""} />
                    {analyzingAll ? "SCANNING_ALL..." : "AI_ANALYZE_ALL"}
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="p-4 text-center text-[#003b00] italic"> // AWAITING_NETWORK_TRAFFIC...</div>
                ) : (
                    logs.slice().reverse().map((log, i) => {
                        const isExpanded = activeLog?.url === log.url;
                        const analysis = networkAnalysis[log.url];

                        return (
                            <div key={i} className="flex flex-col border-b border-[#001100]">
                                <div
                                    onClick={() => setActiveLog(isExpanded ? null : log)}
                                    className={`flex hover:bg-[#001100] whitespace-nowrap transition-colors group cursor-pointer
                                        ${isExpanded ? "bg-[#002200]" : ""}`}
                                >
                                    <div className={`w-12 p-1 text-center border-r border-[#001100] group-hover:border-[#003b00] ${log.status >= 400 ? "text-[#ff003c]" : log.status === 0 ? "text-[#ffb700]" : "text-[#00ff41]"}`}>
                                        {log.status || "PEND"}
                                    </div>
                                    <div className="w-16 p-1 text-center border-r border-[#001100] group-hover:border-[#003b00] text-[#008f11] group-hover:text-[#00ff41]">
                                        {log.method}
                                    </div>
                                    <div className="w-20 p-1 text-center border-r border-[#001100] group-hover:border-[#003b00] text-[#008f11] group-hover:text-[#00ff41] truncate">
                                        {log.type || "fetch"}
                                    </div>
                                    <div className="flex-1 p-1 pl-2 border-r border-[#001100] group-hover:border-[#003b00] text-[#008f11] group-hover:text-[#00ff41] truncate" title={log.url}>
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                            {log.url.split("/").pop() || log.url}
                                            <span className="text-[#003b00] group-hover:text-[#008f11] opacity-60">
                                                {(() => {
                                                    try { return `(${new URL(log.url).hostname})`; } catch { return ""; }
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-16 p-1 text-right border-r border-[#001100] group-hover:border-[#003b00] text-[#008f11]">
                                        {log.size ? (log.size > 1024 ? `${(log.size / 1024).toFixed(1)}K` : `${log.size}B`) : "-"}
                                    </div>
                                    <div className="w-16 p-1 text-right text-[#008f11]">
                                        {log.time ? `${log.time}ms` : "-"}
                                    </div>
                                </div>

                                {/* Expanded Detail View */}
                                {isExpanded && (
                                    <div className="p-3 bg-[#020a02] border-l border-r border-[#003b00] flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1 max-w-[70%]">
                                                <div className="text-[9px] text-[#008f11] opacity-70 uppercase tracking-tighter">Full Resource Path</div>
                                                <div className="text-[#00ff41] break-all border border-[#003b00]/30 p-1 bg-black/50 rounded">{log.url}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAnalyze(log); }}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-[#003b00]/20 border border-[#003b00] rounded hover:bg-[#003b00]/40 text-[#00ff41] transition-all"
                                                >
                                                    <Shield size={12} className={!analysis ? "animate-pulse" : ""} />
                                                    {analysis ? "RE-ANALYZE" : "AI_SECURITY_AUDIT"}
                                                </button>
                                                {log.responseBody && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewingResponseLog(log); }}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#1a003b]/20 border border-[#2b004d] rounded hover:bg-[#1a003b]/40 text-[#d2a8ff] transition-all"
                                                            title="View Response Body"
                                                        >
                                                            <Eye size={12} />
                                                            VIEW_RESPONSE
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); downloadAsCSV(log); }}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#001a3b]/20 border border-[#002b4d] rounded hover:bg-[#001a3b]/40 text-[#00a2ff] transition-all"
                                                            title="Download Response as CSV"
                                                        >
                                                            <FileDown size={12} />
                                                            EXPORT_CSV
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="text-[#00ff41] border-b border-[#003b00] pb-1 flex items-center gap-1">
                                                    <Zap size={10} /> PURPOSE_EXPLORER
                                                </div>
                                                <div className="text-[#008f11] leading-relaxed italic">
                                                    {analysis ? analysis.purpose : "// AWAITING_AI_CONTEXT..."}
                                                </div>

                                                <div className="text-[#ff003c] border-b border-[#003b00] pb-1 mt-4 flex items-center gap-1">
                                                    <Shield size={10} /> SECURITY_INSIGHTS
                                                </div>
                                                <div className="text-[#ff003c]/80 leading-relaxed font-bold">
                                                    {analysis ? analysis.vulnerabilities : "// ANALYZE_FOR_VULNS..."}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-[#00ff41] border-b border-[#003b00] pb-1 flex items-center gap-2">
                                                    <Terminal size={10} /> CURL_COMMAND_GENERATOR
                                                    {analysis && (
                                                        <button
                                                            onClick={() => handleCopy(analysis.curl, log.url)}
                                                            className="ml-auto text-[8px] flex items-center gap-1 hover:text-white"
                                                        >
                                                            {copiedUrl === log.url ? <Check size={8} /> : <Copy size={8} />}
                                                            {copiedUrl === log.url ? "COPIED" : "COPY"}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="relative group/curl">
                                                    <pre className="text-[9px] text-gray-400 bg-black p-2 rounded border border-[#003b00]/30 whitespace-pre-wrap break-all max-h-40 overflow-y-auto custom-scrollbar leading-tight">
                                                        {analysis ? analysis.curl : `curl -X ${log.method} "${log.url}" \\ \n  -H "User-Agent: DeepTechno-Scanner/1.0"`}
                                                    </pre>
                                                </div>
                                                {log.postData && (
                                                    <div className="mt-2">
                                                        <div className="text-[#008f11] opacity-50 mb-1">PAYLOAD_DATA:</div>
                                                        <pre className="text-[8px] text-blue-300 bg-black p-1 truncate cursor-help" title={log.postData}>{log.postData}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Response Viewer Modal */}
            {viewingResponseLog && viewingResponseLog.responseBody && (
                <ResponseViewer
                    responseBody={viewingResponseLog.responseBody}
                    url={viewingResponseLog.url}
                    onClose={() => setViewingResponseLog(null)}
                />
            )}
        </div>
    );
}
