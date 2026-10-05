import type { Metadata, Viewport } from 'next';
import '../src/styles.css';
export const metadata: Metadata = { metadataBase: new URL('https://stripe-entitlements-harness-webapp.vercel.app'), title: { default: 'BRH billing failure demo', template: '%s — BRH' }, description: 'Break a simulated billing flow. Replay BRH catching a product failure behind successful Stripe signals.' };
export const viewport: Viewport = { themeColor: '#0a0a0b', colorScheme: 'dark' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body style={{ margin: 0 }}>{children}</body></html>; }
