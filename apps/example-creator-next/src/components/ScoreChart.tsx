"use client";

import { useMemo } from "react";
import { Check, ShieldAlert, Sparkles, Zap } from "lucide-react";

interface ScoreChartProps {
  answers: Record<number, number>;
}

export default function ScoreChart({ answers }: ScoreChartProps) {
  // Group questions by focus areas
  // 1-indexed questions mapping (0-indexed in array key)
  const categoryScores = useMemo(() => {
    // Category 1: Habits & Consistency (Q1, Q9, Q11, Q13)
    const consistencyQ = [1, 9, 11, 13];
    // Category 2: Focus & Execution (Q2, Q7, Q8, Q12)
    const executionQ = [2, 7, 8, 12];
    // Category 3: Goal Clarity & Ownership (Q5, Q6, Q10, Q14)
    const clarityQ = [5, 6, 10, 14];
    // Category 4: Wellness & Trajectory (Q3, Q4, Q15)
    const wellnessQ = [3, 4, 15];

    const sum = (indices: number[]) =>
      indices.reduce((acc, idx) => acc + (answers[idx] || 3), 0);

    const max = (indices: number[]) => indices.length * 5;

    const getPct = (indices: number[]) =>
      Math.round((sum(indices) / max(indices)) * 100);

    return [
      {
        name: "Habits & Consistency",
        pct: getPct(consistencyQ),
        score: sum(consistencyQ),
        max: max(consistencyQ),
        color: "from-purple-500 to-indigo-600",
        strokeColor: "#8b5cf6",
        desc: "Ability to build habits and finish what you start",
        icon: Zap
      },
      {
        name: "Focus & Execution",
        pct: getPct(executionQ),
        score: sum(executionQ),
        max: max(executionQ),
        color: "from-cyan-500 to-blue-600",
        strokeColor: "#06b6d4",
        desc: "Time management and action over research/planning",
        icon: Sparkles
      },
      {
        name: "Goal Clarity & Ownership",
        pct: getPct(clarityQ),
        score: sum(clarityQ),
        max: max(clarityQ),
        color: "from-emerald-500 to-teal-600",
        strokeColor: "#10b981",
        desc: "Ownership of results and working towards clear goals",
        icon: Check
      },
      {
        name: "Wellness & Trajectory",
        pct: getPct(wellnessQ),
        score: sum(wellnessQ),
        max: max(wellnessQ),
        color: "from-orange-500 to-amber-600",
        strokeColor: "#f97316",
        desc: "Health, financial intent, and long-term satisfaction",
        icon: ShieldAlert
      }
    ];
  }, [answers]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {categoryScores.map((cat) => {
        const Icon = cat.icon;
        // SVG circle dimensions
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (cat.pct / 100) * circumference;

        return (
          <div
            key={cat.name}
            className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-all duration-300"
          >
            {/* SVG Ring Progress */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-white/5"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke={cat.strokeColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{cat.pct}%</span>
                <span className="text-[9px] text-muted-foreground uppercase font-medium">
                  {cat.score}/{cat.max}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg bg-linear-to-r ${cat.color} p-1.5 text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="font-heading font-semibold text-white text-sm">
                  {cat.name}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                {cat.desc}
              </p>
              
              {/* Timeline Status Comment */}
              <div className="text-[10px] font-medium mt-2">
                {cat.pct < 40 ? (
                  <span className="text-accent">Timeline status: Critical action needed</span>
                ) : cat.pct < 70 ? (
                  <span className="text-yellow-500">Timeline status: Moderate drift</span>
                ) : (
                  <span className="text-secondary">Timeline status: Optimal alignment</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
