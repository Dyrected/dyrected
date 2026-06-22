"use client";

import Link from "next/link";
import { useState } from "react";
import { Brain, Sparkles, Send, CheckCircle2 } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("That email doesn't exist in this dimension.");
      return;
    }
    setError("");
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="border-t border-white/5 bg-[#0b0b13] text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Logo / Branding */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                <Brain className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-base font-bold tracking-tight text-white leading-none">
                  Future You
                </span>
                <span className="text-[9px] text-secondary font-medium tracking-widest uppercase">
                  Coaching
                </span>
              </div>
            </Link>
            <p className="text-sm max-w-xs text-muted-foreground leading-relaxed">
              &ldquo;Helping Present You Become the Person Future You Keeps Bragging About.&rdquo;
            </p>
            <div className="flex gap-4">
              {["X", "GitHub", "YouTube", "Discord"].map((platform) => (
                <a
                  key={platform}
                  href="#"
                  className="text-xs hover:text-white transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                  Coaching
                </h3>
                <ul role="list" className="mt-4 space-y-2.5">
                  <li>
                    <Link href="/services" className="text-sm hover:text-white transition-colors">
                      Services Catalog
                    </Link>
                  </li>
                  <li>
                    <Link href="/booking" className="text-sm hover:text-white transition-colors">
                      Book Session
                    </Link>
                  </li>
                  <li>
                    <Link href="/about#faq" className="text-sm hover:text-white transition-colors">
                      Frequently Asked Questions
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                  Diagnostics
                </h3>
                <ul role="list" className="mt-4 space-y-2.5">
                  <li>
                    <Link href="/assessment" className="text-sm hover:text-white transition-colors">
                      The Disappointment Test
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-sm hover:text-white transition-colors">
                      Growth Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="text-sm hover:text-white transition-colors">
                      Timeline Articles
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                <span>Timeline Alerts</span>
                <Sparkles className="h-3 w-3 text-secondary animate-pulse" />
              </h3>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Receive warnings and advice from timelines where you actually got your life together.
              </p>
              {subscribed ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/10 border border-secondary/20 p-3 text-sm text-secondary">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold block text-white">Subscribed!</span>
                    We&apos;ll email you 5 years ago to warn you about tomorrow.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="present.you@example.com"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-focus transition-all"
                      aria-label="Submit email"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {error && <span className="text-xs text-accent font-medium">{error}</span>}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 Future You Coaching. All rights reserved.</p>
          <p className="text-muted-foreground/60 italic">
            Disclaimer: Results may vary by timeline. Anti-gravity or space-time fluctuations are not covered under standard terms.
          </p>
        </div>
      </div>
    </footer>
  );
}
