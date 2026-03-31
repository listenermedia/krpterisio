"use client";

import { useScanStore } from "../store/scanStore";

export default function NetworkLogs() {
    const logs = useScanStore((state) => state.networkLogs);

    if (logs.length === 0) {
        return <div className="p-6 text-gray-500 text-center">No network activity captured yet.</div>;
    }

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-900 sticky top-0">
                <h3 className="text-lg font-medium text-gray-300">Live Network Traffic</h3>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700 text-gray-200 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Method</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">URL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.map((log, index) => (
                            <tr key={index} className="hover:bg-gray-750 font-mono text-xs">
                                <td className={`px-4 py-2 font-bold ${log.method === 'GET' ? 'text-blue-400' : 'text-green-400'}`}>{log.method}</td>
                                <td className={`px-4 py-2 ${log.status >= 400 ? 'text-red-400' : log.status >= 300 ? 'text-yellow-400' : 'text-green-400'}`}>{log.status}</td>
                                <td className="px-4 py-2 truncate max-w-md" title={log.url}>{log.url}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
