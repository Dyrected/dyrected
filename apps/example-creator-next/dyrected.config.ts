import {
  defineArrayField,
  defineBooleanField,
  defineCollection,
  defineConfig,
  defineDateTimeField,
  defineGlobal,
  defineNumberField,
  defineObjectField,
  defineRelationshipField,
  defineSelectField,
  defineTextField,
  defineTextareaField,
  defineView,
  defineAction,
  displaySection,
  displayField,
  displayTabs,
  displayTab,
  displayRepeat,
  displayComputed,
  displayDivider,
  displayText,
} from "@dyrected/core";
import type { Block, Field } from "@dyrected/core";
import { postgresAdapter } from "@dyrected/db-postgres";

import aboutContent from "./src/app/about/about-content.json";
import blogContent from "./src/app/blog/blog-content.json";
import bookingContent from "./src/app/booking/booking-content.json";
import contactContent from "./src/app/contact/contact-content.json";
import homeContent from "./src/app/home-content.json";
import resultsContent from "./src/app/assessment/results/results-content.json";
import servicesContent from "./src/app/services/services-content.json";
import sharedContent from "./src/lib/shared-content.json";
import siteContent from "./src/lib/site-content.json";

const publicRead = "true";
const staffWrite = "user.roles != null && ('owner' in user.roles || 'admin' in user.roles || 'editor' in user.roles)";
const adminOnly = "user.roles != null && ('owner' in user.roles || 'admin' in user.roles)";

const linkFields = [
  defineTextField({ name: "label", label: "Label", required: true }),
  defineTextField({ name: "href", label: "Link URL", required: true }),
] satisfies Field[];

const actionFields = [
  ...linkFields,
  defineSelectField({
    name: "variant",
    label: "Variant",
    options: ["primary", "secondary"],
  }),
] satisfies Field[];

const imageFields = [
  defineRelationshipField({ name: "asset", label: "Media asset", relationTo: "media" }),
  defineTextField({ name: "src", label: "Fallback image path", required: true }),
  defineTextField({ name: "alt", label: "Alt text", required: true }),
] satisfies Field[];

const heroFields = [
  defineTextField({ name: "badge", label: "Badge" }),
  defineTextField({ name: "titlePrefix", label: "Title prefix", required: true }),
  defineTextField({ name: "titleHighlight", label: "Title highlight", required: true }),
  defineTextareaField({ name: "description", label: "Description", required: true }),
  defineObjectField({ name: "image", label: "Image", fields: imageFields }),
  defineArrayField({ name: "actions", label: "Actions", fields: actionFields }),
] satisfies Field[];

const ctaFields = [
  defineTextField({ name: "title", label: "Title", required: true }),
  defineTextareaField({ name: "description", label: "Description", required: true }),
  defineArrayField({ name: "actions", label: "Actions", fields: actionFields }),
] satisfies Field[];

const SimulatorBlock = {
  slug: "timelineSimulator",
  labels: { singular: "Timeline simulator", plural: "Timeline simulators" },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "titleHighlight", label: "Title highlight", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "widgetLabel", label: "Widget label", type: "text", required: true },
    { name: "scoreLabel", label: "Score label", type: "text", required: true },
    {
      name: "sliderLabels",
      label: "Slider labels",
      type: "array",
      fields: [{ name: "label", label: "Label", type: "text", required: true }],
    },
    {
      name: "statLabels",
      label: "Stat labels",
      type: "array",
      fields: [{ name: "label", label: "Label", type: "text", required: true }],
    },
    {
      name: "ranges",
      label: "Ranges",
      type: "array",
      fields: [
        { name: "maxVal", label: "Maximum value", type: "number", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "focus", label: "Daily focus", type: "text", required: true },
        { name: "finished", label: "Projects done", type: "text", required: true },
        { name: "status", label: "Status", type: "text", required: true },
        { name: "statusColor", label: "Status color classes", type: "text", required: true },
        { name: "comment", label: "Comment", type: "textarea", required: true },
      ],
    },
  ],
} satisfies Block;

const StepsBlock = {
  slug: "steps",
  labels: { singular: "Steps", plural: "Steps" },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "titleHighlight", label: "Title highlight", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "steps",
      label: "Steps",
      type: "array",
      fields: [
        { name: "step", label: "Step number", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "desc", label: "Description", type: "textarea", required: true },
      ],
    },
  ],
} satisfies Block;

const FeaturedAssessmentBlock = {
  slug: "featuredAssessment",
  labels: { singular: "Featured assessment", plural: "Featured assessments" },
  fields: [
    { name: "badge", label: "Badge", type: "text", required: true },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "action", label: "Action", type: "object", fields: linkFields },
  ],
} satisfies Block;

const TestimonialsBlock = {
  slug: "testimonials",
  labels: { singular: "Testimonials", plural: "Testimonials" },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "titleHighlight", label: "Title highlight", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "list",
      label: "Testimonials",
      type: "array",
      fields: [
        { name: "quote", label: "Quote", type: "textarea", required: true },
        { name: "author", label: "Author", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "avatar", label: "Avatar initials", type: "text", required: true },
      ],
    },
  ],
} satisfies Block;

