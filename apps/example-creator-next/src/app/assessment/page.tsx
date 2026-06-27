import { getAssessmentPageContent } from "@/lib/dyrected";
import AssessmentContent from "./AssessmentContent";

export default async function Assessment() {
  const assessmentGlobal = await getAssessmentPageContent();
  return <AssessmentContent assessmentGlobal={assessmentGlobal} />;
}
