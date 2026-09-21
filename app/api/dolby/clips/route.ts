import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const dolbyDir = process.env.DOLBY_CACHE_DIR || '/opt/dinustream/cache/dolby';

    if (fs.existsSync(/*turbopackIgnore: true*/ dolbyDir)) {
      const entries = fs.readdirSync(/*turbopackIgnore: true*/ dolbyDir, { withFileTypes: true });
      const videoExtensions = new Set(['.mp4', '.mkv', '.webm', '.mov', '.ts', '.m4v']);

      const clips = entries
        .filter((e) => e.isFile() && videoExtensions.has(path.extname(e.name).toLowerCase()))
        .map((e, index) => {
          const ext = path.extname(e.name);
          const rawName = path.basename(e.name, ext);
          const cleanTitle = rawName
            .replace(/[-_.]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          return {
            id: `dolby-hosted-${index}-${encodeURIComponent(e.name)}`,
            title: cleanTitle || `Dolby Atmos Intro ${index + 1}`,
            subtitle: 'Oracle NVMe SSD Local Cache • Dolby Atmos',
            localPath: `/api/dolby/stream?file=${encodeURIComponent(e.name)}`,
            fallbackUrl: `/api/dolby/stream?file=${encodeURIComponent(e.name)}`,
            isHosted: true,
            filename: e.name,
          };
        });

      if (clips.length > 0) {
        return NextResponse.json({
          success: true,
          source: dolbyDir,
          count: clips.length,
          clips,
        });
      }
    }

    return NextResponse.json({
      success: true,
      source: 'fallback',
      count: 0,
      clips: [],
    });
  } catch (error) {
    console.error('[Dolby Clips API Error]:', error);
    return NextResponse.json({ success: false, clips: [] }, { status: 500 });
  }
}