const ProfileBlock = {
  slug: "profile",
  labels: { singular: "Profile", plural: "Profiles" },
  fields: [
    { name: "badge", label: "Badge", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "image", label: "Image", type: "object", fields: imageFields },
    {
      name: "bioParagraphs",
      label: "Bio paragraphs",
      type: "array",
      fields: [{ name: "text", label: "Text", type: "textarea", required: true }],
    },
    { name: "specialization", label: "Specialization", type: "text", required: true },
    { name: "experience", label: "Experience", type: "text", required: true },
  ],
} satisfies Block;

const ValuesBlock = {
  slug: "values",
  labels: { singular: "Values", plural: "Values" },
  fields: [
    { name: "titlePrefix", label: "Title prefix", type: "text", required: true },
    { name: "titleHighlight", label: "Title highlight", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "list",
      label: "Values",
      type: "array",
      fields: [
        { name: "icon", label: "Icon", type: "icon", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "desc", label: "Description", type: "textarea", required: true },
      ],
    },
  ],
} satisfies Block;

const FaqBlock = {
  slug: "faq",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "list",
      label: "Questions",
      type: "array",
      fields: [
        { name: "q", label: "Question", type: "text", required: true },
        { name: "a", label: "Answer", type: "textarea", required: true },
      ],
    },
  ],
} satisfies Block;

const ServiceCopyBlock = {
  slug: "serviceCopy",
  labels: { singular: "Service copy", plural: "Service copy" },
  fields: [
    {
      name: "serviceGrid",
      label: "Service grid",
      type: "object",
      fields: [
        { name: "popularLabel", label: "Popular label", type: "text", required: true },
        { name: "priceSuffix", label: "Price suffix", type: "text", required: true },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
      ],
    },
    {
      name: "warningCallout",
      label: "Warning callout",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
        { name: "href", label: "Link URL", type: "text", required: true },
      ],
    },
  ],
} satisfies Block;

const ContactBlock = {
  slug: "contact",
  labels: { singular: "Contact content", plural: "Contact content" },
  fields: [
    {
      name: "channelsIntro",
      label: "Channels intro",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
      ],
    },
    {
      name: "channels",
      label: "Channels",
      type: "array",
      fields: [
        { name: "icon", label: "Icon", type: "icon", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "detail", label: "Detail", type: "textarea", required: true },
        {
          name: "variant",
          label: "Variant",
          type: "select",
          options: ["primary", "secondary", "muted"],
          required: true,
        },
      ],
    },
    {
      name: "subjectOptions",
      label: "Subject options",
      type: "array",
      fields: [{ name: "option", label: "Option", type: "text", required: true }],
    },
    {
      name: "success",
      label: "Success message",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
      ],
    },
  ],
} satisfies Block;

const BookingBlock = {
  slug: "booking",
  labels: { singular: "Booking content", plural: "Booking content" },
  fields: [
    {
      name: "serviceStep",
      label: "Service step",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
      ],
    },
    {
      name: "intakeStep",
      label: "Intake step",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        {
          name: "fields",
          label: "Fields",
          type: "array",
          fields: [
            { name: "key", label: "Key", type: "text", required: true },
            { name: "label", label: "Label", type: "text", required: true },
            { name: "placeholder", label: "Placeholder", type: "textarea", required: true },
          ],
        },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
      ],
    },
    {
      name: "scheduleStep",
      label: "Schedule step",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        {
          name: "dates",
          label: "Dates",
          type: "array",
          fields: [
            { name: "label", label: "Label", type: "text", required: true },
            { name: "desc", label: "Description", type: "text", required: true },
          ],
        },
        {
          name: "times",
          label: "Times",
          type: "array",
          fields: [{ name: "time", label: "Time", type: "text", required: true }],
        },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
      ],
    },
    {
      name: "successStep",
      label: "Success step",
      type: "object",
      fields: [
        { name: "badge", label: "Badge", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "note", label: "Note", type: "textarea", required: true },
        { name: "actions", label: "Actions", type: "array", fields: actionFields },
      ],
    },
  ],
} satisfies Block;

const AssessmentResultsBlock = {
  slug: "assessmentResults",
  labels: { singular: "Assessment results content", plural: "Assessment results content" },
  fields: [
    {
      name: "header",
      label: "Header",
      type: "object",
      fields: [
        { name: "badge", label: "Badge", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
      ],
    },
    {
      name: "saveReport",
      label: "Save report",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
      ],
    },
    {
      name: "bookingCta",
      label: "Booking call to action",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "actionLabel", label: "Action label", type: "text", required: true },
        { name: "href", label: "Link URL", type: "text", required: true },
      ],
    },
  ],
} satisfies Block;

const FinalCtaBlock = {
  slug: "finalCta",
  labels: { singular: "Final call to action", plural: "Final calls to action" },
  fields: ctaFields,
} satisfies Block;

