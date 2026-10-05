import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillingFailureDemo } from '../../../src/demo';
import { getScenario, scenarios, PRODUCT_URL } from '../../../src/data';
export function generateStaticParams() { return scenarios.map(item => ({ scenario: item.id })); }
export async function generateMetadata({ params }: { params: Promise<{ scenario: string }> }): Promise<Metadata> {
  const { scenario: id } = await params; const scenario = getScenario(id); if (!scenario) notFound();
  return { title: `${scenario.name} demo`, description: scenario.description, alternates: { canonical: `/demo/${id}` }, openGraph: { title: `${scenario.name}: billing succeeded, the product did not.`, description: scenario.description, url: `${PRODUCT_URL}/demo/${id}`, images: [{ url: `/demo/${id}/opengraph-image`, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image' } };
}
export default async function Page({ params }: { params: Promise<{ scenario: string }> }) { const { scenario: id } = await params; const scenario = getScenario(id); if (!scenario) notFound(); return <BillingFailureDemo scenarioId={scenario.id} entryContext="deep_link" />; }
