"use client";

import { useState } from "react";
import { Send, CheckCircle2, Mail, Globe, Brain } from "lucide-react";
import contactFallback from "./contact-content.json";

const iconMap: Record<string, React.ElementType> = { Mail, Globe, Brain };

const variantStyles: Record<string, string> = {
  primary: "bg-primary/20 border-primary/30 text-primary",
  secondary: "bg-secondary/20 border-secondary/30 text-secondary",
  muted: "bg-white/5 border-white/10 text-white",
};

type Channel = {
  icon: string;
  title: string;
  detail: string;
  variant: string;
};

type ContactGlobal = {
  hero?: {
    badge?: string;
    titlePrefix?: string;
    titleHighlight?: string;
    description?: string;
  };
  channels?: Channel[];
  success?: { title?: string; description?: string };
} | null;

export default function ContactContent({
  contactGlobal,
}: {
  contactGlobal?: ContactGlobal;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Timeline Drift Inquiry");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError("Please fill out all transmission fields.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Your email address is invalid in this sector.");
      return;
    }
    setError("");
    setSent(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  const hero = {
    badge: contactGlobal?.hero?.badge ?? contactFallback.hero.badge,
    titlePrefix: contactGlobal?.hero?.titlePrefix ?? contactFallback.hero.titlePrefix,
    titleHighlight: contactGlobal?.hero?.titleHighlight ?? contactFallback.hero.titleHighlight,
    description: contactGlobal?.hero?.description ?? contactFallback.hero.description,
  };

  const channels: Channel[] =
    contactGlobal?.channels && contactGlobal.channels.length > 0
      ? contactGlobal.channels
      : contactFallback.channels;

  const success = {
    title: contactGlobal?.success?.title ?? contactFallback.success.title,
    description: contactGlobal?.success?.description ?? contactFallback.success.description,
  };

  return (
    <div className="flex-1 w-full bg-background pb-16">
      {/* Contact Hero */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-semibold text-primary glow-text-purple">
            <span>{hero.badge}</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            {hero.titlePrefix}{" "}
            <span className="text-gradient-purple-teal">{hero.titleHighlight}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {hero.description}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-12 items-start max-w-5xl mx-auto">
            {/* Contact channels */}
            <div className="md:col-span-5 space-y-8">
              <div className="space-y-4">
                <h3 className="font-heading text-xl font-bold text-white">Transmission Channels</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Have questions about custom timeline options or corporate focus assessments? Tap into our coordinates:
                </p>
              </div>

              <div className="space-y-4">
                {channels.map((ch) => {
                  const Icon = iconMap[ch.icon] || Mail;
                  const iconClass = variantStyles[ch.variant] ?? variantStyles.muted;
                  const isPulsing = ch.icon === "Brain";
                  return (
                    <div key={ch.title} className="flex items-start gap-4 bg-white/5 border border-white/5 rounded-2xl p-4">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-xl border shrink-0 ${iconClass}`}>
                        <Icon className={`h-5 w-5${isPulsing ? " animate-pulse" : ""}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{ch.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{ch.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Panel */}
            <div className="md:col-span-7">
              {sent ? (
                <div className="glass-panel border-white/5 rounded-3xl p-8 text-center space-y-6">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary/20 border border-secondary/30 text-secondary mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading text-2xl font-extrabold text-white">{success.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      {success.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setSent(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-6 py-2.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10"
                  >
                    <span>Send Another Signal</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                        Identifier (Name)
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Present Self Name"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                        Notification Coordinates (Email)
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="present.you@example.com"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                      Transmission Target (Subject)
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl bg-[#11111c] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                    >
                      <option>Timeline Drift Inquiry</option>
                      <option>Procrastination Emergency</option>
                      <option>Dr. Tomorrow Interview Request</option>
                      <option>Sponsorships &amp; Alternate Realities</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                      Signal Payload (Message)
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your signal message here..."
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  {error && <p className="text-xs font-semibold text-accent">{error}</p>}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:scale-102 transition-all shadow-lg"
                  >
                    <Send className="h-4 w-4" />
                    <span>Broadcast Signal</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
