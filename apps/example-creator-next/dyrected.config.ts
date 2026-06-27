import { defineCollection, defineGlobal, defineConfig } from "@dyrected/core";

// ─── Auth ─────────────────────────────────────────────────────────────────────

const Users = defineCollection({
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    group: "Administration",
  },
  fields: [
    { name: "name", type: "text", label: "Full Name", required: true },
    {
      name: "role",
      type: "select",
      label: "Role",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Administrator", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      access: {
        update: ({ user }) => (user as Record<string, unknown>)?.["role"] === "admin",
      },
    },
  ],
});

// ─── Globals ──────────────────────────────────────────────────────────────────

const Nav = defineGlobal({
  slug: "nav",
  label: "Navigation Bar",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "brandName",
      type: "text",
      label: "Brand Name",
      required: true,
      defaultValue: "Future You",
    },
    {
      name: "brandSubtitle",
      type: "text",
      label: "Brand Subtitle",
      defaultValue: "Coaching",
    },
    {
      name: "links",
      type: "array",
      label: "Navigation Links",
      admin: {
        description: "Each link must point to a valid page on this site (e.g. /about).",
      },
      fields: [
        { name: "name", type: "text", label: "Label", required: true },
        {
          name: "href",
          type: "text",
          label: "Path (e.g. /about)",
          required: true,
        },
      ],
    },
    {
      name: "dashboardLabel",
      type: "text",
      label: "Dashboard Button Label",
      defaultValue: "Dashboard",
    },
    {
      name: "diagnosticLabel",
      type: "text",
      label: "Diagnostic Button Label",
      defaultValue: "Diagnostic",
    },
  ],
});

const FooterGlobal = defineGlobal({
  slug: "footer",
  label: "Footer",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "tagline",
      type: "text",
      label: "Tagline",
      admin: { description: "Short sentence shown beneath the logo." },
    },
    {
      name: "newsletter",
      type: "object",
      label: "Newsletter Section",
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "description", type: "textarea", label: "Description" },
        {
          name: "successMessage",
          type: "text",
          label: "Confirmation Message",
          admin: { description: "Shown after someone subscribes." },
        },
      ],
    },
    {
      name: "disclaimer",
      type: "textarea",
      label: "Disclaimer",
      admin: { description: "Small print at the very bottom of the page." },
    },
  ],
});

// ─── Home Page global ──────────────────────────────────────────────────────────

