"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { SearchableDropdown } from "@/components/tap/SearchableDropdown";
import { FloatingInput } from "@/components/tap/FloatingInput";
import { DatePicker } from "@/components/tap/DatePicker";
import { VisualCardGrid } from "@/components/tap/VisualCardGrid";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type TapResponse = {
  org_name?: string;
  form_fields?: FormField[];
  default_branch?: string;
  logo_url?: string | null;
  theme_color?: string;
  welcome_title?: string;
  welcome_text?: string;
};

const STEP_META = [
  { icon: "🎓", heading: "Choose Your Path", subtext: "Find the programme that ignites your ambition." },
  { icon: "✦",  heading: "Tell Us About You", subtext: "Every great journey starts with a story." },
  { icon: "✦",  heading: "A Few More Details", subtext: "Help us get to know you better." },
  { icon: "✦",  heading: "Almost There",       subtext: "One final step before we connect." },
  { icon: "🤝", heading: "Your Commitment",    subtext: "Confirm your interest and we'll take it from here." },
];

export default function TapPage() {
  const params  = useParams();
  const token   = params?.token as string | undefined;

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [data,         setData]         = useState<TapResponse | null>(null);
  const [formData,     setFormData]     = useState<Record<string, string>>({});
  const [gdprConsent,  setGdprConsent]  = useState(false);
  const [idempotencyKey]               = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [metadata,     setMetadata]     = useState<Record<string, any>>({});
  const [currentStep,  setCurrentStep]  = useState(0);
  const [animDir,      setAnimDir]      = useState(1);
  const [toastError,   setToastError]   = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    sp.forEach((v, k) => { if (k.startsWith("utm_")) utms[k] = v; });
    setMetadata({
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      browser: navigator.userAgent, language: navigator.language,
      timestamp: new Date().toISOString(), referrer: document.referrer || "direct",
      utm_parameters: Object.keys(utms).length > 0 ? utms : null,
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res  = await fetch(`${base}/tap/${token}`);
        if (!res.ok) { 
           try {
              const errData = await res.json();
              if (errData.detail) {
                 setError(errData.detail);
                 return;
              }
           } catch(error) {
              const err = error as Error;
              console.error("Failed to parse error response:", err);
           }
           setError(res.status === 404 ? "This card isn't recognised." : "Unable to connect."); 
           return; 
        }
        setData(await res.json());
      } catch { setError("Unable to connect. Please try again later."); }
      finally  { setLoading(false); }
    })();
  }, [token]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tapply_returning_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now() && parsed.data) {
          setFormData(parsed.data);
        }
      }
    } catch(error) {
      const err = error as Error;
      console.error("Failed to load returning user data:", err);
      setToastError("Failed to load previous data.");
    }
  }, []);

  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (!navigator.onLine) return;
      const queueStr = localStorage.getItem("tapply_offline_queue");
      if (!queueStr) return;
      
      try {
        const queue: Array<{ token: string, payload: any, addedAt: number }> = JSON.parse(queueStr);
        if (queue.length === 0) return;

        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const remaining = [];
        for (const item of queue) {
           try {
              const res = await fetch(`${base}/tap/${item.token}/submit`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
              if (!res.ok && res.status !== 429) {
                 if (res.status >= 500) {
                   remaining.push(item);
                 }
              }
           } catch(e) {
              remaining.push(item);
           }
        }
        localStorage.setItem("tapply_offline_queue", JSON.stringify(remaining));
      } catch(error) {
        const err = error as Error;
        console.error("Failed to process offline queue:", err);
        setToastError("Failed to sync offline queue.");
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncOfflineQueue();
    };

    window.addEventListener("online", syncOfflineQueue);
    document.addEventListener("visibilitychange", onVisibilityChange);
    
    syncOfflineQueue();

    return () => {
      window.removeEventListener("online", syncOfflineQueue);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const steps = useMemo(() => {
    if (!data?.form_fields) return [];
    const branch = data.form_fields.find(f => f.name === "branch");
    const rest   = data.form_fields.filter(f => f.name !== "branch");
    const groups: FormField[][] = [];
    if (branch) groups.push([branch]);
    for (let i = 0; i < rest.length; i += 3) groups.push(rest.slice(i, i + 3));
    return groups;
  }, [data]);

  const totalSteps = steps.length + 1;
  const progress   = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  const validate = () => {
    if (currentStep === steps.length) return gdprConsent;
    return steps[currentStep].every(f => {
      if (!f.required) return true;
      const v = formData[f.name] ?? "";
      if (!v.trim()) return false;
      if (f.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (f.type === "tel")   return /^[+]?[\d\s\-\(\)]{7,20}$/.test(v);
      return true;
    });
  };

  const go = (dir: 1 | -1) => {
    const next = currentStep + dir;
    if (dir === 1 && !validate()) return;
    if (next < 0 || next >= totalSteps) return;
    setAnimDir(dir);
    setTimeout(() => setCurrentStep(next), 40);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true); setSubmitError(null);
    const payload = { idempotency_key: idempotencyKey, consent: gdprConsent, data: { ...formData, metadata } };

    try {
      if (!navigator.onLine) {
        throw new Error("offline");
      }

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res  = await fetch(`${base}/tap/${token}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Unable to submit. Please try again.";
        try { const e = await res.json(); if (e.detail) msg = typeof e.detail === "string" ? e.detail : msg; } catch(_) {}
        throw new Error(msg);
      }
      setIsSuccess(true);
      
      try {
        localStorage.setItem("tapply_returning_user", JSON.stringify({
          data: formData,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
        }));
      } catch(e) {}
    } catch (error) { 
      const e = error as Error;
      if (e.message === "offline" || e.name === "TypeError") {
         try {
           const queue = JSON.parse(localStorage.getItem("tapply_offline_queue") || "[]");
           queue.push({ token, payload, addedAt: Date.now() });
           localStorage.setItem("tapply_offline_queue", JSON.stringify(queue));
         } catch(error) {
           const err = error as Error;
           console.error("Failed to queue offline submission:", err);
           setSubmitError("Failed to save offline application.");
           return;
         }
         setIsSuccess(true);
      } else {
         setSubmitError(e.message || "Network error."); 
      }
    }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg,#fdf8f0,#f5ebe0)" }}>
      <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-[#C9A96E] animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center justify-center min-h-screen p-6" style={{ background: "linear-gradient(135deg,#fdf8f0,#f5ebe0)" }}>
      <div className="text-center max-w-sm w-full p-10 rounded-3xl bg-white border border-stone-200 shadow-xl space-y-4">
        <p className="text-4xl">😔</p>
        <h1 className="text-2xl font-light text-stone-800">Oops</h1>
        <p className="text-stone-400 font-light">{error || "Something went wrong."}</p>
      </div>
    </div>
  );

  if (isSuccess) return (
    <div className="flex items-center justify-center min-h-screen p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#fdf8f0,#f5ebe0)" }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 text-center max-w-sm w-full p-10 rounded-[32px] bg-white border border-stone-200 shadow-2xl space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
        <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center animate-[bounce-subtle_2s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(135deg,#C9A96E,#A8864E)", boxShadow: "0 8px 30px rgba(201,169,110,0.35)" }}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-light text-stone-800 mb-3">Application Complete</h1>
          <p className="text-stone-500 text-[15px] font-light leading-relaxed">
            Thank you for applying to <strong className="text-[#C9A96E] font-medium">{data.org_name || "us"}</strong>. We'll be in touch shortly.
          </p>
        </div>
      </div>
    </div>
  );

  const renderField = (field: FormField, idx: number) => {
    const delay = `${idx * 80}ms`;
    const wrap  = "animate-in slide-in-from-bottom-3 fade-in duration-400 fill-mode-both";
    const set   = (v: string) => setFormData(p => ({ ...p, [field.name]: v }));

    if (field.name === "branch") return (
      <div key={field.name} className={`flex flex-col gap-3 ${wrap}`} style={{ animationDelay: delay }}>
        <label className="text-[11px] uppercase tracking-[0.15em] text-[#C9A96E] font-semibold ml-0.5">
          Select {field.label} {field.required && <span className="text-rose-500">*</span>}
        </label>
        <VisualCardGrid options={field.options || []} value={formData[field.name] || ""} onChange={set} required={field.required} />
      </div>
    );

    if (field.name === "dob") return (
      <div key={field.name} className={wrap} style={{ animationDelay: delay }}>
        <DatePicker id={field.name} name={field.name} label={field.label} required={field.required}
          value={formData[field.name] || ""} onChange={set} />
      </div>
    );

    if (["dropdown","select"].includes(field.type)) return (
      <div key={field.name} className={wrap} style={{ animationDelay: delay }}>
        <SearchableDropdown id={field.name} name={field.name} label={field.label}
          options={field.options || []} value={formData[field.name] || ""} onChange={set} required={field.required} />
      </div>
    );

    const t = (["text","email","tel","textarea"].includes(field.type) ? field.type : "text") as any;
    return (
      <div key={field.name} className={wrap} style={{ animationDelay: delay }}>
        <FloatingInput id={field.name} name={field.name} label={field.label} type={t}
          required={field.required} value={formData[field.name] || ""} onChange={set} />
      </div>
    );
  };

  const accent = data.theme_color || "#C9A96E";
  const accentLight = `${accent}29`; // 16% opacity

  // Override step 0 heading/subtext with org-configured branding
  const dynamicStepMeta = STEP_META.map((s, i) =>
    i === 0
      ? { ...s, heading: data.welcome_title || s.heading, subtext: data.welcome_text || s.subtext }
      : s
  );
  const stepMeta = dynamicStepMeta[Math.min(currentStep, dynamicStepMeta.length - 1)];

  return (
    <div className="flex-1 w-full min-h-screen font-sans flex flex-col lg:grid lg:grid-cols-[40%_60%]" style={{ background: "linear-gradient(135deg,#fdf8f0 0%,#f5ebe0 100%)" }}>

      {/* ══ LEFT PANEL — sticky aside, desktop only ══ */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden relative">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#fdf2e0 0%,#f7e8d0 55%,#eedfc8 100%)" }} />
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(201,169,110,0.18) 0%,transparent 70%)", animation: "breathe 9s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 -right-20 w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(201,169,110,0.12) 0%,transparent 70%)", animation: "breathe 12s ease-in-out infinite reverse" }} />

        <div className="relative z-10 flex flex-col h-full px-12 py-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {data.logo_url ? (
              <img src={data.logo_url} alt={data.org_name} className="h-9 w-auto object-contain rounded-xl" />
            ) : (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg,${accent},${accent}bb)`, boxShadow: `0 4px 14px ${accent}66` }}>
                <span className="text-white font-bold text-sm">{(data.org_name || "T")[0].toUpperCase()}</span>
              </div>
            )}
            <span className="text-[12px] font-semibold tracking-[0.22em] uppercase text-stone-400">{data.org_name || "Tapply"}</span>
          </div>

          {/* Step block */}
          <div key={currentStep} className="flex-1 flex flex-col justify-center py-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="text-5xl mb-6 leading-none select-none">{stepMeta.icon}</p>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: accent }}>
              Step {currentStep + 1} of {totalSteps}
            </p>
            <h2 className="text-3xl font-light text-stone-800 leading-snug mb-3">{stepMeta.heading}</h2>
            <p className="text-[15px] text-stone-400 font-light leading-relaxed max-w-[240px]">{stepMeta.subtext}</p>

            <div className="flex items-center gap-2 mt-10">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-500 shrink-0" style={{
                  width: i === currentStep ? 26 : 8, height: 8,
                  background: i <= currentStep ? accent : "#ddd5cc",
                  opacity: i < currentStep ? 0.45 : 1,
                }} />
              ))}
            </div>
          </div>

          {/* Org name */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300 font-medium mb-0.5">Admissions Portal</p>
            <p className="text-lg text-stone-600 font-light">{data.org_name || "University"}</p>
          </div>
        </div>
      </aside>

      {/* ══ RIGHT COLUMN — scrollable form ══ */}
      <div className="flex flex-col min-h-screen">

        {/* Progress bar */}
        <div className="fixed top-0 left-0 w-full h-[3px] z-50 bg-stone-200/60">
          <div className="h-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, background: `linear-gradient(to right,${accent}bb,${accent})`, boxShadow: `0 0 6px ${accent}80` }} />
        </div>

        {/* Mobile header (Rich version matching desktop) */}
        <header key={`mobile-header-${currentStep}`} className="lg:hidden px-6 pt-14 pb-2 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-4xl mb-3 leading-none select-none drop-shadow-sm">{stepMeta.icon}</p>
          <p className="text-[9px] uppercase tracking-[0.25em] font-bold mb-2" style={{ color: accent }}>
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h2 className="text-2xl font-light text-stone-800 leading-snug mb-2">{stepMeta.heading}</h2>
          <p className="text-[14px] text-stone-500 font-light leading-relaxed max-w-[280px]">
            {stepMeta.subtext}
          </p>
          
          {/* Mobile Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-500 shrink-0" style={{
                width: i === currentStep ? 20 : 6, height: 6,
                background: i <= currentStep ? accent : "#ddd5cc",
                opacity: i < currentStep ? 0.45 : 1,
              }} />
            ))}
          </div>
        </header>

        {/* Form — centered vertically */}
        <main className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-20 xl:px-32 pt-10 lg:pt-16 pb-16 w-full">
          <div className="w-full">

            {/* White card */}
            <div className="w-full bg-white rounded-3xl border border-stone-200/80 shadow-[0_2px_32px_rgba(0,0,0,0.07)] p-8 sm:p-12">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-semibold mb-6">
                Step {currentStep + 1} <span className="text-stone-300 font-normal">/ {totalSteps}</span>
              </p>

              <div key={currentStep} className="animate-in fade-in duration-400 fill-mode-both"
                style={{ animationName: "enter-step", "--slide-from": animDir > 0 ? "18px" : "-18px" } as any}>

                {currentStep < steps.length ? (
                  <div className="space-y-5">
                    {steps[currentStep].map((f, i) => renderField(f, i))}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-3 fade-in duration-400">
                    <div>
                      <h2 className="text-xl font-light text-stone-800 mb-1">Almost done</h2>
                      <p className="text-sm text-stone-400 font-light">Please confirm your consent below.</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200">
                      <div className="flex items-start gap-4">
                        <div className="relative flex items-center h-5 mt-0.5 shrink-0">
                          <input type="checkbox" id="gdpr_consent" required checked={gdprConsent}
                            onChange={e => setGdprConsent(e.target.checked)}
                            className="peer h-5 w-5 appearance-none rounded-md border-2 border-stone-300 bg-white checked:bg-[#C9A96E] checked:border-[#C9A96E] transition-all cursor-pointer" />
                          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <label htmlFor="gdpr_consent" className="text-[13px] text-stone-500 leading-relaxed cursor-pointer select-none font-light">
                          I agree to be contacted by the university regarding my inquiry and understand that my data will be processed according to the{" "}
                          <a href="#" className="text-[#C9A96E] hover:text-[#B8935A] underline underline-offset-2 transition-colors">Privacy Policy</a>.
                        </label>
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-light animate-[shake_0.4s_ease-in-out]">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01"/>
                        </svg>
                        {submitError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Nav buttons — below the card */}
            <div className="flex gap-3 mt-4">
              {currentStep > 0 && (
                <button onClick={() => go(-1)} type="button"
                  className="w-[100px] shrink-0 rounded-2xl border border-stone-200 bg-white text-stone-500 text-[14px] font-light hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-[0.97]"
                  style={{ height: 52 }}>
                  Back
                </button>
              )}

              {currentStep < steps.length ? (
                <button onClick={() => go(1)} type="button" disabled={!validate()}
                  className="flex-1 relative overflow-hidden group rounded-2xl text-[13px] font-medium tracking-[0.12em] uppercase transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ height: 52, background: "linear-gradient(135deg,#C9A96E,#B8935A)", color: "#fff",
                    boxShadow: "0 4px 18px rgba(201,169,110,0.3),0 1px 3px rgba(0,0,0,0.07)" }}>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    Continue
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </span>
                </button>
              ) : (
                <button onClick={handleSubmit} type="button" disabled={!validate() || isSubmitting}
                  className="flex-1 relative overflow-hidden group rounded-2xl text-[13px] font-medium tracking-[0.12em] uppercase transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ height: 52, background: "linear-gradient(135deg,#C9A96E,#A8864E)", color: "#fff",
                    boxShadow: "0 4px 22px rgba(201,169,110,0.35),0 1px 3px rgba(0,0,0,0.07)" }}>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin opacity-70" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit Application
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {toastError && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-stone-800 border border-stone-700 text-white text-sm shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span className="font-light">{toastError}</span>
            <button onClick={() => setToastError(null)} className="ml-2 text-stone-400 hover:text-white transition-colors" aria-label="Dismiss">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
