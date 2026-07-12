import Link from "next/link";
import { Button } from "@repo/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Audit Reliability Lab</h1>
      <p className="text-muted-foreground">
        Supplier-audit AI reliability system with regression testing.
      </p>
      <Button asChild>
        <Link href="/audits">Open Dashboard</Link>
      </Button>
    </main>
  );
}
