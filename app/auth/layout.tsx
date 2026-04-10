import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-black/95">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-3 sm:px-4 mx-auto">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
              POSard
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex items-center justify-center px-3 sm:px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
