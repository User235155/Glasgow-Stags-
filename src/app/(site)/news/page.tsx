import type { Metadata } from "next";
import Link from "next/link";
import { club } from "@/content/club";
import { listPosts } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "News", description: `Latest news from ${club.name}.` };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await listPosts({ publishedOnly: true });
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <span className="eyebrow">Club news</span>
          <h1 className="display">News</h1>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap">
          {posts.length === 0 ? (
            <p className="empty">No news posted yet.</p>
          ) : (
            <div className="grid-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/news/${p.slug}`} className="news-card">
                  <div className="news-band" />
                  <div className="news-body">
                    {p.published_at && <time>{formatDate(p.published_at, { year: true })}</time>}
                    <h3>{p.title}</h3>
                    {p.summary && <p>{p.summary}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
