import type { Post } from "@/lib/data";
import { savePost } from "@/app/admin/actions";

export function PostForm({ post }: { post?: Post }) {
  return (
    <form action={savePost} className="aform">
      {post && <input type="hidden" name="id" value={post.id} />}
      <label className="f">
        <span>Title</span>
        <input name="title" required defaultValue={post?.title} />
      </label>
      <label className="f">
        <span>Summary</span>
        <input name="summary" defaultValue={post?.summary ?? ""} maxLength={300} />
        <small>One line shown on news cards.</small>
      </label>
      <label className="f">
        <span>Post</span>
        <textarea name="body" defaultValue={post?.body} style={{ minHeight: 260 }} />
        <small>Leave a blank line between paragraphs.</small>
      </label>
      <label className="check">
        <input type="checkbox" name="published" defaultChecked={Boolean(post?.published)} /> Publish on the website
      </label>
      <button className="btn btn-sm btn-dark" type="submit" style={{ justifySelf: "start" }}>
        {post ? "Save post" : "Create post"}
      </button>
    </form>
  );
}
