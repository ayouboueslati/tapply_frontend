"use client";
import React, { useState } from "react";

type VisualCardGridProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export const VisualCardGrid: React.FC<VisualCardGridProps> = ({
  options,
  value,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search options..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/70 backdrop-blur-md rounded-xl border border-stone-200 h-12 pl-11 pr-4 text-[14px] font-light text-stone-800 outline-none transition-all duration-300 focus:border-[#C9A96E]/40 focus:bg-white focus:ring-4 focus:ring-[#C9A96E]/10 hover:border-stone-300"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 pb-2 custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => {
            const isSelected = value === opt;
            
            return (
                <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`relative flex items-center p-4 rounded-2xl border text-left transition-all duration-300 group
                  ${isSelected
                    ? "bg-white border-[#C9A96E]/50 shadow-[0_4px_12px_rgba(201,169,110,0.15)] scale-[1.02] z-10"
                    : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 hover:-translate-y-0.5 shadow-sm"
                  }
                `}
              >
                {/* Background Glow when selected */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#C9A96E]/10 to-transparent opacity-50 pointer-events-none" />
                )}

                <div className="flex-1 min-w-0 pr-8">
                  <p className={`text-[14px] truncate transition-colors duration-300
                    ${isSelected ? "text-[#C9A96E] font-medium" : "text-stone-700 font-light group-hover:text-stone-900"}
                  `}>
                    {opt}
                  </p>
                </div>

                {/* Checkmark indicator */}
                <div className={`absolute right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300
                  ${isSelected
                    ? "border-[#C9A96E] bg-[#C9A96E]"
                    : "border-stone-300 bg-transparent group-hover:border-stone-400"
                  }
                `}>
                  <svg 
                    className={`w-3 h-3 text-white transition-all duration-300 origin-center
                      ${isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"}
                    `} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-1 sm:grid-cols-2 py-8 text-center text-stone-400 text-sm font-light">
            No options found for "{searchTerm}"
          </div>
        )}
      </div>

    </div>
  );
};
