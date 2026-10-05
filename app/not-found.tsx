import Link from 'next/link';
export default function NotFound() { return <main style={{ padding: 60, background: '#0a0a0b', color: '#eee9df', minHeight: '100vh', fontFamily: 'sans-serif' }}><h1>That scenario doesn’t exist.</h1><Link href="/demo" style={{ color: '#f0a93b' }}>Try the billing demo →</Link></main>; }
