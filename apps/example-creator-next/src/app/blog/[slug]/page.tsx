"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Brain, ArrowRight } from "lucide-react";
import { ARTICLES } from "../page";
import blogContent from "../blog-content.json";

function renderLocalBodyHtml(bodyHtml: string) {
  return bodyHtml
    .split("</p>")
    .map((paragraph) => paragraph.replace("<p>", "").trim())
    .filter(Boolean);
}

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug as string;

  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
        <div className="space-y-4 max-w-sm">
          <h2 className="text-xl font-bold text-white">Timeline Article Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This article might exist in another dimension, but it is missing from this timeline.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Journal</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background pb-16">
      {/* Article Header Details */}
      <section className="py-12 md:py-20 border-b border-white/5 bg-linear-to-b from-[#0c0c16] to-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Journal</span>
          </Link>

          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="text-primary font-bold">{article.category}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{article.date}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{article.readTime}</span>
              </span>
            </div>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            {article.title}
          </h1>
          
          <p className="text-lg text-muted-foreground font-medium leading-relaxed italic">
            &ldquo;{article.excerpt}&rdquo;
          </p>
        </div>
      </section>

      {/* Article Body Content */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="glass-panel border-white/5 rounded-3xl p-6 sm:p-10 space-y-6 text-muted-foreground leading-relaxed text-base sm:text-lg">
            {renderLocalBodyHtml(article.bodyHtml).map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Coaching Callout banner */}
          <div className="mt-12 glass-panel-glow border-primary/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-md text-center sm:text-left">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <Brain className="h-5 w-5 text-primary" />
                <span>{blogContent.articleCta.title}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {blogContent.articleCta.description}
              </p>
            </div>
            <Link
              href={blogContent.articleCta.href}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white hover:scale-102 transition-all shadow-lg"
            >
              <span>{blogContent.articleCta.actionLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
