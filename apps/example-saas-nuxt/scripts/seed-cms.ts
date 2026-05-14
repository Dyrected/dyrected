import { createClient } from "@dyrected/sdk";

async function seed() {
  console.log("🌱 Seeding Dyrected CMS via SDK Client (Port 3009)...");

  const app = createClient({ 
    baseUrl: "http://localhost:3009/dyrected/api" 
  });
  
  const pages = app.collection("pages");

  // 1. Clear existing
  try {
    const existing = await pages.find({
      where: { slug: { in: ["home", "about", "features", "pricing"] } }
    }).exec();
    
    for (const p of existing.data) {
      await pages.deleteOne(p.id);
    }
    console.log("🧹 Cleaned existing pages.");
  } catch (e) {
    console.log("Notice: Handled existing clean-up.");
  }

  // 2. Create pages (Shortened for brevity but complete slugs)
  const pageData = [
    {
      title: "Home",
      slug: "home",
      layout: [
        {
          blockType: "hero",
          heading: "Snack Management, Reimagined for the Enterprise.",
          subheading: "SnackTrack Pro delivers end-to-end visibility into your office snack ecosystem.",
          ctaLabel: "Request a Snack Demo",
          ctaLink: "/contact"
        },
        {
          blockType: "features",
          heading: "Core Features",
          items: [
            { title: "AI Forecasting", description: "Predict snack depletion.", icon: "" }
          ]
        },
        {
          blockType: "cta",
          heading: "Join the snack revolution",
          buttonLabel: "Get Started",
          buttonLink: "/contact"
        }
      ]
    },
    {
      title: "About Us",
      slug: "about",
      layout: [
        {
          blockType: "hero",
          heading: "About SnackTrack Pro",
          subheading: "We take snacks seriously."
        },
        {
          blockType: "timeline",
          items: [
            { year: "2020", title: "Founded", description: "Started in a pantry." }
          ]
        }
      ]
    },
    {
      title: "Features",
      slug: "features",
      layout: [
        {
          blockType: "hero",
          heading: "Enterprise Snack Features",
          subheading: "Scale your pantry with ease."
        }
      ]
    },
    {
      title: "Pricing",
      slug: "pricing",
      layout: [
        {
          blockType: "hero",
          heading: "Fair Pricing for Every Pantry",
          subheading: "Choose your crunch tier."
        },
        {
          blockType: "pricing",
          heading: "Snack Plans",
          plans: [
            { name: "Starter", price: "$49", features: [{ text: "1 drawer" }], ctaLabel: "Go", ctaLink: "/contact" }
          ]
        }
      ]
    }
  ];

  for (const data of pageData) {
    await pages.create(data);
    console.log(`✅ Created page: ${data.slug}`);
  }

  console.log("✨ All pages seeded successfully!");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
