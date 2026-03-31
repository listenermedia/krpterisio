"use client";

import { useState, useMemo, useCallback } from "react";
import { X, ChevronDown, ChevronRight, ExternalLink, Copy, Check, Sparkles, Code, Eye, Loader2, FileDown } from "lucide-react";

interface ResponseViewerProps {
    responseBody: string;
    url: string;
    onClose: () => void;
}

// Extract all URLs from any string value (handles iframes, href, src, plain URLs)
function extractUrls(str: string): string[] {
    const urls: string[] = [];
    // Match http/https URLs
    const urlRegex = /https?:\/\/[^\s"'<>\]},)]+/gi;
    const matches = str.match(urlRegex);
    if (matches) {
        matches.forEach(u => {
            // Decode URL-encoded values
            try {
                const decoded = decodeURIComponent(u);
                if (!urls.includes(decoded)) urls.push(decoded);
            } catch {
                if (!urls.includes(u)) urls.push(u);
            }
        });
    }
    return urls;
}

// Render a string value with highlighted clickable URLs
function UrlHighlightedString({ value }: { value: string }) {
    const urls = extractUrls(value);
    if (urls.length === 0) return <span className="text-[#ffa657]">"{value}"</span>;

    // Split the string by URLs and render with highlights
    let remaining = value;
    const parts: React.ReactNode[] = [];
    let key = 0;

    for (const url of urls) {
        const encodedVariants = [url, encodeURI(url), encodeURIComponent(url)];
        let idx = -1;
        let matchedVariant = url;
        for (const variant of encodedVariants) {
            idx = remaining.indexOf(variant);
            if (idx !== -1) { matchedVariant = variant; break; }
        }
        if (idx === -1) continue;

        if (idx > 0) {
            parts.push(<span key={key++} className="text-[#ffa657]">{remaining.slice(0, idx)}</span>);
        }
        parts.push(
            <a
                key={key++}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#58a6ff] underline underline-offset-2 hover:text-[#79c0ff] inline-flex items-center gap-1 cursor-pointer"
                title={`Open: ${url}`}
            >
                {matchedVariant.length > 80 ? matchedVariant.slice(0, 77) + "..." : matchedVariant}
                <ExternalLink size={11} className="inline flex-shrink-0" />
            </a>
        );
        remaining = remaining.slice(idx + matchedVariant.length);
    }
    if (remaining) {
        parts.push(<span key={key++} className="text-[#ffa657]">{remaining}</span>);
    }

    return <span>"{parts}"</span>;
}

// Recursive JSON tree node
function JsonNode({ keyName, value, depth = 0, defaultExpanded = true }: {
    keyName?: string;
    value: any;
    depth?: number;
    defaultExpanded?: boolean;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded && depth < 2);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [value]);

    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);
    const childCount = isObject ? Object.keys(value).length : 0;

    const renderValue = () => {
        if (value === null) return <span className="text-[#ff7b72]">null</span>;
        if (value === undefined) return <span className="text-[#ff7b72]">undefined</span>;
        if (typeof value === 'boolean') return <span className="text-[#d2a8ff]">{String(value)}</span>;
        if (typeof value === 'number') return <span className="text-[#79c0ff]">{value}</span>;
        if (typeof value === 'string') {
            // Check if string looks like a URL
            if (/^https?:\/\//.test(value)) {
                return (
                    <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-[#58a6ff] underline underline-offset-2 hover:text-[#79c0ff] inline-flex items-center gap-1">
                        "{value.length > 100 ? value.slice(0, 97) + '...' : value}"
                        <ExternalLink size={11} className="inline flex-shrink-0" />
                    </a>
                );
            }
            // Check if string contains URLs (like iframe HTML)
            if (value.includes('http://') || value.includes('https://')) {
                return <UrlHighlightedString value={value} />;
            }
            // Check if it looks like HTML
            if (value.includes('<') && value.includes('>')) {
                return <span className="text-[#7ee787]">"{value}"</span>;
            }
            return <span className="text-[#ffa657]">"{value.length > 200 ? value.slice(0, 197) + '...' : value}"</span>;
        }
        return <span>{String(value)}</span>;
    };

    if (!isObject) {
        return (
            <div className="flex items-start gap-1.5 py-[3px] group/val hover:bg-[#001a00]/50 rounded px-1" style={{ paddingLeft: depth * 20 }}>
                {keyName !== undefined && (
                    <span className="text-[#00ff41] flex-shrink-0">"{keyName}": </span>
                )}
                {renderValue()}
                <button onClick={handleCopy} className="opacity-0 group-hover/val:opacity-100 flex-shrink-0 ml-1 text-[#008f11] hover:text-[#00ff41] transition-opacity">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
            </div>
        );
    }

    return (
        <div style={{ paddingLeft: depth > 0 ? 0 : 0 }}>
            <div
                className="flex items-center gap-1.5 py-[3px] cursor-pointer hover:bg-[#001a00]/50 rounded px-1 group/node"
                style={{ paddingLeft: depth * 20 }}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronDown size={14} className="text-[#008f11] flex-shrink-0" /> : <ChevronRight size={14} className="text-[#008f11] flex-shrink-0" />}
                {keyName !== undefined && (
                    <span className="text-[#00ff41]">"{keyName}": </span>
                )}
                <span className="text-[#008f11]">
                    {isArray ? `[${childCount}]` : `{${childCount}}`}
                </span>
                {!expanded && (
                    <span className="text-[#003b00] text-[11px] ml-1 italic">
                        {isArray ? `${childCount} items` : Object.keys(value).slice(0, 3).join(', ') + (childCount > 3 ? '...' : '')}
                    </span>
                )}
                <button onClick={handleCopy} className="opacity-0 group-hover/node:opacity-100 flex-shrink-0 ml-1 text-[#008f11] hover:text-[#00ff41] transition-opacity">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
            </div>
            {expanded && (
                <div>
                    {Object.entries(value).map(([k, v]) => (
                        <JsonNode key={k} keyName={isArray ? undefined : k} value={v} depth={depth + 1} defaultExpanded={depth < 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Extract all URLs from the entire JSON recursively
function extractAllUrls(obj: any, results: { path: string; url: string }[] = [], path = ''): { path: string; url: string }[] {
    if (typeof obj === 'string') {
        const urls = extractUrls(obj);
        urls.forEach(u => results.push({ path, url: u }));
    } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => extractAllUrls(item, results, `${path}[${i}]`));
    } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => extractAllUrls(v, results, path ? `${path}.${k}` : k));
    }
    return results;
}

export default function ResponseViewer({ responseBody, url, onClose }: ResponseViewerProps) {
    const [viewMode, setViewMode] = useState<'tree' | 'raw' | 'urls'>('tree');
    const [cleaning, setCleaning] = useState(false);
    const [cleanedData, setCleanedData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const parsedData = useMemo(() => {
        try {
            return JSON.parse(responseBody);
        } catch {
            return null;
        }
    }, [responseBody]);

    const allUrls = useMemo(() => {
        if (!parsedData) return [];
        return extractAllUrls(parsedData);
    }, [parsedData]);

    // Unique URLs only
    const uniqueUrls = useMemo(() => {
        const seen = new Set<string>();
        return allUrls.filter(u => {
            if (seen.has(u.url)) return false;
            seen.add(u.url);
            return true;
        });
    }, [allUrls]);

    // AI Clean: strips HTML, extracts meaningful data, decodes URLs
    const handleAiClean = useCallback(() => {
        if (!parsedData) return;
        setCleaning(true);

        setTimeout(() => {
            try {
                const clean = (obj: any): any => {
                    if (obj === null || obj === undefined) return obj;
                    if (typeof obj === 'string') {
                        // Decode URL-encoded strings
                        let s = obj;
                        try { s = decodeURIComponent(s); } catch { }

                        // Extract src from iframes
                        const iframeMatch = s.match(/src=["']([^"']+)["']/i);
                        if (iframeMatch && s.includes('<iframe')) {
                            let iframeSrc = iframeMatch[1];
                            // Extract the actual video URL from the wrapper
                            const vParam = iframeSrc.match(/[?&]v=([^&]+)/);
                            if (vParam) {
                                try { iframeSrc = decodeURIComponent(vParam[1]); } catch { }
                            }
                            return iframeSrc;
                        }

                        // Strip HTML tags for simple HTML strings
                        if (s.includes('<') && s.includes('>')) {
                            return s.replace(/<[^>]*>/g, '').trim();
                        }
                        return s;
                    }
                    if (Array.isArray(obj)) return obj.map(clean);
                    if (typeof obj === 'object') {
                        const result: any = {};
                        for (const [k, v] of Object.entries(obj)) {
                            // Skip empty/useless fields
                            const cleaned = clean(v);
                            if (cleaned === '' || cleaned === null || cleaned === undefined) continue;
                            if (typeof cleaned === 'string' && cleaned === 'https://ashacademylms.com/media/dummy-image.jpg') continue;
                            result[k] = cleaned;
                        }
                        return result;
                    }
                    return obj;
                };

                setCleanedData(clean(parsedData));
            } catch {
                setCleanedData(parsedData);
            }
            setCleaning(false);
        }, 300);
    }, [parsedData]);

    // Download cleaned data as CSV
    const downloadCleanedCSV = useCallback(() => {
        const data = cleanedData || parsedData;
        if (!data) return;

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
                        result[name] = JSON.stringify(val);
                    } else if (val.length === 0) {
                        result[name] = '';
                    } else if (typeof val[0] === 'object' && val[0] !== null) {
                        val.forEach((item: any, i: number) => {
                            Object.assign(result, flatten(item, `${name}[${i}]`, depth + 1));
                        });
                    } else {
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

        let arrayData = Array.isArray(data) ? data : [data];
        if (!Array.isArray(data) && typeof data === 'object') {
            const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
            if (possibleArrays.length === 1) {
                arrayData = possibleArrays[0] as any[];
            }
        }

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
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        try {
            a.download = `${cleanedData ? 'cleaned' : 'response'}_${new URL(url).pathname.split('/').pop() || 'data'}.csv`;
        } catch {
            a.download = `${cleanedData ? 'cleaned' : 'response'}_data.csv`;
        }
        a.click();
        window.URL.revokeObjectURL(blobUrl);
    }, [cleanedData, parsedData, url]);

    // Categorize URLs
    const categorizedUrls = useMemo(() => {
        const categories: Record<string, { path: string; url: string }[]> = {
            'Video/Media': [],
            'Images': [],
            'API/Pages': [],
            'Other': [],
        };
        uniqueUrls.forEach(u => {
            const lower = u.url.toLowerCase();
            if (lower.match(/\.(mp4|mkv|avi|mov|webm|m3u8)/)) categories['Video/Media'].push(u);
            else if (lower.match(/\.(jpg|jpeg|png|gif|svg|webp)/)) categories['Images'].push(u);
            else if (lower.includes('/api/') || lower.includes('.html') || lower.includes('.php')) categories['API/Pages'].push(u);
            else categories['Other'].push(u);
        });
        return categories;
    }, [uniqueUrls]);

    const displayData = cleanedData || parsedData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-[90vw] max-w-5xl h-[85vh] bg-[#0a0a0a] border border-[#003b00] rounded-lg shadow-[0_0_40px_rgba(0,255,65,0.15)] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#050505] border-b border-[#003b00]">
                    <div className="flex items-center gap-3">
                        <div className="text-[#00ff41] font-bold text-[13px] uppercase tracking-wider flex items-center gap-2">
                            <Eye size={14} />
                            RESPONSE_INSPECTOR
                        </div>
                        <div className="text-[11px] text-[#008f11] max-w-[400px] truncate font-mono" title={url}>
                            {url}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* AI Clean button */}
                        <button
                            onClick={handleAiClean}
                            disabled={cleaning || !parsedData}
                            className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded transition-all
                                ${cleanedData
                                    ? 'border-[#d2a8ff]/50 text-[#d2a8ff] bg-[#d2a8ff]/10'
                                    : 'border-[#003b00] text-[#00ff41] hover:bg-[#003b00]/40'}
                                ${cleaning ? 'opacity-50 cursor-wait' : ''}
                            `}
                        >
                            {cleaning ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            {cleanedData ? 'AI_CLEANED ✓' : 'AI_CLEAN'}
                        </button>
                        {cleanedData && (
                            <button
                                onClick={() => setCleanedData(null)}
                                className="text-[11px] text-[#ff7b72] hover:text-[#ff9999] px-1"
                            >
                                RESET
                            </button>
                        )}
                        <button
                            onClick={downloadCleanedCSV}
                            disabled={!parsedData}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] border border-[#002b4d] text-[#00a2ff] rounded hover:bg-[#001a3b]/40 transition-all"
                            title={cleanedData ? 'Download cleaned data as CSV' : 'Download response as CSV'}
                        >
                            <FileDown size={10} />
                            {cleanedData ? 'EXPORT_CLEANED' : 'EXPORT_CSV'}
                        </button>
                        <button onClick={onClose} className="text-[#008f11] hover:text-[#00ff41] p-1 hover:bg-[#003b00]/30 rounded transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1 px-4 py-1 bg-[#080808] border-b border-[#001a00]">
                    {([
                        { id: 'tree' as const, label: 'STRUCTURED_VIEW', icon: <Code size={9} /> },
                        { id: 'urls' as const, label: `URLS_FOUND (${uniqueUrls.length})`, icon: <ExternalLink size={9} /> },
                        { id: 'raw' as const, label: 'RAW_JSON', icon: <Eye size={9} /> },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            className={`flex items-center gap-1 px-3 py-1 text-[11px] uppercase tracking-wider rounded-t transition-all
                                ${viewMode === tab.id
                                    ? 'bg-[#001a00] text-[#00ff41] border border-b-0 border-[#003b00]'
                                    : 'text-[#008f11] hover:text-[#00ff41] hover:bg-[#001100]/50'}
                            `}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}

                    {/* Search */}
                    {viewMode === 'raw' && (
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="SEARCH_JSON..."
                            className="ml-auto bg-black border border-[#003b00]/50 rounded px-2 py-1 text-[11px] text-[#00ff41] placeholder-[#003b00] w-48 outline-none focus:border-[#00ff41]/50"
                        />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto custom-scrollbar p-4 font-mono text-[13px]">
                    {!parsedData ? (
                        /* Raw text if not JSON */
                        <pre className="text-[#008f11] whitespace-pre-wrap break-all leading-relaxed">{responseBody}</pre>
                    ) : viewMode === 'tree' ? (
                        /* Structured Tree View */
                        <div className="leading-relaxed">
                            {cleanedData && (
                                <div className="mb-2 px-2 py-1.5 bg-[#d2a8ff]/5 border border-[#d2a8ff]/20 rounded text-[11px] text-[#d2a8ff] flex items-center gap-1">
                                    <Sparkles size={9} />
                                    AI_CLEANED: HTML stripped, iframe URLs extracted, dummy data removed
                                </div>
                            )}
                            <JsonNode value={displayData} defaultExpanded={true} />
                        </div>
                    ) : viewMode === 'urls' ? (
                        /* URLs View */
                        <div className="space-y-4">
                            {uniqueUrls.length === 0 ? (
                                <div className="text-center text-[#003b00] italic py-8">// NO_URLS_DETECTED_IN_RESPONSE</div>
                            ) : (
                                Object.entries(categorizedUrls).map(([category, urls]) => {
                                    if (urls.length === 0) return null;
                                    return (
                                        <div key={category}>
                                            <div className="text-[#00ff41] text-[12px] uppercase tracking-wider border-b border-[#003b00]/50 pb-1 mb-2 flex items-center gap-1">
                                                {category === 'Video/Media' && '🎬'}
                                                {category === 'Images' && '🖼️'}
                                                {category === 'API/Pages' && '🌐'}
                                                {category === 'Other' && '🔗'}
                                                {category} ({urls.length})
                                            </div>
                                            <div className="space-y-1">
                                                {urls.map((u, i) => (
                                                    <div key={i} className="flex items-start gap-2 py-1 px-2 hover:bg-[#001a00]/50 rounded group/url">
                                                        <span className="text-[#003b00] text-[11px] w-5 flex-shrink-0 pt-0.5">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <a
                                                                href={u.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[#58a6ff] hover:text-[#79c0ff] underline underline-offset-2 break-all text-[13px] flex items-center gap-1"
                                                            >
                                                                {u.url}
                                                                <ExternalLink size={11} className="flex-shrink-0" />
                                                            </a>
                                                            <div className="text-[10px] text-[#003b00] mt-0.5">
                                                                path: {u.path || 'root'}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(u.url); }}
                                                            className="opacity-0 group-hover/url:opacity-100 text-[#008f11] hover:text-[#00ff41] flex-shrink-0 transition-opacity"
                                                        >
                                                            <Copy size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Raw JSON View */
                        <pre className="text-[#008f11] whitespace-pre-wrap break-all leading-relaxed">
                            {JSON.stringify(displayData, null, 2)}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-[#050505] border-t border-[#003b00] text-[11px] text-[#003b00]">
                    <span>SIZE: {(responseBody.length / 1024).toFixed(1)}KB</span>
                    <span>URLS: {uniqueUrls.length} found</span>
                    <span>TYPE: {parsedData ? 'JSON' : 'TEXT'}</span>
                </div>
            </div>
        </div>
    );
}