const richTextFromHtml = (html: string) => ({
  type: "doc",
  content: Array.from(html.matchAll(/<p>(.*?)<\/p>/g)).map((match) => ({
    type: "paragraph",
    content: [{ type: "text", text: match[1].replace(/&mdash;/g, "—") }],
  })),
});

const normalizeStringArray = (items: string[], key: string) => items.map((item) => ({ [key]: item }));

const Admins = defineCollection({
  slug: "__admins",
  labels: { singular: "Admin", plural: "Admins" },
  auth: true,
  admin: {
    useAsTitle: "name",
  },
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "roles",
      label: "Roles",
      type: "multiSelect",
      options: ["owner", "admin", "editor"],
      required: true,
    },
  ],
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
});

const Media = defineCollection({
  slug: "media",
  labels: { singular: "Media item", plural: "Media" },
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  },
  fields: [
    { name: "alt", label: "Alt text", type: "text", required: true },
    { name: "caption", label: "Caption", type: "textarea" },
  ],
  access: {
    read: publicRead,
    create: staffWrite,
    update: staffWrite,
    delete: adminOnly,
  },
});

const SiteSettings = defineGlobal({
  slug: "site-settings",
  label: "Site settings",
  fields: [
    {
      name: "seo",
      label: "SEO defaults",
      type: "object",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
      ],
    },
    {
      name: "brand",
      label: "Brand",
      type: "object",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "descriptor", label: "Descriptor", type: "text", required: true },
      ],
    },
    {
      name: "navigation",
      label: "Navigation",
      type: "object",
      fields: [
        { name: "links", label: "Links", type: "array", fields: linkFields },
        { name: "dashboardLabel", label: "Dashboard label", type: "text", required: true },
        { name: "diagnosticLabel", label: "Diagnostic label", type: "text", required: true },
        { name: "mobileAssessmentLabel", label: "Mobile assessment label", type: "text", required: true },
      ],
    },
    {
      name: "footer",
      label: "Footer",
      type: "object",
      fields: [
        { name: "tagline", label: "Tagline", type: "textarea", required: true },
        { name: "socialLinks", label: "Social links", type: "array", fields: linkFields },
        {
          name: "linkGroups",
          label: "Link groups",
          type: "array",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "links", label: "Links", type: "array", fields: linkFields },
          ],
        },
        {
          name: "newsletter",
          label: "Newsletter",
          type: "object",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "description", label: "Description", type: "textarea", required: true },
            { name: "placeholder", label: "Placeholder", type: "text", required: true },
            { name: "successMessage", label: "Success message", type: "textarea", required: true },
          ],
        },
        { name: "copyright", label: "Copyright", type: "text", required: true },
        { name: "disclaimer", label: "Disclaimer", type: "textarea", required: true },
      ],
    },
  ],
  initialData: siteContent,
  detail: [
    displayComputed("Header links", "count(doc.navigation.links)", { span: 6 }),
    displayComputed("Footer links", "count(doc.footer.socialLinks)", { span: 6 }),
    displayTabs([
      displayTab(
        "Brand & SEO",
        [
          displaySection("Brand Identity", [
            displayField("brand.name", { span: 6 }),
            displayField("brand.descriptor", { span: 6 }),
          ]),
          displaySection("Search Engine Optimization", [
            displayField("seo.title", { span: 12 }),
            displayField("seo.description", { span: 12 }),
          ]),
        ],
        { icon: "Globe" },
      ),
      displayTab(
        "Navigation",
        [
          displaySection("Header Navigation", [
            displayField("navigation.dashboardLabel", { span: 4 }),
            displayField("navigation.diagnosticLabel", { span: 4 }),
            displayField("navigation.mobileAssessmentLabel", { span: 4 }),
            displayRepeat("navigation.links", [displayField("href", { hideLabel: true })], {
              span: 12,
              layout: "cards",
              titleField: "label",
              columns: 4,
            }),
          ]),
        ],
        { icon: "Compass" },
      ),
      displayTab(
        "Footer & Legal",
        [
          displaySection("Footer Content", [
            displayField("footer.tagline", { span: 12 }),
            displayField("footer.copyright", { span: 6 }),
            displayField("footer.disclaimer", { span: 6 }),
          ]),
          displaySection("Footer Links & Newsletter", [
            displayField("footer.socialLinks", { span: 6 }),
            displayField("footer.linkGroups", { span: 6 }),
            displayField("footer.newsletter", { span: 12 }),
          ]),
        ],
        { icon: "FileText" },
      ),
    ]),
  ],
  access: {
    read: () => true,
    update: ({ user }) =>
      Boolean(user?.roles?.some((role) => role === "admin" || role === "editor" || role === "owner")),
  },
});

const Pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  admin: {
    useAsTitle: "title",
  },
  detail: false,
  /*[
    displayField("slug", { span: 6, display: "copyable" }),
    displaySection(
      "Hero Section",
      [
        displayField("hero.badge", { span: 4, display: "badge" }),
        displayField("hero.titlePrefix", { span: 4 }),
        displayField("hero.titleHighlight", { span: 4 }),
        displayField("hero.description", { span: 12 }),
      ],
      { span: 12 },
    ),
    displaySection("Layout Blocks", [displayField("layout", { span: 12 })], { span: 12 }),
    displayComputed("totalBlocks", "count(doc.layout)"),
  ]*/
  fields: [
    { name: "slug", label: "Slug", type: "text", required: true, unique: true },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "hero", label: "Hero", type: "object", fields: heroFields },
    {
      name: "layout",
      label: "Layout",
      type: "blocks",
      blocks: [
        SimulatorBlock,
        StepsBlock,
        FeaturedAssessmentBlock,
        TestimonialsBlock,
        FinalCtaBlock,
        ProfileBlock,
        ValuesBlock,
        FaqBlock,
        ServiceCopyBlock,
        ContactBlock,
        BookingBlock,
        AssessmentResultsBlock,
      ],
    },
  ],
  initialData: [
    {
      slug: "home",
      title: "Home",
      hero: homeContent.hero,
      layout: [
        {
          blockType: "timelineSimulator",
          ...homeContent.simulator,
          sliderLabels: normalizeStringArray(homeContent.simulator.sliderLabels, "label"),
          statLabels: normalizeStringArray(homeContent.simulator.statLabels, "label"),
        },
        { blockType: "steps", ...homeContent.howItWorks },
        { blockType: "featuredAssessment", ...homeContent.featuredAssessment },
        { blockType: "testimonials", ...homeContent.testimonials },
        { blockType: "finalCta", ...homeContent.finalCta },
      ],
    },
    {
      slug: "about",
      title: "About",
      hero: aboutContent.hero,
      layout: [
        {
          blockType: "profile",
          ...aboutContent.profile,
          bioParagraphs: normalizeStringArray(aboutContent.profile.bioParagraphs, "text"),
        },
        { blockType: "values", ...aboutContent.values },
        { blockType: "faq", ...aboutContent.faq },
      ],
    },
    {
      slug: "services",
      title: "Services",
      hero: servicesContent.hero,
      layout: [
        {
          blockType: "serviceCopy",
          serviceGrid: servicesContent.serviceGrid,
          warningCallout: servicesContent.warningCallout,
        },
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      hero: contactContent.hero,
      layout: [
        {
          blockType: "contact",
          ...contactContent,
          subjectOptions: normalizeStringArray(contactContent.subjectOptions, "option"),
        },
      ],
    },
    {
      slug: "booking",
      title: "Booking",
      hero: { titlePrefix: "Book", titleHighlight: "Alignment", description: bookingContent.serviceStep.description },
      layout: [
        {
          blockType: "booking",
          ...bookingContent,
          scheduleStep: {
            ...bookingContent.scheduleStep,
            times: normalizeStringArray(bookingContent.scheduleStep.times, "time"),
          },
        },
      ],
    },
    {
      slug: "assessment-results",
      title: "Assessment Results",
      hero: {
        titlePrefix: "Assessment",
        titleHighlight: "Results",
        description: resultsContent.bookingCta.description,
      },
      layout: [{ blockType: "assessmentResults", ...resultsContent }],
    },
  ],
  access: {
    read: publicRead,
    create: staffWrite,
    update: staffWrite,
    delete: adminOnly,
  },
});

const Services = defineCollection({
  slug: "services",
  labels: { singular: "Service", plural: "Services" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "duration", "id"],
  },
  detail: [
    displaySection(
      "Service Overview",
      [
        displayField("name", { span: 8 }),
        displayField("price", { span: 2, display: "badge" }),
        displayField("duration", { span: 2, display: "badge" }),
        displayField("id", { span: 12, display: "copyable" }),
        displayField("description", { span: 12 }),
      ],
      { span: 8 },
    ),
    displaySection(
      "Benefits & Highlights",
      [displayRepeat("benefits", [displayField("benefit", { hideLabel: true })], { layout: "list" })],
      { span: 4 },
    ),
    displayComputed("benefitsCount", "count(doc.benefits)"),
  ],
  fields: [
    { name: "id", label: "Service ID", type: "text", required: true, unique: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "benefits",
      label: "Benefits",
      type: "array",
      fields: [{ name: "benefit", label: "Benefit", type: "textarea", required: true }],
    },
    { name: "duration", label: "Duration", type: "text", required: true },
    { name: "price", label: "Price", type: "text", required: true },
  ],
  initialData: sharedContent.services.map((service) => ({
    ...service,
    benefits: normalizeStringArray(service.benefits, "benefit"),
  })),
  access: {
    read: publicRead,
    create: staffWrite,
    update: staffWrite,
    delete: adminOnly,
  },
});

