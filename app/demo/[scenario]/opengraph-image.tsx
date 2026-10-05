import { ImageResponse } from 'next/og';
import { getScenario } from '../../../src/data';
export const alt = 'Successful billing signals can hide incorrect product access. BRH catches the failure.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario: id } = await params; const scenario = getScenario(id); if (!scenario) return new Response('Not found', { status: 404 });
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', background: '#0a0a0b', color: '#eee9df', width: '100%', height: '100%', padding: '55px 65px', fontFamily: 'sans-serif' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#aaa69e' }}><span>BRH / BILLING RELIABILITY HARNESS</span><span>RECORDED CHECK · {scenario.checkId}</span></div><div style={{ display: 'flex', flexDirection: 'column', marginTop: 60, fontSize: 62, lineHeight: 1.1, letterSpacing: '-2px' }}><span>Your Stripe checkout can succeed</span><span style={{ color: '#f0a93b' }}>while your product fails.</span></div><div style={{ display: 'flex', marginTop: 45, padding: '25px 0', borderTop: '1px solid #ffffff30', gap: 50, alignItems: 'center' }}><span style={{ fontSize: 22, color: '#83c69b' }}>Payment OK</span><span style={{ fontSize: 22, color: '#eb8279' }}>{scenario.unit}: {scenario.actual}</span><span style={{ fontSize: 22 }}>{scenario.name}</span></div><div style={{ marginTop: 20, fontSize: 20, color: '#aaa69e' }}>Break a billing flow. Watch BRH catch it. No account or card.</div></div>, size);
}
