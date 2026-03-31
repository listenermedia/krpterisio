"use client";

import { useState, useRef, useEffect } from "react";
import { useScanStore } from "../store/scanStore";
import { getSocket } from "@/lib/socket";
import { Send, Bot, User, ChevronRight, ChevronLeft, Sparkles, MessageSquare, Terminal, Shield, Square, Copy, Check, Trash2, RotateCcw } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 bg-[#1a1a1a] border border-[#003b00] rounded hover:border-[#00ff41] transition-colors group relative"
            title="Copy selection"
        >
            {copied ? (
                <Check size={12} className="text-[#00ff41]" />
            ) : (
                <Copy size={12} className="text-[#008f11] group-hover:text-[#00ff41]" />
            )}
        </button>
    );
}

// Ensure tables and lists have proper spacing for markdown parsing
const preprocessMarkdown = (content: string) => {
    // Ensure tables have a newline before them (GFM requirement)
    // Matches any line that doesn't start with | or newline, followed by a line starting with |
    return content.replace(/([^\n])\n\|/g, '$1\n\n|');
};

export default function AIChat() {
    const {
        chatMessages, addChatMessage, clearChat, consoleLogs, addConsoleLog,
        targetUrl, status, findings, networkLogs, sources, setActiveTab,
        setTargetUrl, setStatus, stats, sourceAnalysis, networkAnalysis,
        setSidebarTab
    } = useScanStore();
    const [input, setInput] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [width, setWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isAwaiting = useRef(false);
    const socket = getSocket();

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages, isTyping]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 200 && newWidth < 800) {
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

    useEffect(() => {
        socket.on("chat:response", (content: string) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            isAwaiting.current = false;
            addChatMessage({ role: "assistant", content });
            setIsTyping(false);
        });

        // Listen for actions from the AI agent
        socket.on("chat:actions", (actions: any[]) => {
            actions.forEach((action: any) => {
                switch (action.type) {
                    case 'browse_external':
                        if (action.url) {
                            window.open(action.url, '_blank');
                        }
                        break;
                    case 'start_scan':
                        if (action.url) {
                            setTargetUrl(action.url);
                            setStatus('scanning');
                            socket.emit('scan:start', { url: action.url });
                        }
                        break;
                    case 'switch_tab':
                        if (action.tab) {
                            setActiveTab(action.tab as any);
                        }
                        break;
                    case 'inject_js':
                        // Server handles AI injection directly now
                        console.log("[AIChat] AI-Triggered JS Injection detected");
                        break;
                    case 'generate_report':
                        if (targetUrl) {
                            setSidebarTab('reports');
                            socket.emit("report:generate", {
                                url: targetUrl,
                                timestamp: Date.now(),
                                findings,
                                networkLogs,
                                consoleLogs,
                                sourceAnalysis,
                                networkAnalysis,
                                stats
                            });
                        }
                        break;
                }
            });
        });

        return () => {
            socket.off("chat:response");
            socket.off("chat:actions");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleSend = () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        addChatMessage({ role: "user", content: userMsg });
        setInput("");
        setIsTyping(true);
        isAwaiting.current = true;

        const stateContext = {
            targetUrl,
            status,
            findings: findings.slice(0, 20).map(f => ({
                vulnerability: f.vulnerability,
                severity: f.severity,
                details: f.details,
                location: f.location
            })),
            networkLogs: networkLogs.slice(0, 30).map(l => ({
                url: l.url,
                method: l.method,
                status: l.status,
                type: l.type || '',
                size: l.size || 0,
                responseBody: l.responseBody ? l.responseBody.substring(0, 800) : ''
            })),
            consoleLogs: consoleLogs.slice(-20).map(l => ({
                type: l.type,
                text: l.text,
                timestamp: l.timestamp
            })),
            sources: sources,
            sourcesCount: sources.length
        };

        // Safety timeout: If server doesn't respond in 60 seconds, reset typing state
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        console.log(`[AIChat] Socket event "chat:message" emitted at ${new Date().toLocaleTimeString()}`);

        timeoutRef.current = setTimeout(() => {
            if (isAwaiting.current) {
                console.warn("[AIChat] SAFETY TIMEOUT REACHED (60s). Reseting state.");
                isAwaiting.current = false;
                setIsTyping(false);
                addChatMessage({ role: "assistant", content: "DeepTechno: The neural link is unstable. Connection timed out. Please try a shorter message or check your API quota." });
            }
            timeoutRef.current = null;
        }, 60000);

        socket.emit("chat:message", {
            message: userMsg,
            history: chatMessages.slice(-5), // Only last 5 messages for context
            state: stateContext
        });
    };

    const handleStop = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        isAwaiting.current = false;
        setIsTyping(false);
        addChatMessage({ role: "assistant", content: "... [COMMAND_INTERRUPTED_BY_OPERATOR] ..." });
    };



    return (
        <div
            className={`relative flex h-full transition-all shrink-0 ${!isResizing ? "duration-300" : ""}`}
            style={{ width: isExpanded ? `${width}px` : "40px" }}
        >
            {/* Resizer Handle */}
            {isExpanded && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#00ff41] z-50 transition-colors"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                />
            )}

            {/* Toggle Button Column */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-full w-10 bg-[#0a0a0a] border-l border-[#003b00] flex flex-col items-center py-4 hover:bg-[#001a00] transition-colors group z-20"
            >
                {isExpanded ? <ChevronRight size={16} className="text-[#00ff41]" /> : <ChevronLeft size={16} className="text-[#00ff41]" />}
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4">
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold tracking-[0.2em] text-[#008f11] group-hover:text-[#00ff41]">
                        DEEP_TECHNO_AGENT
                    </span>
                    <Bot size={18} className="text-[#00ff41] animate-pulse" />
                </div>
            </button>

            {/* Chat Content */}
            {isExpanded && (
                <div className="flex-1 bg-[#050505] border-l border-[#003b00] flex flex-col shadow-2xl overflow-hidden relative">
                    {/* Header */}
                    <div className="p-4 border-b border-[#003b00] bg-[#0a0a0a] flex items-center gap-3">
                        <div className="relative">
                            <Bot className="text-[#00ff41]" size={20} />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00ff41] rounded-full animate-ping" />
                        </div>
                        <div>
                            <div className="text-[12px] font-bold text-[#00ff41] tracking-wider uppercase">DeepTechno</div>
                            <div className="text-[8px] text-[#008f11] font-mono">SEC_AGENT_v2.0 // SECRET_WORLD</div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (confirm("Clear current session?")) {
                                        clearChat();
                                    }
                                }}
                                className="p-1.5 hover:bg-[#1a0000] rounded text-[#008f11] hover:text-[#ff003c] transition-colors group relative"
                                title="Clear Session"
                            >
                                <Trash2 size={14} />
                            </button>
                            <Sparkles size={14} className="text-[#00ff41] opacity-50" />
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-opacity-5"
                    >
                        {chatMessages.length === 0 && (
                            <div className="text-center py-10 space-y-3">
                                <MessageSquare size={32} className="mx-auto text-[#003b00]" />
                                <div className="text-[10px] text-[#008f11] italic leading-relaxed px-4">
                                    "I am DeepTechno. I see the wire, the code, and the shadows. Ask, and I shall reveal."
                                </div>
                            </div>
                        )}

                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <div className={`flex gap-2 max-w-[90%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                    <div className={`shrink-0 mt-1 h-6 w-6 rounded-full flex items-center justify-center border shadow-lg ${msg.role === "user" ? "bg-[#003b00] border-[#00ff41]/30" : "bg-[#1a1a1a] border-[#00ff41]/50"
                                        }`}>
                                        {msg.role === "user" ? <User size={12} className="text-[#00ff41]" /> : <Bot size={12} className="text-[#00ff41]" />}
                                    </div>
                                    <div className={`p-3 rounded-lg text-[11px] leading-relaxed shadow-lg break-words min-w-0 ${msg.role === "user"
                                        ? "bg-[#001a00] border border-[#003b00] text-[#00ff41] rounded-tr-none whitespace-pre-wrap"
                                        : "bg-[#0a0a0a] border border-[#003b00] text-[#00ff41] rounded-tl-none font-mono markdown-container overflow-hidden"
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }) => <div className="mb-2 last:mb-0" {...props} />,
                                                    code: ({ node, inline, ...props }: any) => {
                                                        const codeContent = props.children ? String(props.children).replace(/\n$/, '') : '';

                                                        return inline ? (
                                                            <code className="bg-[#1a1a1a] px-1 rounded text-[#00ff41] break-words" {...props} />
                                                        ) : (
                                                            <div className="my-2 bg-black border border-[#003b00] rounded overflow-hidden relative group/code">
                                                                <div className="flex items-center justify-between px-3 py-1 bg-[#111] border-b border-[#003b00] select-none">
                                                                    <span className="text-[8px] text-[#008f11] font-mono tracking-widest uppercase">Console_Output</span>
                                                                    <CopyButton text={codeContent} />
                                                                </div>
                                                                <div className="p-3 overflow-x-hidden whitespace-pre-wrap break-all">
                                                                    <code className="text-[#00ff41]" {...props} />
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                    table: ({ node, ...props }) => (
                                                        <div className="overflow-x-auto my-3 border border-[#003b00] rounded max-w-full custom-scrollbar">
                                                            <table className="min-w-full divide-y divide-[#003b00] table-auto border-collapse" {...props} />
                                                        </div>
                                                    ),
                                                    th: ({ node, ...props }) => <th className="px-3 py-2 bg-[#111] text-left text-[10px] font-bold border-b border-[#003b00] uppercase tracking-wider text-[#00ff41]" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-3 py-2 text-[10px] border-b border-[#003b00]/30 break-all leading-tight align-top" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                                    h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-[#00ff41] border-b border-[#00ff41]/20 pb-1 mb-2 mt-2 uppercase tracking-widest" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-[12px] font-bold text-[#00ff41] mb-2 mt-2 uppercase flex items-center gap-2 before:content-['>'] before:text-[10px]" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-[11px] font-bold text-[#00ff41] mb-1 mt-2 opacity-80 italic" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="text-[#00ff41] font-bold shadow-[0_0_5px_rgba(0,255,65,0.2)]" {...props} />,
                                                    a: ({ node, ...props }) => <a className="text-[#00ff41] underline opacity-80 hover:opacity-100 hover:text-white transition-all underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                                                }}
                                            >
                                                {preprocessMarkdown(msg.content)}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                                <div className="text-[7px] text-[#003b00] mt-1 uppercase tracking-tighter">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-2">
                                <div className="h-6 w-6 rounded-full bg-[#1a1a1a] border border-[#00ff41]/50 flex items-center justify-center">
                                    <Bot size={12} className="text-[#00ff41] animate-pulse" />
                                </div>
                                <div className="bg-[#0a0a0a] border border-[#003b00] p-2 rounded-lg rounded-tl-none">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-[#00ff41] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1 h-1 bg-[#00ff41] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1 h-1 bg-[#00ff41] rounded-full animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-[#003b00] bg-[#0a0a0a]">
                        <div className="relative flex items-center gap-2">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows={1}
                                placeholder="Intercept command..."
                                className="flex-1 bg-black border border-[#003b00] rounded-xl py-2 pl-4 pr-10 text-[10px] text-[#00ff41] focus:outline-none focus:border-[#00ff41] placeholder:text-[#003b00] transition-all resize-none overflow-y-auto custom-scrollbar"
                            />
                            {isTyping ? (
                                <button
                                    onClick={handleStop}
                                    className="p-2 bg-[#3b0000] text-[#ff003c] rounded-full hover:bg-[#5c0000] transition-colors border border-[#ff003c]/30"
                                >
                                    <Square size={12} fill="currentColor" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="p-2 bg-[#003b00] text-[#00ff41] rounded-full hover:bg-[#005c00] disabled:opacity-50 transition-colors border border-[#00ff41]/30"
                                >
                                    <Send size={12} />
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex justify-between px-1">
                            <div className="flex gap-2">
                                <Shield size={10} className="text-[#00ff41] opacity-30" />
                                <Terminal size={10} className="text-[#00ff41] opacity-30" />
                            </div>
                            <span className="text-[7px] text-[#008f11] opacity-50 uppercase tracking-widest">DeepTechno Intelligence</span>
                        </div>
                    </div>


                </div>
            )}
        </div>
    );
}
