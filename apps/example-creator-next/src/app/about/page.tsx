"use client";

import Image from "next/image";
import { useState } from "react";
import { HelpCircle, ChevronDown, Award, Globe, Compass, ShieldAlert } from "lucide-react";

export default function About() {
  // FAQ Open/Close state helper
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Can I take the assessment without booking coaching?",
      a: "Absolutely. The assessment is 100% free, requires no credit card, and gives you instant scores. You can print or download your growth roadmap and apply it yourself."
    },
    {
      q: "Will Future Me really contact me?",
      a: "Yes. Every time you make a major commitment or experience a lapse in discipline, Future You is emotionally affected. While we don't have direct, physical portal mail, our automated 'Concerned Emails' feature is a highly realistic simulation of their exact perspective."
    },
    {
      q: "Can I save my assessment results?",
      a: "Yes. After completing the assessment, you can input a mock Name and Email to immediately save your results to your interactive Timeline Dashboard. This allows you to track progress over time."
    },
    {
      q: "How does coaching work?",
      a: "We use a proprietary Future-Back Methodology. Instead of analyzing why you didn't do something in the past, Dr. Tomorrow helps you look back from the timeline where things worked out, analyzing the exact steps you took to achieve it."
    },
    {
      q: "What if Future Me is disappointed?",
      a: "Don't panic. The fact that you are here means you still possess the agency to change the trajectory. Drift warning is just feedback, not a life sentence."
    }
  ];

  const values = [
    {
      icon: Compass,
      title: "Timeline Agency",
      desc: "We believe that you are never locked into a bad timeline. Your next decision is the portal to a better outcome."
    },
    {
      icon: Award,
      title: "System Ownership",
      desc: "Motivation is a fair-weather friend. Systems, habits, and clean environments are the actual building blocks of success."
    },
    {
      icon: Globe,
      title: "Optimistic Science",
      desc: "Growth should be fun, slightly experimental, and optimistic, rather than a dry, guilt-inducing chore."
    }
  ];

  return (
    <div className="flex flex-col w-full bg-background pb-16">
      {/* Intro Hero */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Meet <span className="text-gradient-purple-teal">Dr. Tomorrow</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Helping people make better decisions today by understanding the habits, choices, and systems that guarantee a better tomorrow.
          </p>
        </div>
      </section>

      {/* Profile Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Portrait */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden glass-panel p-4">
                <Image
                  src="/dr_tomorrow.png"
                  alt="Dr. Tomorrow"
                  fill
                  className="object-cover p-2 rounded-2xl"
                  priority
                />
              </div>
            </div>

            {/* Profile Bio details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/30 px-3 py-1 text-xs font-semibold text-secondary">
                  <span>Founder & Lead Coach</span>
                </div>
                <h2 className="font-heading text-3xl font-extrabold text-white">
                  Dr. Tomorrow
                </h2>
                <p className="text-sm text-primary font-bold tracking-wider uppercase">
                  Certified Future Alignment Specialist
                </p>
              </div>

              <div className="text-muted-foreground space-y-4 leading-relaxed">
                <p>
                  Dr. Tomorrow has spent decades studying successful timelines and helping people avoid becoming cautionary tales. Frustrated by standard productivity coaching that focuses on past mistakes, he developed the **Future-Back Framework**.
                </p>
                <p>
                  By establishing a virtual dialog with the person you could become, Dr. Tomorrow breaks down goal resistance, eliminates procrastination loops, and turns abstract goals into immediate daily systems.
                </p>
              </div>

              <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Specialization
                  </h4>
                  <p className="text-sm font-semibold text-white mt-1">
                    Timeline Correction & Habit Design
                  </p>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Experience
                  </h4>
                  <p className="text-sm font-semibold text-white mt-1">
                    12,000+ Hours Coached
                  </p>
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
              Our Core <span className="text-gradient-lime-teal">Values</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              The operational guidelines we use to construct aligned trajectories.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white">
                    {v.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v.desc}
                  </p>
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
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-muted-foreground text-sm">
              Everything you need to know about time-travel coaching.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
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
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
