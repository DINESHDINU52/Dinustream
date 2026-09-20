import { MediaSegment } from '@/types/segments';

/**
 * Standard mock segment datasets.
 * Includes user-specified realistic timestamps:
 * - Intro: 00:00 -> 00:01:32 (0s -> 92s)
 * - Recap: 00:01:32 -> 00:02:45 (92s -> 165s)
 * - Outro: 01:58:20 -> 02:02:10 (7100s -> 7330s)
 *
 * Plus PREVIEW and COMMERCIAL support.
 */

export const DEFAULT_CINEMA_SEGMENTS: MediaSegment[] = [
  {
    id: 'seg-dune-intro',
    type: 'INTRO',
    title: 'Cinematic Prologue & Opening Titles',
    buttonLabel: 'SKIP INTRO',
    startSeconds: 0,
    endSeconds: 92, // 00:01:32
    source: 'mock',
  },
  {
    id: 'seg-dune-recap',
    type: 'RECAP',
    title: 'Previously on Arrakis',
    buttonLabel: 'SKIP RECAP',
    startSeconds: 92,
    endSeconds: 165, // 00:02:45
    source: 'mock',
  },
  {
    id: 'seg-dune-commercial',
    type: 'COMMERCIAL',
    title: 'Intermission / Sponsor Break',
    buttonLabel: 'SKIP AD',
    startSeconds: 2700, // 00:45:00
    endSeconds: 2760,   // 00:46:00
    source: 'mock',
  },
  {
    id: 'seg-dune-preview',
    type: 'PREVIEW',
    title: 'Behind the Scenes Sneak Peek',
    buttonLabel: 'SKIP PREVIEW',
    startSeconds: 6960, // 01:56:00
    endSeconds: 7100,   // 01:58:20
    source: 'mock',
  },
  {
    id: 'seg-dune-outro',
    type: 'OUTRO',
    title: 'End Credits & Symphony',
    buttonLabel: 'SKIP OUTRO',
    startSeconds: 7100, // 01:58:20
    endSeconds: 7330,   // 02:02:10
    source: 'mock',
  },
];

/**
 * Series episodes with quick testable intervals so user / subagents can immediately
 * test playback transitions within the first 60 seconds without waiting.
 */
export const EPISODE_SEGMENTS: Record<string, MediaSegment[]> = {
  // Severance S01E01 - "Good News About Hell"
  'sev-s01e01': [
    {
      id: 'sev-recap-1',
      type: 'RECAP',
      title: 'Previously on Severance',
      buttonLabel: 'SKIP RECAP',
      startSeconds: 4,
      endSeconds: 24, // 00:00:04 -> 00:00:24
      source: 'mock',
    },
    {
      id: 'sev-intro-1',
      type: 'INTRO',
      title: 'Lumon Industries Title Sequence',
      buttonLabel: 'SKIP INTRO',
      startSeconds: 28,
      endSeconds: 78, // 00:00:28 -> 00:01:18
      source: 'mock',
    },
    {
      id: 'sev-comm-1',
      type: 'COMMERCIAL',
      title: 'Stream Sponsor Message',
      buttonLabel: 'SKIP AD',
      startSeconds: 120,
      endSeconds: 140,
      source: 'mock',
    },
    {
      id: 'sev-preview-1',
      type: 'PREVIEW',
      title: 'Next Episode Preview',
      buttonLabel: 'SKIP PREVIEW',
      startSeconds: 3200,
      endSeconds: 3260,
      source: 'mock',
    },
    {
      id: 'sev-outro-1',
      type: 'OUTRO',
      title: 'Closing Credits',
      buttonLabel: 'SKIP OUTRO',
      startSeconds: 3260,
      endSeconds: 3420,
      source: 'mock',
    },
  ],

  // Succession S04E01 - "The Munsters"
  'succ-s04e01': [
    {
      id: 'succ-recap-1',
      type: 'RECAP',
      title: 'Waystar Royco Recap',
      buttonLabel: 'SKIP RECAP',
      startSeconds: 3,
      endSeconds: 30,
      source: 'mock',
    },
    {
      id: 'succ-intro-1',
      type: 'INTRO',
      title: 'Nicholas Britell Theme Sequence',
      buttonLabel: 'SKIP INTRO',
      startSeconds: 35,
      endSeconds: 95,
      source: 'mock',
    },
    {
      id: 'succ-outro-1',
      type: 'OUTRO',
      title: 'Executive Producer Credits',
      buttonLabel: 'SKIP OUTRO',
      startSeconds: 3500,
      endSeconds: 3650,
      source: 'mock',
    },
  ],
};
