import { NextRequest, NextResponse } from 'next/server';
import { setSyncJob, getAllSyncJobs } from '@/lib/sync/syncJobRegistry';

export async function GET() {
  const jobs = getAllSyncJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, sizeGb, movieId } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const sizeNum = typeof sizeGb === 'number' && sizeGb > 0 ? sizeGb : parseFloat(sizeGb) || 2.5;
    const totalBytes = Math.round(sizeNum * 1024 * 1024 * 1024);
    const speed = 148 * 1024 * 1024; // 148 MB/s simulated NVMe write speed

    const cleanFilename = title.replace(/[^\w\s.-]/gi, '').trim() || 'stream-sync.mkv';

    setSyncJob(cleanFilename, {
      filename: cleanFilename,
      movieId: movieId || `admin-sync-${Date.now()}`,
      startedAt: Date.now(),
      totalBytes,
      speed,
    });

    return NextResponse.json({
      success: true,
      message: `Sync job for "${title}" queued successfully`,
      job: {
        filename: cleanFilename,
        totalBytes,
        fileSizeGb: sizeNum,
      },
    });
  } catch (error) {
    console.error('[Admin Sync API Error]:', error);
    return NextResponse.json({ error: 'Failed to queue sync job' }, { status: 500 });
  }
}
