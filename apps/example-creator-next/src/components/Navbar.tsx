"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, Activity, Menu, X, ArrowRight, Brain } from "lucide-react";
import { getStoredProfile, UserProfile } from "@/lib/storage";
import siteContent from "@/lib/site-content.json";

export default function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  useEffect(() => {
    // Initial fetch - delayed to avoid sync render warning
    const timeoutId = setTimeout(() => {
      const initial = getStoredProfile();
      if (initial) {
        setProfile(initial);
      }
    }, 0);

    // Sync state on custom profile updates
    const handleUpdate = () => {
      const next = getStoredProfile();
      setProfile((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    };

    window.addEventListener("storage_profile_update", handleUpdate);
    // Also sync on localstorage direct event (from other tabs if any)
    window.addEventListener("storage", handleUpdate);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("storage_profile_update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const navLinks = siteContent.navigation.links;

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 transition-transform group-hover:scale-105">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-secondary animate-bounce" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold tracking-tight text-white leading-none">
              {siteContent.brand.name}
            </span>
            <span className="text-[10px] text-secondary font-medium tracking-widest uppercase">
              {siteContent.brand.descriptor}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? "text-primary glow-text-purple font-semibold" : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {profile ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-semibold text-white hover:bg-primary/20 transition-all hover:scale-105"
            >
              <Activity className="h-4 w-4 text-secondary" />
              <span>Dashboard ({profile.name.split(" ")[0]})</span>
            </Link>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors"
              >
                {siteContent.navigation.dashboardLabel}
              </Link>
              <Link
                href="/assessment"
                className="group flex items-center gap-1.5 rounded-full bg-linear-to-r from-primary to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all"
              >
                <span>{siteContent.navigation.diagnosticLabel}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-white/5 bg-background px-4 py-4 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-base font-semibold hover:bg-white/5 ${
                    isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
            {profile ? (
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/30 py-3 text-base font-semibold text-white"
              >
                <Activity className="h-5 w-5 text-secondary" />
                <span>Dashboard ({profile.name})</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-white/10 py-3 text-base font-semibold text-white"
                >
                {siteContent.navigation.dashboardLabel}
                </Link>
                <Link
                  href="/assessment"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-linear-to-r from-primary to-violet-600 py-3 text-base font-semibold text-white"
                >
                {siteContent.navigation.mobileAssessmentLabel}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
