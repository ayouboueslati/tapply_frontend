export default function StatusBadge({ status }: { status: string }) {
  // Simple hash to consistently assign a color to a status string
  const hash = status.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const colors = [
    { bg: "bg-indigo-500/10 dark:bg-indigo-500/15", border: "border-indigo-500/20 dark:border-indigo-500/30", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500 dark:bg-indigo-400" },
    { bg: "bg-rose-500/10 dark:bg-rose-500/15", border: "border-rose-500/20 dark:border-rose-500/30", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500 dark:bg-rose-400" },
    { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", border: "border-emerald-500/20 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500 dark:bg-emerald-400" },
    { bg: "bg-amber-500/10 dark:bg-amber-500/15", border: "border-amber-500/20 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500 dark:bg-amber-400" },
    { bg: "bg-sky-500/10 dark:bg-sky-500/15", border: "border-sky-500/20 dark:border-sky-500/30", text: "text-sky-700 dark:text-sky-400", dot: "bg-sky-500 dark:bg-sky-400" },
  ];
  
  const color = colors[hash % colors.length];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text} border ${color.border} whitespace-nowrap shadow-sm transition-all hover:brightness-110`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color.dot} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${color.dot}`}></span>
      </span>
      {status}
    </span>
  );
}
