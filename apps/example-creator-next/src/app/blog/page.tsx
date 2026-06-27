import { getBlogPageContent, getArticles } from "@/lib/dyrected";
import BlogContent, { type Article } from "./BlogContent";
import blogFallback from "./blog-content.json";

export default async function Blog() {
  const [blogPageGlobal, articleDocs] = await Promise.all([
    getBlogPageContent(),
    getArticles(),
  ]);

  const articles: Article[] =
    articleDocs.length > 0
      ? articleDocs.map((a) => ({
          slug: a.slug,
          title: a.title,
          category: a.category,
          readTime: a.readTime,
          date: a.date,
          excerpt: a.excerpt,
          content: a.content.map((c) => c.paragraph),
        }))
      : (blogFallback.articles as Article[]);

  return (
    <BlogContent
      blogPageGlobal={blogPageGlobal as Parameters<typeof BlogContent>[0]["blogPageGlobal"]}
      articles={articles}
    />
  );
}
