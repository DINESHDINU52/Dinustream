import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFile = searchParams.get('file');

    if (!requestedFile) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
    }

    const safeFilename = path.basename(decodeURIComponent(requestedFile));
    const dolbyDir = process.env.DOLBY_CACHE_DIR || '/opt/dinustream/cache/dolby';
    const filePath = path.join(/*turbopackIgnore: true*/ dolbyDir, safeFilename);

    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return NextResponse.json({ error: 'Dolby video file not found in local cache' }, { status: 404 });
    }

    const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'video/mp4';
    if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.mov') contentType = 'video/quicktime';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error('[Dolby Stream API Error]:', error);
    return NextResponse.json({ error: 'Internal streaming error' }, { status: 500 });
  }
}
