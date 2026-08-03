"use client";

import React, { useState, useRef, useEffect } from "react";

interface SearchableDropdownProps {
  id: string;
  name: string;
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function SearchableDropdown({
  id,
  name,
  label,
  options,
  value,
  onChange,
  required,
  placeholder = "Select an option...",
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );
  
  const isFloating = isOpen || value;

  return (
    <div ref={wrapperRef} className="relative flex flex-col w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/70 backdrop-blur-md rounded-2xl border transition-all duration-300 outline-none h-14 px-5 text-left flex items-center
          ${isOpen 
            ? "border-[#C9A96E]/50 bg-white ring-4 ring-[#C9A96E]/10"
            : "border-stone-200 hover:border-stone-300"
          }
        `}
        style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}
      >
        <div className={`absolute left-5 transition-all duration-300 pointer-events-none flex items-center gap-3 w-[calc(100%-40px)] justify-between
          ${isFloating 
            ? "top-2 text-[10px] uppercase tracking-widest text-[#C9A96E] font-medium"
            : "top-1/2 -translate-y-1/2 text-[14px] text-stone-400 tracking-wide font-light"
          }
        `}>
          <span>{label || placeholder} {required && <span className="text-rose-500/80">*</span>}</span>
        </div>

        <span className={`text-[15px] font-light tracking-wide text-stone-800 mt-4 block truncate pr-6`}>
          {value || ""}
        </span>
        
        <svg 
          className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#C9A96E]" : ""}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hidden input for native form submission and validation */}
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={() => {}} // Controlled strictly via dropdown
        className="absolute opacity-0 -z-10 w-0 h-0"
        tabIndex={-1}
      />

      {/* Dropdown Menu */}
      <div 
        className={`absolute top-[calc(100%+8px)] left-0 w-full z-50 p-2 rounded-2xl bg-white border border-stone-200 shadow-xl backdrop-blur-xl transition-all duration-300 origin-top flex flex-col max-h-[300px]
          ${isOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"}
        `}
      >
        <div className="mb-2 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
             <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-9 pr-3 text-sm text-stone-800 outline-none focus:border-[#C9A96E]/50 focus:bg-white focus:ring-2 focus:ring-[#C9A96E]/10"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus={isOpen}
          />
        </div>
        <ul className="overflow-y-auto custom-scrollbar flex-1 pr-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = value === opt;
              return (
                <li
                  key={opt}
                  className={`px-4 py-3 text-[14px] rounded-xl cursor-pointer transition-colors flex items-center justify-between mb-1
                    ${isSelected 
                      ? "bg-[#C9A96E]/10 text-[#C9A96E] font-medium" 
                      : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                    }
                  `}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate pr-4">{opt}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-[#C9A96E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-4 py-6 text-[13px] text-stone-400 text-center font-light">
              No matches found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
