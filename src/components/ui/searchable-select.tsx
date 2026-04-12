"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  error,
  disabled,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate">{label}</label>
      )}
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
          className={cn(
            "w-full rounded-[--radius-md] border bg-white px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer",
            isOpen ? "border-royal ring-2 ring-royal/20" : "border-mist-dark",
            error && "border-error",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={value ? "text-slate" : "text-slate-lighter"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown size={16} className={cn("text-slate-lighter transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-[--radius-md] border border-mist shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-mist">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-lighter" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-cloud rounded-[--radius-sm] outline-none border-none text-slate placeholder:text-slate-lighter"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-lighter text-center">
                  No results found
                </div>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-cloud transition-colors cursor-pointer",
                      value === option.value && "bg-violet/5 text-violet font-medium"
                    )}
                  >
                    {option.label}
                    {value === option.value && <Check size={14} className="text-violet" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
