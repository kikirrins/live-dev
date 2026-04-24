export function CartSummary() {
  return (
    <aside className="rounded-lg border border-neutral-200 bg-white p-5 h-fit">
      <h2 className="text-lg font-semibold mb-4">Cart</h2>
      <ul className="space-y-2 text-sm text-neutral-600">
        <li className="flex justify-between">
          <span>Terracotta Vase</span>
          <span>$48.00</span>
        </li>
        <li className="flex justify-between">
          <span>Linen Throw</span>
          <span>$72.00</span>
        </li>
      </ul>
      <div className="border-t border-neutral-200 mt-4 pt-4 flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>$120.00</span>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Checkout
      </button>
    </aside>
  );
}
