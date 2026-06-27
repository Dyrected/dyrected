"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Brain, Check } from "lucide-react";
import { saveAssessmentResult, getCategoryByScore } from "@/lib/storage";
import assessmentFallback from "./assessment-content.json";

type Question = { text: string; comment: string };

type AssessmentGlobal = {
  badge?: string;
  questions?: Question[];
} | null;

export default function AssessmentContent({
  assessmentGlobal,
}: {
  assessmentGlobal?: AssessmentGlobal;
}) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const badge = assessmentGlobal?.badge ?? assessmentFallback.header.badge;
  const questions =
    assessmentGlobal?.questions && assessmentGlobal.questions.length > 0
      ? assessmentGlobal.questions
      : assessmentFallback.questions;

  const handleSelectScore = (rating: number) => {
    const qNum = currentIdx + 1;
    setAnswers((prev) => ({ ...prev, [qNum]: rating }));
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx((prev) => prev + 1), 250);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx((prev) => prev - 1);
  };

  const handleNext = () => {
    const qNum = currentIdx + 1;
    if (answers[qNum] && currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handleFinish = () => {
    const totalScore = Object.values(answers).reduce((acc, val) => acc + val, 0);
    const catDetails = getCategoryByScore(totalScore);
    const resultObj = saveAssessmentResult({
      score: totalScore,
      answers,
      category: catDetails.title,
      summary: catDetails.summary,
      strengths: catDetails.strengths,
      growthOpportunities: catDetails.growthOpportunities,
      recommendation: catDetails.recommendation,
    });
    router.push(`/assessment/results?id=${resultObj.id}`);
  };

  const currentQNum = currentIdx + 1;
  const currentRating = answers[currentQNum] || null;
  const progressPct = Math.round((currentIdx / questions.length) * 100);
  const isFinished = Object.keys(answers).length === questions.length;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 md:py-24">
      <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 space-y-8 border-white/5 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-primary/20 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {badge}
            </span>
          </div>
          <span className="text-sm font-bold text-white">
            Question {currentQNum} of {questions.length}
          </span>
        </div>

        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-violet-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="min-h-[140px] flex flex-col justify-center space-y-4 text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-white leading-normal">
            {questions[currentIdx].text}
          </h2>
          <p className="text-xs sm:text-sm text-secondary font-medium italic animate-pulse">
            &ldquo;{questions[currentIdx].comment}&rdquo;
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-xs text-muted-foreground font-semibold px-2">
            <span>Strongly Disagree (1)</span>
            <span>Strongly Agree (5)</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => handleSelectScore(score)}
                className={`flex h-12 sm:h-16 flex-col items-center justify-center rounded-2xl border transition-all font-heading text-lg font-bold ${
                  currentRating === score
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-white hover:bg-white/10"
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <button
            onClick={handleBack}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!currentRating}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span>Skip / Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!isFinished}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-6 py-2.5 text-sm font-bold text-black hover:scale-105 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span>Submit Diagnostic</span>
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
