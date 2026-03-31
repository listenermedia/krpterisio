"use client";

import { useState, useRef, useEffect } from "react";
import { useScanStore } from "../store/scanStore";
import { getSocket } from "@/lib/socket";
import { Terminal, Send, Trash2, ChevronRight, XCircle, AlertCircle, Info, Hash } from "lucide-react";

export default function BrowserConsole() {
    const { consoleLogs, clearConsole } = useScanStore();
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const socket = getSocket();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [consoleLogs]);

    const handleInject = () => {
        if (!input.trim()) return;

        socket.emit("console:inject", { code: input.trim() });
        setHistory(prev => [input.trim(), ...prev.slice(0, 49)]); // Keep last 50 commands
        setHistoryIndex(-1);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleInject();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const nextIndex = historyIndex + 1;
            if (nextIndex < history.length) {
                setHistoryIndex(nextIndex);
                setInput(history[nextIndex]);
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIndex = historyIndex - 1;
            if (nextIndex >= -1) {
                setHistoryIndex(nextIndex);
                setInput(nextIndex === -1 ? "" : history[nextIndex]);
            }
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'error': return <XCircle size={12} className="text-red-500" />;
            case 'warning': return <AlertCircle size={12} className="text-yellow-500" />;
            case 'info': return <Info size={12} className="text-blue-400" />;
            default: return <ChevronRight size={12} className="text-[#00ff41] opacity-50" />;
        }
    };

    const getLogStyle = (type: string) => {
        switch (type) {
            case 'error': return "text-red-400 bg-red-900/10 border-l-2 border-red-500";
            case 'warning': return "text-yellow-400 bg-yellow-900/10 border-l-2 border-yellow-500";
            case 'info': return "text-blue-300 bg-blue-900/10 border-l-2 border-blue-500";
            default: return "text-[#00ff41] border-l-2 border-[#00ff41]/30";
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] font-mono text-[11px]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#003b00] bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-[#00ff41]" />
                    <span className="font-bold tracking-widest text-[#00ff41] uppercase">Browser_Console</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-[#003b00]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                        <span className="text-[9px] text-[#008f11]">LIVE_STREAM</span>
                    </div>
                    <button
                        onClick={clearConsole}
                        className="p-1.5 hover:bg-[#1a0000] rounded text-[#008f11] hover:text-red-500 transition-colors"
                        title="Clear Console"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Log View */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar scroll-smooth"
            >
                {consoleLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2 select-none">
                        <Hash size={32} />
                        <span className="text-[10px] uppercase tracking-[0.3em]">No_Runtime_Events</span>
                    </div>
                ) : (
                    consoleLogs.map((log, i) => (
                        <div key={i} className={`group flex gap-2 p-1.5 rounded transition-colors hover:bg-white/5 ${getLogStyle(log.type)}`}>
                            <div className="shrink-0 mt-0.5">
                                {getLogIcon(log.type)}
                            </div>
                            <div className="flex-1 break-all whitespace-pre-wrap leading-relaxed">
                                <span className="text-[10px] opacity-40 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                {log.text}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input View */}
            <div className="p-3 bg-[#0a0a0a] border-t border-[#003b00]">
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ff41] opacity-50 font-bold group-focus-within:opacity-100 transition-opacity">
                        &gt;
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Inject JavaScript code into current session..."
                        className="w-full bg-black border border-[#003b00] rounded-lg py-2 pl-8 pr-12 text-[#00ff41] placeholder:text-[#003b00] focus:outline-none focus:border-[#00ff41] transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                    />
                    <button
                        onClick={handleInject}
                        disabled={!input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#003b00] text-[#008f11] hover:text-[#00ff41] rounded transition-all disabled:opacity-0"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <div className="mt-2 flex justify-between items-center px-1">
                    <span className="text-[8px] text-[#003b00] uppercase font-bold tracking-tighter">
                        Evaluation_Context: DOM_Window
                    </span>
                    <span className="text-[8px] text-[#003b00] italic">
                        ArrowUp/Down for history
                    </span>
                </div>
            </div>
        </div>
    );
}
