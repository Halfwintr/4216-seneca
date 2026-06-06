"use client";

import { useEffect, useState } from "react";
import { useLenis } from "./LenisProvider";

export interface EditorNavNode {
  id: string;
  label: string;
  children?: EditorNavNode[];
}

interface EditorSidebarProps {
  nodes: EditorNavNode[];
  className?: string;
}

function flattenIds(nodes: EditorNavNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...(n.children ? flattenIds(n.children) : [])]);
}

export function EditorSidebar({ nodes, className = "" }: EditorSidebarProps) {
  const lenis = useLenis();
  const [activeId, setActiveId] = useState<string>(nodes[0]?.id ?? "");

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    if (lenis) {
      lenis.scrollTo(el, { offset: -96, duration: 1.0 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  useEffect(() => {
    const ids = flattenIds(nodes);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [nodes]);

  return (
    <nav
      aria-label="Editor navigation"
      className={`sticky top-24 max-h-[calc(100vh-7rem)] w-56 shrink-0 self-start overflow-y-auto pr-2 ${className}`}
    >
      <NodeList nodes={nodes} depth={0} activeId={activeId} onSelect={scrollTo} />
    </nav>
  );
}

function NodeList({
  nodes,
  depth,
  activeId,
  onSelect,
}: {
  nodes: EditorNavNode[];
  depth: number;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className={depth === 0 ? "flex flex-col gap-1" : "mt-1 flex flex-col gap-0.5 border-l border-stone-800 pl-3"}>
      {nodes.map((node) => {
        const active = node.id === activeId;
        const isTop = depth === 0;
        return (
          <li key={node.id}>
            <button
              onClick={() => onSelect(node.id)}
              aria-current={active ? "true" : undefined}
              className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left font-sans transition-colors ${
                isTop
                  ? "text-[11px] uppercase tracking-[0.12em]"
                  : "text-[12px]"
              } ${
                active
                  ? "bg-amber-warm/10 text-amber-warm-light"
                  : isTop
                    ? "text-stone-300 hover:text-stone-100"
                    : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {node.label}
            </button>
            {node.children && node.children.length > 0 && (
              <NodeList
                nodes={node.children}
                depth={depth + 1}
                activeId={activeId}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
