"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    console.log("isLoaded:", isLoaded, "signIn:", signIn);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1220] px-4 font-sans selection:bg-[#D4AF6A] selection:text-[#0B1220]">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-[#F5F3EE]">Tapply Admin</h1>
          <p className="text-sm text-white/50 mt-2">
            {!pendingVerification ? "Sign in to your dashboard" : "Check your email for the code"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {!pendingVerification ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#F5F3EE]/80">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-[#0B1220]/50 border border-white/10 rounded-lg px-4 py-3 text-[#F5F3EE] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF6A] hover:bg-[#c39e5b] text-[#0B1220] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-[#F5F3EE]/80">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[#0B1220]/50 border border-white/10 rounded-lg px-4 py-3 text-[#F5F3EE] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent transition-all text-center tracking-[0.25em] font-mono text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF6A] hover:bg-[#c39e5b] text-[#0B1220] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setPendingVerification(false)}
              className="w-full text-[#D4AF6A]/70 hover:text-[#D4AF6A] text-sm transition-colors mt-4"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
