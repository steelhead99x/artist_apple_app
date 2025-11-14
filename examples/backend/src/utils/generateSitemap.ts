/**
 * Sitemap Generator for Artist Space
 * 
 * This script generates a dynamic sitemap.xml file based on the current database content.
 * Run this script periodically (e.g., daily via cron job) to keep the sitemap up to date.
 * 
 * Usage:
 *   npm run generate-sitemap
 *   or
 *   ts-node backend/src/utils/generateSitemap.ts
 */

import { pool } from '../db';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://artist-space.com';
const OUTPUT_PATH = path.join(__dirname, '../../../public/sitemap.xml');

interface UrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface DbRow {
  id: number;
  updated_at?: string;
}

/**
 * Format date to YYYY-MM-DD format for sitemap
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate XML for a single URL entry
 */
function generateUrlXml(entry: UrlEntry): string {
  return `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

/**
 * Generate the complete sitemap XML
 */
async function generateSitemap(): Promise<void> {
  try {
    console.log('🗺️  Generating sitemap...');
    
    const urls: UrlEntry[] = [];
    const today = formatDate(new Date());

    // Static pages
    const staticPages = [
      { loc: BASE_URL, priority: 1.0, changefreq: 'daily' as const },
      { loc: `${BASE_URL}/pricing`, priority: 0.9, changefreq: 'weekly' as const },
      { loc: `${BASE_URL}/business-models`, priority: 0.7, changefreq: 'monthly' as const },
      { loc: `${BASE_URL}/studios`, priority: 0.8, changefreq: 'weekly' as const },
      { loc: `${BASE_URL}/browse-bands`, priority: 0.8, changefreq: 'daily' as const },
    ];

    staticPages.forEach(page => {
      urls.push({
        ...page,
        lastmod: today
      });
    });

    // Dynamic pages - Bands (only approved and active)
    const bandsResult = await pool.query(`
      SELECT b.id, b.updated_at 
      FROM bands b
      JOIN users u ON b.user_id = u.id
      WHERE u.status = 'approved' AND u.deleted_at IS NULL
      ORDER BY b.id
    `);
    
    bandsResult.rows.forEach((band: any) => {
      urls.push({
        loc: `${BASE_URL}/bands/${band.id}`,
        lastmod: formatDate(new Date(band.updated_at || today)),
        changefreq: 'weekly',
        priority: 0.7
      });
    });

    console.log(`✓ Added ${bandsResult.rows.length} band profiles`);

    // Dynamic pages - Venues (only approved and active)
    const barsResult = await pool.query(`
      SELECT b.id, b.updated_at 
      FROM venues b
      JOIN users u ON b.user_id = u.id
      WHERE u.status = 'approved' AND u.deleted_at IS NULL
      ORDER BY b.id
    `);
    
    barsResult.rows.forEach((bar: any) => {
      urls.push({
        loc: `${BASE_URL}/bars/${bar.id}`,
        lastmod: formatDate(new Date(bar.updated_at || today)),
        changefreq: 'weekly',
        priority: 0.7
      });
    });

    console.log(`✓ Added ${barsResult.rows.length} venue profiles`);

    // Dynamic pages - Recording Studios (only approved and active)
    const studiosResult = await pool.query(`
      SELECT rs.id, rs.updated_at 
      FROM recording_studios rs
      JOIN users u ON rs.user_id = u.id
      WHERE u.status = 'approved' AND u.deleted_at IS NULL
      ORDER BY rs.id
    `);
    
    studiosResult.rows.forEach((studio: any) => {
      urls.push({
        loc: `${BASE_URL}/studios/${studio.id}`,
        lastmod: formatDate(new Date(studio.updated_at || today)),
        changefreq: 'weekly',
        priority: 0.7
      });
    });

    console.log(`✓ Added ${studiosResult.rows.length} studio profiles`);

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(generateUrlXml).join('\n')}
</urlset>`;

    // Write to file
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
    
    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📍 Location: ${OUTPUT_PATH}`);
    console.log(`📊 Total URLs: ${urls.length}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the generator
if (require.main === module) {
  generateSitemap()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default generateSitemap;

