export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D4AF6A]/15 text-[#D4AF6A] border border-[#D4AF6A]/25 whitespace-nowrap">
      {status}
    </span>
  );
}
