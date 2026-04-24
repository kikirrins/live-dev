import Link from "next/link";

const items = [
  { href: "/", label: "Shop" },
  { href: "/checkout", label: "Checkout" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex gap-6 text-sm">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-neutral-600 hover:text-neutral-900"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
