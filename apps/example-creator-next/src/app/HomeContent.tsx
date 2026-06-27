"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Calendar, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";
// import homeFallback from "./home-content.json";

type SimulatorRange = {
  maxVal: number;
  title: string;
  focus: string;
  finished: string;
  status: string;
  statusColor: string;
  comment: string;
};

type HomeStep = { step: string; title: string; desc: string };
type Testimonial = { quote: string; author: string; title: string; avatar: string };

type HomeGlobal = {
  hero?: {
    badge?: string;
    titlePrefix?: string;
    titleHighlight?: string;
    description?: string;
  };
  simulator?: {
    title?: string;
    titleHighlight?: string;
    description?: string;
    widgetLabel?: string;
    ranges?: SimulatorRange[];
  };
  howItWorks?: {
    title?: string;
    titleHighlight?: string;
    description?: string;
    steps?: HomeStep[];
  };
  featuredAssessment?: {
    badge?: string;
    title?: string;
    description?: string;
  };
  testimonials?: {
    title?: string;
    titleHighlight?: string;
    description?: string;
  };
  finalCta?: {
    title?: string;
    description?: string;
  };
} | null;

export type { HomeGlobal, Testimonial };

export default function HomeContent({
  homeGlobal,
  testimonials,
}: {
  homeGlobal?: HomeGlobal;
  testimonials?: Testimonial[];
}) {
  const [sliderVal, setSliderVal] = useState(50);

  const hero = {
    badge: homeGlobal?.hero?.badge,
    titlePrefix: homeGlobal?.hero?.titlePrefix,
    titleHighlight: homeGlobal?.hero?.titleHighlight,
    description: homeGlobal?.hero?.description,
  };

  const simulator = {
    title: homeGlobal?.simulator?.title,
    titleHighlight: homeGlobal?.simulator?.titleHighlight,
    description: homeGlobal?.simulator?.description,
    widgetLabel: homeGlobal?.simulator?.widgetLabel,
    ranges:
      homeGlobal?.simulator?.ranges && homeGlobal.simulator.ranges.length > 0
        ? homeGlobal.simulator.ranges
        : ([]),
  };

  const howItWorks = {
    title: homeGlobal?.howItWorks?.title,
    titleHighlight: homeGlobal?.howItWorks?.titleHighlight,
    description: homeGlobal?.howItWorks?.description,
    steps:
      homeGlobal?.howItWorks?.steps && homeGlobal.howItWorks.steps.length > 0
        ? homeGlobal.howItWorks.steps
        : [],
  };

  const featuredAssessment = {
    badge: homeGlobal?.featuredAssessment?.badge,
    title: homeGlobal?.featuredAssessment?.title,
    description: homeGlobal?.featuredAssessment?.description,
  };

  const testimonialsHeader = {
    title: homeGlobal?.testimonials?.title,
    titleHighlight: homeGlobal?.testimonials?.titleHighlight,
    description: homeGlobal?.testimonials?.description,
  };

  const testimonialList =
    testimonials && testimonials.length > 0
      ? testimonials
      : [];

  const finalCta = {
    title: homeGlobal?.finalCta?.title,
    description: homeGlobal?.finalCta?.description,
  };

  const getSliderState = (val: number) => {
    const range =
      simulator.ranges.find((r) => val <= r.maxVal) ||
      simulator.ranges[simulator.ranges.length - 1];
    return {
      title: range.title,
      focus: range.focus,
      finished: range.finished,
      status: range.status,
      color: range.statusColor,
      comment: range.comment,
    };
  };

  const sliderState = getSliderState(sliderVal);

  return (
    <div className="flex flex-col w-full bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 border-b border-white/5 bg-linear-to-b from-background to-[#0c0c16]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-semibold text-primary glow-text-purple">
                <Sparkles className="h-3.5 w-3.5 text-secondary animate-pulse" />
                <span>{hero.badge}</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {hero.titlePrefix}{" "}
                <span className="text-gradient-purple-teal">{hero.titleHighlight}</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {hero.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/assessment"
                  className="group flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-primary to-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all"
                >
                  <span>Take Free Assessment</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/booking"
                  className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-8 py-4 text-base font-bold text-white bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105"
                >
                  <Calendar className="h-5 w-5 text-secondary" />
                  <span>Book Alignment Session</span>
                </Link>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full max-w-md md:max-w-lg aspect-square rounded-3xl overflow-hidden glass-panel-glow p-4">
                <Image
                  src="/hero_portal.png"
                  alt="Future You Coaching Portal"
                  fill
                  className="object-cover p-2 rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Timeline Slider Section */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-[#0a0a12]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
              {simulator.title}{" "}
              <span className="text-gradient-lime-teal">{simulator.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              {simulator.description}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 text-left space-y-6 max-w-3xl mx-auto border-white/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                  {simulator.widgetLabel}
                </h3>
                <p className="text-lg font-bold text-white mt-1">
                  Current score: <span className="text-primary">{sliderVal} / 100</span>
                </p>
              </div>
              <div className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold ${sliderState.color}`}>
                {sliderState.status}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="timeline-slider" className="sr-only">Timeline Alignment Slider</label>
              <input
                id="timeline-slider"
                type="range"
                min="10"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="w-full h-2.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-semibold px-1">
                <span>Concerned (10%)</span>
                <span>Optimistic (50%)</span>
                <span>Aligned (100%)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-xs text-muted-foreground block font-medium">Daily Focus</span>
                <span className="text-lg sm:text-xl font-bold text-white block mt-1">
                  {sliderState.focus}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-xs text-muted-foreground block font-medium">Projects Done</span>
                <span className="text-lg sm:text-xl font-bold text-white block mt-1">
                  {sliderState.finished}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-xs text-muted-foreground block font-medium">Trajectory</span>
                <span className="text-lg sm:text-xl font-bold text-white block mt-1 truncate">
                  {sliderState.title.split(" ")[1]}
                </span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
              <p className="text-sm text-white leading-relaxed">{sliderState.comment}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
              {howItWorks.title}{" "}
              <span className="text-gradient-purple-teal">{howItWorks.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {howItWorks.description}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mt-16">
            {howItWorks.steps.map((step, idx) => (
              <div
                key={step.step}
                className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all group duration-300"
              >
                <div>
                  <span className="text-4xl font-extrabold text-primary/30 group-hover:text-primary transition-colors block mb-4">
                    {step.step}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/10 hidden lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Assessment Highlight */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-[#0b0b14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-panel-glow-lime rounded-3xl p-8 sm:p-12 md:flex md:items-center md:justify-between gap-8 max-w-4xl mx-auto border-white/5">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/30 px-3 py-1 text-xs font-semibold text-secondary">
                <span>{featuredAssessment.badge}</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
                {featuredAssessment.title}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {featuredAssessment.description}
              </p>
            </div>
            <div className="mt-8 md:mt-0 shrink-0">
              <Link
                href="/assessment"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-8 py-4 text-base font-bold text-black hover:scale-105 transition-all shadow-lg shadow-secondary/10 hover:shadow-secondary/20"
              >
                <span>Take Assessment</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4 max-w-xl mx-auto">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
              {testimonialsHeader.title}{" "}
              <span className="text-gradient-purple-teal">{testimonialsHeader.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {testimonialsHeader.description}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto text-left">
            {testimonialList.map((t) => (
              <div
                key={t.author}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between"
              >
                <p className="text-base text-white/95 italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.author}</h4>
                    <p className="text-xs text-muted-foreground">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-radial-to-c from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            {finalCta.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {finalCta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/assessment"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-primary to-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg hover:scale-105 transition-all"
            >
              <span>Start Assessment</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-8 py-4 text-base font-bold text-white bg-white/5 hover:bg-white/10 transition-all hover:scale-105"
            >
              <span>Explore Programs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
