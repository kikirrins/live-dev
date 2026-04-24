export function CheckoutForm() {
  return (
    <form className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-neutral-700">First name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-700">Last name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-neutral-700">Email</span>
        <input
          type="email"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-700">Address</span>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Place order
      </button>
    </form>
  );
}
