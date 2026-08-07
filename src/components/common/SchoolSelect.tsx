"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { STUDENT_INSTITUTIONS } from "@/data/student_institutions";
import { Search, ChevronDown, Check, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SchoolSelectProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function SchoolSelect({
  value,
  onChange,
  placeholder = "Search or select educational institution...",
  className,
  error = false,
}: SchoolSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSchools = useMemo(() => {
    if (!search.trim()) return STUDENT_INSTITUTIONS;
    const query = search.toLowerCase().trim();
    return STUDENT_INSTITUTIONS.filter((inst) =>
      inst.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Select Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 text-sm bg-background border rounded-lg cursor-pointer transition-all duration-150 select-none shadow-sm min-h-[42px]",
          error ? "border-red-500 focus:ring-red-500" : "border-input hover:border-emerald-500",
          isOpen ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""
        )}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <GraduationCap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className={cn("truncate text-xs sm:text-sm font-medium", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
      </div>

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Input Box */}
          <div className="p-2 border-b bg-muted/40 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Type school name (e.g. ABU, BUK, FUDMA, UNILAG)..."
              className="pl-9 text-xs h-9 bg-background focus-visible:ring-emerald-500"
            />
          </div>

          {/* List of Options */}
          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-border/20">
            {filteredSchools.length > 0 ? (
              filteredSchools.map((inst) => {
                const isSelected = value === inst;
                return (
                  <div
                    key={inst}
                    onClick={() => {
                      onChange(inst);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-md text-xs sm:text-sm cursor-pointer transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium",
                      isSelected && "bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold"
                    )}
                  >
                    <span className="line-clamp-2 pr-2">{inst}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-1" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching school found. Select "Other Higher Institution Outside Katsina" or refine your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
