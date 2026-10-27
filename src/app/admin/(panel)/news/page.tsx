import Link from "next/link";
import { listPosts } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Flash, PageHead } from "@/components/admin";
import { PostForm } from "@/components/PostForm";

export default async function NewsAdminPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const posts = await listPosts();
  return (
    <>
      <PageHead title="News" sub="Posts here appear on the public News page and the homepage." />
      <Flash msg={msg} />
      <div className="cols">
        <section className="panel panel-flush">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="r">Date</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/news/${p.id}`}>{p.title}</Link>
                    </td>
                    <td>
                      {p.published ? <span className="pill pill-green">Live</span> : <span className="pill">Draft</span>}
                    </td>
                    <td className="r muted">{p.published_at ? formatDate(p.published_at, { year: true }) : "—"}</td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-a">
                      No posts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>New post</h2>
          </div>
          <PostForm />
        </section>
      </div>
    </>
  );
}
