export function SettingsPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-600">
          Manage your account preferences.
        </p>
      </header>
      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4">
        <label className="block text-sm">
          <span className="text-neutral-700">Display name</span>
          <input
            type="text"
            defaultValue="Jane Doe"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="rounded" />
          <span>Receive product updates</span>
        </label>
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Save changes
        </button>
      </div>
    </section>
  );
}
