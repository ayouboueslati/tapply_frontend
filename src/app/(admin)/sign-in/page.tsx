"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const { supportedFirstFactors } = await signIn.create({
        identifier: emailAddress,
      });

      const emailFactor = supportedFirstFactors?.find(
        (f) => f.strategy === "email_code"
      );

      if (emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
        setPendingVerification(true);
      } else {
        setError("Email code authentication is not enabled for this user.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Unable to complete sign in. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Animated aurora glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[40%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
          style={{
            background:
              "conic-gradient(from 180deg, #C9A96E 0deg, #1a1a2e 90deg, #C9A96E 180deg, #1a1a2e 270deg, #C9A96E 360deg)",
            animation: "aurora-spin 20s linear infinite",
            filter: "blur(80px)",
          }}
        />
        {/* Warm accent orb */}
        <div
          className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #C9A96E 0%, transparent 60%)",
            animation: "breathe 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Card container */}
      <div
        className={`relative z-10 w-full max-w-[440px] mx-6 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.98]"
        }`}
      >
        {/* Outer glow */}
        <div
          className="absolute -inset-[1px] rounded-[20px] opacity-60"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,169,110,0.2) 0%, transparent 40%, transparent 60%, rgba(201,169,110,0.08) 100%)",
          }}
        />

        <div
          className="relative rounded-[20px] border border-white/[0.06] p-10 backdrop-blur-2xl"
          style={{
            background:
              "linear-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            boxShadow:
              "0 0 0 0.5px rgba(255,255,255,0.03) inset, 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 80px -20px rgba(201,169,110,0.06)",
          }}
        >
          {/* Brand wordmark */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2.5 mb-6"
              style={{ animation: "fade-down 0.8s ease-out 0.2s both" }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #C9A96E 0%, #A8864E 100%)",
                  boxShadow: "0 4px 12px rgba(201,169,110,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span className="text-[#09090b] font-bold text-sm tracking-tight">T</span>
              </div>
              <span
                className="text-[15px] font-medium tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Tapply
              </span>
            </div>

            <h1
              className="text-[28px] font-light tracking-[-0.02em] text-white/95 leading-tight"
              style={{ animation: "fade-down 0.8s ease-out 0.3s both" }}
            >
              {!pendingVerification ? (
                <>Welcome back</>
              ) : (
                <>Verify your identity</>
              )}
            </h1>
            <p
              className="mt-3 text-[14px] font-light tracking-wide leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.3)",
                animation: "fade-down 0.8s ease-out 0.4s both",
              }}
            >
              {!pendingVerification ? (
                "Enter your email to continue"
              ) : (
                <>
                  A code was sent to{" "}
                  <span
                    className="font-normal"
                    style={{ color: "#C9A96E" }}
                  >
                    {emailAddress}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-8 flex items-center gap-3 rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(244,63,94,0.06)",
                border: "1px solid rgba(244,63,94,0.12)",
              }}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                <svg
                  className="h-3 w-3 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-[13px] font-light text-rose-300/80 tracking-wide">{error}</p>
            </div>
          )}

          {/* Email step */}
          {!pendingVerification ? (
            <form
              onSubmit={handleEmailSubmit}
              className="space-y-7"
              style={{ animation: "fade-up 0.6s ease-out 0.5s both" }}
            >
              <div className="space-y-3">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium uppercase tracking-[0.15em]"
                  style={{ color: "rgba(201,169,110,0.6)" }}
                >
                  Email Address
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg
                      className="h-5 w-5 text-white/20 transition-colors duration-300 group-focus-within:text-[#C9A96E]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="3" />
                      <path d="M22 7l-10 6L2 7" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-2xl border border-white/[0.05] bg-black/40 py-4 pl-11 pr-4 text-[15px] font-light tracking-wide text-white/90 outline-none transition-all duration-300 placeholder:text-white/[0.15] focus:border-[#C9A96E]/40 focus:bg-black/60 focus:ring-[4px] focus:ring-[#C9A96E]/10"
                    style={{
                      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl py-3.5 px-6 text-[13px] font-medium uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: "linear-gradient(135deg, #C9A96E 0%, #B8935A 50%, #A8864E 100%)",
                  color: "#09090b",
                  boxShadow:
                    "0 4px 20px rgba(201,169,110,0.25), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                {/* Shimmer */}
                <div
                  className="absolute inset-0 -translate-x-full transition-transform duration-[1200ms] ease-out group-hover:translate-x-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                />
                <span className="relative flex items-center justify-center gap-2.5">
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending
                    </>
                  ) : (
                    <>
                      Continue
                      <svg
                        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleCodeSubmit}
              className="space-y-7"
              style={{ animation: "fade-up 0.6s ease-out both" }}
            >
              <div className="space-y-3">
                <label
                  htmlFor="code"
                  className="block text-[11px] font-medium uppercase tracking-[0.15em]"
                  style={{ color: "rgba(201,169,110,0.6)" }}
                >
                  Verification Code
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg
                      className="h-5 w-5 text-white/20 transition-colors duration-300 group-focus-within:text-[#C9A96E]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <input
                    id="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="· · · · · ·"
                    autoFocus
                    className="w-full rounded-2xl border border-white/[0.05] bg-black/40 py-4 pl-11 pr-4 text-center font-mono text-[20px] tracking-[0.4em] text-white/90 outline-none transition-all duration-300 placeholder:text-white/[0.15] placeholder:tracking-[0.4em] focus:border-[#C9A96E]/40 focus:bg-black/60 focus:ring-[4px] focus:ring-[#C9A96E]/10"
                    style={{
                      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl py-3.5 px-6 text-[13px] font-medium uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{
                  background: "linear-gradient(135deg, #C9A96E 0%, #B8935A 50%, #A8864E 100%)",
                  color: "#09090b",
                  boxShadow:
                    "0 4px 20px rgba(201,169,110,0.25), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <div
                  className="absolute inset-0 -translate-x-full transition-transform duration-[1200ms] ease-out group-hover:translate-x-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                />
                <span className="relative flex items-center justify-center gap-2.5">
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying
                    </>
                  ) : (
                    "Sign In"
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false);
                  setError("");
                }}
                className="group flex w-full items-center justify-center gap-2 pt-1 text-[12px] uppercase tracking-[0.15em] transition-all duration-300"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(201,169,110,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
              >
                <svg
                  className="h-3 w-3 transition-transform duration-300 group-hover:-translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Different email
              </button>
            </form>
          )}

          {/* Divider + footer */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
            <p
              className="text-[10px] font-light uppercase tracking-[0.2em] shrink-0"
              style={{ color: "rgba(255,255,255,0.12)" }}
            >
              Admin Portal
            </p>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
          </div>
        </div>
      </div>

    </div>
  );
}

