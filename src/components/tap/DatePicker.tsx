"use client";
import React, { useState, useEffect, useRef } from "react";

type DatePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
};

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [age, setAge] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isFilled = value.trim().length > 0;
  const isFloating = isOpen || isFilled;

  // Initialize state based on value
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
        calculateAge(d);
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calculateAge = (dob: Date) => {
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    setAge(Math.abs(age_dt.getUTCFullYear() - 1970));
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Format to YYYY-MM-DD
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const days = [];
    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    
    // Day slots
    for (let i = 1; i <= daysCount; i++) {
      const isSelected = value && new Date(value).getDate() === i && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
      days.push(
        <button
          key={i}
          type="button"
          onClick={() => handleSelectDate(i)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200
            ${isSelected 
              ? "bg-[#C9A96E] text-white font-medium shadow-[0_2px_8px_rgba(201,169,110,0.4)] scale-110" 
              : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }
          `}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className={`relative flex flex-col ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/70 backdrop-blur-md rounded-2xl border transition-all duration-300 outline-none h-14 px-5 text-left flex items-center hover:border-stone-300
          ${isOpen 
            ? "border-[#C9A96E]/50 bg-white ring-4 ring-[#C9A96E]/10"
            : "border-stone-200"
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
          <span>{label} {required && <span className="text-rose-500/80">*</span>}</span>
          
          {age !== null && isFloating && (
            <span className="text-emerald-500 text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-300 font-medium">
              {age} Years Old
            </span>
          )}
        </div>

        <span className={`text-[15px] font-light tracking-wide text-stone-800 mt-4 block`}>
          {value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
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

      {/* Dropdown Calendar */}
      <div 
        className={`absolute top-[calc(100%+8px)] left-0 w-full z-50 p-4 rounded-2xl bg-white border border-stone-200 shadow-xl backdrop-blur-xl transition-all duration-300 origin-top
          ${isOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"}
        `}
      >
        <div className="flex gap-2 mb-4">
          <select 
            value={currentDate.getMonth()}
            onChange={handleMonthChange}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-stone-800 outline-none focus:border-[#C9A96E]/50 focus:ring-1 focus:ring-[#C9A96E]/30 appearance-none custom-select"
          >
            {months.map((m, i) => <option key={m} value={i} className="bg-white">{m}</option>)}
          </select>
          <select 
            value={currentDate.getFullYear()}
            onChange={handleYearChange}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-stone-800 outline-none focus:border-[#C9A96E]/50 focus:ring-1 focus:ring-[#C9A96E]/30 appearance-none custom-select"
          >
            {years.map(y => <option key={y} value={y} className="bg-white">{y}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
            <div key={d} className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 place-items-center">
          {renderCalendar()}
        </div>
      </div>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
};
