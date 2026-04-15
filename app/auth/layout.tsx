import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background font-sans overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <header className="glass-header w-full">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-6 mx-auto">
          <Link href="/" className="flex items-center gap-2 group transition-all">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-all shadow-lg shadow-primary/20">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-heading font-extrabold tracking-tight text-foreground">
              POS<span className="text-primary italic">ard</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <ThemeSwitcher />
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center pt-12 pb-20 px-6">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      <footer className="absolute bottom-8 w-full text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
          © 2026 POSard. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
