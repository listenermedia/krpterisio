import { useEffect, useState, useRef } from "react";
import { useScanStore } from "../store/scanStore";
import NetworkTable from "../components/NetworkTable";
import FindingsList from "../components/FindingsList";
import SourceTree from "../components/SourceTree";
import { RefreshCw, Shield, Globe, Terminal, Activity, FileCode, Bug, Search, Folder } from "lucide-react";
import { getSocket } from "@/lib/socket";
import AIChat from "../components/AIChat";
import BrowserConsole from "../components/BrowserConsole";
import LeftSidebar from "../components/LeftSidebar";
import SplashScreen from "../components/SplashScreen";
import TerminalComponent from "../components/Terminal";

export default function HackerBrowser() {
    const {
        stats,
        findings,
        targetUrl,
        status,
        setTargetUrl,
        setStatus,
        setScreenshot,
        currentScreenshot,
        addNetworkLog,
        addFinding,
        addSource,
        setSourceContent,
        activeSource,
        activeSourceContent,
        activeFolder,
        setActiveFolder,
        activeNetworkLog,
        setActiveNetworkLog,
        resetScan,
        isAnalyzingSource,
        sourceAnalysis,
        setSourceAnalysis,
        setAnalyzingSource,
        sources,
        addConsoleLog
    } = useScanStore();

    const [urlInput, setUrlInput] = useState("");
    const [activePanel, setActivePanel] = useState<"terminal" | "network" | "sources" | "findings" | "console">("terminal");
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [panelHeight, setPanelHeight] = useState(256);
    const [isDragging, setIsDragging] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    const socket = getSocket();

    useEffect(() => {
        // Initialize Socket listeners
        socket.on("scan:log", (log: any) => {
            addNetworkLog(log);
            setStatus("scanning");
        });

        socket.on("scan:finding", (finding: any) => {
            addFinding(finding);
        });

        socket.on("scan:screenshot", (data: string) => {
            setScreenshot(data);
        });

        socket.on("scan:source", (url: string) => {
            addSource(url);
        });

        socket.on("scan:console", (log: any) => {
            addConsoleLog(log);
        });

        socket.on("scan:source-content", (payload: { url: string, content: string }) => {
            setSourceContent(payload.url, payload.content);
            setActivePanel("sources");
        });

        socket.on("source:analysis:result", (payload: { url: string, results: any[] }) => {
            setSourceAnalysis(payload.url, payload.results);
        });

        socket.on("source:analysis:result:all", (payload: { results: any[] }) => {
            // Group findings by file or store them globally. Easiest is to store under 'ALL_SOURCES'
            setSourceAnalysis('ALL_SOURCES', payload.results);
            // Auto switch view to the ALL_SOURCES
            setSourceContent('ALL_SOURCES', '// MASS ANALYSIS COMPLETE.\n// See AI Security Insights panel for details across all files.');
        });

        socket.on("network:analysis:result", (payload: { url: string, analysis: any }) => {
            useScanStore.getState().setNetworkAnalysis(payload.url, payload.analysis);
        });

        socket.on("network:analysis:result:all", (payload: { results: Record<string, any> }) => {
            // results is map of url -> analysis
            Object.entries(payload.results).forEach(([url, analysis]) => {
                useScanStore.getState().setNetworkAnalysis(url, analysis);
            });
        });

        const handleSourceClick = (e: any) => {
            const url = e.detail;
            if (socket) socket.emit("scan:get-source", url);
        };

        const handleFolderClick = (e: any) => {
            const path = e.detail;
            setActiveFolder(path);
        };

        window.addEventListener("source:click", handleSourceClick);
        window.addEventListener("folder:click", handleFolderClick);

        return () => {
            socket.off("scan:log");
            socket.off("scan:finding");
            socket.off("scan:screenshot");
            socket.off("scan:source");
            socket.off("scan:finished");
            socket.off("scan:source-content");
            socket.off("source:analysis:result");
            socket.off("source:analysis:result:all");
            socket.off("network:analysis:result");
            socket.off("network:analysis:result:all");
            socket.off("scan:console");
            window.removeEventListener("source:click", handleSourceClick);
            window.removeEventListener("folder:click", handleFolderClick);
        }
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            // Calculate new height based on mouse position (bottom panel)
            const newHeight = window.innerHeight - e.clientY;
            // Constrain constraints: min 100px, max windowHeight - 100px
            if (newHeight > 100 && newHeight < window.innerHeight - 100) {
                setPanelHeight(newHeight);
                if (!isPanelOpen) setIsPanelOpen(true);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isPanelOpen]);

    const handleNavigate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput) return;

        // Normalize URL
        let target = urlInput;
        const isLocal = target.includes("localhost") || target.includes("127.0.0.1");
        if (!target.startsWith("http") && !isLocal) {
            target = `https://${target}`;
        } else if (!target.startsWith("http") && isLocal) {
            target = `http://${target}`;
        }

        // Reset previous state
        resetScan();
        setTargetUrl(target);
        setStatus("scanning");

        // Trigger Scan/Navigate
        if (socket) socket.emit("scan:start", { url: target });
    };

    if (showSplash) {
        return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-[#00ff41] font-mono overflow-hidden selection:bg-[#003b00] selection:text-[#00ff41]">

            {/* 1. BROWSER TOP BAR */}
            <header className="h-12 border-b border-[#003b00] bg-[#0a0a0a] flex items-center px-4 space-x-4 shrink-0">
                <div className="flex items-center space-x-2 text-[#00ff41]">
                    <Shield size={20} className="animate-pulse" />
                    <span className="font-bold tracking-widest text-lg hidden md:block">KRPTERISIO_V1</span>
                </div>

                {/* Address Bar */}
                <form onSubmit={handleNavigate} className="flex-1 flex items-center">
                    <div className="flex-1 flex items-center bg-[#000] border border-[#003b00] h-8 px-2 focus-within:border-[#00ff41] transition-colors relative group">
                        <Globe size={14} className="text-[#008f11] mr-2 group-focus-within:text-[#00ff41]" />
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="ENTER_TARGET_SYSTEM_URL..."
                            className="bg-transparent border-none outline-none w-full text-sm text-[#00ff41] placeholder-[#003b00]"
                        />
                        <button type="submit" className="text-[#008f11] hover:text-[#00ff41]">
                            <Search size={14} />
                        </button>
                    </div>
                </form>

                {/* Controls */}
                <div className="flex space-x-4 text-xs">
                    <div className="flex flex-col items-center">
                        <span className="text-[#ff003c] font-bold">{stats.critical}</span>
                        <span className="text-[10px] text-[#008f11]">CRIT</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[#00ff41] font-bold">{findings.length}</span>
                        <span className="text-[10px] text-[#008f11]">VULN</span>
                    </div>
                    <button onClick={() => window.location.reload()} className="hover:text-[#fff] transition-colors">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {/* 2. MAIN LAYOUT WITH SIDEBARS */}
            <div className="flex-1 flex overflow-hidden">
                <LeftSidebar />
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* VIEWPORT (Interactive Image) */}
                    <main className="flex-1 relative bg-[#000] overflow-hidden flex items-center justify-center">
                        {currentScreenshot ? (
                            <img
                                src={currentScreenshot}
                                alt="Remote Browser View"
                                tabIndex={0}
                                className="max-w-full max-h-full object-contain cursor-crosshair outline-none"
                                onClick={(e) => {
                                    const img = e.currentTarget;
                                    const rect = img.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    const scaleX = img.naturalWidth / rect.width;
                                    const scaleY = img.naturalHeight / rect.height;
                                    if (socket) socket.emit("interaction:click", { x: x * scaleX, y: y * scaleY });
                                }}
                                onKeyDown={(e) => {
                                    const modifiers = ["Shift", "Control", "Alt", "Meta"];
                                    if (modifiers.includes(e.key)) return; // Ignore standalone modifiers

                                    // Don't scroll page or trigger browser shortcuts when typing in remote view
                                    if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Backspace", "Enter"].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                    if (socket) socket.emit("interaction:type", e.key);
                                }}
                                onWheel={(e) => {
                                    if (socket) socket.emit("interaction:scroll", e.deltaY);
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center opacity-50 text-center px-8">
                                <div className="w-16 h-16 border border-[#003b00] flex items-center justify-center mb-4 animate-pulse">
                                    <span className="text-4xl">█</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[#00ff41] tracking-widest text-xs uppercase font-bold">
                                        {status === 'scanning' ? 'ESTABLISHING_REMOTE_LINK' : 'SYSTEM_STANDBY // WAITING_FOR_INPUT'}
                                    </p>
                                    {targetUrl && (
                                        <p className="text-[#008f11] text-[10px] font-mono break-all max-w-md">
                                            TARGET: {targetUrl}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* DEVTOOLS PANEL (Collapsible) */}
                    <div
                        className={`border-t border-[#003b00] bg-[#0a0a0a] flex flex-col relative ${!isDragging ? "transition-all duration-300" : ""}`}
                        style={{ height: isPanelOpen ? `${panelHeight}px` : '32px' }}
                    >
                        {/* Resizer Handle */}
                        <div
                            className="absolute top-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-[#00ff41] z-50 transition-colors"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                        />

                        {/* Tab Bar */}
                        <div className="h-8 flex border-b border-[#003b00] bg-[#050505]">
                            <button
                                onClick={() => setIsPanelOpen(!isPanelOpen)}
                                className="px-2 border-r border-[#003b00] hover:bg-[#003b00] text-[#008f11] hover:text-[#00ff41]"
                            >
                                {isPanelOpen ? "▼" : "▲"}
                            </button>
                            {[
                                { id: "terminal", icon: Terminal, label: "TERMINAL" },
                                { id: "network", icon: Activity, label: "LIVE REQUESTS" },
                                { id: "sources", icon: FileCode, label: "SOURCES" },
                                { id: "findings", icon: Bug, label: "FINDINGS" },
                                { id: "console", icon: Terminal, label: "CONSOLE" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActivePanel(tab.id as any); setIsPanelOpen(true); }}
                                    className={`px-4 flex items-center text-xs tracking-wider border-r border-[#003b00] hover:bg-[#001100] transition-colors
                                        ${activePanel === tab.id ? "bg-[#003b00] text-[#00ff41]" : "text-[#008f11]"}`}
                                >
                                    <tab.icon size={12} className="mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                            <div className="flex-1"></div>
                            <div className="px-2 flex items-center text-[10px] text-[#008f11]">
                                STATUS: {socket?.connected ? "CONNECTED" : "OFFLINE"}
                            </div>
                        </div>

                        {/* Panel Content */}
                        {isPanelOpen && (
                            <div className="flex-1 overflow-hidden relative bg-[#050505] flex">
                                <div className="flex-1 overflow-hidden relative">
                                    <div style={{ display: activePanel === "terminal" ? "block" : "none", height: "100%", width: "100%" }}>
                                        <TerminalComponent />
                                    </div>
                                    {activePanel === "network" && <NetworkTable />}
                                    {activePanel === "sources" && (
                                        <div className="h-full flex overflow-hidden">
                                            <div className="w-64 border-r border-[#003b00] overflow-auto custom-scrollbar">
                                                <SourceTree />
                                            </div>
                                            <div className="flex-1 flex flex-col overflow-hidden bg-[#000]">
                                                {/* Source Viewer Header with Analyze Button */}
                                                <div className="h-10 border-b border-[#003b00] flex items-center justify-between px-4 bg-[#0a0a0a] shrink-0">
                                                    <div className="text-[#008f11] text-[10px] uppercase tracking-tighter truncate max-w-md">
                                                        {activeFolder ? `FOLDER: ${activeFolder}` : `FILE: ${activeSource === 'ALL_SOURCES' ? 'MULTI_FILE_MASS_ANALYSIS' : activeSource?.split('/').pop()}`}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                if (socket && sources.length > 0) {
                                                                    setAnalyzingSource(true);
                                                                    const payload = sources.map((url: string) => ({
                                                                        url,
                                                                        content: "// Server will fetch via crawler cache",
                                                                        fileName: url.split('/').pop() || 'unknown'
                                                                    }));
                                                                    socket.emit("source:analyze:all", payload);
                                                                }
                                                            }}
                                                            disabled={isAnalyzingSource || sources.length === 0}
                                                            className={`flex items-center space-x-2 px-3 py-1 text-[10px] font-bold border transition-all
                                                                ${isAnalyzingSource
                                                                    ? "border-[#003b00] text-[#003b00] animate-pulse"
                                                                    : "border-[#ff9d00] text-[#ff9d00] hover:bg-[#ff9d00] hover:text-[#000]"}`}
                                                        >
                                                            <Activity size={12} className={isAnalyzingSource ? "animate-spin" : ""} />
                                                            <span>{isAnalyzingSource ? "ANALYZING..." : "ANALYZE_ALL_SOURCES"}</span>
                                                        </button>

                                                        {activeFolder && (
                                                            <button
                                                                onClick={() => {
                                                                    if (socket && sources.length > 0) {
                                                                        setAnalyzingSource(true);
                                                                        // Filter sources that belong to this folder path
                                                                        const folderUrls = sources.filter(url => url.startsWith(activeFolder));
                                                                        const payload = folderUrls.map((url: string) => ({
                                                                            url,
                                                                            content: "// Server will fetch via crawler cache",
                                                                            fileName: url.split('/').pop() || 'unknown'
                                                                        }));

                                                                        socket.emit("source:analyze:all", payload);
                                                                    }
                                                                }}
                                                                disabled={isAnalyzingSource || sources.filter(url => url.startsWith(activeFolder!)).length === 0}
                                                                className={`flex items-center space-x-2 px-3 py-1 text-[10px] font-bold border transition-all
                                                                    ${isAnalyzingSource
                                                                        ? "border-[#003b00] text-[#003b00] animate-pulse"
                                                                        : "border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#000]"}`}
                                                            >
                                                                <Activity size={12} className={isAnalyzingSource ? "animate-spin" : ""} />
                                                                <span>{isAnalyzingSource ? "ANALYZING..." : "ANALYZE_FOLDER"}</span>
                                                            </button>
                                                        )}

                                                        {activeSource && activeSource !== 'ALL_SOURCES' && !activeFolder && (
                                                            <button
                                                                onClick={() => {
                                                                    if (socket && activeSource && activeSourceContent) {
                                                                        setAnalyzingSource(true);
                                                                        socket.emit("source:analyze", {
                                                                            url: activeSource,
                                                                            content: activeSourceContent,
                                                                            fileName: activeSource.split('/').pop()
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={isAnalyzingSource}
                                                                className={`flex items-center space-x-2 px-3 py-1 text-[10px] font-bold border transition-all
                                                                    ${isAnalyzingSource
                                                                        ? "border-[#003b00] text-[#003b00] animate-pulse"
                                                                        : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#000]"}`}
                                                            >
                                                                <Activity size={12} className={isAnalyzingSource ? "animate-spin" : ""} />
                                                                <span>{isAnalyzingSource ? "ANALYZING..." : "AI_SEC_AUDIT"}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 flex overflow-hidden">
                                                    {/* Code viewer */}
                                                    <div className="flex-1 overflow-auto p-4 custom-scrollbar text-[11px]">
                                                        {activeFolder ? (
                                                            <div className="h-full flex flex-col items-center justify-center text-[#008f11] italic space-y-4">
                                                                <Folder size={48} className="text-[#003b00]" />
                                                                <div>// FOLDER_SELECTED: {activeFolder}</div>
                                                                <div className="text-[10px] text-[#003b00]">
                                                                    CONTAINS {sources.filter(url => url.startsWith(activeFolder)).length} IDENTIFIED FILES
                                                                </div>
                                                            </div>
                                                        ) : activeSourceContent ? (
                                                            <pre className="text-[#00ff41] whitespace-pre-wrap font-mono">
                                                                <code>{activeSourceContent}</code>
                                                            </pre>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-[#003b00] italic">
                                                                // SELECT_A_SOURCE_FILE_OR_FOLDER_TO_INSPECT
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* AI Insights Sidebar */}
                                                    {activeSource && sourceAnalysis[activeSource] && (
                                                        <div className="w-80 border-l border-[#003b00] bg-[#0a0a0a] overflow-auto p-3 text-[10px] custom-scrollbar animate-in slide-in-from-right duration-300">
                                                            <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-[#003b00]">
                                                                <Bug size={14} className="text-[#ff003c]" />
                                                                <h4 className="text-[#00ff41] font-bold uppercase tracking-wider">AI Security Insights</h4>
                                                            </div>

                                                            <div className="space-y-4">
                                                                {sourceAnalysis[activeSource].map((insight: any, idx: number) => (
                                                                    <div key={idx} className="bg-[#000] border border-[#011] p-3 rounded-sm">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="font-bold uppercase tracking-tighter text-[#00ff41]">{insight.vulnerability}</span>
                                                                            <span className={`px-1.5 py-0.5 rounded-xs font-black text-[8px] 
                                                                                ${insight.severity === 'CRITICAL' || insight.severity === 'HIGH' ? 'bg-[#ff003c] text-[#fff]' :
                                                                                    insight.severity === 'MEDIUM' ? 'bg-[#ff9d00] text-[#000]' : 'bg-[#00ff41] text-[#000]'}`}>
                                                                                {insight.severity}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[#008f11] leading-relaxed mb-3">{insight.explanation}</p>
                                                                        {insight.lines && <div className="mb-2 text-[#00ff41] opacity-60">Lines: {insight.lines}</div>}
                                                                        <div className="border-t border-[#001100] pt-2 mt-2">
                                                                            <div className="text-[9px] text-[#003b00] font-bold mb-1 underline tracking-widest italic">PROPOSED_FIX:</div>
                                                                            <p className="text-[#fff] bg-[#001100] p-2 border-l-2 border-[#00ff41] italic">{insight.fix}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {sourceAnalysis[activeSource].length === 0 && (
                                                                    <div className="text-[#003b00] italic text-center py-10">// NO_THREATS_DETECTED</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activePanel === "findings" && (
                                        <div className="h-full overflow-auto">
                                            <FindingsList />
                                        </div>
                                    )}
                                    {activePanel === "console" && <BrowserConsole />}
                                </div>

                                {/* Details Sidebar for Network/Findings */}
                                {isPanelOpen && activePanel === "network" && activeNetworkLog && (
                                    <div className="w-80 border-l border-[#003b00] bg-[#0a0a0a] overflow-auto p-3 text-[10px] custom-scrollbar">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-[#00ff41] font-bold uppercase tracking-wider">Request Details</h4>
                                            <button onClick={() => setActiveNetworkLog(null)} className="text-[#008f11] hover:text-[#00ff41]">×</button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-[#003b00] uppercase mb-1">General</div>
                                                <div className="bg-[#000] p-2 border border-[#001100]">
                                                    <div><span className="text-[#008f11]">URL:</span> {activeNetworkLog.url}</div>
                                                    <div><span className="text-[#008f11]">Method:</span> {activeNetworkLog.method}</div>
                                                    <div><span className="text-[#008f11]">Status:</span> {activeNetworkLog.status}</div>
                                                </div>
                                            </div>
                                            {activeNetworkLog.type && (
                                                <div>
                                                    <div className="text-[#003b00] uppercase mb-1">Response Headers</div>
                                                    <div className="bg-[#000] p-2 border border-[#001100] break-words">
                                                        <div><span className="text-[#008f11]">content-type:</span> {activeNetworkLog.type}</div>
                                                        {activeNetworkLog.size && <div><span className="text-[#008f11]">content-size:</span> {activeNetworkLog.size} bytes</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <AIChat />
            </div>
        </div>
    );
}
