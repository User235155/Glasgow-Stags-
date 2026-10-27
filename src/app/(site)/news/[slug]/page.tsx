import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Prose } from "@/components/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  return post ? { title: post.title, description: post.summary ?? undefined } : {};
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return (
    <section className="section">
      <div className="wrap">
        <article className="article">
          <Link href="/news" className="eyebrow" style={{ textDecoration: "none" }}>
            All news
          </Link>
          <h1 className="display">{post.title}</h1>
          {post.published_at && (
            <p style={{ color: "var(--muted)", marginTop: 12 }}>{formatDate(post.published_at, { year: true })}</p>
          )}
          <div className="prose">
            <Prose text={post.body} />
          </div>
        </article>
      </div>
    </section>
  );
}
