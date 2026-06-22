"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Calendar, ArrowRight, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { SERVICES } from "@/lib/storage";
import servicesContent from "./services-content.json";

export default function Services() {
  const getIcon = (id: string) => {
    switch (id) {
      case "future-alignment":
        return Sparkles;
      case "timeline-upgrade":
        return Zap;
      default:
        return ShieldAlert;
    }
  };

  const getStyle = (id: string) => {
    switch (id) {
      case "timeline-upgrade":
        return {
          cardClass: "glass-panel-glow border-primary/30 relative",
          badge: "bg-primary text-white border-primary/20",
          btnClass: "bg-primary text-white hover:scale-105"
        };
      case "anti-procrastination":
        return {
          cardClass: "glass-panel-glow-lime border-secondary/30 relative",
          badge: "bg-secondary text-black border-secondary/20",
          btnClass: "bg-secondary text-black hover:scale-105"
        };
      default:
        return {
          cardClass: "bg-white/5 border-white/10",
          badge: "bg-white/10 text-white border-white/10",
          btnClass: "bg-white/10 text-white hover:bg-white/20 hover:scale-105"
        };
    }
  };

  return (
    <div className="flex flex-col w-full bg-background pb-16">
      {/* Services Header */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-semibold text-primary glow-text-purple">
            <span>{servicesContent.hero.badge}</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            {servicesContent.hero.titlePrefix} <span className="text-gradient-purple-teal">{servicesContent.hero.titleHighlight}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {servicesContent.hero.description}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3 items-stretch">
            {SERVICES.map((s) => {
              const Icon = getIcon(s.id);
              const style = getStyle(s.id);
              const isPopular = s.id === "timeline-upgrade";

              return (
                <div
                  key={s.id}
                  className={`rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 ${style.cardClass}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white tracking-wider uppercase">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{s.duration}</span>
                        </div>
                      </div>
                      <h3 className="font-heading text-xl font-bold text-white mt-2">
                        {s.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-1 py-2 border-t border-b border-white/5">
                      <span className="text-3xl font-extrabold text-white">{s.price}</span>
                      <span className="text-xs text-muted-foreground">/ program placeholder</span>
                    </div>

                    {/* Benefits List */}
                    <ul role="list" className="space-y-3">
                      {s.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug">
                          <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="mt-8 pt-4">
                    <Link
                      href={`/booking?service=${s.id}`}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-lg transition-all duration-300 ${style.btnClass}`}
                    >
                      <span>Book Alignment</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trajectory Warning Banner */}
      <section className="py-8 bg-[#0b0b14] border-t border-b border-white/5">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-accent shrink-0 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white">{servicesContent.warningCallout.title}</h4>
              <p className="text-xs text-muted-foreground">{servicesContent.warningCallout.description}</p>
            </div>
          </div>
          <Link
            href="/assessment"
            className="rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition-all"
          >
            {servicesContent.warningCallout.actionLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