const BlogArticles = defineCollection({
  slug: "blog-articles",
  labels: { singular: "Blog article", plural: "Blog articles" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "date", "category", "readTime"],
  },
  detail: [
    displayField("title", { span: 12 }),
    displayField("slug", { span: 6, display: "copyable" }),
    displayField("date", { span: 6 }),
    displayField("category", { span: 6, display: "badge" }),
    displayField("readTime", { span: 6, display: "badge" }),
    displayField("excerpt", { span: 12 }),
    displaySection("Content Body", [displayField("body", { span: 12 })], { span: 12 }),
  ],
  fields: [
    { name: "slug", label: "Slug", type: "text", required: true, unique: true },
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: blogContent.categories.filter((category) => category !== "All"),
      required: true,
    },
    { name: "readTime", label: "Read time", type: "text", required: true },
    { name: "date", label: "Display date", type: "text", required: true },
    { name: "excerpt", label: "Excerpt", type: "textarea", required: true },
    { name: "body", label: "Body", type: "richText", required: true },
  ],
  initialData: blogContent.articles.map(({ bodyHtml, ...article }) => ({
    ...article,
    body: richTextFromHtml(bodyHtml),
  })),
  access: {
    read: publicRead,
    create: staffWrite,
    update: staffWrite,
    delete: adminOnly,
  },
});

