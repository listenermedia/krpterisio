"use client";

import { useState } from "react";
import { useScanStore } from "../store/scanStore";

interface ScanDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ScanDialog({ isOpen, onClose }: ScanDialogProps) {
    const [url, setUrl] = useState("https://");
    const [headers, setHeaders] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { setTargetUrl, resetScan, setActiveTab } = useScanStore();

    if (!isOpen) return null;

    const handleStart = () => {
        if (!url) return;

        let parsedHeaders = {};
        if (headers.trim()) {
            try {
                parsedHeaders = JSON.parse(headers);
            } catch (e) {
                alert("Invalid JSON Format for Headers. Please fix or clear.");
                return;
            }
        }

        resetScan();
        setTargetUrl(url);
        setActiveTab("dashboard");

        // Trigger scan command
        // Emit custom event for advanced scan start
        window.dispatchEvent(new CustomEvent('scanner:start', {
            detail: { url, headers: parsedHeaders }
        }));

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">New Security Scan</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Target URL
                    </label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="https://example.com"
                        autoFocus
                    />
                </div>

                {/* Advanced Options Toggle */}
                <div className="mb-4">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                    >
                        {showAdvanced ? "▼ Hide Advanced Options" : "▶ Show Advanced Options"}
                    </button>

                    {showAdvanced && (
                        <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-gray-400 mb-1">
                                Custom Headers / Cookies (JSON)
                            </label>
                            <textarea
                                value={headers}
                                onChange={(e) => setHeaders(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs font-mono text-green-400 h-24 focus:outline-none focus:border-blue-500"
                                placeholder='{ "Cookie": "session_id=123", "Authorization": "Bearer token" }'
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                Use this for authenticated scanning. Paste cookies/tokens here.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStart}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-medium shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                    >
                        Start Scan
                    </button>
                </div>
            </div>
        </div>
    );
}
