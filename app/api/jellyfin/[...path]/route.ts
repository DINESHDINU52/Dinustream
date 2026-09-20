import { NextRequest, NextResponse } from 'next/server';
import {
  MOCK_MOVIES,
  MOCK_SERIES,
  FEATURED_HERO_MEDIA,
  MOCK_TRENDING,
  MOCK_RECENTLY_ADDED,
  MOCK_DOLBY_ATMOS,
} from '@/lib/mock-data';
import { SEVERANCE_SEASONS, SHOGUN_SEASONS } from '@/lib/mock-series';
import { JellyfinItem, JellyfinSegment } from '@/lib/api/jellyfin';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

// Helper to convert our internal media model into Jellyfin raw representation
function toJellyfinItem(item: (typeof MOCK_MOVIES)[0]): JellyfinItem {
  // Convert runtime "2h 46m" or "58m" to ticks (1 sec = 10,000,000 ticks)
  let runtimeSeconds = 7200;
  if (item.runtime.includes('h')) {
    const parts = item.runtime.split('h');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1]?.replace('m', '').trim() || '0', 10) || 0;
    runtimeSeconds = h * 3600 + m * 60;
  } else if (item.runtime.includes('m')) {
    runtimeSeconds = (parseInt(item.runtime.replace('m', ''), 10) || 50) * 60;
  }

  const ticks = runtimeSeconds * 10000000;
  const ratingNum = parseFloat(item.rating.replace('/10', '')) || 8.5;

  return {
    Id: item.id,
    Name: item.title,
    Overview: item.overview,
    Type: item.type === 'movie' ? 'Movie' : 'Series',
    ProductionYear: item.releaseYear,
    CommunityRating: ratingNum,
    OfficialRating: 'PG-13',
    RunTimeTicks: ticks,
    Genres: item.genres,
    People: [
      {
        Id: 'p-dir-1',
        Name: item.director || 'Denis Villeneuve',
        Type: 'Director',
      },
      ...(item.cast || ['Dinu', 'Kanmani']).map((name, i) => ({
        Id: `p-cast-${i}`,
        Name: name,
        Type: 'Actor' as const,
      })),
    ],
    MediaStreams: [
      {
        Type: 'Video',
        Index: 0,
        Codec: 'hevc',
        DisplayTitle: '4K HEVC HDR10',
        IsDefault: true,
      },
      {
        Type: 'Audio',
        Index: 1,
        Codec: 'truehd',
        Language: 'eng',
        DisplayTitle: 'Dolby Atmos (TrueHD 7.1)',
        Title: 'English Dolby Atmos',
        Channels: 8,
        ChannelLayout: '7.1',
        IsDefault: true,
      },
      {
        Type: 'Audio',
        Index: 2,
        Codec: 'eac3',
        Language: 'eng',
        DisplayTitle: 'Dolby Digital Plus 5.1',
        Title: 'English DD+ 5.1',
        Channels: 6,
        ChannelLayout: '5.1',
        IsDefault: false,
      },
      {
        Type: 'Audio',
        Index: 3,
        Codec: 'aac',
        Language: 'fra',
        DisplayTitle: 'French Stereo',
        Title: 'French Audio',
        Channels: 2,
        IsDefault: false,
      },
      {
        Type: 'Subtitle',
        Index: 4,
        Codec: 'subrip',
        Language: 'eng',
        DisplayTitle: 'English [CC]',
        Title: 'English (SDH)',
        IsDefault: true,
      },
      {
        Type: 'Subtitle',
        Index: 5,
        Codec: 'subrip',
        Language: 'spa',
        DisplayTitle: 'Spanish',
        Title: 'Spanish Subtitles',
        IsDefault: false,
      },
      {
        Type: 'Subtitle',
        Index: 6,
        Codec: 'subrip',
        Language: 'fra',
        DisplayTitle: 'French',
        Title: 'French Subtitles',
        IsDefault: false,
      },
    ],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
    ImageTags: {
      Primary: 'img-tag-primary',
    },
    BackdropImageTags: ['img-tag-backdrop'],
  };
}

