"use client";

import { useEffect, useState } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const bootLogs = [
        "[*] INITIALIZING KRPTERISIO_V1 KERNEL...",
        "[*] LOADING DEEP TECHNO FORENSIC ENGINE...",
        "[*] ESTABLISHING ENCRYPTED TUNNEL [PATH: SECRET_WORLD]",
        "[*] BYPASSING ANTI-BOT PROTOCOLS...",
        "[*] CONNECTING TO KRPTERISIO NODES...",
        "[*] DEPLOYING STEALTH CRAWLER...",
        "[*] SYSTEM STATUS: SECURE",
        "[+] WELCOME TO KRPTERISIO."
    ];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Progress bar simulation
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 40); // 100 * 40ms = 4s

        // Log simulation
        let logIndex = 0;
        const logInterval = setInterval(() => {
            if (logIndex < bootLogs.length) {
                setLogs(prev => [...prev, bootLogs[logIndex]]);
                logIndex++;
            } else {
                clearInterval(logInterval);
            }
        }, 500);

        // Final transition
        const timeout = setTimeout(() => {
            onFinish();
        }, 5000);

        return () => {
            clearInterval(interval);
            clearInterval(logInterval);
            clearTimeout(timeout);
        };
    }, [onFinish]);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#000] flex flex-col items-center justify-center font-mono overflow-hidden">

            {/* Background Lottie Animation with Glow */}
            <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none z-0 overflow-hidden">
                <div className="relative w-[800px] h-[800px] sm:w-[1000px] sm:h-[1000px]">
                    <div className="absolute inset-0 rounded-full bg-[#ff3131] opacity-30 filter blur-[150px] animate-pulse"></div>
                    <DotLottieReact
                        src="/krpterisio.lottie"
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-lg px-8 flex flex-col items-center pt-20">

                {/* Brand Text */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-[#fff] tracking-[0.3em] mb-2 drop-shadow-[0_0_15px_rgba(255,49,49,0.5)]">
                        KRPTERISIO
                    </h1>
                    <p className="text-[#00ff41] text-[10px] tracking-[0.5em] font-bold uppercase opacity-80">
                        Project by Team Krpterisio
                    </p>
                </div>

                {/* Boot Logs */}
                <div className="w-full bg-transparent p-4 text-[10px] h-32 overflow-hidden mb-6 flex flex-col justify-end">
                    {logs.map((log, i) => (
                        <div key={i} className={`mb-1 transition-opacity duration-300 ${i === logs.length - 1 ? 'text-[#00ff41]' : 'text-[#008f11] opacity-50'}`}>
                            {log}
                        </div>
                    ))}
                    <div className="flex items-center text-[#00ff41] animate-pulse">
                        <span className="mr-2">&gt;</span>
                        <div className="w-2 h-4 bg-[#00ff41]"></div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full">
                    <div className="flex justify-between text-[8px] text-[#008f11] mb-1">
                        <span>SYSTEM_BOOT_SEQUENCE</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1 bg-[#001100] border border-[#003b00] overflow-hidden relative">
                        <div
                            className="h-full bg-gradient-to-r from-[#008f11] to-[#00ff41] transition-all duration-300 shadow-[0_0_10px_#00ff41]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Developed By Footer */}
                <div className="mt-12 text-[9px] text-[#003b00] font-bold tracking-widest flex items-center gap-2">
                    <TerminalIcon size={10} />
                    <span>KRPTERISIO | AGENT: DEEP TECHNO</span>
                </div>
            </div>

            <style>{`
                @keyframes wings-left {
                    0%, 100% { transform: rotate(-10deg) scaleX(1); }
                    50% { transform: rotate(15deg) scaleX(1.2); }
                }
                @keyframes wings-right {
                    0%, 100% { transform: rotate(10deg) scaleX(1); }
                    50% { transform: rotate(-15deg) scaleX(1.2); }
                }
                @keyframes matrix-rain {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100%); }
                }
                .animate-wing-left { animation: wings-left 0.5s ease-in-out infinite; }
                .animate-wing-right { animation: wings-right 0.5s ease-in-out infinite; }
                .animate-matrix-rain { animation: matrix-rain linear infinite; }
            `}</style>
        </div>
    );
}
