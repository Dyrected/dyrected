"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import blogFallback from "./blog-content.json";

export type Article = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
  content: string[];
};

type BlogPageGlobal = {
  hero?: {
    badge?: string;
    titlePrefix?: string;
    titleHighlight?: string;
    description?: string;
  };
} | null;

export default function BlogContent({
  blogPageGlobal,
  articles,
}: {
  blogPageGlobal?: BlogPageGlobal;
  articles?: Article[];
}) {
  const [selectedCat, setSelectedCat] = useState("All");

  const hero = {
    badge: blogPageGlobal?.hero?.badge ?? blogFallback.hero.badge,
    titlePrefix: blogPageGlobal?.hero?.titlePrefix ?? blogFallback.hero.titlePrefix,
    titleHighlight: blogPageGlobal?.hero?.titleHighlight ?? blogFallback.hero.titleHighlight,
    description: blogPageGlobal?.hero?.description ?? blogFallback.hero.description,
  };

  const articleList = articles && articles.length > 0 ? articles : (blogFallback.articles as Article[]);

  const uniqueCategories = Array.from(new Set(articleList.map((a) => a.category)));
  const categories = ["All", ...uniqueCategories];

  const filteredArticles =
    selectedCat === "All"
      ? articleList
      : articleList.filter((a) => a.category === selectedCat);

  return (
    <div className="flex-1 w-full bg-background pb-16">
      {/* Blog Hero */}
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

      {/* Categories & Listing */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
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

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {filteredArticles.map((art) => (
              <article
                key={art.slug}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all duration-300"
              >
                <div className="space-y-4">
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{art.excerpt}</p>
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