const HomePageGlobal = defineGlobal({
  slug: "home-page",
  label: "Home Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "hero",
      type: "object",
      label: "Hero Section",
      fields: [
        {
          name: "badge",
          type: "text",
          label: "Badge Label",
          admin: {
            description: "Short all-caps label inside the small pill above the headline.",
          },
        },
        {
          name: "titlePrefix",
          type: "text",
          label: "Headline — Plain Text",
          required: true,
        },
        {
          name: "titleHighlight",
          type: "text",
          label: "Headline — Highlighted Words",
          required: true,
          admin: { description: "One to three words shown in gradient colour." },
        },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "simulator",
      type: "object",
      label: "Trajectory Simulator Section",
      fields: [
        { name: "title", type: "text", label: "Heading — Plain Text" },
        { name: "titleHighlight", type: "text", label: "Heading — Highlighted Word" },
        { name: "description", type: "textarea", label: "Description Paragraph" },
        { name: "widgetLabel", type: "text", label: "Widget Label" },
        {
          name: "ranges",
          type: "array",
          label: "Slider Ranges",
          admin: {
            description: "Keep exactly 4 ranges. Each covers a portion of the 0–100 slider scale.",
          },
          fields: [
            {
              name: "maxVal",
              type: "number",
              label: "Upper Bound (0–100)",
              required: true,
            },
            { name: "title", type: "text", label: "Range Title", required: true },
            {
              name: "focus",
              type: "text",
              label: 'Daily Focus Figure (e.g. "2.8 hrs/day")',
              required: true,
            },
            {
              name: "finished",
              type: "text",
              label: 'Projects Finished Figure (e.g. "48%")',
              required: true,
            },
            {
              name: "status",
              type: "text",
              label: "Status Label",
              required: true,
              admin: { description: "Two to four words." },
            },
            {
              name: "statusColor",
              type: "text",
              label: "Status Colour Classes",
              admin: {
                description: "Tailwind classes for the badge colour — do not change unless you know Tailwind CSS.",
              },
            },
            {
              name: "comment",
              type: "textarea",
              label: "Comment",
              admin: { description: "One sentence shown inside the widget." },
            },
          ],
        },
      ],
    },
    {
      name: "howItWorks",
      type: "object",
      label: "How It Works Section",
      fields: [
        { name: "title", type: "text", label: "Heading — Plain Text" },
        { name: "titleHighlight", type: "text", label: "Heading — Highlighted Words" },
        { name: "description", type: "textarea", label: "Description Paragraph" },
        {
          name: "steps",
          type: "array",
          label: "Steps",
          admin: { description: "Keep exactly 4 steps." },
          fields: [
            {
              name: "step",
              type: "text",
              label: 'Step Number Label (e.g. "01")',
              required: true,
            },
            { name: "title", type: "text", label: "Step Title", required: true },
            {
              name: "desc",
              type: "textarea",
              label: "Step Description",
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "featuredAssessment",
      type: "object",
      label: "Featured Assessment Callout",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        { name: "title", type: "text", label: "Heading", required: true },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "testimonialsHeader",
      type: "object",
      label: "Testimonials Section Header",
      fields: [
        { name: "title", type: "text", label: "Heading — Plain Text" },
        { name: "titleHighlight", type: "text", label: "Heading — Highlighted Words" },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "finalCta",
      type: "object",
      label: "Final Call to Action",
      fields: [
        { name: "title", type: "text", label: "Headline" },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
  ],
});

// ─── Testimonials collection ───────────────────────────────────────────────────

const Testimonials = defineCollection({
  slug: "testimonials",
  labels: { plural: "Testimonials", singular: "Testimonial" },
  admin: {
    useAsTitle: "author",
    group: "Home Page",
    defaultColumns: ["author", "title", "order", "updatedAt"],
  },
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
  fields: [
    { name: "quote", type: "textarea", label: "Quote", required: true },
    {
      name: "author",
      type: "text",
      label: "Person's Name",
      required: true,
    },
    {
      name: "title",
      type: "text",
      label: 'Person Title (e.g. "Former Excuse Collector")',
      required: true,
      admin: { description: "A short descriptor shown beneath the name." },
    },
    {
      name: "avatar",
      type: "text",
      label: "Initials (2 characters)",
      required: true,
      admin: { description: "Exactly two uppercase letters shown as the avatar." },
    },
    {
      name: "order",
      type: "number",
      label: "Display Order",
      admin: { description: "Lower numbers appear first." },
    },
  ],
});

// ─── About Page global ─────────────────────────────────────────────────────────

const AboutPageGlobal = defineGlobal({
  slug: "about-page",
  label: "About Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "hero",
      type: "object",
      label: "Hero Section",
      fields: [
        {
          name: "titlePrefix",
          type: "text",
          label: "Headline — Plain Text",
          required: true,
        },
        {
          name: "titleHighlight",
          type: "text",
          label: "Headline — Highlighted Words",
          required: true,
        },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "profile",
      type: "object",
      label: "Coach Profile",
      fields: [
        {
          name: "badge",
          type: "text",
          label: 'Badge Label (e.g. "Founder & Lead Coach")',
        },
        { name: "name", type: "text", label: "Coach's Name", required: true },
        { name: "title", type: "text", label: "Job Title" },
        {
          name: "bioParagraph1",
          type: "textarea",
          label: "Biography — Paragraph 1",
          required: true,
        },
        {
          name: "bioParagraph2",
          type: "textarea",
          label: "Biography — Paragraph 2",
        },
        { name: "specialization", type: "text", label: "Specialisation Label" },
        {
          name: "experience",
          type: "text",
          label: 'Experience Figure (e.g. "12,000+ Hours Coached")',
        },
      ],
    },
    {
      name: "valuesHeader",
      type: "object",
      label: "Core Values Section Header",
      fields: [
        { name: "titlePrefix", type: "text", label: "Heading — Plain Text" },
        { name: "titleHighlight", type: "text", label: "Heading — Highlighted Word" },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "faqHeader",
      type: "object",
      label: "FAQ Section Header",
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
  ],
});

// ─── Values collection ─────────────────────────────────────────────────────────

const Values = defineCollection({
  slug: "values",
  labels: { plural: "Core Values", singular: "Core Value" },
  admin: {
    useAsTitle: "title",
    group: "About Page",
    defaultColumns: ["title", "order", "updatedAt"],
  },
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
  fields: [
    {
      name: "icon",
      type: "icon",
      label: "Icon",
      required: true,
      defaultValue: "Compass",
      admin: { description: "Select from the available icon library." },
    },
    { name: "title", type: "text", label: "Value Title", required: true },
    { name: "desc", type: "textarea", label: "Value Description", required: true },
    {
      name: "order",
      type: "number",
      label: "Display Order",
      admin: { description: "Lower numbers appear first." },
    },
  ],
});

// ─── FAQ collection ────────────────────────────────────────────────────────────

const FaqEntries = defineCollection({
  slug: "faq-entries",
  labels: { plural: "FAQ Entries", singular: "FAQ Entry" },
  admin: {
    useAsTitle: "q",
    group: "About Page",
    defaultColumns: ["q", "order", "updatedAt"],
  },
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
  fields: [
    { name: "q", type: "text", label: "Question", required: true },
    { name: "a", type: "textarea", label: "Answer", required: true },
    {
      name: "order",
      type: "number",
      label: "Display Order",
      admin: { description: "Lower numbers appear first." },
    },
  ],
});

// ─── Services collection ───────────────────────────────────────────────────────

const ServicesCollection = defineCollection({
  slug: "services",
  labels: { plural: "Coaching Services", singular: "Coaching Service" },
  admin: {
    useAsTitle: "name",
    group: "Services",
    defaultColumns: ["name", "price", "duration", "order", "updatedAt"],
  },
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
  fields: [
    { name: "name", type: "text", label: "Service Name", required: true },
    {
      name: "serviceId",
      type: "text",
      label: "Service ID",
      required: true,
      unique: true,
      admin: {
        description:
          'A short machine-readable identifier (e.g. "future-alignment"). Do not change after the service goes live.',
      },
    },
    {
      name: "description",
      type: "textarea",
      label: "Service Description",
      required: true,
    },
    {
      name: "price",
      type: "text",
      label: 'Price (e.g. "$149")',
      required: true,
    },
    {
      name: "duration",
      type: "text",
      label: 'Duration (e.g. "60 Minutes")',
      required: true,
    },
    {
      name: "benefits",
      type: "array",
      label: "Benefits",
      admin: {
        description: "Each benefit is one short sentence shown as a bullet point.",
      },
      fields: [{ name: "text", type: "text", label: "Benefit", required: true }],
    },
    {
      name: "order",
      type: "number",
      label: "Display Order",
      admin: { description: "Lower numbers appear first." },
    },
  ],
});

// ─── Services Page global ──────────────────────────────────────────────────────

const ServicesPageGlobal = defineGlobal({
  slug: "services-page",
  label: "Services Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "hero",
      type: "object",
      label: "Hero Section",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        {
          name: "titlePrefix",
          type: "text",
          label: "Heading — Plain Text",
          required: true,
        },
        {
          name: "titleHighlight",
          type: "text",
          label: "Heading — Highlighted Words",
          required: true,
        },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "warningCallout",
      type: "object",
      label: "Warning Callout Banner",
      fields: [
        { name: "title", type: "text", label: "Heading", required: true },
        { name: "description", type: "textarea", label: "Description" },
        { name: "actionLabel", type: "text", label: "Button Label", required: true },
      ],
    },
  ],
});

// ─── Assessment Page global ────────────────────────────────────────────────────

const AssessmentPageGlobal = defineGlobal({
  slug: "assessment-page",
  label: "Assessment Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "badge",
      type: "text",
      label: "Badge Label",
      admin: {
        description: "Short label shown at the top of the assessment card.",
      },
    },
    {
      name: "questions",
      type: "array",
      label: "Assessment Questions",
      admin: {
        description:
          "Each question has a statement and a short comment. The scoring scale is calibrated for 15 questions — significantly more or fewer will require the score thresholds to be reviewed.",
      },
      fields: [
        { name: "text", type: "text", label: "Question Statement", required: true },
        {
          name: "comment",
          type: "text",
          label: "Comment (shown while answering)",
          required: true,
          admin: { description: "One short, lightly humorous sentence." },
        },
      ],
    },
  ],
});

// ─── Assessment Results Page global ───────────────────────────────────────────

const AssessmentResultsPageGlobal = defineGlobal({
  slug: "assessment-results-page",
  label: "Assessment Results Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "header",
      type: "object",
      label: "Page Header",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        { name: "title", type: "text", label: "Page Heading" },
      ],
    },
    {
      name: "saveReport",
      type: "object",
      label: "Save Report Panel",
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
    {
      name: "bookingCta",
      type: "object",
      label: "Booking Call to Action Panel",
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
    {
      name: "categories",
      type: "object",
      label: "Score Categories",
      admin: {
        description: "Four result tiers shown based on the assessment score. Do not remove any tier.",
      },
      fields: [
        {
          name: "CONCERNED",
          type: "object",
          label: "Tier 1 — Concerned (lowest scores)",
          fields: [
            { name: "title", type: "text", label: "Title", required: true },
            {
              name: "summary",
              type: "textarea",
              label: "Summary Paragraph",
              required: true,
            },
            {
              name: "strengths",
              type: "array",
              label: "Strengths (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Strength", required: true }],
            },
            {
              name: "growthOpportunities",
              type: "array",
              label: "Growth Opportunities (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Opportunity", required: true }],
            },
            {
              name: "recommendation",
              type: "textarea",
              label: "Recommendation Sentence",
              required: true,
            },
          ],
        },
        {
          name: "OPTIMISTIC",
          type: "object",
          label: "Tier 2 — Optimistic",
          fields: [
            { name: "title", type: "text", label: "Title", required: true },
            {
              name: "summary",
              type: "textarea",
              label: "Summary Paragraph",
              required: true,
            },
            {
              name: "strengths",
              type: "array",
              label: "Strengths (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Strength", required: true }],
            },
            {
              name: "growthOpportunities",
              type: "array",
              label: "Growth Opportunities (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Opportunity", required: true }],
            },
            {
              name: "recommendation",
              type: "textarea",
              label: "Recommendation Sentence",
              required: true,
            },
          ],
        },
        {
          name: "PROUD",
          type: "object",
          label: "Tier 3 — Proud",
          fields: [
            { name: "title", type: "text", label: "Title", required: true },
            {
              name: "summary",
              type: "textarea",
              label: "Summary Paragraph",
              required: true,
            },
            {
              name: "strengths",
              type: "array",
              label: "Strengths (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Strength", required: true }],
            },
            {
              name: "growthOpportunities",
              type: "array",
              label: "Growth Opportunities (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Opportunity", required: true }],
            },
            {
              name: "recommendation",
              type: "textarea",
              label: "Recommendation Sentence",
              required: true,
            },
          ],
        },
        {
          name: "BRAGGING",
          type: "object",
          label: "Tier 4 — Bragging (highest scores)",
          fields: [
            { name: "title", type: "text", label: "Title", required: true },
            {
              name: "summary",
              type: "textarea",
              label: "Summary Paragraph",
              required: true,
            },
            {
              name: "strengths",
              type: "array",
              label: "Strengths (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Strength", required: true }],
            },
            {
              name: "growthOpportunities",
              type: "array",
              label: "Growth Opportunities (3 bullet points)",
              fields: [{ name: "text", type: "text", label: "Opportunity", required: true }],
            },
            {
              name: "recommendation",
              type: "textarea",
              label: "Recommendation Sentence",
              required: true,
            },
          ],
        },
      ],
    },
  ],
});

