"use client";
import React, { useState } from "react";

type FloatingInputProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  rows?: number;
};

export const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  className = "",
  rows = 3,
}) => {
  const [focused, setFocused] = useState(false);
  const [blurredOnce, setBlurredOnce] = useState(false);
  
  const isFilled = value.trim().length > 0;
  const isFloating = focused || isFilled;

  // Simple validation based on type
  const isValid = () => {
    if (required && !isFilled) return false;
    if (isFilled) {
      if (type === "email") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      if (type === "tel") {
        return /^[+]?[\d\s\-\(\)]{7,20}$/.test(value);
      }
    }
    return true;
  };

  const hasError = blurredOnce && !isValid();
  const showCheck = isFilled && isValid();

  const handleBlur = () => {
    setFocused(false);
    setBlurredOnce(true);
  };

  const inputClasses = `
    w-full bg-white/70 backdrop-blur-md rounded-2xl
    border transition-all duration-300 outline-none
    ${type === "textarea" ? "py-4 px-5 resize-y" : "h-14 px-5"}
    ${hasError 
      ? "border-rose-500/50 bg-rose-50 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 error-shake"
      : "border-stone-200 focus:border-[#C9A96E]/50 focus:bg-white focus:ring-4 focus:ring-[#C9A96E]/10 hover:border-stone-300"
    }
    text-stone-800 font-light tracking-wide text-[15px]
  `;

  const inputElement = type === "textarea" ? (
    <textarea
      id={id}
      name={name}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      rows={rows}
      className={`${inputClasses} pt-6`}
      style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}
    />
  ) : (
    <input
      type={type}
      id={id}
      name={name}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      className={`${inputClasses} pt-5`}
      style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}
    />
  );

  return (
    <div className={`relative flex flex-col ${className}`}>
      {inputElement}
      
      <label
        htmlFor={id}
        className={`absolute left-5 transition-all duration-300 pointer-events-none
          ${isFloating 
            ? "top-2 text-[10px] uppercase tracking-widest text-[#C9A96E] font-medium"
            : type === "textarea" 
              ? "top-4 text-[14px] text-stone-400 tracking-wide font-light"
              : "top-1/2 -translate-y-1/2 text-[14px] text-stone-400 tracking-wide font-light"
          }
          ${hasError && isFloating ? "!text-rose-500" : ""}
        `}
      >
        {label} {required && <span className="text-rose-500/80">*</span>}
      </label>

      {/* Validation Icons */}
      <div className={`absolute right-4 flex items-center pointer-events-none ${type === "textarea" ? "top-5" : "top-1/2 -translate-y-1/2"}`}>
        {hasError && (
          <svg className="w-5 h-5 text-rose-500 animate-in fade-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
        )}
        {showCheck && !focused && !hasError && (
          <svg className="w-5 h-5 text-emerald-500 animate-in fade-in zoom-in duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      

    </div>
  );
};
