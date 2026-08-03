"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";

// ── Types ────────────────────────────────────────────────────────────────────

export type FormFieldDef = {
  name: string;
  label?: string;
  type?: string;
};

export type OrgContextData = {
  email: string;
  org_name: string;
  role: string;
  form_fields: FormFieldDef[];
};

type OrgContextValue = {
  context: OrgContextData | null;
  loading: boolean;
  error: string | null;
};

// ── Context ──────────────────────────────────────────────────────────────────

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrgContext must be used within DashboardLayout");
  }
  return ctx;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const pathname = usePathname();

  const [contextData, setContextData] = useState<OrgContextData | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Fetch org context ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Session expired");

        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${apiUrl}/organizations/me/context`, { headers });

        if (cancelled) return;

        if (res.status === 403) {
          setContextError(
            "You're signed in, but not yet part of an organization. Contact your administrator."
          );
          return;
        }
        if (!res.ok) {
          setContextError("Unable to connect to the server. Please try again later.");
          return;
        }

        setContextData(await res.json());
      } catch {
        if (!cancelled) setContextError("Network error. Unable to reach the server.");
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, apiUrl]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ redirectUrl: '/sign-in' });
    } catch (e) {
      console.error("Sign out error", e);
      setIsSigningOut(false);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Settings", href: "/dashboard/settings" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  const contextLoading = isLoaded && isSignedIn && !contextData && !contextError;

  return (
    <OrgContext.Provider value={{ context: contextData, loading: contextLoading, error: contextError }}>
      <div className="min-h-screen bg-background flex font-sans text-foreground transition-colors duration-300">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-white/10 shrink-0 bg-transparent">
          <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-white/10">
            <h1 className="text-xl font-bold tracking-tight text-gradient">
              Tapply
            </h1>
          </div>
          
          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    block px-4 py-2.5 rounded-xl text-sm transition-all duration-200
                    ${active 
                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-[#FAFAFA] border border-transparent"}
                  `}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Panel */}
            <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-background border-r border-slate-200 dark:border-white/10">
              <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-white/10">
                <h1 className="text-xl font-bold tracking-tight text-gradient">
                  Tapply
                </h1>
              </div>
              
              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        block px-4 py-2.5 rounded-xl text-sm transition-all duration-200
                        ${active 
                          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-[#FAFAFA] border border-transparent"}
                      `}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar */}
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-200 dark:border-white/10 shrink-0 bg-transparent backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {contextData?.email && (
                <span className="text-sm font-medium text-slate-500 dark:text-white/50 hidden sm:block">
                  {contextData.email}
                </span>
              )}
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-label="Sign Out"
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/70 dark:hover:text-white glass-panel dark:hover:bg-white/10 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </header>

          {/* Page Content (handles loading/error states) */}
          <main className="flex-1 overflow-auto p-4 lg:p-8 relative">
            {!isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-400 dark:text-[#F5F3EE]/50 animate-pulse">Loading app...</p>
              </div>
            ) : contextLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-400 dark:text-[#F5F3EE]/50 animate-pulse">Loading organization...</p>
              </div>
            ) : contextError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="max-w-md w-full p-6 rounded-lg bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium">{contextError}</p>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </OrgContext.Provider>
  );
}
