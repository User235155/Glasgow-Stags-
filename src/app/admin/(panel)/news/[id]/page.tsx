import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/data";
import { Flash, PageHead } from "@/components/admin";
import { PostForm } from "@/components/PostForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deletePost } from "../../../actions";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const post = await getPost(Number((await params).id));
  if (!post) notFound();
  const { msg } = await searchParams;
  return (
    <>
      <PageHead title="Edit post" crumb={{ href: "/admin/news", label: "News" }}>
        {post.published ? (
          <Link href={`/news/${post.slug}`} target="_blank" className="btn btn-sm btn-ghost">
            View live ↗
          </Link>
        ) : null}
      </PageHead>
      <Flash msg={msg} />
      <div className="cols">
        <section className="panel">
          <PostForm post={post} />
        </section>
        <section className="panel">
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <ConfirmButton message="Delete this post?">Delete post</ConfirmButton>
          </form>
        </section>
      </div>
    </>
  );
}
