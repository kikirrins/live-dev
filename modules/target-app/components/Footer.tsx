export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-neutral-500 flex justify-between">
        <span>&copy; {new Date().getFullYear()} Sandpalace</span>
        <span>Built on Live-Dev</span>
      </div>
    </footer>
  );
}
