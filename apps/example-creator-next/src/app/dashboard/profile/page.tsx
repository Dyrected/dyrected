"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2 } from "lucide-react";
import { getStoredProfile, saveProfile, UserProfile } from "@/lib/storage";

const FOCUS_AREAS_OPTIONS = [
  "Time Consistency",
  "Habit Design",
  "Action Execution",
  "Goal Clarity & Detail",
  "Focus Management",
  "Personal Accountability",
  "Money & Finance Intent",
  "Health & Routine Priority",
  "Finishing Projects"
];

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const loaded = getStoredProfile();
      if (loaded) {
        setProfile(loaded);
        setName(loaded.name);
        setEmail(loaded.email);
        setGoals(loaded.personalGoals || "");
        setSelectedFocus(loaded.growthFocusAreas || []);
      } else {
        // Redirect if no profile exists
        router.push("/dashboard");
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [router]);

  const handleToggleFocus = (option: string) => {
    setSelectedFocus((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Name and Email parameters are required to maintain timeline calibration.");
      return;
    }
    setError("");

    saveProfile({
      name,
      email,
      personalGoals: goals,
      growthFocusAreas: selectedFocus
    });

    setSavedSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  if (!profile) return null;

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-background">
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
          Edit Profile Coordinates
        </h1>
        <p className="text-sm text-muted-foreground">
          Calibrate your personal metrics to ensure Dr. Tomorrow receives the proper sync feeds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 mt-8">
        {/* Basic fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white block">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white block">Core Personal Goal</label>
          <textarea
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Focus selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-white block">Growth Focus Areas</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {FOCUS_AREAS_OPTIONS.map((opt) => {
              const isChecked = selectedFocus.includes(opt);
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => handleToggleFocus(opt)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    isChecked
                      ? "bg-primary/10 border-primary text-white font-bold"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="text-xs">{opt}</span>
                  {isChecked && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-accent">{error}</p>}

        {savedSuccess ? (
          <div className="flex items-center gap-2 rounded-xl bg-secondary/10 border border-secondary/20 p-3.5 text-sm text-secondary">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Coordinates synced successfully! Returning to Dashboard...</span>
          </div>
        ) : (
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:scale-102 transition-all shadow-lg"
          >
            <span>Save Coordinates</span>
          </button>
        )}
      </form>
    </div>
  );
}
