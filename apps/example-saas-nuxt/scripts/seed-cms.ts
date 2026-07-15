import { createClient } from "@dyrected/sdk";
import { DyrectedSchema } from "../app/dyrected-types.js";

async function seed() {
  console.log("🌱 Seeding Dyrected CMS with full archived content...");

  const app = createClient<DyrectedSchema>({
    baseUrl: "http://localhost:3009/dyrected",
  });

  const pages = app.collection("pages");

  // 1. Clear existing pages to ensure a fresh start with exact content
  try {
    const existing = await pages
      .find({
        where: { slug: { in: ["home", "about", "features", "pricing", "contact"] } },
      })
      .exec();

    for (const p of existing.docs) {
      await pages.delete(p.id);
    }
    console.log("🧹 Cleaned existing pages.");
  } catch (e) {
    console.log("Notice: Handled existing clean-up.", e);
  }

  // 2. Exact Page Data from Archived Files
  const pageData = [
    {
      title: "Home",
      slug: "home",
      seo: {
        metaTitle: "SnackTrack Pro — AI-Powered Office Snack Inventory Management",
        metaDescription:
          "Enterprise-grade, AI-powered office snack inventory management. Track, forecast, and optimize your office snack ecosystem at scale.",
      },
      layout: [
        {
          blockType: "hero",
          heading: "Snack Management, Reimagined for the Enterprise.",
          subheading:
            "SnackTrack Pro delivers end-to-end visibility into your office snack ecosystem. From Doritos to destiny — we handle the full snack lifecycle.",
          ctaLabel: "Request a Snack Demo",
          ctaLink: "/contact",
        },
        {
          blockType: "logos",
          heading: "Trusted by the world's leading organizations",
          items: [
            { name: "Deloitte" },
            { name: "McKinsey & Co." },
            { name: "Goldman Snachs" },
            { name: "Bain & Crunch" },
            { name: "KPMG Munchies" },
          ],
        },
        {
          blockType: "features",
          heading: "Everything your snacks need to succeed.",
          items: [
            {
              icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v2" />`,
              title: "CrunchGPT AI Forecasting",
              description:
                "Predict snack depletion before it happens. Our AI analyzes consumption patterns across 47 variables.",
            },
            {
              icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />`,
              title: "Real-Time Snack Alerts",
              description:
                "Never experience an unexpected chip shortage again. Instant Slack, email, and SMS notifications.",
            },
            {
              icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />`,
              title: "Snack ROI Dashboard",
              description:
                "Prove snack value to your CFO. Track employee satisfaction correlation to pretzel availability in real time.",
            },
          ],
        },
        {
          blockType: "testimonial",
          quote:
            "Before SnackTrack Pro, we were manually auditing our snack drawers every Tuesday. Now, CrunchGPT tells us on Sunday. We've reclaimed 14 hours of executive bandwidth per quarter.",
          author: "Rebecca Holtsworth",
          role: "Chief Operations Officer, Meridian Consulting Group",
          initials: "RH",
        },
        {
          blockType: "cta",
          heading: "Join the snack revolution",
          description: "Start managing your office snacks like a Fortune 500 company.",
          buttonLabel: "Get Started",
          buttonLink: "/contact",
        },
      ],
    },
    {
      title: "About Us",
      slug: "about",
      seo: {
        metaTitle: "About — SnackTrack Pro",
        metaDescription:
          "The story of how two ex-consultants decided office snack chaos was a $47B problem worth solving.",
      },
      layout: [
        {
          blockType: "hero",
          heading: "We believe no office should suffer an unexpected snack outage.",
          subheading:
            "SnackTrack Pro was founded on the radical belief that snack management deserves the same rigor, tooling, and executive attention as any other mission-critical enterprise system.",
        },
        {
          blockType: "stats",
          items: [
            { value: "2,400+", label: "Enterprise Customers" },
            { value: "47", label: "Countries" },
            { value: "14M+", label: "Snack Events / Day" },
            { value: "$47B", label: "Addressable Snack Market" },
          ],
        },
        {
          blockType: "timeline",
          items: [
            {
              year: "2019",
              title: "The Incident",
              description:
                "Co-founders Marcus Webb and Priya Nair experience a career-defining snack outage during a critical all-hands meeting.",
            },
            {
              year: "2020",
              title: "Ideation During Lockdown",
              description: "Marcus builds the first version of SnackTrack in a Google Sheet.",
            },
            {
              year: "2021",
              title: "Seed Round & First Customers",
              description: "Raises $4.2M from Sequoia Snackpital and Andreessen Munchowitz.",
            },
            {
              year: "2022",
              title: "CrunchGPT Launch",
              description:
                "Releases CrunchGPT v1.0, the world's first AI model trained exclusively on snack consumption telemetry.",
            },
            {
              year: "2023",
              title: "Series A & Global Expansion",
              description: "Raises $28M Series A. Expands to EMEA and APAC.",
            },
            {
              year: "2024",
              title: "2,400 Customers & Growing",
              description: "Reaches 2,400 enterprise customers across 47 countries.",
            },
          ],
        },
        {
          blockType: "team",
          heading: "The team behind the crunch.",
          members: [
            {
              name: "Marcus Webb",
              role: "Chief Snack Officer",
              bio: "Former McKinsey partner, 12 years in operational transformation.",
              initials: "MW",
            },
            {
              name: "Priya Nair",
              role: "President & Co-Founder",
              bio: "Previously led supply chain innovation at Amazon Fresh and Google Cafeteria Operations.",
              initials: "PN",
            },
            {
              name: "Devon Ashcroft",
              role: "VP of Crunch",
              bio: "Leads all revenue operations and enterprise sales.",
              initials: "DA",
            },
            {
              name: "Yuki Tanaka",
              role: "Head of Flavor Intelligence",
              bio: "PhD in Computational Gastronomy from Stanford.",
              initials: "YT",
            },
          ],
        },
        {
          blockType: "press",
          items: [
            {
              publication: "TechCrunch Munchies Edition",
              quote:
                "SnackTrack Pro has done for office snacks what Salesforce did for CRM — made it unnecessarily complex and indispensable.",
              date: "March 2024",
            },
            {
              publication: "Forbes Snack 30 Under 30",
              quote: "Webb and Nair have identified a $47 billion market hiding in plain sight.",
              date: "January 2024",
            },
          ],
        },
      ],
    },
    {
      title: "Features",
      slug: "features",
      seo: {
        metaTitle: "Features — SnackTrack Pro",
        metaDescription: "Explore CrunchGPT AI Forecasting, Real-Time Snack Alerts, and the Snack ROI Dashboard.",
      },
      layout: [
        {
          blockType: "hero",
          heading: "Built for enterprises that take snacks seriously.",
          subheading:
            "Every feature engineered to eliminate snack risk, maximize crunch uptime, and deliver measurable ROI to your office pantry.",
          ctaLabel: "Request a Snack Demo",
          ctaLink: "/contact",
        },
        {
          blockType: "features",
          heading: "CrunchGPT™ AI Forecasting",
          items: [
            {
              title: "14-day predictive snack horizon",
              description: "Hyper-accurate depletion forecasts up to 14 days in advance.",
            },
            {
              title: "Meeting density correlation engine",
              description: "Accounts for holiday surges and meeting density.",
            },
          ],
        },
        {
          blockType: "stats",
          items: [
            { value: "162%", label: "Avg. Snack ROI at 12 months" },
            { value: "97pts", label: "Peak Employee Satisfaction Index" },
          ],
        },
        {
          blockType: "comparison",
          heading: "How we compare.",
          rows: [
            { feature: "AI Snack Forecasting", snacktrack: true, competitorA: "No", competitorB: "No" },
            { feature: "Real-Time Slack Alerts", snacktrack: true, competitorA: "Yes", competitorB: "No" },
            { feature: "Snack ROI Dashboard", snacktrack: true, competitorA: "No", competitorB: "No" },
            { feature: "SSO / SAML Integration", snacktrack: true, competitorA: "Yes", competitorB: "Yes" },
          ],
        },
      ],
    },
    {
      title: "Pricing",
      slug: "pricing",
      seo: {
        metaTitle: "Pricing — SnackTrack Pro",
        metaDescription:
          "Transparent enterprise snack management pricing. Starter, Growth, and Enterprise Snack Suite plans.",
      },
      layout: [
        {
          blockType: "hero",
          heading: "Invest in your snacks. Your team will notice.",
          subheading: "Simple, predictable pricing for offices of every crunch volume.",
        },
        {
          blockType: "pricing",
          heading: "Fair Pricing for Every Pantry",
          plans: [
            {
              name: "Starter",
              price: "$49/mo",
              features: [{ text: "1 snack drawer" }, { text: "7-day forecast" }, { text: "Email alerts" }],
              ctaLabel: "Start Free Trial",
              ctaLink: "/contact",
            },
            {
              name: "Growth",
              price: "$149/mo",
              features: [{ text: "Up to 10 drawers" }, { text: "14-day forecast" }, { text: "Slack + SMS alerts" }],
              ctaLabel: "Start Free Trial",
              ctaLink: "/contact",
            },
            {
              name: "Enterprise",
              price: "Contact Us",
              features: [{ text: "Unlimited drawers" }, { text: "30-day forecast" }, { text: "Snack Concierge" }],
              ctaLabel: "Contact Sales",
              ctaLink: "/contact",
            },
          ],
        },
        {
          blockType: "faq",
          heading: "Frequently asked questions.",
          items: [
            {
              question: "What counts as a snack drawer?",
              answer: "Any designated physical storage unit tracked by SnackTrack Pro.",
            },
            {
              question: "Is my pretzel data stored in the EU?",
              answer: "Yes, we offer full data residency options in multiple regions.",
            },
            { question: "Can I integrate with ERP?", answer: "Yes, native connectors for SAP, Oracle, and more." },
          ],
        },
      ],
    },
    {
      title: "Contact",
      slug: "contact",
      seo: {
        metaTitle: "Contact — SnackTrack Pro",
        metaDescription: "Talk to our Sales team, Support desk, or dedicated Snack Concierge.",
      },
      layout: [
        {
          blockType: "hero",
          heading: "Let's talk about your snack infrastructure.",
          subheading:
            "Our team is standing by to assess your snack situation, walk you through a live demo, or simply listen to your pain.",
          ctaLabel: "",
          ctaLink: "",
        },
        {
          blockType: "contactForm",
          heading: "Request a Snack Demo",
          subheading: "A member of our Snack Intelligence team will contact you within 1 business day.",
        },
      ],
    },
  ];

  for (const doc of pageData) {
    try {
      await pages.create(doc);
      console.log(`✅ Seeded page: ${doc.title}`);
    } catch (err: any) {
      console.error(`❌ Failed to seed page: ${doc.title}`, err.message);
    }
  }

  console.log("✨ Seeding complete!");
}

seed().catch((err) => {
  console.error("❌ Seeding process failed:", err);
  process.exit(1);
});
