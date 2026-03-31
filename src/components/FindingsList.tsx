"use client";

import { useScanStore } from "../store/scanStore";

export default function FindingsList() {
    const { findings, status } = useScanStore((state) => state);

    if (findings.length === 0) {
        if (status === 'scanning') {
            return (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
                    <div className="w-12 h-12 border-4 border-[#003b00] border-t-[#00ff41] rounded-full animate-spin"></div>
                    <div>
                        <div className="text-[#00ff41] font-bold animate-pulse">Scanning Target System...</div>
                        <p className="text-xs text-[#008f11] mt-1">&gt;&gt; ANALYZING_VULNERABILITIES &lt;&lt;</p>
                    </div>
                </div>
            );
        }
        return <div className="p-6 text-[#003b00] text-center font-mono">NO_VULNERABILITIES_DETECTED</div>;
    }

    return (
        <div className="bg-[#050505] h-full flex flex-col font-mono border-l border-[#003b00]">
            <div className="p-2 border-b border-[#003b00] bg-[#0a0a0a] sticky top-0 flex justify-between items-center">
                <h3 className="text-xs font-bold text-[#00ff41]">DETECTED_FINDINGS</h3>
                <span className="text-[10px] text-[#008f11]">{findings.length} TOTAL</span>
            </div>
            <div className="overflow-auto flex-1 p-2 space-y-2">
                {findings.map((f, i) => (
                    <div key={i} className={`p-2 border border-[#003b00] hover:border-[#00ff41] transition-colors relative group ${f.severity === 'critical' ? 'border-[#ff003c]' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-[#00ff41] text-xs leading-tight">{f.vulnerability.toUpperCase()}</h4>
                            <span className={`text-[10px] px-1 font-bold ${f.severity === 'critical' ? 'text-[#ff003c] animate-pulse' :
                                f.severity === 'high' ? 'text-[#ff003c]' :
                                    f.severity === 'medium' ? 'text-orange-500' :
                                        'text-[#008f11]'
                                }`}>{f.severity.toUpperCase()}</span>
                        </div>
                        <p className="text-[10px] text-[#008f11] mb-2 leading-relaxed">{f.details}</p>
                        <div className="text-[10px] text-[#003b00] truncate border-t border-[#003b00] pt-1">
                            LOC: {f.location}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
