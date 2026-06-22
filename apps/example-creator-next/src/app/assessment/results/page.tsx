"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, RefreshCw, Calendar, UserPlus } from "lucide-react";
import { getStoredResults, getStoredProfile, saveProfile, AssessmentResult } from "@/lib/storage";
import ScoreChart from "@/components/ScoreChart";

function ResultsContent() {

  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [error, setError] = useState("");

  // Load results from localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const results = getStoredResults();
      const found = results.find((r) => r.id === resultId) || results[0];
      if (found) {
        setResult(found);
      }
      
      // Check if profile already exists
      const existingProfile = getStoredProfile();
      if (existingProfile) {
        setProfileSaved(true);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [resultId]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Please provide both name and email.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("That email doesn't exist in this timeline.");
      return;
    }
    setError("");

    // Save profile to localStorage
    saveProfile({
      name,
      email,
      personalGoals: goals || "Align my timeline and build consistent habits.",
      growthFocusAreas: result ? result.growthOpportunities : ["Consistency", "Goal Clarity"]
    });

    setProfileSaved(true);
  };

  if (!result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-white">No Diagnostic Found</h2>
          <p className="text-muted-foreground text-sm">
            It seems like you haven&apos;t completed the disappointment test in this session yet.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Start Test Now</span>
          </Link>
        </div>
      </div>
    );
  }

  // Visual category helper
  const getCategoryStyles = (score: number) => {
    if (score <= 30) return "text-accent border-accent/20 bg-accent/5";
    if (score <= 50) return "text-yellow-500 border-yellow-500/20 bg-yellow-500/5";
    if (score <= 65) return "text-primary border-primary/20 bg-primary/5";
    return "text-secondary border-secondary/20 bg-secondary/5";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 bg-background">
      {/* Top Header */}
      <div className="text-center space-y-4">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
          Diagnostic Analysis
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
          Your Timeline Alignment Report
        </h1>
        <p className="text-muted-foreground text-sm">
          Generated on {new Date(result.timestamp).toLocaleDateString()}
        </p>
      </div>

      {/* Main Score Board */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 grid gap-8 md:grid-cols-12 items-center border-white/5">
        {/* Big Score Visual */}
        <div className="md:col-span-4 flex flex-col items-center text-center space-y-2 border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-8">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
            Overall Score
          </span>
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-linear-to-tr from-primary/10 to-violet-600/10 border-2 border-primary/30 shadow-2xl shadow-primary/10">
            <div className="absolute inset-2 rounded-full border border-dashed border-primary/25 animate-spin-slow" />
            <div className="text-center">
              <span className="text-4xl font-black text-white">{result.score}</span>
              <span className="text-sm text-muted-foreground block font-bold">/ 75</span>
            </div>
          </div>
          <div className={`mt-2 rounded-full border px-3.5 py-1 text-[11px] font-bold ${getCategoryStyles(result.score)}`}>
            {result.score <= 30 ? "Concerned" : result.score <= 50 ? "Cautionary" : result.score <= 65 ? "Proud" : "Optimal"}
          </div>
        </div>

        {/* Category Details */}
        <div className="md:col-span-8 space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-white">
            {result.category}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.summary}
          </p>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <h4 className="text-xs text-primary font-bold tracking-wider uppercase mb-1.5">
              Dr. Tomorrow&apos;s Recommendation:
            </h4>
            <p className="text-sm text-white font-medium leading-relaxed">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Score Breakdown Chart */}
      <div className="space-y-6">
        <h3 className="font-heading text-lg font-bold text-white">
          Category Score Breakdown
        </h3>
        <ScoreChart answers={result.answers} />
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="glass-panel rounded-2xl p-6 border-white/5 space-y-4">
          <h4 className="font-heading text-base font-bold text-secondary flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5" />
            <span>Timeline Strengths</span>
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {result.strengths.map((str, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-secondary font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Opportunities */}
        <div className="glass-panel rounded-2xl p-6 border-white/5 space-y-4">
          <h4 className="font-heading text-base font-bold text-accent flex items-center gap-1.5">
            <ChevronRight className="h-5 w-5" />
            <span>Growth Opportunities</span>
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {result.growthOpportunities.map((opp, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-accent font-bold">•</span>
                <span>{opp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Account Signup (Save Report) Section */}
      {!profileSaved ? (
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border-white/5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-secondary/15 blur-xl pointer-events-none" />
          <div className="grid gap-6 md:grid-cols-12 items-center">
            <div className="md:col-span-7 space-y-3">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-secondary animate-pulse" />
                <span>Save Report to Timeline Dashboard</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Don&apos;t let this diagnostic fade into alternate timelines. Enter your details to create a simulated account and save this assessment to your live dashboard.
              </p>
            </div>
            
            <form onSubmit={handleCreateAccount} className="md:col-span-5 space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="What is your biggest personal goal right now?"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              {error && <p className="text-xs font-semibold text-accent">{error}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:scale-102 transition-all shadow-lg shadow-primary/10"
              >
                <span>Activate Dashboard Account</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      ) : (
        <div className="glass-panel rounded-3xl p-6 border-white/5 text-center space-y-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30 text-secondary mx-auto">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h4 className="font-heading text-lg font-bold text-white">Results Saved to Your Dashboard</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This diagnostic report has been synced to your dashboard profile. You can now view previous scores and track upcoming coaching sessions.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <span>View Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Booking CTA Section */}
      <section className="glass-panel-glow border-primary/20 rounded-3xl p-8 text-center space-y-6 max-w-2xl mx-auto">
        <h3 className="font-heading text-2xl font-extrabold text-white">
          Want Help Accelerating Your Timeline?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Book a 1-on-1 **Future Alignment Session** with Dr. Tomorrow to map your target habits, review this report, and lock in the timeline where things worked out.
        </p>
        <Link
          href="/booking?service=future-alignment"
          className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg hover:scale-105 transition-all"
        >
          <Calendar className="h-5 w-5 text-secondary" />
          <span>Book Future Alignment Session</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-white">Loading Results...</h2>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
