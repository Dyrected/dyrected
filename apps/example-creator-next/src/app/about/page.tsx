import { getAboutPageContent, getValues, getFaqEntries } from "@/lib/dyrected";
import AboutContent from "./AboutContent";

export default async function About() {
  const [aboutGlobal, valuesDocs, faqDocs] = await Promise.all([
    getAboutPageContent(),
    getValues(),
    getFaqEntries(),
  ]);

  return (
    <AboutContent
      aboutGlobal={aboutGlobal as Parameters<typeof AboutContent>[0]["aboutGlobal"]}
      values={valuesDocs.map((v) => ({ icon: v.icon, title: v.title, desc: v.desc }))}
      faqEntries={faqDocs.map((f) => ({ q: f.q, a: f.a }))}
    />
  );
}
