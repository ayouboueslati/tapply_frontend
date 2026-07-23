import { ReactNode } from "react";

export default function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}
