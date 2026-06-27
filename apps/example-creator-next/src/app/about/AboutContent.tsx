"use client";

import Image from "next/image";
import { useState } from "react";
import { HelpCircle, ChevronDown, Award, Globe, Compass } from "lucide-react";
import aboutFallback from "./about-content.json";

const iconMap: Record<string, React.ElementType> = { Compass, Award, Globe };

type Value = { icon: string; title: string; desc: string };
type FaqEntry = { q: string; a: string };

type AboutGlobal = {
  hero?: { titlePrefix?: string; titleHighlight?: string; description?: string };
  profile?: {
    badge?: string;
    name?: string;
    title?: string;
    bioParagraphs?: string[];
    specialization?: string;
    experience?: string;
  };
  values?: { titlePrefix?: string; titleHighlight?: string; description?: string };
  faq?: { title?: string; description?: string };
} | null;

export default function AboutContent({
  aboutGlobal,
  values,
  faqEntries,
}: {
  aboutGlobal?: AboutGlobal;
  values?: Value[];
  faqEntries?: FaqEntry[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const hero = {
    titlePrefix: aboutGlobal?.hero?.titlePrefix ?? aboutFallback.hero.titlePrefix,
    titleHighlight: aboutGlobal?.hero?.titleHighlight ?? aboutFallback.hero.titleHighlight,
    description: aboutGlobal?.hero?.description ?? aboutFallback.hero.description,
  };

  const profile = {
    badge: aboutGlobal?.profile?.badge ?? aboutFallback.profile.badge,
    name: aboutGlobal?.profile?.name ?? aboutFallback.profile.name,
    title: aboutGlobal?.profile?.title ?? aboutFallback.profile.title,
    bioParagraphs:
      aboutGlobal?.profile?.bioParagraphs && aboutGlobal.profile.bioParagraphs.length > 0
        ? aboutGlobal.profile.bioParagraphs
        : aboutFallback.profile.bioParagraphs,
    specialization: aboutGlobal?.profile?.specialization ?? aboutFallback.profile.specialization,
    experience: aboutGlobal?.profile?.experience ?? aboutFallback.profile.experience,
  };

  const valuesHeader = {
    titlePrefix: aboutGlobal?.values?.titlePrefix ?? aboutFallback.values.titlePrefix,
    titleHighlight: aboutGlobal?.values?.titleHighlight ?? aboutFallback.values.titleHighlight,
    description: aboutGlobal?.values?.description ?? aboutFallback.values.description,
  };

  const valuesList =
    values && values.length > 0 ? values : aboutFallback.values.list;

  const faqHeader = {
    title: aboutGlobal?.faq?.title ?? aboutFallback.faq.title,
    description: aboutGlobal?.faq?.description ?? aboutFallback.faq.description,
  };

  const faqList =
    faqEntries && faqEntries.length > 0 ? faqEntries : aboutFallback.faq.list;

  return (
    <div className="flex flex-col w-full bg-background pb-16">
      {/* Intro Hero */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            {hero.titlePrefix}{" "}
            <span className="text-gradient-purple-teal">{hero.titleHighlight}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {hero.description}
          </p>
        </div>
      </section>

      {/* Profile Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden glass-panel p-4">
                <Image
                  src="/dr_tomorrow.png"
                  alt={profile.name}
                  fill
                  className="object-cover p-2 rounded-2xl"
                  priority
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/30 px-3 py-1 text-xs font-semibold text-secondary">
                  <span>{profile.badge}</span>
                </div>
                <h2 className="font-heading text-3xl font-extrabold text-white">
                  {profile.name}
                </h2>
                <p className="text-sm text-primary font-bold tracking-wider uppercase">
                  {profile.title}
                </p>
              </div>

              <div className="text-muted-foreground space-y-4 leading-relaxed">
                {profile.bioParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Specialization
                  </h4>
                  <p className="text-sm font-semibold text-white mt-1">{profile.specialization}</p>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Experience
                  </h4>
                  <p className="text-sm font-semibold text-white mt-1">{profile.experience}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values & Philosophy */}
      <section className="py-16 border-t border-b border-white/5 bg-[#0a0a12]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="font-heading text-3xl font-extrabold text-white">
              {valuesHeader.titlePrefix}{" "}
              <span className="text-gradient-lime-teal">{valuesHeader.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              {valuesHeader.description}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {valuesList.map((v) => {
              const Icon = iconMap[v.icon] || Compass;
              return (
                <div key={v.title} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="font-heading text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <HelpCircle className="h-7 w-7 text-primary animate-pulse" />
              <span>{faqHeader.title}</span>
            </h2>
            <p className="text-muted-foreground text-sm">{faqHeader.description}</p>
          </div>

          <div className="space-y-4">
            {faqList.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-white font-semibold hover:bg-white/5 transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-white/5 bg-black/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
