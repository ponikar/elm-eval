import Link from 'next/link';
import { Button } from '@repo/ui';
import { Shield, FlaskConical, GitCompare, CheckCircle2, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: FlaskConical,
    title: 'Evaluation Suite',
    description: 'Trusted test cases that measure finding recall, precision, and correctness.',
  },
  {
    icon: GitCompare,
    title: 'Version Comparison',
    description: 'Compare baseline vs candidate agents across every metric and detect regressions.',
  },
  {
    icon: CheckCircle2,
    title: 'Quality Gates',
    description:
      'Automated approval or blocking of agent versions based on configurable thresholds.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Audit Reliability Lab</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/audits">
            Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Supplier Audit AI Evaluation
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Audit Reliability Lab
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Evaluate AI agents that review supplier audits. Compare versions, catch regressions, and
            block unsafe models before they ship.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/audits">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/evals">View Eval Suite</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-4">
        <p className="text-center text-xs text-muted-foreground/60">Audit Reliability Lab v0.1</p>
      </footer>
    </div>
  );
}
