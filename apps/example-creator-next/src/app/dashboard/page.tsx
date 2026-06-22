"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Calendar, Award, Compass, RefreshCw, AlertTriangle, ArrowRight, Brain, Settings, ShieldAlert, Sparkles, Clock } from "lucide-react";
import { getStoredProfile, getStoredResults, getStoredBookings, saveProfile, clearAllData, UserProfile, AssessmentResult, Booking } from "@/lib/storage";
import ScoreChart from "@/components/ScoreChart";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Onboarding states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [onboardingError, setOnboardingError] = useState("");

  const loadData = () => {
    setProfile(getStoredProfile());
    setResults(getStoredResults());
    setBookings(getStoredBookings());
  };

  useEffect(() => {
    loadData();

    // Listen for updates
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("storage_profile_update", handleUpdate);
    return () => {
      window.removeEventListener("storage_profile_update", handleUpdate);
    };
  }, []);

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setOnboardingError("Name and email coordinates are required.");
      return;
    }
    setOnboardingError("");

    saveProfile({
      name,
      email,
      personalGoals: goals || "Align my daily actions with my long-term trajectory.",
      growthFocusAreas: ["Time Consistency", "Habit Design", "Action Focus"]
    });
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to clear your timeline coordinates? This will wipe your history, profile, and bookings.")) {
      clearAllData();
      loadData();
    }
  };

  // Locked/Empty onboarding state
  if (!profile) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md glass-panel border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 text-center">
          <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 text-primary mx-auto">
            <ShieldAlert className="h-6 w-6 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-extrabold text-white">Timeline Dashboard Locked</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To unlock your interactive timeline analytics, previous score records, and coaching schedules, create your profile coordinates or take the diagnostic test.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-3 text-left">
            <div className="space-y-2">
              <input
                type="text"
                required
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="email"
                required
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="What is your biggest personal goal right now?"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            {onboardingError && <p className="text-xs font-semibold text-accent">{onboardingError}</p>}
            
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-lg"
            >
              <span>Setup Dashboard Coordinates</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-white/5"></div>
            <span className="shrink mx-3 text-xs text-muted-foreground uppercase font-bold">Or</span>
            <div className="grow border-t border-white/5"></div>
          </div>

          <Link
            href="/assessment"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <Brain className="h-4 w-4" />
            <span>Take Disappointment Test</span>
          </Link>
        </div>
      </div>
    );
  }

  // Active Dashboard
  const latestResult = results[0] || null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-10 bg-background">
      {/* Header Dashboard Profile Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Welcome Back, <span className="text-gradient-purple-teal">{profile.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-secondary" />
            <span>Core Focus: {profile.personalGoals || "Align daily habits with target timeline."}</span>
          </p>
        </div>
        
        {/* Profile / Account Settings buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all"
          >
            <Settings className="h-4 w-4" />
            <span>Edit Profile</span>
          </Link>
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/10 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset Timeline</span>
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Metrics and Breakdown */}
        <div className="lg:col-span-8 space-y-8">
          {latestResult ? (
            <div className="space-y-6">
              {/* Score header */}
              <div className="glass-panel border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-secondary uppercase tracking-widest block">
                    Latest Alignment Diagnostic
                  </span>
                  <h3 className="font-heading text-2xl font-extrabold text-white">
                    {latestResult.category}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                    {latestResult.summary}
                  </p>
                </div>
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-primary/10 to-violet-600/10 border border-primary/20">
                  <div className="text-center">
                    <span className="text-3xl font-black text-white">{latestResult.score}</span>
                    <span className="text-xs text-muted-foreground block font-bold">/ 75</span>
                  </div>
                </div>
              </div>

              {/* Score breakdown charts */}
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-bold text-white">
                  Trajectory Competency Scores
                </h3>
                <ScoreChart answers={latestResult.answers} />
              </div>
            </div>
          ) : (
            <div className="glass-panel border-white/5 rounded-3xl p-8 text-center space-y-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary mx-auto">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">No Diagnostic Scores Recorded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Take the signature disappointment test to record your score, audit your strengths, and populate your metrics.
              </p>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg"
              >
                <span>Take Free Assessment</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Assessment history list */}
          {results.length > 1 && (
            <div className="space-y-4">
              <h3 className="font-heading text-lg font-bold text-white">Assessment History</h3>
              <div className="space-y-3">
                {results.map((res, index) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 p-4"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">Diagnostic Attempt #{results.length - index}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(res.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted-foreground">{res.category.split(" ").slice(-2).join(" ")}</span>
                      <span className="text-base font-black text-primary bg-primary/10 border border-primary/25 rounded-lg px-2 py-1">
                        {res.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Bookings & Focus areas */}
        <div className="lg:col-span-4 space-y-8">
          {/* Booked Sessions */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 space-y-6">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Coaching Schedules</span>
            </h3>

            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white/5 border border-white/5 p-4 space-y-3 relative overflow-hidden"
                  >
                    {/* Visual glowing bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-secondary" />

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white leading-tight">{b.serviceName}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3.5 w-3.5 text-secondary" />
                        <span>{b.slotDate} at {b.slotTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-white/5">
                      <span className="text-muted-foreground">ID: {b.bookingCode}</span>
                      <span className="text-secondary animate-pulse">Starts in 2 Days</span>
                    </div>
                  </div>
                ))}
                
                <Link
                  href="/booking"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  <span>Book Another Program</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No upcoming coaching alignments. Book a 1-on-1 session with Dr. Tomorrow to fast-track your trajectory.
                </p>
                <Link
                  href="/services"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  <span>Explore Programs</span>
                </Link>
              </div>
            )}
          </div>

          {/* Profile Focus Areas List */}
          <div className="glass-panel border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" />
              <span>Growth Focus Areas</span>
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {(profile.growthFocusAreas || ["Consistency", "Goal Clarity"]).map((area) => (
                <span
                  key={area}
                  className="text-xs font-semibold text-white bg-white/5 border border-white/10 rounded-full px-3 py-1"
                >
                  {area}
                </span>
              ))}
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-2.5 text-xs text-muted-foreground leading-normal">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p>
                Focus areas are dynamically calibrated from your latest diagnostic results. Update them in your profile editing panel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
