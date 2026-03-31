"use client";

import { useScanStore } from "../store/scanStore";
import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

// Simple recursive tree node
interface TreeNode {
    name: string;
    children?: TreeNode[];
    url?: string;
    path?: string;
}

export default function SourceTree() {
    const sources = useScanStore((state) => state.sources);

    // Group flat URLs into a tree structure
    const tree = buildTree(sources);

    return (
        <div className="text-xs font-mono text-[#00ff41] h-full bg-[#050505]">
            <h3 className="text-[10px] uppercase font-bold text-[#008f11] mb-2 px-2 tracking-widest border-b border-[#003b00] py-1">SOURCE_TREE</h3>
            <div className="space-y-0.5">
                {tree.map((node, i) => (
                    <TreeNodeItem key={i} node={node} level={0} />
                ))}
                {sources.length === 0 && <div className="text-[#003b00] px-2 italic"> // NO_SOURCES_DISCOVERED</div>}
            </div>
        </div>
    );
}

function TreeNodeItem({ node, level }: { node: TreeNode; level: number }) {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className={`flex items-center hover:bg-[#001100] cursor-pointer py-0.5 px-2 transition-colors ${hasChildren ? "text-[#00ff41]" : "text-[#008f11] hover:text-[#00ff41]"}`}
                style={{ paddingLeft: `${level * 12 + 4}px` }}
                onClick={(e) => {
                    if (hasChildren) {
                        // Clicked a folder. Tell the app viewer a folder is active. 
                        if (node.path) {
                            window.dispatchEvent(new CustomEvent("folder:click", { detail: node.path }));
                        }
                        // Clicking icon toggles, clicking text just selects folder
                        // But native behavior: Just toggle it too for ease (unless text/icon separation is requested)
                        setIsOpen(!isOpen);
                        
                        // If the folder acts as a root source itself, trigger preview too
                        if (node.url) {
                            window.dispatchEvent(new CustomEvent("source:click", { detail: node.url }));
                        }
                    } else if (node.url) {
                        window.dispatchEvent(new CustomEvent("source:click", { detail: node.url }));
                    }
                }}
            >
                {hasChildren ? (
                    isOpen ? <ChevronDown size={10} className="mr-1" /> : <ChevronRight size={10} className="mr-1" />
                ) : (
                    <span className="w-2.5 mr-1"></span>
                )}
                {hasChildren ? <Folder size={10} className="mr-2 text-[#008f11]" /> : <File size={10} className="mr-2" />}
                <span className="truncate">{node.name}</span>
            </div>
            {isOpen && hasChildren && (
                <div>
                    {node.children!.map((child, i) => (
                        <TreeNodeItem key={i} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Helper to convert URLs to Tree
// URLs: [https://a.com/js/main.js, https://a.com/css/style.css]
function buildTree(urls: string[]): TreeNode[] {
    const root: TreeNode[] = [];

    urls.forEach(url => {
        try {
            const parsed = new URL(url);
            let currentLevel = root;

            // Reconstruct path step by step so folder node knows its path string.
            // Using domain generic format "a.com/js..." to match against URL strings.
            let builtPath = `https://${parsed.hostname}`;

            const parts = parsed.pathname.split("/").filter(p => p);

            // Domain Node
            let domainNode = currentLevel.find(n => n.name === parsed.hostname);
            if (!domainNode) {
                const isRootDoc = parts.length === 0;
                domainNode = { name: parsed.hostname, children: [], path: builtPath, url: isRootDoc ? url : undefined };
                currentLevel.push(domainNode);
            } else if (parts.length === 0) {
                // We found a root doc but the domain node already exists
                domainNode.url = url;
            }
            
            currentLevel = domainNode.children!;
            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1;
                builtPath += `/${part}`;
                let node = currentLevel.find(n => n.name === part);
                if (!node) {
                    node = { name: part, children: [], url: isFile ? url : undefined, path: builtPath };
                    currentLevel.push(node);
                }
                currentLevel = node.children!;
            });
        } catch (e) {
            // Ignore invalid
        }
    });

    return root;
}
