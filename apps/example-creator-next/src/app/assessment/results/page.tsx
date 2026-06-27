import { Suspense } from "react";
import { getAssessmentResultsPageContent } from "@/lib/dyrected";
import ResultsContent from "./ResultsContent";

export default async function Results() {
  const resultsGlobal = await getAssessmentResultsPageContent();

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
          <div className="space-y-4 max-w-md">
            <h2 className="text-2xl font-bold text-white">Loading Results...</h2>
          </div>
        </div>
      }
    >
      <ResultsContent
        resultsGlobal={
          resultsGlobal as Parameters<typeof ResultsContent>[0]["resultsGlobal"]
        }
      />
    </Suspense>
  );
}
