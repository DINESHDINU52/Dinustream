'use client';

import React from 'react';

/**
 * Fixed ambient lighting behind the page shell.
 *
 * Deliberately restrained. The previous version ended with a 300px
 * `linear-gradient(to top, #06080d, transparent)` pinned to the bottom of the
 * viewport, which permanently laid an opaque black wash over the lower third of
 * whatever was on screen — including hero artwork and the first row of posters.
 * Combined with the hero's own gradients it produced the dead black band below
 * the fold. The vignette is gone; the two colour blooms remain because they sit
 * behind content (`-z-10`) and only tint the empty background.
 */
export const AmbientBackdrop: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
      {/* Top-centre midnight bloom — sized in viewport units so it scales down
          on phones instead of washing out a 360px-wide screen. */}
      <div
        className="absolute -top-[20vh] left-1/2 -translate-x-1/2 w-[120vw] max-w-[900px] h-[55vh] max-h-[500px] rounded-full blur-[120px] opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(25, 42, 70, 0.45) 0%, transparent 70%)',
        }}
      />

      {/* Upper-right atmospheric sheen */}
      <div
        className="absolute top-1/4 -right-[15vw] w-[70vw] max-w-[600px] h-[70vw] max-h-[600px] rounded-full blur-[140px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(30, 48, 80, 0.3) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};
