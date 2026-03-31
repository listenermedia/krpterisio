import { create } from "zustand";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface ConsoleLog {
    type: string;
    text: string;
    timestamp: number;
}

interface ScanStats {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

interface Finding {
    vulnerability: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    details: string;
    location: string;
}

export interface IntelligenceData {
    businessImpact: string;
    exploitLikelihood: number; // 0-100
    remediationSuggestions: string[];
    codeRewrites: { file: string; original: string; fixed: string; explanation: string }[];
}

interface NetworkLog {
    id: string; // Unique ID for matching requests
    method: string;
    url: string;
    status: number;
    type?: string;
    size?: number;
    time?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    postData?: string;
    responseBody?: string;
    statusCode?: number;
    contentType?: string;
}

export interface ScanSession {
    id: string;
    url: string;
    timestamp: number;
    status: "idle" | "scanning" | "complete";
    findings: Finding[];
    stats: ScanStats;
    networkLogs: NetworkLog[];
    sources: string[];
    chatHistory: ChatMessage[];
    consoleLogs: ConsoleLog[];
    sourceAnalysis: Record<string, any[]>;
    networkAnalysis: Record<string, any>;
    report?: string;
    intelligence?: IntelligenceData;
}

interface ScanState {
    status: "idle" | "scanning" | "complete";
    targetUrl: string;
    stats: ScanStats;
    findings: Finding[];
    networkLogs: NetworkLog[];
    sources: string[]; // List of discovered file URLs
    activeTab: "dashboard" | "scans" | "findings" | "network" | "settings";
    currentScreenshot: string | null;
    activeSource: string | null;
    activeSourceContent: string | null;
    activeFolder: string | null;
    activeNetworkLog: NetworkLog | null;
    sourceAnalysis: Record<string, any[]>; // map of url -> insights
    networkAnalysis: Record<string, any>; // map of url -> AI insight {purpose, curl, vulnerabilities}
    isAnalyzingSource: boolean;
    chatMessages: ChatMessage[];
    consoleLogs: ConsoleLog[];
    sessions: ScanSession[];
    report: string | null;
    sidebarTab: "history" | "reports" | "intelligence";
    intelligenceData: IntelligenceData | null;

    setTargetUrl: (url: string) => void;
    setStatus: (status: ScanState["status"]) => void;
    setActiveTab: (tab: ScanState["activeTab"]) => void;
    setScreenshot: (data: string | null) => void;

    addFinding: (finding: Finding) => void;
    addNetworkLog: (log: NetworkLog) => void;
    addSource: (url: string) => void;
    setSourceContent: (url: string | null, content: string | null) => void;
    setActiveFolder: (folderString: string | null) => void;
    setActiveNetworkLog: (log: NetworkLog | null) => void;
    setSourceAnalysis: (url: string, results: any[]) => void;
    setNetworkAnalysis: (url: string, analysis: any) => void;
    setAnalyzingSource: (analyzing: boolean) => void;
    addChatMessage: (message: Omit<ChatMessage, "timestamp">) => void;
    clearChat: () => void;
    addConsoleLog: (log: ConsoleLog) => void;
    clearConsole: () => void;
    setSessions: (sessions: ScanSession[]) => void;
    loadSession: (session: ScanSession) => void;
    resetScan: () => void;
    setReport: (report: string | null) => void;
    setSidebarTab: (tab: "history" | "reports" | "intelligence") => void;
    setIntelligenceData: (data: IntelligenceData | null) => void;
}

export const useScanStore = create<ScanState>((set) => ({
    status: "idle",
    targetUrl: "",
    stats: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    findings: [],
    networkLogs: [],
    sources: [],
    activeTab: "dashboard",
    currentScreenshot: null,
    activeSource: null,
    activeSourceContent: null,
    activeFolder: null,
    activeNetworkLog: null,
    sourceAnalysis: {},
    networkAnalysis: {},
    isAnalyzingSource: false,
    chatMessages: [],
    consoleLogs: [],
    sessions: [],
    report: null,
    sidebarTab: "history",
    intelligenceData: null,

    setTargetUrl: (url) => set({ targetUrl: url }),
    setStatus: (status) => set({ status: status }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setScreenshot: (data) => set({ currentScreenshot: data }),

    addFinding: (finding) =>
        set((state) => {
            const newStats = { ...state.stats };
            newStats[finding.severity]++;
            return {
                findings: [...state.findings, finding],
                stats: newStats,
            };
        }),

    addNetworkLog: (log) =>
        set((state) => ({
            networkLogs: [...state.networkLogs, log],
            status: state.status === "idle" ? "scanning" : state.status
        })),

    addSource: (url) =>
        set((state) => {
            if (state.sources.includes(url)) return state;
            return { sources: [...state.sources, url] };
        }),

    setSourceContent: (url, content) => set({ activeSource: url, activeSourceContent: content, activeFolder: null }),
    setActiveFolder: (folderString) => set({ activeFolder: folderString, activeSource: null, activeSourceContent: null }),

    setActiveNetworkLog: (log) => set({ activeNetworkLog: log }),

    setSourceAnalysis: (url, results) =>
        set((state) => {
            return {
                sourceAnalysis: { ...state.sourceAnalysis, [url]: results },
                isAnalyzingSource: false,
            };
        }),

    setNetworkAnalysis: (url, analysis) =>
        set((state) => ({
            networkAnalysis: { ...state.networkAnalysis, [url]: analysis }
        })),

    setAnalyzingSource: (analyzing) => set({ isAnalyzingSource: analyzing }),

    addChatMessage: (message) =>
        set((state) => ({
            chatMessages: [...state.chatMessages, { ...message, timestamp: Date.now() }],
        })),

    clearChat: () => set({ chatMessages: [] }),

    addConsoleLog: (log) =>
        set((state) => ({
            consoleLogs: [...state.consoleLogs.slice(-499), log], // Keep last 500 logs
        })),

    clearConsole: () => set({ consoleLogs: [] }),

    setSessions: (sessions) => set({ sessions }),

    loadSession: (session) =>
        set({
            targetUrl: session.url,
            status: session.status,
            findings: session.findings,
            stats: session.stats,
            networkLogs: session.networkLogs,
            sources: session.sources,
            chatMessages: session.chatHistory,
            consoleLogs: session.consoleLogs,
            sourceAnalysis: session.sourceAnalysis,
            networkAnalysis: session.networkAnalysis,
            report: session.report,
            intelligenceData: session.intelligence || null,
            currentScreenshot: null,
            activeSource: null,
            activeSourceContent: null,
            activeFolder: null,
            activeNetworkLog: null,
        }),

    resetScan: () =>
        set({
            status: "idle",
            targetUrl: "",
            stats: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
            findings: [],
            networkLogs: [],
            sources: [],
            currentScreenshot: null,
            activeFolder: null,
            sourceAnalysis: {},
            networkAnalysis: {},
            isAnalyzingSource: false,
            chatMessages: [],
            consoleLogs: [],
            report: null,
            intelligenceData: null,
        }),
    setReport: (report) => set({ report }),
    setSidebarTab: (tab) => set({ sidebarTab: tab }),
    setIntelligenceData: (data) => set({ intelligenceData: data }),
}));
