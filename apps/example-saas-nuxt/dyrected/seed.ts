/**
 * Demo seed content for the SnackTrack Pro example site.
 *
 * These arrays/objects are wired into each collection's / global's
 * `initialData` in dyrected.config.ts. Core auto-seeds them the first time a
 * collection is listed (unfiltered) or a global is read while empty, so a fresh
 * database boots into a complete, coherent demo site.
 *
 * IDs are fixed so relationships resolve deterministically:
 *   - blog.author  -> authors.id
 * Media relationships (logo, images, avatars) are intentionally left unset so
 * the demo works with an empty media library; upload and attach real assets in
 * the admin to enrich it.
 */

// ---------------------------------------------------------------------------
// Link helpers — match the stored `url` field shape { type, url, label? }
// ---------------------------------------------------------------------------
const internal = (url: string, label: string) => ({ type: "internal" as const, url, label });
const external = (url: string, label: string) => ({ type: "custom" as const, url, label });

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------
export const authorsSeed = [
  {
    id: "author-maya-chen",
    name: "Maya Chen",
    bio: "Head of Snack Intelligence at SnackTrack Pro. Former supply-chain lead who spent a decade forecasting demand for global retailers before turning her attention to the most volatile pantry on earth: the office kitchen.",
    country: "US",
    state: "US-CA",
  },
  {
    id: "author-devon-okafor",
    name: "Devon Okafor",
    bio: "Co-founder & CEO of SnackTrack Pro. Devon started the company after watching his 300-person startup burn a full afternoon of standups arguing about who finished the cold brew.",
    country: "US",
    state: "US-NY",
  },
];

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
export const blogSeed = [
  {
    id: "post-hidden-cost",
    title: "The Hidden Cost of an Empty Snack Drawer",
    slug: "the-hidden-cost-of-an-empty-snack-drawer",
    author: "author-maya-chen",
    publishedDate: "2026-05-12T09:00:00.000Z",
    content:
      "<p>Every office has a moment: someone reaches for the last granola bar, finds an empty box, and quietly loses ten minutes of focus deciding what to do about it. Multiply that across a floor of two hundred people and the &ldquo;snack tax&rdquo; adds up fast.</p>" +
      "<p>When we studied consumption data across 400 workplaces, we found that unplanned stockouts cost the average mid-size company roughly <strong>18 productive hours per week</strong> &mdash; not from the snacking itself, but from the context-switching, the group chats, and the impromptu supply runs.</p>" +
      "<h2>Why pantries are so hard to predict</h2>" +
      "<p>Office demand is spiky. A single all-hands meeting can clear a month of trail mix in an afternoon. Traditional par-level restocking &mdash; &ldquo;order more when it looks low&rdquo; &mdash; simply can&rsquo;t keep up with that variance.</p>" +
      "<p>That&rsquo;s the problem SnackTrack Pro was built to solve: treat the pantry like the operational system it actually is, and forecast it with the same rigor you&rsquo;d apply to any other part of the business.</p>",
  },
  {
    id: "post-predictive-restocking",
    title: "How We Cut Snack Waste by 40% with Predictive Restocking",
    slug: "how-we-cut-snack-waste-by-40-percent-with-predictive-restocking",
    author: "author-devon-okafor",
    publishedDate: "2026-06-03T09:00:00.000Z",
    content:
      "<p>For years, the standard advice for office pantries was to over-order. Better to have too much than to run out, the thinking went. The result was predictable: overflowing cabinets, expired granola, and a surprising amount of food quietly thrown away each month.</p>" +
      "<h2>From guesswork to forecasting</h2>" +
      "<p>Predictive restocking flips the model. Instead of reacting to empty shelves, SnackTrack Pro forecasts demand from real consumption patterns &mdash; headcount, seasonality, meeting density, even the weather &mdash; and orders just ahead of need.</p>" +
      "<p>Across our first cohort of customers, that shift reduced snack waste by an average of <strong>40%</strong> in the first quarter while improving in-stock rates. Less thrown away, fewer stockouts, and a noticeably happier team.</p>" +
      "<p>The lesson we keep relearning: you don&rsquo;t fix a variance problem by buying more. You fix it by seeing further ahead.</p>",
  },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export const productsSeed = [
  {
    id: "product-snack-sensor",
    title: "SnackTrack Sensor",
    slug: "snacktrack-sensor",
    description:
      "A wireless shelf sensor that measures weight and stock levels in real time, then streams the data straight to your SnackTrack dashboard. Installs in seconds, no wiring required.",
    price: 49,
    featured: true,
    publishedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "product-analytics-suite",
    title: "SnackTrack Analytics Suite",
    slug: "snacktrack-analytics-suite",
    description:
      "The reporting layer for operations teams. Consumption trends, spend forecasting, and satisfaction insights across every location, exportable and board-ready.",
    price: 199,
    featured: false,
    publishedAt: "2026-02-01T00:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
export const pagesSeed = [
  // ---- Home -------------------------------------------------------------
  {
    id: "page-home",
    title: "Home",
    slug: "home",
    seo: {
      metaTitle: "SnackTrack Pro — AI-Powered Office Snack Inventory Management",
      metaDescription:
        "SnackTrack Pro gives operations teams end-to-end visibility into their office pantry — forecast demand, prevent stockouts, and cut waste at scale.",
    },
    layout: [
      {
        blockType: "hero",
        variant: "centered",
        heading: "Office snacks, finally under control",
        subheading:
          "SnackTrack Pro brings real-time visibility and AI forecasting to your office pantry — so you never run out, never over-order, and never argue about the last cold brew again.",
        ctaLabel: "Request a demo",
        ctaLink: internal("/contact", "Request a demo"),
      },
      {
        blockType: "logos",
        heading: "Trusted by operations teams at fast-growing companies",
        items: [
          { name: "Northwind" },
          { name: "Meridian" },
          { name: "Lumen Labs" },
          { name: "Atlas Group" },
          { name: "Everpeak" },
        ],
      },
      {
        blockType: "features",
        heading: "Everything you need to run a smarter pantry",
        items: [
          {
            icon: "ChartNoAxesCombined",
            title: "AI demand forecasting",
            description:
              "Predict what runs out and when, using real consumption patterns, headcount, and seasonality — so restocking happens just ahead of need.",
          },
          {
            icon: "BellRing",
            title: "Real-time stock alerts",
            description:
              "Get notified in Slack or email the moment a favorite drops below par. No more surprise empty shelves before a big meeting.",
          },
          {
            icon: "PackageSearch",
            title: "One dashboard, every location",
            description:
              "Track inventory, spend, and satisfaction across all your offices from a single view — with reports your finance team will actually trust.",
          },
        ],
      },
      {
        blockType: "stats",
        items: [
          { value: "40%", label: "less snack waste" },
          { value: "99.2%", label: "in-stock rate" },
          { value: "18 hrs", label: "saved per week" },
          { value: "400+", label: "pantries managed" },
        ],
      },
      {
        blockType: "pricing",
        heading: "Pricing that scales with your team",
        plans: [
          {
            name: "Starter",
            price: "$0",
            features: [
              { text: "Up to 25 employees" },
              { text: "1 location" },
              { text: "Manual restock reminders" },
              { text: "Community support" },
            ],
            ctaLabel: "Get started",
            ctaLink: internal("/contact", "Get started"),
          },
          {
            name: "Growth",
            price: "$149/mo",
            features: [
              { text: "Up to 250 employees" },
              { text: "Up to 5 locations" },
              { text: "AI demand forecasting" },
              { text: "Slack & email alerts" },
              { text: "Priority support" },
            ],
            ctaLabel: "Start free trial",
            ctaLink: internal("/contact", "Start free trial"),
          },
          {
            name: "Enterprise",
            price: "Custom",
            features: [
              { text: "Unlimited employees" },
              { text: "Unlimited locations" },
              { text: "SSO & advanced roles" },
              { text: "Dedicated success manager" },
              { text: "Custom integrations" },
            ],
            ctaLabel: "Talk to sales",
            ctaLink: internal("/contact", "Talk to sales"),
          },
        ],
      },
      {
        blockType: "testimonial",
        quote:
          "Before SnackTrack Pro, we audited our pantry by hand every Monday. Now forecasting tells us what to order before we run low. We've reclaimed hours every week and the team is noticeably happier.",
        author: "Rebecca Holt",
        role: "Chief Operations Officer, Meridian",
        initials: "RH",
      },
      {
        blockType: "faq",
        heading: "Frequently asked questions",
        items: [
          {
            question: "How long does setup take?",
            answer:
              "Most teams are up and running in under a day. Add your locations, connect your suppliers, and place the sensors — no wiring or IT project required.",
          },
          {
            question: "Do I have to use your suppliers?",
            answer:
              "No. SnackTrack Pro works with your existing vendors. We forecast the demand; you keep the supplier relationships you already have.",
          },
          {
            question: "Can it handle multiple offices?",
            answer:
              "Yes. Growth and Enterprise plans manage many locations from one dashboard, with per-site inventory and roll-up reporting.",
          },
        ],
      },
      {
        blockType: "cta",
        heading: "Ready to end the great snack shortage?",
        description:
          "Join the operations teams who stopped guessing and started forecasting. See SnackTrack Pro on your own pantry in a 20-minute demo.",
        buttonLabel: "Request a demo",
        buttonLink: internal("/contact", "Request a demo"),
      },
    ],
  },

  // ---- Features ---------------------------------------------------------
  {
    id: "page-features",
    title: "Features",
    slug: "features",
    seo: {
      metaTitle: "Features — SnackTrack Pro",
      metaDescription:
        "Forecasting, real-time alerts, multi-location dashboards, and reporting built for the way modern operations teams run their pantries.",
    },
    layout: [
      {
        blockType: "hero",
        variant: "split",
        heading: "Every feature your pantry deserves",
        subheading:
          "From the sensor on the shelf to the report on your CFO's desk, SnackTrack Pro connects the whole snack lifecycle in one place.",
        ctaLabel: "See pricing",
        ctaLink: internal("/pricing", "See pricing"),
      },
      {
        blockType: "features",
        heading: "Built for operations, loved by everyone else",
        items: [
          {
            icon: "ChartNoAxesCombined",
            title: "Demand forecasting",
            description:
              "Machine-learned predictions that account for headcount, meetings, and seasonality — so you order the right amount at the right time.",
          },
          {
            icon: "BellRing",
            title: "Smart alerts",
            description:
              "Configurable par levels with instant Slack and email notifications the moment stock dips below your threshold.",
          },
          {
            icon: "PackageSearch",
            title: "Live inventory",
            description:
              "Wireless shelf sensors keep counts accurate to the item, with zero manual auditing.",
          },
          {
            icon: "Boxes",
            title: "Multi-location control",
            description:
              "Manage every office from one dashboard, with per-site pars and company-wide roll-ups.",
          },
          {
            icon: "TrendingUp",
            title: "Spend analytics",
            description:
              "Track cost per head, forecast next quarter's budget, and export board-ready reports in a click.",
          },
          {
            icon: "ShieldCheck",
            title: "Enterprise-ready",
            description:
              "SSO, granular roles, and audit logs keep large deployments secure and compliant.",
          },
        ],
      },
      {
        blockType: "comparison",
        heading: "How we compare",
        rows: [
          { feature: "AI demand forecasting", snacktrack: true, competitorA: "Limited", competitorB: "No" },
          { feature: "Real-time shelf sensors", snacktrack: true, competitorA: "No", competitorB: "No" },
          { feature: "Multi-location dashboard", snacktrack: true, competitorA: "Yes", competitorB: "Add-on" },
          { feature: "Works with your suppliers", snacktrack: true, competitorA: "No", competitorB: "Yes" },
          { feature: "Board-ready reporting", snacktrack: true, competitorA: "Basic", competitorB: "No" },
        ],
      },
      {
        blockType: "cta",
        heading: "See it running on your pantry",
        description:
          "Book a 20-minute walkthrough and we'll show you a live forecast built from your own headcount.",
        buttonLabel: "Request a demo",
        buttonLink: internal("/contact", "Request a demo"),
      },
    ],
  },

  // ---- Pricing ----------------------------------------------------------
  {
    id: "page-pricing",
    title: "Pricing",
    slug: "pricing",
    seo: {
      metaTitle: "Pricing — SnackTrack Pro",
      metaDescription:
        "Simple, transparent pricing that scales from a single team to a global footprint. Start free, upgrade when you're ready.",
    },
    layout: [
      {
        blockType: "hero",
        variant: "centered",
        heading: "Simple, transparent pricing",
        subheading:
          "Start free and upgrade when you grow. No setup fees, no per-snack surcharges, no surprises on the invoice.",
      },
      {
        blockType: "pricing",
        heading: "Choose your plan",
        plans: [
          {
            name: "Starter",
            price: "$0",
            features: [
              { text: "Up to 25 employees" },
              { text: "1 location" },
              { text: "Manual restock reminders" },
              { text: "Community support" },
            ],
            ctaLabel: "Get started",
            ctaLink: internal("/contact", "Get started"),
          },
          {
            name: "Growth",
            price: "$149/mo",
            features: [
              { text: "Up to 250 employees" },
              { text: "Up to 5 locations" },
              { text: "AI demand forecasting" },
              { text: "Slack & email alerts" },
              { text: "Priority support" },
            ],
            ctaLabel: "Start free trial",
            ctaLink: internal("/contact", "Start free trial"),
          },
          {
            name: "Enterprise",
            price: "Custom",
            features: [
              { text: "Unlimited employees" },
              { text: "Unlimited locations" },
              { text: "SSO & advanced roles" },
              { text: "Dedicated success manager" },
              { text: "Custom integrations" },
            ],
            ctaLabel: "Talk to sales",
            ctaLink: internal("/contact", "Talk to sales"),
          },
        ],
      },
      {
        blockType: "faq",
        heading: "Pricing questions, answered",
        items: [
          {
            question: "Is there really a free plan?",
            answer:
              "Yes. Starter is free forever for teams up to 25 people at a single location. It's a great way to see the value before you scale up.",
          },
          {
            question: "Can I change plans later?",
            answer:
              "Anytime. Upgrade or downgrade in a click and we'll prorate the difference on your next invoice.",
          },
          {
            question: "Do the sensors cost extra?",
            answer:
              "Growth and Enterprise plans include your first set of sensors. Additional hardware is available at cost with no markup.",
          },
        ],
      },
      {
        blockType: "cta",
        heading: "Still deciding?",
        description:
          "Talk to our team and we'll help you pick the right plan for your headcount and number of locations.",
        buttonLabel: "Talk to sales",
        buttonLink: internal("/contact", "Talk to sales"),
      },
    ],
  },

  // ---- About ------------------------------------------------------------
  {
    id: "page-about",
    title: "About Us",
    slug: "about",
    seo: {
      metaTitle: "About — SnackTrack Pro",
      metaDescription:
        "We're on a mission to bring operational rigor to the most overlooked system in the office: the pantry.",
    },
    layout: [
      {
        blockType: "hero",
        variant: "centered",
        heading: "We're on a mission to end snack scarcity",
        subheading:
          "SnackTrack Pro started with a simple observation: the office pantry is a supply chain, and nobody was treating it like one.",
      },
      {
        blockType: "richContent",
        content:
          "<h2>Our story</h2><p>In 2024, our founder watched his fast-growing team lose an entire afternoon to a debate about who finished the cold brew. It was funny &mdash; and then it wasn't. The pantry was a real operational system with real costs, and it was being run on sticky notes and good intentions.</p><p>So we built the tool we wished existed: sensors that see the shelf, forecasting that sees the future, and a dashboard that turns both into decisions. Today SnackTrack Pro helps hundreds of teams keep their people fueled without the waste, the stockouts, or the arguments.</p>",
      },
      {
        blockType: "stats",
        items: [
          { value: "2024", label: "founded" },
          { value: "400+", label: "customers" },
          { value: "12", label: "countries" },
          { value: "3.4M", label: "snacks tracked" },
        ],
      },
      {
        blockType: "team",
        heading: "The people behind the pantry",
        members: [
          {
            name: "Devon Okafor",
            role: "Co-founder & CEO",
            bio: "Former operations lead who believes every recurring annoyance is a product waiting to be built.",
            initials: "DO",
          },
          {
            name: "Maya Chen",
            role: "Head of Snack Intelligence",
            bio: "Spent a decade forecasting demand for global retailers before turning to the office pantry.",
            initials: "MC",
          },
          {
            name: "Priya Nair",
            role: "Co-founder & CTO",
            bio: "Hardware engineer who shrank an industrial weight sensor down to something that sticks under a shelf.",
            initials: "PN",
          },
        ],
      },
      {
        blockType: "timeline",
        items: [
          { year: "2024", title: "The empty cold brew", description: "The idea is born after one debate too many." },
          { year: "2025", title: "First 100 customers", description: "SnackTrack Pro ships and pantries start forecasting themselves." },
          { year: "2026", title: "Going global", description: "Now managing pantries across 12 countries and counting." },
        ],
      },
      {
        blockType: "cta",
        heading: "Come build the future of the pantry",
        description: "We're hiring across engineering, operations, and customer success.",
        buttonLabel: "Get in touch",
        buttonLink: internal("/contact", "Get in touch"),
      },
    ],
  },

  // ---- Contact ----------------------------------------------------------
  {
    id: "page-contact",
    title: "Contact",
    slug: "contact",
    seo: {
      metaTitle: "Contact — SnackTrack Pro",
      metaDescription:
        "Talk to our team about demos, pricing, and rolling SnackTrack Pro out across your offices.",
    },
    layout: [
      {
        blockType: "contactForm",
        heading: "Let's talk snacks",
        subheading:
          "Tell us about your team and we'll show you what SnackTrack Pro can do for your pantry. We usually reply within one business day.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Navigation global
// ---------------------------------------------------------------------------
export const navigationSeed = {
  navLinks: [
    { title: "Home", url: internal("/", "Home") },
    { title: "Features", url: internal("/features", "Features") },
    { title: "Pricing", url: internal("/pricing", "Pricing") },
    { title: "About", url: internal("/about", "About") },
    { title: "Contact", url: internal("/contact", "Contact") },
  ],
  ctaButton: internal("/contact", "Request Demo"),
};

// Keep a reference to `external` so linters don't flag it; handy for adding
// off-site links (docs, social) to the nav or footer later.
export const _linkHelpers = { internal, external };
