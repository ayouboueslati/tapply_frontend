"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    { name: "Status Labels", href: "/dashboard/status-labels" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  const contextLoading = isLoaded && isSignedIn && !contextData && !contextError;

  return (
    <OrgContext.Provider value={{ context: contextData, loading: contextLoading, error: contextError }}>
      <div className="min-h-screen bg-[#0B1220] flex font-sans text-[#F5F3EE]">
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-[#0B1220]/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1220] border-r border-white/10 flex flex-col
            transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Logo / Org Name */}
          <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
            <h1 className="text-lg font-medium truncate">
              {contextData?.org_name || "Tapply"}
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
                    block px-3 py-2 rounded-lg text-sm transition-colors
                    ${active 
                      ? "bg-[#D4AF6A]/10 text-[#D4AF6A] font-medium" 
                      : "text-white/60 hover:bg-white/5 hover:text-[#F5F3EE]"}
                  `}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar */}
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/10 shrink-0 bg-[#0B1220]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden text-white/60 hover:text-white"
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
                <span className="text-sm text-white/40 hidden sm:block">
                  {contextData.email}
                </span>
              )}
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-label="Sign Out"
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </header>

          {/* Page Content (handles loading/error states) */}
          <main className="flex-1 overflow-auto p-4 lg:p-8 relative">
            {!isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[#F5F3EE]/50 animate-pulse">Loading app...</p>
              </div>
            ) : contextLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[#F5F3EE]/50 animate-pulse">Loading organization...</p>
              </div>
            ) : contextError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="max-w-md w-full p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-red-400 font-medium">{contextError}</p>
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
