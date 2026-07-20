export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-md mx-auto min-h-screen">
        {children}
      </div>
    </main>
  );
}
