import type { MetadataRoute } from 'next';
import { PRODUCT_URL, scenarios } from '../src/data';
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: `${PRODUCT_URL}/demo` }, ...scenarios.map(item => ({ url: `${PRODUCT_URL}/demo/${item.id}` }))]; }
