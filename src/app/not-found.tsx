import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-medium tracking-tight">That page is not in the record</h1>
      <p className="mt-3 text-sm text-muted-foreground">The issue or release is not in the current project.</p>
      <Link href="/mission" className="mt-6 inline-flex text-sm text-primary hover:underline">
        Back to mission control
      </Link>
    </div>
  );
}