const AssessmentCategories = defineGlobal({
  slug: "assessment-categories",
  label: "Assessment categories",
  detail: [
    displayComputed("Total categories", "count(doc.categories)", { span: 6 }),
    displayComputed("Dummy stat", "'No data'", { span: 6 }),
    displayDivider({ spacing: "md" }),
    displayText("Category Breakdown", { variant: "heading" }),
    displayText("Review performance metrics and feedback across all categories.", { variant: "muted" }),

    displayRepeat(
      "categories",
      [
        displayField("key", { hideLabel: false, span: 4, display: "badge" }),
        // displayField("title", { span: 8 }),
        displayField("summary", { span: 12 }),
        displayField("range", { span: 12, label: "Range" }),
        displayField("strengths", { span: 12, label: "Strengths" }),
        displayField("growthOpportunities", { span: 12, label: "Growth Opportunities" }),
        displayField("recommendation", { span: 12, hideLabel: false }),
      ],
      {
        span: 12,
        layout: "cards",
        useAsTitle: "title",
        icon: "Folder",
      },
    ),
  ],
  fields: [
    {
      name: "categories",
      label: "Categories",
      type: "array",
      fields: [
        { name: "key", label: "Key", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        {
          name: "range",
          label: "Range",
          type: "array",
          fields: [{ name: "value", label: "Value", type: "number", required: true }],
        },
        { name: "summary", label: "Summary", type: "textarea", required: true },
        {
          name: "strengths",
          label: "Strengths",
          type: "array",
          fields: [{ name: "strength", label: "Strength", type: "text", required: true }],
        },
        {
          name: "growthOpportunities",
          label: "Growth opportunities",
          type: "array",
          fields: [{ name: "opportunity", label: "Opportunity", type: "text", required: true }],
        },
        { name: "recommendation", label: "Recommendation", type: "textarea", required: true },
      ],
    },
  ],
  initialData: {
    categories: Object.entries(sharedContent.categories).map(([key, category]) => ({
      key,
      ...category,
      range: category.range.map((value) => ({ value })),
      strengths: normalizeStringArray(category.strengths, "strength"),
      growthOpportunities: normalizeStringArray(category.growthOpportunities, "opportunity"),
    })),
  },
  access: {
    read: () => true,
    update: ({ user }) =>
      Boolean(user?.roles?.some((role) => role === "admin" || role === "editor" || role === "owner")),
  },
});

// ── Operational Views: Guest Responses ──────────────────────────────────────
// Exercises every view layout, action shape, and metric scenario from
// specs/TODO-2026-08-17/operational-views.md against real data.

const checkInAction = defineAction({
  name: "checkIn",
  label: "Check In",
  icon: "UserCheck",
  type: "row",
  confirm: "Confirm guest check-in at the door?",
  mutation: {
    checkedIn: true,
    checkedInAt: "now()",
  },
});

const undoCheckInAction = defineAction({
  name: "undoCheckIn",
  label: "Undo Check-In",
  icon: "UserX",
  type: "row",
  mutation: {
    checkedIn: false,
    checkedInAt: null,
  },
});

const assignTableAction = defineAction({
  name: "assignTable",
  label: "Assign Table",
  icon: "Table2",
  type: "row",
  fields: [
    defineNumberField({ name: "tableNumber", label: "Table Number", required: true }),
    defineTextField({ name: "notes", label: "Seating Notes" }),
  ],
  mutation: {
    tableNumber: "input.tableNumber",
    seatingNotes: "input.notes",
  },
});

const markPaidAction = defineAction({
  name: "markPaid",
  label: "Mark Paid",
  icon: "CreditCard",
  type: "row",
  fields: [defineSelectField({ name: "method", label: "Payment Method", options: ["transfer", "cash", "card"] })],
  mutation: {
    asoebiStatus: "paid",
    asoebiPaidAt: "now()",
  },
});

const markCollectedAction = defineAction({
  name: "markCollected",
  label: "Mark Collected",
  icon: "PackageCheck",
  type: "row",
  mutation: {
    asoebiStatus: "collected",
    asoebiCollectedAt: "now()",
  },
});

const markSelectedPaidAction = defineAction({
  name: "markSelectedPaid",
  label: "Mark Paid",
  icon: "CreditCard",
  type: "bulk",
  mutation: {
    asoebiStatus: "paid",
    asoebiPaidAt: "now()",
  },
});

const sendReminderAction = defineAction({
  name: "sendReminder",
  label: "Send Reminders",
  icon: "BellRing",
  type: "header",
  confirm: "Send a payment reminder to everyone still in `requested`?",
  mutation: {
    remindedAt: "now()",
  },
});

const inDays = (days: number, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const GuestResponses = defineCollection({
  slug: "guest-responses",
  labels: { singular: "Guest response", plural: "Guest Responses" },
  admin: {
    useAsTitle: "name",
    icon: "Users",
  },
  fields: [
    defineTextField({ name: "name", label: "Full Name", required: true }),
    defineTextField({ name: "email", label: "Email" }),
    defineBooleanField({ name: "attending", label: "Attending" }),
    defineNumberField({ name: "guestCount", label: "Plus-Ones", defaultValue: 0 }),
    defineNumberField({ name: "tableNumber", label: "Table Number" }),
    defineBooleanField({ name: "checkedIn", label: "Checked In", defaultValue: false }),
    defineDateTimeField({ name: "checkedInAt", label: "Checked In At" }),

    // Asoebi (outfit) details
    defineBooleanField({ name: "asoebi", label: "Wants Asoebi" }),
    defineSelectField({
      name: "asoebiStatus",
      label: "Asoebi Status",
      options: ["requested", "paid", "collected"],
      defaultValue: "requested",
    }),
    defineSelectField({
      name: "asoebiSize",
      label: "Asoebi Size",
      options: ["S", "M", "L", "XL", "XXL"],
    }),
    defineNumberField({ name: "asoebiQuantity", label: "Quantity", defaultValue: 1 }),

    // Appointments & notes
    defineDateTimeField({ name: "appointmentDate", label: "Tasting Date" }),
    defineTextareaField({ name: "wellWishes", label: "Well Wishes" }),
  ],
  views: [
    // 1. Table layout for door check-in
    defineView({
      slug: "attending-guests",
      label: "Attending Guests",
      icon: "UserCheck",
      layout: "table",
      filter: { attending: { equals: true } },
      columns: ["name", "email", "guestCount", "tableNumber", "checkedIn"],
      sort: { field: "name", direction: "asc" },
      actions: [checkInAction, undoCheckInAction, assignTableAction, markSelectedPaidAction, sendReminderAction],
      metrics: [
        {
          label: "Attending Guests",
          color: "purple",
          unit: "Headcount",
          aggregates: {
            leads: { count: "*", where: { attending: { equals: true } } },
            plusOnes: { sum: "guestCount", cast: "number", where: { attending: { equals: true } } },
          },
          expression: "aggregates.leads + aggregates.plusOnes",
          subMetrics: [
            { label: "Leads", aggregate: { count: "*", where: { attending: { equals: true } } } },
            {
              label: "Plus-Ones",
              aggregate: { sum: "guestCount", cast: "number", where: { attending: { equals: true } } },
            },
          ],
        },
        {
          label: "Door Check-In",
          color: "emerald",
          unit: "Checked In",
          aggregate: { count: "*", where: { attending: { equals: true }, checkedIn: { equals: true } } },
          subMetrics: [
            {
              label: "Pending",
              aggregates: {
                totalAttending: { count: "*", where: { attending: { equals: true } } },
                totalCheckedIn: { count: "*", where: { attending: { equals: true }, checkedIn: { equals: true } } },
              },
              expression: "aggregates.totalAttending - aggregates.totalCheckedIn",
            },
            {
              label: "Rate",
              aggregates: {
                totalAttending: { count: "*", where: { attending: { equals: true } } },
                totalCheckedIn: { count: "*", where: { attending: { equals: true }, checkedIn: { equals: true } } },
              },
              expression: "math.round((aggregates.totalCheckedIn / aggregates.totalAttending) * 100, 0)",
              format: "percent",
            },
          ],
        },
        {
          label: "Asoebi Orders",
          color: "amber",
          unit: "Requests",
          aggregate: { count: "*", where: { asoebi: { equals: true } } },
          subMetrics: [
            { label: "Paid", aggregate: { count: "*", where: { asoebiStatus: { in: ["paid", "collected"] } } } },
            { label: "Unpaid", aggregate: { count: "*", where: { asoebiStatus: { equals: "requested" } } } },
          ],
        },
        {
          label: "Total Asoebi Revenue",
          color: "rose",
          format: "currency",
          currency: "NGN",
          aggregate: {
            sum: "asoebiQuantity",
            cast: "number",
            where: { asoebiStatus: { in: ["paid", "collected"] } },
          },
          transform: "value * 25000",
          subMetrics: [
            {
              label: "Collected",
              format: "currency",
              currency: "NGN",
              aggregate: { sum: "asoebiQuantity", cast: "number", where: { asoebiStatus: { equals: "collected" } } },
              transform: "value * 25000",
            },
            {
              label: "Pending",
              format: "currency",
              currency: "NGN",
              aggregate: { sum: "asoebiQuantity", cast: "number", where: { asoebiStatus: { equals: "paid" } } },
              transform: "value * 25000",
            },
          ],
        },
      ],
    }),

    // 2. Kanban board for outfit fulfillment
    defineView({
      slug: "asoebi-pipeline",
      label: "Asoebi Fulfillment",
      icon: "Shirt",
      layout: "kanban",
      filter: { asoebi: { equals: true } },
      groupBy: "asoebiStatus",
      columns: ["name", "asoebiSize", "asoebiQuantity"],
      actions: [markPaidAction, markCollectedAction],
      metrics: [
        {
          label: "Total Orders",
          color: "purple",
          unit: "Outfits",
          aggregate: { count: "*", where: { asoebi: { equals: true } } },
          subMetrics: [
            { label: "Requested", aggregate: { count: "*", where: { asoebiStatus: { equals: "requested" } } } },
            { label: "Ready", aggregate: { count: "*", where: { asoebiStatus: { equals: "ready" } } } },
          ],
        },
        {
          label: "Paid & Collected",
          color: "emerald",
          unit: "Completed",
          aggregate: {
            count: "*",
            where: { asoebiStatus: { in: ["paid", "collected"] } },
          },
          subMetrics: [
            { label: "Paid", aggregate: { count: "*", where: { asoebiStatus: { equals: "paid" } } } },
            { label: "Collected", aggregate: { count: "*", where: { asoebiStatus: { equals: "collected" } } } },
          ],
        },
        {
          label: "Asoebi Revenue",
          color: "rose",
          format: "currency",
          currency: "NGN",
          aggregate: {
            sum: "asoebiQuantity",
            cast: "number",
            where: { asoebiStatus: { in: ["paid", "collected"] } },
          },
          transform: "value * 25000",
          subMetrics: [
            {
              label: "Total Units",
              aggregate: { sum: "asoebiQuantity", cast: "number", where: { asoebi: { equals: true } } },
            },
            {
              label: "Price / Unit",
              format: "currency",
              currency: "NGN",
              aggregate: { count: "*" },
              transform: "25000",
            },
          ],
        },
      ],
    }),

    // 3. Calendar layout for tasting appointments
    defineView({
      slug: "tasting-schedule",
      label: "Tasting Schedule",
      icon: "Calendar",
      layout: "calendar",
      dateField: "appointmentDate",
      columns: ["name", "guestCount", "asoebiSize"],
      actions: [assignTableAction],
    }),

    // 4. Cards gallery for the full guest directory
    defineView({
      slug: "guest-directory",
      label: "Guest Directory",
      icon: "LayoutGrid",
      layout: "cards",
      columns: ["name", "email", "attending", "asoebiSize", "tableNumber"],
      actions: [checkInAction],
      metrics: [
        {
          label: "All Responses",
          color: "blue",
          unit: "Submissions",
          aggregate: { count: "*" },
          subMetrics: [
            { label: "Attending", aggregate: { count: "*", where: { attending: { equals: true } } } },
            { label: "Declined", aggregate: { count: "*", where: { attending: { equals: false } } } },
          ],
        },
        {
          label: "Confirmed Guests",
          color: "emerald",
          unit: "Attending",
          aggregate: { count: "*", where: { attending: { equals: true } } },
          subMetrics: [
            { label: "Checked In", aggregate: { count: "*", where: { checkedIn: { equals: true } } } },
            { label: "With Plus-Ones", aggregate: { count: "*", where: { guestCount: { greater_than: 0 } } } },
          ],
        },
        {
          label: "Asoebi Supporters",
          color: "amber",
          unit: "Orders",
          aggregate: { count: "*", where: { asoebi: { equals: true } } },
          subMetrics: [
            { label: "Paid", aggregate: { count: "*", where: { asoebiStatus: { in: ["paid", "collected"] } } } },
            { label: "Pending", aggregate: { count: "*", where: { asoebiStatus: { equals: "requested" } } } },
          ],
        },
      ],
    }),
  ],
  initialData: [
    {
      name: "Tunde Bakare",
      email: "tunde@example.com",
      attending: true,
      guestCount: 2,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "L",
      asoebiQuantity: 1,
      appointmentDate: null,
      wellWishes: "Congratulations!",
    },
    {
      name: "Amaka Obi",
      email: "amaka@example.com",
      attending: true,
      guestCount: 1,
      tableNumber: 3,
      checkedIn: true,
      asoebi: true,
      asoebiStatus: "paid",
      asoebiSize: "M",
      asoebiQuantity: 2,
      appointmentDate: inDays(2),
      wellWishes: "Wishing you both forever joy.",
    },
    {
      name: "Sade Adu",
      email: "sade@example.com",
      attending: true,
      guestCount: 0,
      tableNumber: 5,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "paid",
      asoebiSize: "S",
      asoebiQuantity: 1,
      appointmentDate: inDays(4),
      wellWishes: "",
    },
    {
      name: "Femi Kuti",
      email: "femi@example.com",
      attending: true,
      guestCount: 3,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "collected",
      asoebiSize: "XL",
      asoebiQuantity: 1,
      appointmentDate: inDays(-1, 11),
      wellWishes: "Two become one!",
    },
    {
      name: "Bisi Johnson",
      email: "bisi@example.com",
      attending: true,
      guestCount: 1,
      checkedIn: false,
      asoebi: false,
      asoebiStatus: null,
      asoebiSize: null,
      asoebiQuantity: 0,
      appointmentDate: inDays(6, 13),
      wellWishes: "",
    },
    {
      name: "Kelechi Nwosu",
      email: "kelechi@example.com",
      attending: false,
      guestCount: 0,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "XXL",
      asoebiQuantity: 1,
      appointmentDate: null,
      wellWishes: "Sorry to miss it.",
    },
    {
      name: "Ngozi Eze",
      email: "ngozi@example.com",
      attending: true,
      guestCount: 2,
      tableNumber: 3,
      checkedIn: true,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "M",
      asoebiQuantity: 2,
      appointmentDate: inDays(9, 16),
      wellWishes: "",
    },
    {
      name: "Dapo Ogunlesi",
      email: "dapo@example.com",
      attending: false,
      guestCount: 0,
      checkedIn: false,
      asoebi: false,
      asoebiStatus: null,
      asoebiSize: null,
      asoebiQuantity: 0,
      appointmentDate: null,
      wellWishes: "",
    },
    {
      name: "Saheed Bakare",
      email: "saheed@example.com",
      attending: true,
      guestCount: 2,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "L",
      asoebiQuantity: 1,
      appointmentDate: null,
      wellWishes: "Congratulations!",
    },
    {
      name: "Chichi Obi",
      email: "chichi@example.com",
      attending: true,
      guestCount: 1,
      tableNumber: 3,
      checkedIn: true,
      asoebi: true,
      asoebiStatus: "paid",
      asoebiSize: "M",
      asoebiQuantity: 2,
      appointmentDate: inDays(2),
      wellWishes: "Wishing you both forever joy.",
    },
    {
      name: "Bolu Adu",
      email: "bolu@example.com",
      attending: true,
      guestCount: 0,
      tableNumber: 5,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "paid",
      asoebiSize: "S",
      asoebiQuantity: 1,
      appointmentDate: inDays(4),
      wellWishes: "",
    },
    {
      name: "Abiola Kuti",
      email: "abiola@example.com",
      attending: true,
      guestCount: 3,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "collected",
      asoebiSize: "XL",
      asoebiQuantity: 1,
      appointmentDate: inDays(-1, 11),
      wellWishes: "Two become one!",
    },
    {
      name: "Sarah Johnson",
      email: "sarah@example.com",
      attending: true,
      guestCount: 1,
      checkedIn: false,
      asoebi: false,
      asoebiStatus: null,
      asoebiSize: null,
      asoebiQuantity: 0,
      appointmentDate: inDays(6, 13),
      wellWishes: "",
    },
    {
      name: "Maureen Nwosu",
      email: "maureen@example.com",
      attending: false,
      guestCount: 0,
      checkedIn: false,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "XXL",
      asoebiQuantity: 1,
      appointmentDate: null,
      wellWishes: "Sorry to miss it.",
    },
    {
      name: "Frannie Eze",
      email: "frannie@example.com",
      attending: true,
      guestCount: 2,
      tableNumber: 3,
      checkedIn: true,
      asoebi: true,
      asoebiStatus: "requested",
      asoebiSize: "M",
      asoebiQuantity: 2,
      appointmentDate: inDays(9, 16),
      wellWishes: "",
    },
    {
      name: "Mary Ogunlesi",
      email: "mary@example.com",
      attending: false,
      guestCount: 0,
      checkedIn: false,
      asoebi: false,
      asoebiStatus: null,
      asoebiSize: null,
      asoebiQuantity: 0,
      appointmentDate: null,
      wellWishes: "",
    },
  ],
  access: {
    read: publicRead,
    create: publicRead,
    update: publicRead, // staffWrite,
    delete: adminOnly,
  },
});

export default defineConfig({
  db: postgresAdapter({
    url: process.env.DATABASE_URL as string,
  }),
  admin: {
    branding: {
      logoText: "Future You Coaching",
    },
    meta: {
      titleSuffix: "- Future You Coaching",
    },
  },
  adminAuth: {
    mode: "local",
    collectionSlug: "__admins",
    providers: [],
  },
  collections: [Admins, Media, Pages, Services, BlogArticles, GuestResponses],
  globals: [SiteSettings, AssessmentCategories],
});