// ─── Blog Page global ──────────────────────────────────────────────────────────

const BlogPageGlobal = defineGlobal({
  slug: "blog-page",
  label: "Blog Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "hero",
      type: "object",
      label: "Hero Section",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        {
          name: "titlePrefix",
          type: "text",
          label: "Heading — Plain Text",
          required: true,
        },
        {
          name: "titleHighlight",
          type: "text",
          label: "Heading — Highlighted Words",
          required: true,
        },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
  ],
});

// ─── Articles collection ───────────────────────────────────────────────────────

const Articles = defineCollection({
  slug: "articles",
  labels: { plural: "Blog Articles", singular: "Blog Article" },
  admin: {
    useAsTitle: "title",
    group: "Blog",
    defaultColumns: ["title", "category", "date", "updatedAt"],
  },
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
  },
  fields: [
    { name: "title", type: "text", label: "Title", required: true },
    {
      name: "slug",
      type: "text",
      label: "URL Slug",
      required: true,
      unique: true,
      admin: {
        description:
          'The URL path for this article (e.g. "why-motivation-keeps-ghosting-you"). Set carefully — changing it after publishing will break existing links.',
        hooks: {
          onChange: ({ value, siblingData }: { value: string; siblingData: Record<string, unknown> }) => {
            if (value) return value;
            return ((siblingData?.title as string) || "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
          },
        },
      },
    },
    {
      name: "category",
      type: "text",
      label: "Category",
      required: true,
      admin: {
        description: "e.g. Productivity, Habits, Decision Making, Future Thinking",
      },
    },
    {
      name: "readTime",
      type: "text",
      label: 'Read Time (e.g. "5 min read")',
      required: true,
    },
    {
      name: "date",
      type: "text",
      label: 'Publication Date (e.g. "June 20, 2026")',
      required: true,
    },
    {
      name: "excerpt",
      type: "textarea",
      label: "Excerpt",
      required: true,
      admin: { description: "Short summary shown on the article listing page." },
    },
    {
      name: "content",
      type: "array",
      label: "Article Body",
      admin: { description: "Each item is one paragraph of the article." },
      fields: [{ name: "paragraph", type: "textarea", label: "Paragraph", required: true }],
    },
  ],
});

