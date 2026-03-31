"use client";

import { useEffect, useRef, useState } from "react";
import "xterm/css/xterm.css";
// Dynamic import for xterm to avoid SSR issues completely
import { Terminal } from "xterm"; // We can import types, but class instantiation usually safe in useEffect
import { getSocket } from "@/lib/socket";

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const [isClient, setIsClient] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socket = getSocket();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !terminalRef.current) return;

        // Safety check: Ensure the element has dimensions
        const initTerminal = async () => {
            try {
                // Dynamic import xterm
                const { Terminal } = await import("xterm");

                if (xtermRef.current) return;

                const term = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: "#1e1e1e",
                        foreground: "#f0f0f0",
                    },
                    rows: 20, // Explicit rows
                    cols: 80, // Explicit cols
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 14,
                    allowProposedApi: true,
                });

                // Using a small timeout to ensure the div is rendered and has size
                setTimeout(() => {
                    if (terminalRef.current) {
                        try {
                            term.open(terminalRef.current);
                            xtermRef.current = term;

                            term.writeln("Welcome to Web Vulnerability Scanner CLI");
                            term.writeln("Type 'help' for commands...");
                            term.write("$ ");

                            let currentLine = "";

                            // Setup event listeners
                            term.onData((data) => {
                                const code = data.charCodeAt(0);

                                if (code === 13) { // Enter
                                    term.write('\r\n');
                                    if (socket) socket.emit("terminal:input", currentLine);
                                    currentLine = "";
                                } else if (code === 127) { // Backspace
                                    if (currentLine.length > 0) {
                                        term.write('\b \b');
                                        currentLine = currentLine.slice(0, -1);
                                    }
                                } else if (code < 32) {
                                    // Ignore other control chars
                                } else {
                                    currentLine += data;
                                    term.write(data);
                                }
                            });


                            if (socket) {
                                socket.on("terminal:output", (data: any) => {
                                    term.write(data);
                                });
                            }

                            // Listen for custom events from the UI (e.g. New Scan button)
                            const handleCustomCmd = (e: any) => {
                                const cmd = e.detail;
                                if (cmd) {
                                    term.write(cmd);
                                    currentLine += cmd;
                                    term.focus();
                                }
                            };
                            window.addEventListener('scanner:cmd', handleCustomCmd);

                            // Cleanup listener on dispose
                            return () => {
                                window.removeEventListener('scanner:cmd', handleCustomCmd);
                            }
                        } catch (err: any) {
                            console.error("Terminal Open Error:", err);
                            setError(err.message);
                        }
                    }
                }, 100);

                return () => {
                    term.dispose();
                    xtermRef.current = null;
                };
            } catch (err: any) {
                console.error("Terminal Load Error:", err);
                setError(err.message);
            }
        };

        initTerminal();
    }, [isClient]);

    if (error) {
        return <div className="text-red-500 p-4 border border-red-500 rounded">Terminal Error: {error}</div>;
    }

    // Ensure strict height to prevent 0-height issues
    return (
        <div
            ref={terminalRef}
            id="terminal-container"
            className="w-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700"
            style={{ height: "400px", minHeight: "400px" }}
        />
    );
}
