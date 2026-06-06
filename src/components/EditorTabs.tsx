"use client";

import { useState, type ReactNode } from "react";

export interface EditorTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  defaultId?: string;
}

export function EditorTabs({ tabs, defaultId }: EditorTabsProps) {
  const [activeId, setActiveId] = useState(defaultId ?? tabs[0]?.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 border-b border-stone-800/70">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              aria-current={active ? "true" : undefined}
              className={`-mb-px border-b-2 px-4 py-2.5 font-sans text-xs uppercase tracking-[0.12em] transition-colors ${
                active
                  ? "border-amber-warm text-amber-warm-light"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.id} hidden={tab.id !== activeId}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
