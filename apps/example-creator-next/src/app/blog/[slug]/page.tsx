import { getArticleBySlug } from "@/lib/dyrected";
import BlogPost from "./BlogPost";
import blogFallback from "../blog-content.json";
import type { Article } from "../BlogContent";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cmsArticle = await getArticleBySlug(slug);

  let article: Article | null = null;
  if (cmsArticle) {
    article = {
      slug: cmsArticle.slug,
      title: cmsArticle.title,
      category: cmsArticle.category,
      readTime: cmsArticle.readTime,
      date: cmsArticle.date,
      excerpt: cmsArticle.excerpt,
      content: cmsArticle.content.map((c) => c.paragraph),
    };
  } else {
    const fallback = blogFallback.articles.find((a) => a.slug === slug);
    article = fallback ? (fallback as Article) : null;
  }

  return <BlogPost article={article} />;
}
