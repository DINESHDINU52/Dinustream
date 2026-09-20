'use client';

import React from 'react';

export const AmbientBackdrop: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* Top Center Subtle Midnight Blue Bloom */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[160px] opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(25, 42, 70, 0.45) 0%, transparent 70%)',
        }}
      />

      {/* Top Right Restrained Atmospheric Sheen */}
      <div
        className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full blur-[180px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(30, 48, 80, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Base Deep Obsidian Vignette */}
      <div
        className="absolute bottom-0 inset-x-0 h-[300px]"
        style={{
          background: 'linear-gradient(to top, #06080d 0%, transparent 100%)',
        }}
      />
    </div>
  );
};
