"use client";

import { useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@clerk/nextjs";
import GlassPanel from "@/components/ui/GlassPanel";

type Card = {
  id: string;
  stand_id: string;
  stand_name: string;
  token: string;
  is_active: boolean;
  assigned_recruiter_id: string | null;
};

type CardManagementProps = {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
};

export default function CardManagement({ cards, onCardsChange }: CardManagementProps) {
  const { getToken } = useAuth();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [togglingCard, setTogglingCard] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Session expired");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getToken]);

  const toggleActive = async (card: Card) => {
    setTogglingCard(card.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/cards/${card.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: !card.is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        onCardsChange(cards.map((c) => (c.id === card.id ? updated : c)));
      }
    } catch (e) {
      console.error("Failed to toggle card status", e);
    } finally {
      setTogglingCard(null);
    }
  };

  const downloadQR = (token: string, standName: string) => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      const a = document.createElement("a");
      a.download = `qr-${standName.toLowerCase().replace(/\s+/g, "-")}-${token.slice(0, 8)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (cards.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mb-4">
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest">
            NFC Cards & QR Links
          </h3>
          <span className="text-xs text-slate-400 dark:text-white/30">
            {cards.filter(c => c.is_active).length} of {cards.length} active
          </span>
        </div>

        <div className="space-y-3">
          {cards.map((card) => {
            const tapUrl = `${appUrl}/tap/${card.token}`;
            const isCopied = copiedToken === card.token;
            const isQROpen = qrToken === card.token;
            const isToggling = togglingCard === card.id;

            return (
              <div key={card.id} className="space-y-0">
                <div
                  className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                    card.is_active
                      ? "bg-white/60 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.07]"
                      : "bg-slate-100/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-60"
                  }`}
                >
                  {/* Status indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                    card.is_active 
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                      : "bg-slate-300 dark:bg-white/20"
                  }`} />

                  {/* Card info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-0.5">{card.stand_name}</p>
                    <p className="text-sm text-slate-900 dark:text-[#FAFAFA] font-mono truncate">{tapUrl}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Copy link */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tapUrl);
                        setCopiedToken(card.token);
                        setTimeout(() => setCopiedToken(null), 2000);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        isCopied
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-slate-200/70 text-slate-600 hover:bg-slate-300 border border-transparent dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
                      }`}
                      title="Copy tap link"
                    >
                      {isCopied ? "✓ Copied" : "Copy"}
                    </button>

                    {/* QR toggle */}
                    <button
                      onClick={() => setQrToken(isQROpen ? null : card.token)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                        isQROpen
                          ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400"
                          : "bg-slate-200/70 text-slate-600 hover:bg-slate-300 border-transparent dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
                      }`}
                      title="Show QR code"
                    >
                      QR
                    </button>

                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(card)}
                      disabled={isToggling}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500/50 ${
                        card.is_active
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-white/20"
                      } ${isToggling ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      title={card.is_active ? "Deactivate card" : "Activate card"}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        card.is_active ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* QR Code expandable */}
                {isQROpen && (
                  <div className="flex items-center gap-6 p-5 ml-6 mr-6 -mt-1 bg-white dark:bg-[#0C0E14] rounded-b-xl border border-t-0 border-slate-200 dark:border-white/10 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div ref={qrRef} className="shrink-0 p-3 bg-white rounded-xl border border-slate-200">
                      <QRCodeSVG
                        value={tapUrl}
                        size={160}
                        level="H"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#1e293b"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-white/70 mb-1">QR Code for {card.stand_name}</p>
                        <p className="text-xs text-slate-400 dark:text-white/30">
                          Scan this code to open the tap form. Use this as a fallback when NFC isn&apos;t available.
                        </p>
                      </div>
                      <button
                        onClick={() => downloadQR(card.token, card.stand_name)}
                        className="self-start px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 text-white hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
                      >
                        Download PNG (1024×1024)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