// ─── Booking Page global ───────────────────────────────────────────────────────

const BookingPageGlobal = defineGlobal({
  slug: "booking-page",
  label: "Booking Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "serviceStep",
      type: "object",
      label: "Step 1 — Choose Service",
      fields: [
        { name: "title", type: "text", label: "Step Heading", required: true },
        { name: "description", type: "textarea", label: "Step Description" },
      ],
    },
    {
      name: "intakeStep",
      type: "object",
      label: "Step 2 — Intake Questionnaire",
      fields: [
        { name: "title", type: "text", label: "Step Heading", required: true },
        { name: "description", type: "textarea", label: "Step Description" },
      ],
    },
    {
      name: "scheduleStep",
      type: "object",
      label: "Step 3 — Schedule Session",
      fields: [
        { name: "title", type: "text", label: "Step Heading", required: true },
        { name: "description", type: "textarea", label: "Step Description" },
        {
          name: "dates",
          type: "array",
          label: "Scheduling Options",
          admin: { description: "Keep exactly 4 scheduling options." },
          fields: [
            {
              name: "label",
              type: "text",
              label: 'Option Label (e.g. "Tomorrow")',
              required: true,
            },
            {
              name: "desc",
              type: "text",
              label: 'Option Description (e.g. "Optimal Portal Alignment")',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "successStep",
      type: "object",
      label: "Step 4 — Booking Confirmed",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        {
          name: "title",
          type: "text",
          label: "Confirmation Heading",
          required: true,
        },
        {
          name: "description",
          type: "textarea",
          label: "Confirmation Description",
          required: true,
        },
        { name: "note", type: "textarea", label: "Additional Note" },
      ],
    },
  ],
});

// ─── Contact Page global ───────────────────────────────────────────────────────

const ContactPageGlobal = defineGlobal({
  slug: "contact-page",
  label: "Contact Page",
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
  fields: [
    {
      name: "hero",
      type: "object",
      label: "Hero Section",
      fields: [
        { name: "badge", type: "text", label: "Badge Label" },
        {
          name: "titlePrefix",
          type: "text",
          label: "Heading — Plain Text",
          required: true,
        },
        {
          name: "titleHighlight",
          type: "text",
          label: "Heading — Highlighted Words",
          required: true,
        },
        { name: "description", type: "textarea", label: "Description Paragraph" },
      ],
    },
    {
      name: "channels",
      type: "array",
      label: "Contact Channels",
      admin: {
        description: "Keep exactly 3 contact channels. Each channel has a title and detail text.",
      },
      fields: [
        {
          name: "icon",
          type: "icon",
          label: "Icon",
          admin: { description: "Select from the available icon library." },
        },
        { name: "title", type: "text", label: "Channel Title", required: true },
        { name: "detail", type: "text", label: "Channel Detail", required: true },
        {
          name: "variant",
          type: "select",
          label: "Style Variant",
          options: [
            { label: "Primary (purple)", value: "primary" },
            { label: "Secondary (green)", value: "secondary" },
            { label: "Muted (grey)", value: "muted" },
          ],
          admin: { description: "Controls the icon colour for this channel." },
        },
      ],
    },
    {
      name: "success",
      type: "object",
      label: "Success Message",
      fields: [
        { name: "title", type: "text", label: "Heading" },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
  ],
});

// ─── Config export ─────────────────────────────────────────────────────────────

export {
  Users,
  Nav,
  FooterGlobal,
  HomePageGlobal,
  Testimonials,
  AboutPageGlobal,
  Values,
  FaqEntries,
  ServicesCollection,
  ServicesPageGlobal,
  AssessmentPageGlobal,
  AssessmentResultsPageGlobal,
  BlogPageGlobal,
  Articles,
  BookingPageGlobal,
  ContactPageGlobal,
};

export default defineConfig({
  collections: [Users, Testimonials, Values, FaqEntries, ServicesCollection, Articles],
  globals: [
    Nav,
    FooterGlobal,
    HomePageGlobal,
    AboutPageGlobal,
    ServicesPageGlobal,
    AssessmentPageGlobal,
    AssessmentResultsPageGlobal,
    BlogPageGlobal,
    BookingPageGlobal,
    ContactPageGlobal,
  ],
});
