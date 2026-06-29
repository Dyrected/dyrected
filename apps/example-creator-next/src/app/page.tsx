import { dyrected } from "@/lib/dyrected";
import fallbackHomeContent from "./home-content.json";
import HomePageClient from "./home-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeContent = typeof fallbackHomeContent;
type LayoutBlock = { blockType?: string } & Record<string, unknown>;
type PageDocument = {
  hero?: HomeContent["hero"];
  layout?: LayoutBlock[];
};

export default async function Home() {
  const homeContent = await getHomeContent();
  return <HomePageClient homeContent={homeContent} />;
}

async function getHomeContent(): Promise<HomeContent> {
  try {
    const result = await dyrected.find("pages", {
      where: { slug: { equals: "home" } },
      limit: 1,
    });
    const page = result.docs[0] as PageDocument | undefined;
    if (!page) return fallbackHomeContent;

    return pageToHomeContent(page);
  } catch (error) {
    console.error("Failed to fetch home content from Dyrected:", error);
    return fallbackHomeContent;
  }
}

function pageToHomeContent(page: PageDocument): HomeContent {
  const blocks = Array.isArray(page.layout) ? page.layout : [];

  return {
    ...fallbackHomeContent,
    hero: page.hero ?? fallbackHomeContent.hero,
    simulator: normalizeSimulator(blockByType(blocks, "timelineSimulator")),
    howItWorks: blockByType(blocks, "steps") ?? fallbackHomeContent.howItWorks,
    featuredAssessment: blockByType(blocks, "featuredAssessment") ?? fallbackHomeContent.featuredAssessment,
    testimonials: blockByType(blocks, "testimonials") ?? fallbackHomeContent.testimonials,
    finalCta: blockByType(blocks, "finalCta") ?? fallbackHomeContent.finalCta,
  };
}

function normalizeSimulator(block: HomeContent["simulator"] | undefined): HomeContent["simulator"] {
  if (!block) return fallbackHomeContent.simulator;

  return {
    ...block,
    sliderLabels: normalizeLabelArray(block.sliderLabels),
    statLabels: normalizeLabelArray(block.statLabels),
  };
}

function normalizeLabelArray(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "label" in item && typeof item.label === "string") {
        return item.label;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function blockByType<T>(blocks: LayoutBlock[], blockType: string): T | undefined {
  const block = blocks.find((item) => item.blockType === blockType);
  if (!block) return undefined;

  const content = { ...block };
  delete content.blockType;
  return content as T;
}
