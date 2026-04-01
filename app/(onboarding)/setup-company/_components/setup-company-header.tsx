export function SetupCompanyHeader() {
  return (
    <div className="mb-6">
      <span className="inline-block text-xs font-mono tracking-widest uppercase text-zinc-500 border border-zinc-800 px-2 py-1 rounded mb-4">
        Step 1 — Onboarding
      </span>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-1">
        Set up your company
      </h1>
      <p className="text-sm text-zinc-500">
        This information will be used across your POS system. You can update it
        later in settings.
      </p>
    </div>
  );
}
