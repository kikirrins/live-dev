import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Sandpalace
        </Link>
        <div className="text-sm text-neutral-500">Live-Dev testbed</div>
      </div>
    </header>
  );
}
