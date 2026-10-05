import type { Metadata } from 'next';
import { BillingFailureDemo } from '../../src/demo';
import { PRODUCT_URL } from '../../src/data';
export const metadata: Metadata = { title: 'Payment success is not product success', alternates: { canonical: '/demo' }, openGraph: { title: 'Your Stripe checkout can succeed while your product fails.', description: 'Break a billing flow. Watch BRH catch it.', url: `${PRODUCT_URL}/demo`, images: [{ url: '/demo/entitlement-mismatch/opengraph-image', width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image' } };
export default function Page() { return <BillingFailureDemo />; }
