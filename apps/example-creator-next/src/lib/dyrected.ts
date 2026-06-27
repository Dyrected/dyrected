import { createClient } from "@dyrected/sdk";
import homeFallback from "../app/home-content.json";
import { Articles, HomePageGlobal } from "../../dyrected-types";
import blogFallback from "../app/blog/blog-content.json";

function getDyrectedClient() {
  const baseUrl = process.env.NEXT_PUBLIC_DYRECTED_URL || process.env.DYRECTED_URL || "http://localhost:3000";
  const apiKey = process.env.NEXT_PUBLIC_DYRECTED_API_KEY || process.env.DYRECTED_API_KEY;
  return createClient({ baseUrl, apiKey });
}

// ─── Shared types ──────────────────────────────────────────────────────────────

export type DyrectedService = {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  benefits: Array<{ text: string }>;
  order?: number;
};

export type DyrectedArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
  content: Array<{ paragraph: string }>;
};

export type DyrectedCategoryData = {
  title: string;
  summary: string;
  strengths: Array<{ text: string }>;
  growthOpportunities: Array<{ text: string }>;
  recommendation: string;
};

export type DyrectedCategories = {
  CONCERNED?: DyrectedCategoryData;
  OPTIMISTIC?: DyrectedCategoryData;
  PROUD?: DyrectedCategoryData;
  BRAGGING?: DyrectedCategoryData;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchGlobal<T>(
  slug: string,
  { depth = 1, initialData }: { depth?: number | undefined; initialData?: any } = { depth: 1, initialData: undefined },
): Promise<T | null> {
  try {
    const client = getDyrectedClient();
    const result = await client.global(slug).get({ depth, initialData });
    return (result as T) ?? null;
  } catch {
    return null;
  }
}
interface QueryArgs {
  limit?: number;
  page?: number;
  depth?: number;
  where?: any;
  sort?: string;
  initialData?: any[];
}

async function fetchCollection<T>(slug: string, args?: QueryArgs): Promise<T[]> {
  try {
    const client = getDyrectedClient();
    const result = await client.find(slug, { sort: "order", limit: 200, ...args });
    return ((result as { docs?: T[] }).docs ?? []) as T[];
  } catch {
    return [];
  }
}

// ─── Per-page fetchers ─────────────────────────────────────────────────────────

export async function getNavContent() {
  return fetchGlobal<{
    brandName?: string;
    brandSubtitle?: string;
    links?: Array<{ name: string; href: string }>;
    dashboardLabel?: string;
    diagnosticLabel?: string;
  }>("nav");
}

export async function getFooterContent() {
  return fetchGlobal<{
    tagline?: string;
    newsletter?: {
      title?: string;
      description?: string;
      successMessage?: string;
    };
    disclaimer?: string;
  }>("footer");
}

export async function getHomePageContent() {
  const homePage: HomePageGlobal = {
    hero: homeFallback.hero,
    featuredAssessment: homeFallback.featuredAssessment,
    testimonialsHeader: homeFallback.testimonials,
    simulator: homeFallback.simulator,
    howItWorks: homeFallback.howItWorks,
    finalCta: homeFallback.finalCta,
  };
  console.log("[getHomePageContent] Fetching...");
  return fetchGlobal<HomePageGlobal>("home-page", { initialData: homePage });
}

export async function getTestimonials() {
  return fetchCollection<{
    id: string;
    quote: string;
    author: string;
    title: string;
    avatar: string;
    order?: number;
  }>("testimonials");
}

export async function getAboutPageContent() {
  return fetchGlobal<Record<string, unknown>>("about-page");
}

export async function getValues() {
  return fetchCollection<{
    id: string;
    icon: string;
    title: string;
    desc: string;
    order?: number;
  }>("values");
}

export async function getFaqEntries() {
  return fetchCollection<{
    id: string;
    q: string;
    a: string;
    order?: number;
  }>("faq-entries");
}

export async function getServices(): Promise<DyrectedService[]> {
  return fetchCollection<DyrectedService>("services");
}

export async function getServicesPageContent() {
  return fetchGlobal<Record<string, unknown>>("services-page");
}

export async function getAssessmentPageContent() {
  return fetchGlobal<{
    badge?: string;
    questions?: Array<{ text: string; comment: string }>;
  }>("assessment-page");
}

export async function getAssessmentResultsPageContent() {
  return fetchGlobal<{
    header?: { badge?: string; title?: string };
    saveReport?: { title?: string; description?: string };
    bookingCta?: { title?: string; description?: string };
    categories?: DyrectedCategories;
  }>("assessment-results-page");
}

export async function getBlogPageContent() {
  return fetchGlobal<Record<string, unknown>>("blog-page");
}

export async function getArticles(): Promise<DyrectedArticle[]> {
  const articles: Omit<Articles, "id" | "createdAt" | "updatedAt">[] = blogFallback.articles.map((article) => {
    return {
      // ...article,
      date: article.date,
      title: article.title,
      slug: article.slug,
      category: article.category,
      readTime: article.readTime,
      excerpt: article.excerpt,
      content: article.content.map((p) => ({
        paragraph: p,
      })),
    };
  });
  return fetchCollection<DyrectedArticle>("articles", { sort: "date", initialData: articles });
}

export async function getArticleBySlug(slug: string): Promise<DyrectedArticle | null> {
  try {
    const client = getDyrectedClient();
    const result = await client.find("articles", {
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const docs = (result as { docs?: DyrectedArticle[] }).docs ?? [];
    return docs[0] ?? null;
  } catch {
    return null;
  }
}

export async function getBookingPageContent() {
  return fetchGlobal<Record<string, unknown>>("booking-page");
}

export async function getContactPageContent() {
  return fetchGlobal<Record<string, unknown>>("contact-page");
}
