'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Logo } from '@/components/ui/Logo';
import { FEATURED_HERO_MEDIA } from '@/lib/mock-data';
import { PROFILES } from '@/lib/constants';
import {
  Play,
  Users,
  Volume2,
  Bookmark,
  SlidersHorizontal,
  Bell,
} from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Synchronized watch party room created');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className="space-y-16 py-8 select-none">
      {/* Interactive Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        kicker="Cinema Room Settings"
        title="Playback Calibration"
        description="Configure reference audio output and stream latency for private sync."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="silver"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                triggerToast('Audio calibration saved');
              }}
            >
              Apply Settings
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-[#0d1421] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">Dolby Atmos Passthrough</span>
              <span className="text-[10px] font-mono text-emerald-400">ENABLED</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct bitstream to AVR / soundbar without transcoding.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d1421] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">Sync Latency Tolerance</span>
              <span className="text-[10px] font-mono text-slate-300">120ms</span>
            </div>
            <ProgressBar progress={40} size="xs" variant="silver" />
          </div>
        </div>
      </Modal>

      {/* Interactive Drawer Component */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        kicker="Up Next"
        title="Screening Queue"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-light">
            Collaborative watch queue curated for Dinu & Kanmani.
          </p>

          <div className="space-y-2.5">
            {[
              { title: 'Dune: Part Two', runtime: '2h 46m', badge: 'Atmos' },
              { title: 'Oppenheimer', runtime: '3h 00m', badge: 'UHD' },
              { title: 'Blade Runner 2049', runtime: '2h 44m', badge: 'Vision' },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-slate-500">{idx + 1}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{item.title}</p>
                    <p className="text-[10px] text-slate-400">{item.runtime}</p>
                  </div>
                </div>
                <Badge variant="midnight" size="sm">
                  {item.badge}
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              variant="silver"
              size="sm"
              fullWidth
              onClick={() => {
                setIsDrawerOpen(false);
                triggerToast('Started screening queue');
              }}
            >
              Start Queue Playback
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        subtext="Private room active • Latency < 40ms"
        type="sync"
        isVisible={showToast}
        onDismiss={() => setShowToast(false)}
      />

      {/* Section Header */}
      <SectionHeader
        kicker="Design System Specification"
        title="DinuStream Cinema Visual System"
        subtitle='Bespoke visual architecture for "Your Private Cinema" — near-black background, midnight blue surfaces, subtle silver borders, and premium typography.'
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => setIsModalOpen(true)}
            >
              Open Modal
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Bookmark className="w-3.5 h-3.5" />}
              onClick={() => setIsDrawerOpen(true)}
            >
              Open Queue Drawer
            </Button>
          </div>
        }
      />

      {/* 1. Logo Treatment (Text/CSS Only) */}
      <section className="space-y-4">
        <SectionHeader
          kicker="01 / Identity"
          title="Logo Treatment (Text / CSS Only)"
          subtitle="Clean typographic crest with subtle silver letterspacing and restrained private cinema tag."
        />
        <GlassPanel variant="standard" padding="md" className="space-y-6">
          <div className="flex flex-wrap items-center gap-10">
            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">Size: Large (Header / Hero)</p>
              <Logo size="lg" asLink={false} />
            </div>
            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">Size: Medium (Navigation)</p>
              <Logo size="md" asLink={false} />
            </div>
            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">Size: Small (Footer / Minimal)</p>
              <Logo size="sm" asLink={false} />
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* 2. Reusable Buttons & IconButtons */}
      <section className="space-y-4">
        <SectionHeader
          kicker="02 / Actions"
          title="Buttons & IconButtons"
          subtitle="Precision interaction targets with soft shadows and micro-motion."
        />
        <GlassPanel variant="standard" padding="md" className="space-y-6">
          <div>
            <p className="text-xs font-mono text-slate-400 mb-3">Button Variants</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="silver"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
                onClick={() => triggerToast('Silver primary play clicked')}
              >
                Silver Platinum
              </Button>
              <Button
                variant="primary"
                icon={<Users className="w-3.5 h-3.5" />}
                onClick={() => triggerToast('Midnight blue sync clicked')}
              >
                Midnight Primary
              </Button>
              <Button
                variant="secondary"
                onClick={() => triggerToast('Secondary action clicked')}
              >
                Secondary Surface
              </Button>
              <Button
                variant="ghost"
                onClick={() => triggerToast('Ghost action clicked')}
              >
                Ghost Text
              </Button>
              <Button
                variant="danger"
                onClick={() => triggerToast('End session clicked')}
              >
                Danger
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-3">Button Sizes</p>
              <div className="flex items-center gap-2.5">
                <Button variant="secondary" size="sm">Small (sm)</Button>
                <Button variant="secondary" size="md">Medium (md)</Button>
                <Button variant="secondary" size="lg">Large (lg)</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-slate-400 mb-3">IconButton Component</p>
              <div className="flex items-center gap-2">
                <IconButton
                  variant="primary"
                  size="sm"
                  label="Play audio"
                  icon={<Play className="w-3 h-3 fill-current" />}
                  onClick={() => triggerToast('Play icon clicked')}
                />
                <IconButton
                  variant="secondary"
                  size="md"
                  label="Audio settings"
                  icon={<Volume2 className="w-4 h-4" />}
                  onClick={() => triggerToast('Volume icon clicked')}
                />
                <IconButton
                  variant="glass"
                  size="md"
                  shape="rounded"
                  label="Notification alerts"
                  icon={<Bell className="w-4 h-4" />}
                  onClick={() => triggerToast('Notification triggered')}
                />
              </div>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* 3. Badges */}
      <section className="space-y-4">
        <SectionHeader
          kicker="03 / Metadata"
          title="Badges & Audiovisual Indicators"
          subtitle="Monospace, crisp silver & midnight tags for format standards."
        />
        <GlassPanel variant="standard" padding="md" className="flex flex-wrap items-center gap-2.5">
          <Badge variant="silver">Private Cinema</Badge>
          <Badge variant="midnight">Midnight Reference</Badge>
          <Badge variant="atmos">Dolby Atmos</Badge>
          <Badge variant="vision">Dolby Vision</Badge>
          <Badge variant="uhd">4K UHD</Badge>
          <Badge variant="sync">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Synchronized
          </Badge>
          <Badge variant="rating">PG-13</Badge>
          <Badge variant="rating">TV-MA</Badge>
          <Badge variant="dinu">Dinu Master</Badge>
          <Badge variant="kanmani">Kanmani Selection</Badge>
        </GlassPanel>
      </section>

      {/* 4. GlassPanel & Surfaces */}
      <section className="space-y-4">
        <SectionHeader
          kicker="04 / Surfaces"
          title="GlassPanel Component"
          subtitle="Restrained frosted glass with soft shadows and hairline silver borders."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <GlassPanel variant="subtle" padding="md" className="space-y-2">
            <Badge variant="midnight" size="sm">Subtle Glass</Badge>
            <h4 className="text-sm font-medium text-white">Subtle Blur Layer</h4>
            <p className="text-xs text-slate-400 font-light">
              Lightweight frosted backing for non-intrusive metadata containers.
            </p>
          </GlassPanel>

          <GlassPanel variant="standard" padding="md" className="space-y-2">
            <Badge variant="silver" size="sm">Standard Panel</Badge>
            <h4 className="text-sm font-medium text-white">Reference Cinema Panel</h4>
            <p className="text-xs text-slate-400 font-light">
              Calibrated backdrop blur (12px) with hairline border and soft ambient shadow.
            </p>
          </GlassPanel>

          <GlassPanel
            variant="interactive"
            padding="md"
            className="space-y-2"
            onClick={() => triggerToast('Interactive glass panel clicked')}
          >
            <Badge variant="sync" size="sm">Interactive Panel</Badge>
            <h4 className="text-sm font-medium text-white">Hover Responsive</h4>
            <p className="text-xs text-slate-400 font-light">
              Elevates slightly on hover with subtle border luminance. Click to test.
            </p>
          </GlassPanel>
        </div>
      </section>

      {/* 5. MediaCard (Poster & Backdrop Ratios) */}
      <section className="space-y-4">
        <SectionHeader
          kicker="05 / Catalog Items"
          title="MediaCard Component"
          subtitle="Precision aspect ratios: 2:3 Poster Frame and 16:9 Cinematic Backdrop."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-[11px] font-mono text-slate-400 mb-2">Aspect: Poster (2:3)</p>
            <MediaCard
              media={FEATURED_HERO_MEDIA}
              aspectRatio="poster"
              onPlay={() => triggerToast(`Playing ${FEATURED_HERO_MEDIA.title}`)}
              onToggleSave={() => triggerToast('Toggled watchlist')}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-3">
            <p className="text-[11px] font-mono text-slate-400 mb-2">Aspect: Backdrop (16:9)</p>
            <MediaCard
              media={FEATURED_HERO_MEDIA}
              aspectRatio="backdrop"
              onPlay={() => triggerToast(`Playing ${FEATURED_HERO_MEDIA.title}`)}
              onToggleSave={() => triggerToast('Toggled watchlist')}
            />
          </div>
        </div>
      </section>

      {/* 6. Avatar, Progress & Skeletons */}
      <section className="space-y-4">
        <SectionHeader
          kicker="06 / Presence & Loading"
          title="Avatar, ProgressBar & Skeleton Components"
          subtitle="Understated profile avatars, streaming progress bars, and shimmer loaders."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Avatars */}
          <GlassPanel variant="standard" padding="md" className="space-y-4">
            <p className="text-xs font-mono text-slate-400">Avatar Sizes & Presence</p>
            <div className="flex items-center gap-4">
              <Avatar profile={PROFILES.dinu} size="sm" />
              <Avatar profile={PROFILES.dinu} size="md" />
              <Avatar profile={PROFILES.kanmani} size="lg" />
              <Avatar profile={PROFILES.kanmani} size="xl" />
            </div>
            <p className="text-xs text-slate-400 font-light">
              Understated initials with presence dot for Dinu & Kanmani.
            </p>
          </GlassPanel>

          {/* Progress Bars */}
          <GlassPanel variant="standard" padding="md" className="space-y-4">
            <p className="text-xs font-mono text-slate-400">ProgressBar Variants</p>
            <div className="space-y-3">
              <ProgressBar progress={68} size="xs" variant="silver" showLabel label="Buffer" />
              <ProgressBar progress={82} size="sm" variant="accent" showLabel label="Dune: Part Two" />
              <ProgressBar progress={45} size="md" variant="subtle" showLabel label="Sync Stream" />
            </div>
          </GlassPanel>

          {/* Skeletons */}
          <GlassPanel variant="standard" padding="md" className="space-y-3">
            <p className="text-xs font-mono text-slate-400">Skeleton Loading States</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Skeleton variant="avatar" className="w-8 h-8" />
                <div className="space-y-1 flex-1">
                  <Skeleton variant="text" className="h-3 w-3/4" />
                  <Skeleton variant="text" className="h-2 w-1/2" />
                </div>
              </div>
              <Skeleton variant="card" className="h-16 w-full rounded" />
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* Interactive Trigger Callout */}
      <div className="p-6 rounded-xl bg-[#090e17] border border-slate-400/[0.12] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Ready to test live components?
          </h3>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Click any button, modal trigger, queue drawer, or toast action to verify responsiveness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="silver"
            size="sm"
            onClick={() => triggerToast('Private Cinema System Operational')}
          >
            Trigger Toast
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Open Modal
          </Button>
        </div>
      </div>
    </div>
  );
};
