import { getHomePageContent, getTestimonials } from "@/lib/dyrected";
import HomeContent, { HomeGlobal } from "./HomeContent";

export default async function Home() {
  const [homeGlobal, testimonialDocs] = await Promise.all([
    getHomePageContent(),
    getTestimonials(),
  ]);

  const testimonials = testimonialDocs.map((t) => ({
    quote: t.quote ?? "",
    author: t.author ?? "",
    title: t.title ?? "",
    avatar: t.avatar ?? "",
  }));
  return <HomeContent homeGlobal={homeGlobal as HomeGlobal} testimonials={testimonials} />;
}