const ALL_MOCK_ITEMS = [
  FEATURED_HERO_MEDIA,
  ...MOCK_MOVIES,
  ...MOCK_SERIES,
  ...MOCK_TRENDING,
  ...MOCK_RECENTLY_ADDED,
  ...MOCK_DOLBY_ATMOS,
];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`jellyfin_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 180,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Jellyfin proxy rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { path } = await context.params;
    const subPath = path.join('/');

    // Security: Prevent path traversal and malicious URL injection
    if (subPath.includes('..') || subPath.includes('\\') || subPath.includes('//') || subPath.includes('\0')) {
      return NextResponse.json({ error: 'Malformed path parameter' }, { status: 400 });
    }

    // Security Allowlist: Strictly permit client media queries while blocking administrative/system config endpoints
    const ALLOWED_ENDPOINTS = [
      'user-views',
      'items',
      'shows',
      'playback-info',
      'sessions',
      'syncplay',
      'artists',
      'audio',
      'search',
    ];

    const isAllowed = ALLOWED_ENDPOINTS.some(
      (allowed) => subPath === allowed || subPath.startsWith(`${allowed}/`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Forbidden: Access to this Jellyfin subsystem endpoint is restricted.' },
        { status: 403 }
      );
    }

    const serverUrl = process.env.JELLYFIN_SERVER_URL;
    const apiKey = process.env.JELLYFIN_API_KEY;
    const userId = process.env.JELLYFIN_USER_ID || 'admin';

    // 1. Attempt real forward to live Jellyfin server if reachable
    if (serverUrl && apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        // Map DinuStream normalized subpaths to authentic Jellyfin REST paths
        let jPath = `/${subPath}`;
        if (subPath === 'user-views') {
          jPath = `/Users/${encodeURIComponent(userId)}/Views`;
        } else if (subPath === 'items') {
          jPath = `/Users/${encodeURIComponent(userId)}/Items`;
        } else if (subPath.startsWith('items/') && subPath.includes('/Images/')) {
          // Image requests: /items/:id/Images/:type
          const parts = subPath.split('/');
          jPath = `/Items/${encodeURIComponent(parts[1])}/Images/${encodeURIComponent(parts[3])}`;
        } else if (subPath.startsWith('shows/') && subPath.endsWith('/seasons')) {
          const sId = subPath.split('/')[1];
          jPath = `/Shows/${encodeURIComponent(sId)}/Seasons`;
        } else if (subPath.startsWith('shows/') && subPath.endsWith('/episodes')) {
          const sId = subPath.split('/')[1];
          jPath = `/Shows/${encodeURIComponent(sId)}/Episodes`;
        } else if (subPath.startsWith('items/') && !subPath.includes('/')) {
          const itemId = subPath.replace('items/', '');
          jPath = `/Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`;
        }

        const targetUrl = new URL(jPath, serverUrl);
        req.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));
        if (!targetUrl.searchParams.has('userId') && !jPath.includes('/Users/')) {
          targetUrl.searchParams.set('userId', userId);
        }

        const jRes = await fetch(targetUrl.toString(), {
          headers: {
            'X-Emby-Token': apiKey,
            Accept: subPath.includes('/Images/') ? 'image/*,application/json' : 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (jRes.ok) {
          const contentType = jRes.headers.get('content-type') || '';
          if (contentType.includes('image/')) {
            const blob = await jRes.arrayBuffer();
            return new NextResponse(blob, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
              },
            });
          }
          const data = await jRes.json();
          return NextResponse.json(data);
        }
      } catch {
        // Fall through to resilient mock adapter
      }
    }

  // 2. Resilient local Jellyfin proxy responses
  // Endpoint: /user-views
  if (subPath === 'user-views') {
    return NextResponse.json({
      Items: [
        { Id: 'lib-movies', Name: 'Movies', CollectionType: 'movies' },
        { Id: 'lib-series', Name: 'Series', CollectionType: 'tvshows' },
        { Id: 'lib-atmos', Name: 'Dolby Atmos Cinema', CollectionType: 'movies' },
      ],
    });
  }

  // Endpoint: /items (movies or series query)
  if (subPath === 'items') {
    const typeParam = req.nextUrl.searchParams.get('includeItemTypes');
    let items = ALL_MOCK_ITEMS;
    if (typeParam === 'Movie') {
      items = ALL_MOCK_ITEMS.filter((i) => i.type === 'movie');
    } else if (typeParam === 'Series') {
      items = ALL_MOCK_ITEMS.filter((i) => i.type === 'series');
    }

    const uniqueMap = new Map<string, typeof ALL_MOCK_ITEMS[0]>();
    items.forEach((it) => uniqueMap.set(it.id, it));

    const jellyfinItems = Array.from(uniqueMap.values()).map(toJellyfinItem);
    return NextResponse.json({
      Items: jellyfinItems,
      TotalRecordCount: jellyfinItems.length,
      StartIndex: 0,
    });
  }

  // Endpoint: /shows/:id/seasons
  if (subPath.startsWith('shows/') && subPath.endsWith('/seasons')) {
    const seriesId = subPath.split('/')[1];
    const seasonsList = seriesId.includes('shogun') ? SHOGUN_SEASONS : SEVERANCE_SEASONS;

    const jSeasons: JellyfinItem[] = seasonsList.map((s) => ({
      Id: `season-${s.seasonNumber}`,
      Name: s.title,
      Type: 'Season',
      IndexNumber: s.seasonNumber,
      SeriesId: seriesId,
      Overview: `Season ${s.seasonNumber} collection`,
    }));

    return NextResponse.json({ Items: jSeasons });
  }

  // Endpoint: /shows/:id/episodes
  if (subPath.startsWith('shows/') && subPath.endsWith('/episodes')) {
    const seriesId = subPath.split('/')[1];
    const seasonsList = seriesId.includes('shogun') ? SHOGUN_SEASONS : SEVERANCE_SEASONS;
    const seasonId = req.nextUrl.searchParams.get('seasonId');

    const targetSeasons = seasonId
      ? seasonsList.filter((s) => `season-${s.seasonNumber}` === seasonId)
      : seasonsList;

    const jEpisodes: JellyfinItem[] = targetSeasons.flatMap((s) =>
      s.episodes.map((ep) => ({
        Id: ep.id,
        Name: ep.title,
        Type: 'Episode',
        Overview: ep.overview,
        IndexNumber: ep.episodeNumber,
        ParentIndexNumber: ep.seasonNumber,
        SeriesId: seriesId,
        SeasonId: `season-${s.seasonNumber}`,
        RunTimeTicks: 58 * 60 * 10000000,
        MediaStreams: [
          {
            Type: 'Audio',
            Index: 0,
            Codec: 'truehd',
            DisplayTitle: 'Dolby Atmos (TrueHD 7.1)',
            Title: 'English Dolby Atmos',
            IsDefault: true,
            Channels: 8,
          },
          {
            Type: 'Subtitle',
            Index: 1,
            Codec: 'subrip',
            DisplayTitle: 'English [CC]',
            Language: 'eng',
            IsDefault: true,
          },
        ],
        UserData: {
          PlaybackPositionTicks: ep.progressMinutes ? ep.progressMinutes * 60 * 10000000 : 0,
          PlayCount: 0,
          IsFavorite: false,
          Played: false,
        },
      }))
    );

    return NextResponse.json({ Items: jEpisodes });
  }

  // Endpoint: /items/:id/segments
  if (subPath.includes('/segments')) {
    const itemId = subPath.split('/')[1];
    const segments: JellyfinSegment[] = [
      {
        Id: `seg-intro-${itemId}`,
        ItemId: itemId,
        Type: 'Intro',
        StartTicks: 15 * 10000000,
        EndTicks: 85 * 10000000,
      },
      {
        Id: `seg-recap-${itemId}`,
        ItemId: itemId,
        Type: 'Recap',
        StartTicks: 86 * 10000000,
        EndTicks: 140 * 10000000,
      },
      {
        Id: `seg-outro-${itemId}`,
        ItemId: itemId,
        Type: 'Outro',
        StartTicks: 3400 * 10000000,
        EndTicks: 3550 * 10000000,
      },
    ];
    return NextResponse.json({ Items: segments });
  }

  // Endpoint: /items/:id (details)
  if (subPath.startsWith('items/')) {
    const itemId = subPath.replace('items/', '');
    const found = ALL_MOCK_ITEMS.find((i) => i.id === itemId) || FEATURED_HERO_MEDIA;
    return NextResponse.json(toJellyfinItem(found));
  }

    return NextResponse.json({ Items: [] });
  } catch (error) {
    console.error('[Jellyfin Proxy Error] GET error:', error);
    return NextResponse.json({ error: 'Failed to process media request' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`jellyfin_post_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 60,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { path } = await context.params;
    const subPath = path.join('/');

    // Security: Prevent path traversal and malicious URL injection
    if (subPath.includes('..') || subPath.includes('\\') || subPath.includes('//') || subPath.includes('\0')) {
      return NextResponse.json({ error: 'Malformed path parameter' }, { status: 400 });
    }

    // Playback info endpoint
    if (subPath.includes('/playback-info')) {
      const itemId = subPath.split('/')[1];
      return NextResponse.json({
        PlaySessionId: `session-${Date.now()}`,
        MediaSources: [
          {
            Id: `source-${itemId}`,
            Container: 'mkv',
            SupportsDirectStream: true,
            SupportsTranscoding: true,
            Bitrate: 28000000, // 28 Mbps 4K Bitstream
            MediaStreams: [
              {
                Type: 'Audio',
                Index: 1,
                Codec: 'truehd',
                DisplayTitle: 'Dolby Atmos (TrueHD 7.1)',
                Channels: 8,
                IsDefault: true,
              },
              {
                Type: 'Subtitle',
                Index: 2,
                Codec: 'subrip',
                DisplayTitle: 'English [CC]',
                Language: 'eng',
                IsDefault: true,
              },
            ],
          },
        ],
      });
    }

    // Progress reporting
    if (subPath === 'sessions/playing/progress') {
      return NextResponse.json({ success: true });
    }

    // Jellyfin SyncPlay routes
    if (subPath.startsWith('syncplay/')) {
      if (subPath === 'syncplay/new') {
        return NextResponse.json({
          GroupId: `syncplay-${Date.now()}`,
          GroupName: 'Movie Night ❤️',
          PlayState: 'Idle',
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Jellyfin Proxy Error] POST error:', error);
    return NextResponse.json({ error: 'Failed to process playback action' }, { status: 500 });
  }
}
