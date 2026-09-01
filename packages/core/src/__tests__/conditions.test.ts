import { describe, it, expect, beforeAll } from "vitest";
import jexl from "jexl";
import { when } from "../utils/conditions.js";
import { registerJexlHelpers } from "../utils/jexl-helpers.js";

describe("when Condition Builder — Comprehensive Test Suite", () => {
  beforeAll(() => {
    registerJexlHelpers(jexl);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Block & Variant Matchers
  // ───────────────────────────────────────────────────────────────────────────
  describe("Block & Variant Matchers", () => {
    it("handles single and multiple variants", async () => {
      // Single
      const single = when.variant("split");
      expect(single).toBe("variant == 'split'");
      expect(await jexl.eval(single, { variant: "split" })).toBe(true);
      expect(await jexl.eval(single, { variant: "cards" })).toBe(false);

      // Multiple via rest params
      const multiple = when.variant("split", "imageLeft", "imageRight");
      expect(multiple).toBe("variant in ['split', 'imageLeft', 'imageRight']");
      expect(await jexl.eval(multiple, { variant: "imageLeft" })).toBe(true);
      expect(await jexl.eval(multiple, { variant: "grid" })).toBe(false);

      // Multiple via array
      const arrayArg = when.variant(["imageLeft", "imageRight"]);
      expect(arrayArg).toBe("variant in ['imageLeft', 'imageRight']");
      expect(await jexl.eval(arrayArg, { variant: "imageRight" })).toBe(true);

      // Empty variants fallback
      expect(when.variant()).toBe("true");
      expect(await jexl.eval(when.variant(), {})).toBe(true);
    });

    it("handles notVariant", async () => {
      // Single
      const notSingle = when.notVariant("hidden");
      expect(notSingle).toBe("variant != 'hidden'");
      expect(await jexl.eval(notSingle, { variant: "visible" })).toBe(true);
      expect(await jexl.eval(notSingle, { variant: "hidden" })).toBe(false);

      // Multiple
      const notMulti = when.notVariant("hidden", "draft");
      expect(notMulti).toBe("!(variant in ['hidden', 'draft'])");
      expect(await jexl.eval(notMulti, { variant: "published" })).toBe(true);
      expect(await jexl.eval(notMulti, { variant: "draft" })).toBe(false);

      // Empty fallback
      expect(when.notVariant()).toBe("false");
    });

    it("handles block and notBlock", async () => {
      // Single block
      const singleBlock = when.block("hero");
      expect(singleBlock).toBe("block == 'hero'");
      expect(await jexl.eval(singleBlock, { block: "hero" })).toBe(true);
      expect(await jexl.eval(singleBlock, { block: "footer" })).toBe(false);

      // Multiple blocks
      const multiBlock = when.block("hero", "cta", "features");
      expect(multiBlock).toBe("block in ['hero', 'cta', 'features']");
      expect(await jexl.eval(multiBlock, { block: "cta" })).toBe(true);
      expect(await jexl.eval(multiBlock, { block: "pricing" })).toBe(false);

      // notBlock single
      const notSingleBlock = when.notBlock("sidebar");
      expect(notSingleBlock).toBe("block != 'sidebar'");
      expect(await jexl.eval(notSingleBlock, { block: "main" })).toBe(true);
      expect(await jexl.eval(notSingleBlock, { block: "sidebar" })).toBe(false);

      // notBlock multiple
      const notMultiBlock = when.notBlock("sidebar", "footer");
      expect(notMultiBlock).toBe("!(block in ['sidebar', 'footer'])");
      expect(await jexl.eval(notMultiBlock, { block: "hero" })).toBe(true);
      expect(await jexl.eval(notMultiBlock, { block: "sidebar" })).toBe(false);

      // Empty fallbacks
      expect(when.block()).toBe("true");
      expect(when.notBlock()).toBe("false");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Logical Combinators (all, and, any, or, not)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Logical Combinators & Deep Nesting", () => {
    it("handles all / and", async () => {
      const expr = when.all(
        when.variant("split"),
        when.fieldEquals("showImage", true),
        when.fieldGreaterThan("priority", 1),
      );
      expect(expr).toBe("(variant == 'split') && (showImage == true) && (priority > 1)");
      expect(await jexl.eval(expr, { variant: "split", showImage: true, priority: 5 })).toBe(true);
      expect(await jexl.eval(expr, { variant: "split", showImage: true, priority: 0 })).toBe(false);

      // Alias
      expect(when.and("a", "b")).toBe("a && b");

      // Filter falsy/null/undefined items cleanly
      expect(when.all("a", null, undefined, false, "b")).toBe("a && b");
      expect(when.all()).toBe("true");
      expect(when.all("single == true")).toBe("single == true");
    });

    it("handles any / or", async () => {
      const expr = when.any(
        when.variant("cards"),
        when.fieldEquals("isHero", true),
        when.fieldIsTrue("promoted"),
      );
      expect(expr).toBe("(variant == 'cards') || (isHero == true) || (promoted == true)");
      expect(await jexl.eval(expr, { variant: "other", isHero: false, promoted: true })).toBe(true);
      expect(await jexl.eval(expr, { variant: "other", isHero: false, promoted: false })).toBe(false);

      // Alias
      expect(when.or("a", "b")).toBe("a || b");

      // Filter falsy
      expect(when.any("a", undefined, "b")).toBe("a || b");
      expect(when.any()).toBe("true");
      expect(when.any("only == 1")).toBe("only == 1");
    });

    it("handles not", async () => {
      const expr = when.not(when.fieldEquals("status", "archived"));
      expect(expr).toBe("!(status == \"archived\")");
      expect(await jexl.eval(expr, { status: "published" })).toBe(true);
      expect(await jexl.eval(expr, { status: "archived" })).toBe(false);

      expect(when.not("")).toBe("false");
    });

    it("evaluates deeply nested compound logic: all(any(...), any(...))", async () => {
      // (variant in ['split', 'cards'] || isFeatured == true) && (status == 'published' || user.role == 'admin')
      const compound = when.all(
        when.any(when.variant("split", "cards"), when.fieldIsTrue("isFeatured")),
        when.any(when.fieldEquals("status", "published"), when.userRole("admin")),
      );

      // Context 1: Valid variant + published status -> true
      expect(await jexl.eval(compound, {
        variant: "split",
        isFeatured: false,
        status: "published",
        user: { role: "viewer" },
      })).toBe(true);

      // Context 2: Featured + admin user -> true
      expect(await jexl.eval(compound, {
        variant: "minimal",
        isFeatured: true,
        status: "draft",
        user: { role: "admin" },
      })).toBe(true);

      // Context 3: Neither variant nor featured -> false
      expect(await jexl.eval(compound, {
        variant: "minimal",
        isFeatured: false,
        status: "published",
        user: { role: "viewer" },
      })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Field Matchers (Equality, In, Boolean, Numbers, Strings, Ranges)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Field Matchers & Helpers", () => {
    it("handles fieldEquals and fieldNotEquals with various primitive types", async () => {
      // String
      expect(await jexl.eval(when.fieldEquals("category", "tech"), { category: "tech" })).toBe(true);
      expect(await jexl.eval(when.fieldNotEquals("category", "tech"), { category: "other" })).toBe(true);

      // Number
      expect(await jexl.eval(when.fieldEquals("count", 42), { count: 42 })).toBe(true);
      expect(await jexl.eval(when.fieldNotEquals("count", 42), { count: 10 })).toBe(true);

      // Boolean
      expect(await jexl.eval(when.fieldEquals("isActive", true), { isActive: true })).toBe(true);
      expect(await jexl.eval(when.fieldEquals("isActive", false), { isActive: false })).toBe(true);

      // Null
      expect(await jexl.eval(when.fieldEquals("deletedAt", null), { deletedAt: null })).toBe(true);
      expect(await jexl.eval(when.fieldNotEquals("deletedAt", null), { deletedAt: "2026-01-01" })).toBe(true);
    });

    it("handles fieldIn and fieldNotIn with flat & array args", async () => {
      // Flat args
      const inExpr = when.fieldIn("status", "draft", "in_review", "scheduled");
      expect(await jexl.eval(inExpr, { status: "in_review" })).toBe(true);
      expect(await jexl.eval(inExpr, { status: "published" })).toBe(false);

      // Array arg
      const inArrayExpr = when.fieldIn("tier", ["starter", "pro"]);
      expect(await jexl.eval(inArrayExpr, { tier: "pro" })).toBe(true);
      expect(await jexl.eval(inArrayExpr, { tier: "enterprise" })).toBe(false);

      // Not in
      const notInExpr = when.fieldNotIn("role", "banned", "suspended");
      expect(await jexl.eval(notInExpr, { role: "active" })).toBe(true);
      expect(await jexl.eval(notInExpr, { role: "banned" })).toBe(false);
    });

    it("handles fieldNotEmpty and fieldEmpty", async () => {
      expect(await jexl.eval(when.fieldNotEmpty("heading"), { heading: "Welcome" })).toBe(true);
      expect(await jexl.eval(when.fieldNotEmpty("heading"), { heading: "" })).toBe(false);
      expect(await jexl.eval(when.fieldNotEmpty("heading"), { heading: null })).toBe(false);
      expect(await jexl.eval(when.fieldNotEmpty("heading"), {})).toBe(false);

      expect(await jexl.eval(when.fieldEmpty("heading"), { heading: "" })).toBe(true);
      expect(await jexl.eval(when.fieldEmpty("heading"), { heading: null })).toBe(true);
      expect(await jexl.eval(when.fieldEmpty("heading"), {})).toBe(true);
      expect(await jexl.eval(when.fieldEmpty("heading"), { heading: "Has Text" })).toBe(false);
    });

    it("handles fieldIsTrue and fieldIsFalse", async () => {
      expect(await jexl.eval(when.fieldIsTrue("published"), { published: true })).toBe(true);
      expect(await jexl.eval(when.fieldIsTrue("published"), { published: false })).toBe(false);
      expect(await jexl.eval(when.fieldIsTrue("published"), {})).toBe(false);

      expect(await jexl.eval(when.fieldIsFalse("published"), { published: false })).toBe(true);
      expect(await jexl.eval(when.fieldIsFalse("published"), {})).toBe(true);
      expect(await jexl.eval(when.fieldIsFalse("published"), { published: true })).toBe(false);
    });

    it("handles numeric comparisons (greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, between)", async () => {
      // Greater than
      expect(await jexl.eval(when.fieldGreaterThan("price", 100), { price: 101 })).toBe(true);
      expect(await jexl.eval(when.fieldGreaterThan("price", 100), { price: 100 })).toBe(false);

      // Greater than or equal
      expect(await jexl.eval(when.fieldGreaterThanOrEqual("price", 100), { price: 100 })).toBe(true);
      expect(await jexl.eval(when.fieldGreaterThanOrEqual("price", 100), { price: 99 })).toBe(false);

      // Less than
      expect(await jexl.eval(when.fieldLessThan("stock", 10), { stock: 9 })).toBe(true);
      expect(await jexl.eval(when.fieldLessThan("stock", 10), { stock: 10 })).toBe(false);

      // Less than or equal
      expect(await jexl.eval(when.fieldLessThanOrEqual("stock", 10), { stock: 10 })).toBe(true);
      expect(await jexl.eval(when.fieldLessThanOrEqual("stock", 10), { stock: 11 })).toBe(false);

      // Range between (inclusive)
      const range = when.fieldBetween("rating", 1, 5);
      expect(await jexl.eval(range, { rating: 1 })).toBe(true);
      expect(await jexl.eval(range, { rating: 3 })).toBe(true);
      expect(await jexl.eval(range, { rating: 5 })).toBe(true);
      expect(await jexl.eval(range, { rating: 0 })).toBe(false);
      expect(await jexl.eval(range, { rating: 6 })).toBe(false);
    });

    it("handles string patterns: startsWith, endsWith, contains", async () => {
      expect(await jexl.eval(when.fieldStartsWith("slug", "country-portals/"), { slug: "country-portals/nigeria" })).toBe(true);
      expect(await jexl.eval(when.fieldStartsWith("slug", "country-portals/"), { slug: "about-us" })).toBe(false);

      expect(await jexl.eval(when.fieldEndsWith("docUrl", ".pdf"), { docUrl: "https://example.com/sheet.pdf" })).toBe(true);
      expect(await jexl.eval(when.fieldEndsWith("docUrl", ".pdf"), { docUrl: "https://example.com/sheet.docx" })).toBe(false);

      expect(await jexl.eval(when.fieldContains("title", "AgricTrail"), { title: "Welcome to AgricTrail Web" })).toBe(true);
      expect(await jexl.eval(when.fieldContains("title", "AgricTrail"), { title: "Welcome to other site" })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Array & List Helpers
  // ───────────────────────────────────────────────────────────────────────────
  describe("Array & List Helpers", () => {
    it("handles arrayNotEmpty and arrayEmpty", async () => {
      expect(await jexl.eval(when.arrayNotEmpty("slides"), { slides: [{ id: 1 }] })).toBe(true);
      expect(await jexl.eval(when.arrayNotEmpty("slides"), { slides: [] })).toBe(false);

      expect(await jexl.eval(when.arrayEmpty("slides"), { slides: [] })).toBe(true);
      expect(await jexl.eval(when.arrayEmpty("slides"), { slides: [{ id: 1 }] })).toBe(false);
    });

    it("handles array count constraints", async () => {
      expect(await jexl.eval(when.arrayCountGreaterThan("features", 2), { features: [1, 2, 3] })).toBe(true);
      expect(await jexl.eval(when.arrayCountGreaterThan("features", 2), { features: [1, 2] })).toBe(false);

      expect(await jexl.eval(when.arrayCountAtLeast("features", 2), { features: [1, 2] })).toBe(true);
      expect(await jexl.eval(when.arrayCountAtLeast("features", 2), { features: [1] })).toBe(false);

      expect(await jexl.eval(when.arrayCountLessThan("features", 5), { features: [1, 2, 3] })).toBe(true);
      expect(await jexl.eval(when.arrayCountLessThan("features", 5), { features: [1, 2, 3, 4, 5] })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. User Roles, Permissions & Attributes
  // ───────────────────────────────────────────────────────────────────────────
  describe("User, Roles & Permissions", () => {
    it("handles user.role string check", async () => {
      const expr = when.userRole("admin", "superadmin");
      expect(await jexl.eval(expr, { user: { role: "admin" } })).toBe(true);
      expect(await jexl.eval(expr, { user: { role: "superadmin" } })).toBe(true);
      expect(await jexl.eval(expr, { user: { role: "editor" } })).toBe(false);
    });

    it("handles user.roles array check", async () => {
      const expr = when.userRole("admin");
      expect(await jexl.eval(expr, { user: { roles: ["admin", "editor"] } })).toBe(true);
      expect(await jexl.eval(expr, { user: { roles: ["editor", "viewer"] } })).toBe(false);
    });

    it("handles userEmailDomain (with or without leading @)", async () => {
      const domainWithAt = when.userEmailDomain("@agrictrail.com");
      expect(await jexl.eval(domainWithAt, { user: { email: "busola@agrictrail.com" } })).toBe(true);
      expect(await jexl.eval(domainWithAt, { user: { email: "busola@gmail.com" } })).toBe(false);

      const domainWithoutAt = when.userEmailDomain("agrictrail.com");
      expect(await jexl.eval(domainWithoutAt, { user: { email: "partner@agrictrail.com" } })).toBe(true);
      expect(await jexl.eval(domainWithoutAt, { user: { email: "partner@yahoo.com" } })).toBe(false);
    });

    it("handles userAttributeEquals", async () => {
      const expr = when.userAttributeEquals("department", "marketing");
      expect(await jexl.eval(expr, { user: { department: "marketing" } })).toBe(true);
      expect(await jexl.eval(expr, { user: { department: "engineering" } })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Document Lifecycle & Workflow Statuses
  // ───────────────────────────────────────────────────────────────────────────
  describe("Document Lifecycle & Workflow Statuses", () => {
    it("handles isNewDocument and isExistingDocument", async () => {
      expect(await jexl.eval(when.isNewDocument(), { id: null })).toBe(true);
      expect(await jexl.eval(when.isNewDocument(), {})).toBe(true);
      expect(await jexl.eval(when.isNewDocument(), { id: "doc_123" })).toBe(false);

      expect(await jexl.eval(when.isExistingDocument(), { id: "doc_123" })).toBe(true);
      expect(await jexl.eval(when.isExistingDocument(), { id: null })).toBe(false);
    });

    it("handles statusEquals and statusIn", async () => {
      const eq = when.statusEquals("published");
      expect(await jexl.eval(eq, { status: "published" })).toBe(true);
      expect(await jexl.eval(eq, { status: "draft" })).toBe(false);

      const inStatuses = when.statusIn("draft", "in_review", "rejected");
      expect(await jexl.eval(inStatuses, { status: "in_review" })).toBe(true);
      expect(await jexl.eval(inStatuses, { status: "published" })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Fluent Chainable Builder: when(field)...
  // ───────────────────────────────────────────────────────────────────────────
  describe("Fluent Builder: when('field')...", () => {
    it("covers all fluent builder methods", async () => {
      // equals / notEquals
      expect(await jexl.eval(when("type").equals("banner"), { type: "banner" })).toBe(true);
      expect(await jexl.eval(when("type").notEquals("banner"), { type: "card" })).toBe(true);

      // in / notIn
      expect(await jexl.eval(when("tier").in("pro", "enterprise"), { tier: "pro" })).toBe(true);
      expect(await jexl.eval(when("tier").notIn("free", "trial"), { tier: "pro" })).toBe(true);

      // isTrue / isFalse
      expect(await jexl.eval(when("enabled").isTrue(), { enabled: true })).toBe(true);
      expect(await jexl.eval(when("enabled").isFalse(), { enabled: false })).toBe(true);

      // notEmpty / isEmpty
      expect(await jexl.eval(when("title").notEmpty(), { title: "Hero Title" })).toBe(true);
      expect(await jexl.eval(when("title").isEmpty(), { title: "" })).toBe(true);

      // Numeric comparisons
      expect(await jexl.eval(when("qty").greaterThan(5), { qty: 10 })).toBe(true);
      expect(await jexl.eval(when("qty").greaterThanOrEqual(5), { qty: 5 })).toBe(true);
      expect(await jexl.eval(when("qty").lessThan(5), { qty: 2 })).toBe(true);
      expect(await jexl.eval(when("qty").lessThanOrEqual(5), { qty: 5 })).toBe(true);
      expect(await jexl.eval(when("qty").between(1, 10), { qty: 7 })).toBe(true);

      // String pattern methods
      expect(await jexl.eval(when("url").startsWith("https://"), { url: "https://dyrected.com" })).toBe(true);
      expect(await jexl.eval(when("url").endsWith(".json"), { url: "data.json" })).toBe(true);
      expect(await jexl.eval(when("tags").contains("featured"), { tags: ["featured", "popular"] })).toBe(true);

      // Length methods
      expect(await jexl.eval(when("bio").hasLengthGreaterThan(10), { bio: "A long biography text" })).toBe(true);
      expect(await jexl.eval(when("bio").hasLengthAtLeast(5), { bio: "Hello" })).toBe(true);
    });

    it("can be combined using when.all and when.any", async () => {
      const combined = when.all(
        when("price").greaterThan(100),
        when("status").in("active", "featured"),
        when("stock").greaterThanOrEqual(1),
      );

      expect(await jexl.eval(combined, { price: 150, status: "featured", stock: 1 })).toBe(true);
      expect(await jexl.eval(combined, { price: 150, status: "draft", stock: 1 })).toBe(false);
      expect(await jexl.eval(combined, { price: 50, status: "featured", stock: 1 })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Ternary Branching (when.then) for Preview URLs & Computed Values
  // ───────────────────────────────────────────────────────────────────────────
  describe("Ternary & Branching (when.then)", () => {
    it("generates conditional previewUrl expressions", async () => {
      // Home page fallback: slug == 'home' ? '/' : '/' + slug
      const homePreview = when.then(when.fieldEquals("slug", "home"), "/", "'/' + slug");
      expect(homePreview).toBe("slug == \"home\" ? '/' : '/' + slug");
      expect(await jexl.eval(homePreview, { slug: "home" })).toBe("/");
      expect(await jexl.eval(homePreview, { slug: "about" })).toBe("/about");

      // Fluent preview: when.then(when('slug').equals('home'), ...)
      const fluentPreview = when.then(when("slug").equals("home"), "/", "'/' + slug");
      expect(await jexl.eval(fluentPreview, { slug: "home" })).toBe("/");
      expect(await jexl.eval(fluentPreview, { slug: "contact" })).toBe("/contact");

      // Prefixed collection: when.then(when.fieldNotEmpty('slug'), "'/news/' + slug", null)
      const newsPreview = when.then(when.fieldNotEmpty("slug"), "'/news/' + slug", null);
      expect(await jexl.eval(newsPreview, { slug: "launch" })).toBe("/news/launch");
      expect(await jexl.eval(newsPreview, { slug: "" })).toBe(undefined); // Jexl evaluates null to undefined

      // Path with fallback to slug
      const pathOrSlug = when.then(when.fieldNotEmpty("path"), "path", "'/' + slug");
      expect(await jexl.eval(pathOrSlug, { path: "/custom-url", slug: "ignored" })).toBe("/custom-url");
      expect(await jexl.eval(pathOrSlug, { path: "", slug: "fallback" })).toBe("/fallback");

      // Chained when.then (nested ternary)
      const chainedTernary = when.then(
        when.fieldEquals("slug", "home"),
        "/",
        when.then(when.fieldNotEmpty("path"), "path", "'/' + slug"),
      );
      expect(await jexl.eval(chainedTernary, { slug: "home", path: "" })).toBe("/");
      expect(await jexl.eval(chainedTernary, { slug: "other", path: "/custom" })).toBe("/custom");
      expect(await jexl.eval(chainedTernary, { slug: "about", path: "" })).toBe("/about");
    });

    it("handles fluent multi-branch chaining with when.match()", async () => {
      const routeMatcher = when.match()
        .case(when("slug").equals("home"), "/")
        .case(when.fieldNotEmpty("path"), "path")
        .case(when("category").equals("news"), "'/news/' + slug")
        .case(when("category").equals("portal"), "'/country-portals/' + slug")
        .otherwise("'/' + slug");

      // 1. Home matches first
      expect(await jexl.eval(routeMatcher, { slug: "home", path: "", category: "news" })).toBe("/");

      // 2. Custom path matches second
      expect(await jexl.eval(routeMatcher, { slug: "ignored", path: "/custom-page", category: "portal" })).toBe("/custom-page");

      // 3. News category matches third
      expect(await jexl.eval(routeMatcher, { slug: "harvest-update", path: "", category: "news" })).toBe("/news/harvest-update");

      // 4. Portal category matches fourth
      expect(await jexl.eval(routeMatcher, { slug: "nigeria", path: "", category: "portal" })).toBe("/country-portals/nigeria");

      // 5. Default fallback
      expect(await jexl.eval(routeMatcher, { slug: "pricing", path: "", category: "general" })).toBe("/pricing");
    });

    it("handles declarative multi-branch array with when.cases()", async () => {
      const caseMatcher = when.cases(
        [when.fieldEquals("slug", "home"), "/"],
        [when.fieldNotEmpty("path"), "path"],
        [when("type").equals("article"), "'/articles/' + slug"],
        "'/' + slug",
      );

      expect(await jexl.eval(caseMatcher, { slug: "home", path: "" })).toBe("/");
      expect(await jexl.eval(caseMatcher, { slug: "test", path: "/direct" })).toBe("/direct");
      expect(await jexl.eval(caseMatcher, { slug: "my-post", path: "", type: "article" })).toBe("/articles/my-post");
      expect(await jexl.eval(caseMatcher, { slug: "contact", path: "", type: "page" })).toBe("/contact");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. String Concatenation & JEXL Transform Functions
  // ───────────────────────────────────────────────────────────────────────────
  describe("String Concatenation & JEXL Transforms", () => {
    it("handles when.concat with literal paths and field identifiers", async () => {
      const expr = when.concat("/country-portals/", "slug");
      expect(expr).toBe("'/country-portals/' + slug");
      expect(await jexl.eval(expr, { slug: "kenya" })).toBe("/country-portals/kenya");

      const multiConcat = when.concat("/docs/", "category", "/", "slug");
      expect(multiConcat).toBe("'/docs/' + category + '/' + slug");
      expect(await jexl.eval(multiConcat, { category: "guides", slug: "setup" })).toBe("/docs/guides/setup");
    });

    it("generates transform expressions: slugify, lower, upper, trim", async () => {
      expect(await jexl.eval(when.slugify("title"), { title: "Hello World! 2026" })).toBe("hello-world-2026");
      expect(await jexl.eval(when.lower("name"), { name: "Dyrected CMS" })).toBe("dyrected cms");
      expect(await jexl.eval(when.upper("code"), { code: "promo" })).toBe("PROMO");
      expect(await jexl.eval(when.trim("text"), { text: "  padded  " })).toBe("padded");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Scoped Fluent Builders & Access Control Helpers
  // ───────────────────────────────────────────────────────────────────────────
  describe("Scoped Builders & Access Policy Helpers", () => {
    it("handles when.user and when.sibling scoped builders", async () => {
      const userCond = when.user("email").endsWith("@company.com");
      expect(await jexl.eval(userCond, { user: { email: "alex@company.com" } })).toBe(true);
      expect(await jexl.eval(userCond, { user: { email: "alex@gmail.com" } })).toBe(false);

      const siblingCond = when.sibling("_variant").equals("split");
      expect(await jexl.eval(siblingCond, { siblingData: { _variant: "split" } })).toBe(true);
      expect(await jexl.eval(siblingCond, { siblingData: { _variant: "cards" } })).toBe(false);
    });

    it("handles when.access helpers", async () => {
      // isOwner
      const ownerCond = when.access.isOwner("authorId");
      expect(await jexl.eval(ownerCond, { authorId: "usr_1", user: { id: "usr_1" } })).toBe(true);
      expect(await jexl.eval(ownerCond, { authorId: "usr_2", user: { id: "usr_1" } })).toBe(false);

      // isAdmin
      const adminCond = when.access.isAdmin();
      expect(await jexl.eval(adminCond, { user: { role: "admin" } })).toBe(true);
      expect(await jexl.eval(adminCond, { user: { roles: ["admin"] } })).toBe(true);
      expect(await jexl.eval(adminCond, { user: { role: "editor" } })).toBe(false);

      // isPublishedOrAdmin
      const pubOrAdmin = when.access.isPublishedOrAdmin();
      expect(await jexl.eval(pubOrAdmin, { status: "published", user: { role: "viewer" } })).toBe(true);
      expect(await jexl.eval(pubOrAdmin, { status: "draft", user: { role: "admin" } })).toBe(true);
      expect(await jexl.eval(pubOrAdmin, { status: "draft", user: { role: "viewer" } })).toBe(false);
    });

    it("handles cross-field comparisons (e.g. salePrice < price)", async () => {
      const crossField = when("salePrice").lessThan("price");
      expect(await jexl.eval(crossField, { salePrice: 80, price: 100 })).toBe(true);
      expect(await jexl.eval(crossField, { salePrice: 120, price: 100 })).toBe(false);
    });
  });
});

