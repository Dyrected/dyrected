"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";

export interface Article {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
  content: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: "7-things-future-you-wishes-you-would-start-today",
    title: "7 Things Future You Wishes You'd Start Today",
    category: "Productivity",
    readTime: "5 min read",
    date: "June 20, 2026",
    excerpt: "Stop wait-listing your achievements. Here are seven immediate adjustments your future self has requested to speed up your timeline.",
    content: [
      "If Future You could send you a parcel from five years ahead, it wouldn't contain stock tips or sports scores. It would contain a sticky note that says: 'Get to work on the core goals, please.' Here are the seven key systems they wish you would start today:",
      "1. Build a 'done' list instead of a 'todo' list. Celebrating what you actually finish creates a positive feedback loop that breaks planning-paralysis.",
      "2. Setup immediate environment filters. Remove temptation loops. If your phone is on your desk, you are losing 20 minutes of focus time every hour.",
      "3. Keeping promises to yourself. When you schedule a project block and skip it, you train your brain to distrust your own commitments.",
      "4. Investing in learning and skills daily. A 15-minute routine of deliberate practice compounding over five years creates an unshakeable career foundation.",
      "5. Establishing an automatic finance system. Future You would really appreciate it if you saved $100 a month instead of buying another subscription.",
      "6. Sleeping 7-8 hours consistently. You cannot out-work a sleep deficit, and your future cognitive health is highly dependent on present rest cycles.",
      "7. Doing the hardest task first. Eat the frog. Making progress on your primary goal by 9:00 AM completely shifts the psychology of your day."
    ]
  },
  {
    slug: "why-motivation-keeps-ghosting-you",
    title: "Why Motivation Keeps Ghosting You",
    category: "Habits",
    readTime: "4 min read",
    date: "June 18, 2026",
    excerpt: "Waiting for motivation to strike is a terrible strategy. Discover why systems always defeat feelings in long-term timeline optimization.",
    content: [
      "We've all been there: You watch an inspiring video at 11:30 PM and commit to starting a massive new project tomorrow. But when morning comes, that spark is gone, and you end up opening social feeds instead.",
      "Here's the harsh truth: Motivation is a fair-weather friend. It shows up when you don't need it and ghosts you when the work gets boring.",
      "Dr. Tomorrow suggests shifting your focus entirely from 'motivation' to 'identity systems'. The most aligned timelines aren't populated by people with extreme willpower; they are populated by people with automated routines.",
      "Instead of waiting until you feel like doing something, design a 2-minute starter ritual. If you want to write, commit to opening the document and typing one sentence. By lowering the entry barrier, you bypass the brain's freeze response and let momentum do the rest."
    ]
  },
  {
    slug: "hidden-cost-of-waiting-until-ready",
    title: "The Hidden Cost of Waiting Until You're Ready",
    category: "Decision Making",
    readTime: "6 min read",
    date: "June 15, 2026",
    excerpt: "If you wait until there is zero risk and total clarity, you will spend your entire life in the departure lounge. Learn how to execute on 70% information.",
    content: [
      "Perfectionism is procrastination in a fancy suit. We tell ourselves we are 'researching', 'structuring', or 'waiting for the right moment' when in reality, we are just terrified of making a mistake.",
      "But here is what Future You knows: The cost of inaction is almost always higher than the cost of a corrected mistake.",
      "To optimize your trajectory, adopt the 70% rule: If you have 70% of the information, 70% of the confidence, and 70% of the resources—execute. The remaining 30% can only be discovered by taking action anyway.",
      "By moving before you feel ready, you gain real-world feedback cycles that mock-planning can never duplicate. Stop waiting for permission. Your future self already approved the project."
    ]
  },
  {
    slug: "how-future-you-handles-difficult-decisions",
    title: "How Future You Handles Difficult Decisions",
    category: "Future Thinking",
    readTime: "5 min read",
    date: "June 12, 2026",
    excerpt: "Stuck at a fork in the road? Use the 10/10/10 rule and future-back framing to make choices you'll be proud of in five years.",
    content: [
      "When faced with an intense dilemma, our current emotional state tends to hijack our logic. We make decisions that ease short-term discomfort but damage long-term trajectory.",
      "To counter this, Dr. Tomorrow recommends a simple mental shortcut: Ask how your future self would feel about this choice in 10 minutes, 10 months, and 10 years.",
      "A decision that feels painful right now (like ending an unproductive partnership or starting a difficult habit) usually looks incredibly wise from a 10-month or 10-year horizon.",
      "The next time you are stuck, write a letter to Dr. Tomorrow explaining the choice from the perspective of five years ahead: 'I am so glad I made choice A, because...' By projecting your mind forward, you instantly gain the clarity required to act decisively today."
    ]
  }
];

const CATEGORIES = ["All", "Productivity", "Habits", "Decision Making", "Future Thinking"];

export default function Blog() {
  const [selectedCat, setSelectedCat] = useState("All");

  const filteredArticles = selectedCat === "All"
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === selectedCat);

  return (
    <div className="flex-1 w-full bg-background pb-16">
      {/* Blog Hero */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-semibold text-primary glow-text-purple">
            <span>TIMELINE JOURNAL</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Future You <span className="text-gradient-purple-teal">Articles</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Clever insights, habit design systems, and warnings from alternative timelines compiled by Dr. Tomorrow.
          </p>
        </div>
      </section>

      {/* Categories & Listing */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCat === cat
                    ? "bg-primary text-white scale-105"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Article Grid */}
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {filteredArticles.map((art) => (
              <article
                key={art.slug}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Category & Stats */}
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="text-primary font-bold">{art.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{art.date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{art.readTime}</span>
                      </span>
                    </div>
                  </div>

                  <h3 className="font-heading text-xl font-bold text-white leading-snug">
                    {art.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                  <Link
                    href={`/blog/${art.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-white hover:text-primary transition-colors group"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
