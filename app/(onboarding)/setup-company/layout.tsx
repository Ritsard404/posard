import { ThemeSwitcher } from "@/components/theme-switcher";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 ">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-black/95">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-3 sm:px-4 mx-auto">
          <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
            POSard
          </span>

          <ThemeSwitcher />
        </div>
      </header>
      <div className="flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
