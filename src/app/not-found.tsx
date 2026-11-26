import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notice">
      <h1>Not found</h1>
      <p>The page or task you are looking for does not exist. It may have been deleted.</p>
      <Link href="/" className="btn btn-primary">
        Back to tasks
      </Link>
    </div>
  );
}
