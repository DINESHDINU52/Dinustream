import fs from 'fs';
import path from 'path';

const characters = [
  // ================= MARVEL =================
  {
    id: 'iron-man',
    name: 'Iron Man',
    category: 'Marvel',
    tagline: 'Tony Stark • Mark 85',
    quote: 'I am Iron Man.',
    franchise: 'Marvel Studios',
    accentColor: '#e50914',
    glowColor: 'rgba(229, 9, 20, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_iron" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#4a0004"/>
          <stop offset="100%" stop-color="#0e0002"/>
        </radialGradient>
        <linearGradient id="gold_iron" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffd700"/>
          <stop offset="100%" stop-color="#d4af37"/>
        </linearGradient>
        <linearGradient id="red_iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff1a2b"/>
          <stop offset="100%" stop-color="#99000a"/>
        </linearGradient>
        <filter id="glow_iron">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_iron)"/>
      <path d="M35 30 C35 15, 85 15, 85 30 L88 65 C88 88, 70 102, 60 106 C50 102, 32 88, 32 65 Z" fill="url(#red_iron)" stroke="#ff4d5a" stroke-width="1.5"/>
      <path d="M42 36 L78 36 L76 76 L60 92 L44 76 Z" fill="url(#gold_iron)" opacity="0.95"/>
      <path d="M46 36 L60 48 L74 36" fill="none" stroke="#99000a" stroke-width="2"/>
      <path d="M44 58 L52 64 L68 64 L76 58" fill="none" stroke="#99000a" stroke-width="1.5"/>
      <polygon points="46,54 57,56 56,60 47,58" fill="#58d9ff" filter="url(#glow_iron)"/>
      <polygon points="74,54 63,56 64,60 73,58" fill="#58d9ff" filter="url(#glow_iron)"/>
      <line x1="53" y1="80" x2="67" y2="80" stroke="#800000" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="60,98 52,90 68,90" fill="#99000a"/>
    </svg>`
  },
  {
    id: 'spider-man',
    name: 'Spider-Man',
    category: 'Marvel',
    tagline: 'Miles Morales • Web-Warrior',
    quote: 'Anyone can wear the mask.',
    franchise: 'Marvel Studios',
    accentColor: '#ff003c',
    glowColor: 'rgba(255, 0, 60, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_spidey" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1f0307"/>
          <stop offset="100%" stop-color="#0a0102"/>
        </radialGradient>
        <filter id="glow_spidey">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_spidey)"/>
      <path d="M34 38 C34 16, 86 16, 86 38 C86 64, 82 85, 60 104 C38 85, 34 64, 34 38 Z" fill="#b30018" stroke="#ff2a43" stroke-width="1.5"/>
      <line x1="60" y1="20" x2="60" y2="104" stroke="#1a0004" stroke-width="1.5" opacity="0.6"/>
      <line x1="34" y1="40" x2="86" y2="40" stroke="#1a0004" stroke-width="1.2" opacity="0.5"/>
      <line x1="38" y1="65" x2="82" y2="65" stroke="#1a0004" stroke-width="1.2" opacity="0.5"/>
      <path d="M42 30 Q60 42 78 30" fill="none" stroke="#1a0004" stroke-width="1.2" opacity="0.6"/>
      <path d="M38 52 Q60 68 82 52" fill="none" stroke="#1a0004" stroke-width="1.2" opacity="0.6"/>
      <path d="M44 76 Q60 90 76 76" fill="none" stroke="#1a0004" stroke-width="1.2" opacity="0.6"/>
      <path d="M40 45 Q55 42 57 60 Q48 68 39 58 Z" fill="#080808" stroke="#000" stroke-width="3"/>
      <path d="M80 45 Q65 42 63 60 Q72 68 81 58 Z" fill="#080808" stroke="#000" stroke-width="3"/>
      <path d="M42 47 Q53 45 55 58 Q48 65 41 57 Z" fill="#ffffff" filter="url(#glow_spidey)"/>
      <path d="M78 47 Q67 45 65 58 Q72 65 79 57 Z" fill="#ffffff" filter="url(#glow_spidey)"/>
    </svg>`
  },
  {
    id: 'deadpool',
    name: 'Deadpool',
    category: 'Marvel',
    tagline: 'Wade Wilson • Merc with a Mouth',
    quote: 'Maximum effort!',
    franchise: 'Marvel Studios',
    accentColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_dp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b0307"/>
          <stop offset="100%" stop-color="#0c0102"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_dp)"/>
      <!-- Mask Base -->
      <path d="M34 38 C34 16, 86 16, 86 38 C86 64, 82 85, 60 104 C38 85, 34 64, 34 38 Z" fill="#be123c" stroke="#e11d48" stroke-width="1.5"/>
      <!-- Black Eye Patches -->
      <path d="M40 38 C54 36, 56 68, 42 72 C34 66, 32 46, 40 38 Z" fill="#18181b" stroke="#09090b" stroke-width="1.5"/>
      <path d="M80 38 C66 36, 64 68, 78 72 C86 66, 88 46, 80 38 Z" fill="#18181b" stroke="#09090b" stroke-width="1.5"/>
      <!-- Expressive Squint Eyes -->
      <ellipse cx="46" cy="52" rx="4.5" ry="3" fill="#ffffff" transform="rotate(-10 46 52)"/>
      <ellipse cx="74" cy="52" rx="3.5" ry="4.5" fill="#ffffff" transform="rotate(10 74 52)"/>
      <!-- Center Seam -->
      <line x1="60" y1="20" x2="60" y2="104" stroke="#881337" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'wolverine',
    name: 'Wolverine',
    category: 'Marvel',
    tagline: 'Logan • Weapon X',
    quote: "I'm the best there is at what I do.",
    franchise: 'Marvel Studios',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_wolv" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#332204"/>
          <stop offset="100%" stop-color="#0a0701"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_wolv)"/>
      <!-- Signature Cowl Wings Black -->
      <path d="M38 58 C22 30, 16 12, 12 6 C18 18, 30 40, 44 52 Z" fill="#09090b" stroke="#27272a" stroke-width="1"/>
      <path d="M82 58 C98 30, 104 12, 108 6 C102 18, 90 40, 76 52 Z" fill="#09090b" stroke="#27272a" stroke-width="1"/>
      <!-- Yellow Mask Face -->
      <path d="M40 40 C40 24, 80 24, 80 40 L80 66 C80 82, 70 96, 60 98 C50 96, 40 82, 40 66 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
      <!-- Cowl Face Eye Accents Black -->
      <polygon points="40,54 58,48 56,60 42,66" fill="#09090b"/>
      <polygon points="80,54 62,48 64,60 78,66" fill="#09090b"/>
      <!-- Angry White Slit Eyes -->
      <polygon points="44,56 54,52 52,58 45,60" fill="#ffffff"/>
      <polygon points="76,56 66,52 68,58 75,60" fill="#ffffff"/>
      <!-- Stubble Chin -->
      <polygon points="54,82 66,82 64,92 56,92" fill="#d4a373"/>
      <line x1="56" y1="88" x2="64" y2="88" stroke="#1c1917" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'loki',
    name: 'Loki',
    category: 'Marvel',
    tagline: 'God of Stories & Mischief',
    quote: 'Glorious purpose!',
    franchise: 'Marvel Studios',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_loki" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#022919"/>
          <stop offset="100%" stop-color="#010e08"/>
        </radialGradient>
        <linearGradient id="gold_loki" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe259"/>
          <stop offset="100%" stop-color="#ffa751"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_loki)"/>
      <path d="M40 50 C25 20, 10 15, 8 8 C15 16, 30 35, 48 45 Z" fill="url(#gold_loki)" stroke="#ffd700" stroke-width="1"/>
      <path d="M80 50 C95 20, 110 15, 112 8 C105 16, 90 35, 72 45 Z" fill="url(#gold_loki)" stroke="#ffd700" stroke-width="1"/>
      <path d="M38 52 L60 38 L82 52 L76 62 L60 56 L44 62 Z" fill="url(#gold_loki)" stroke="#e5a93b" stroke-width="1"/>
      <polygon points="60,45 64,51 60,57 56,51" fill="#34d399"/>
      <path d="M46 60 C46 54, 74 54, 74 60 C74 78, 68 88, 60 94 C52 88, 46 78, 46 60 Z" fill="#0d1f15" stroke="#10b981" stroke-width="1.5"/>
      <path d="M50 70 Q55 67 58 70" stroke="#34d399" stroke-width="2" fill="none"/>
      <path d="M70 70 Q65 67 62 70" stroke="#34d399" stroke-width="2" fill="none"/>
      <path d="M54 84 Q62 88 68 82" stroke="#10b981" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'thor',
    name: 'Thor',
    category: 'Marvel',
    tagline: 'God of Thunder • Asgard',
    quote: 'Bring me Thanos!',
    franchise: 'Marvel Studios',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_thor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#04263e"/>
          <stop offset="100%" stop-color="#020d17"/>
        </radialGradient>
        <filter id="glow_thor">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_thor)"/>
      <path d="M20 20 L40 45 L32 55 L52 80" stroke="#38bdf8" stroke-width="1.5" fill="none" opacity="0.4" filter="url(#glow_thor)"/>
      <path d="M100 20 L80 45 L88 55 L68 85" stroke="#38bdf8" stroke-width="1.5" fill="none" opacity="0.4" filter="url(#glow_thor)"/>
      <path d="M34 50 C24 35, 20 20, 24 15 C30 25, 34 38, 42 46 Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1"/>
      <path d="M86 50 C96 35, 100 20, 96 15 C90 25, 86 38, 78 46 Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1"/>
      <path d="M42 45 C42 28, 78 28, 78 45 L76 68 C76 86, 68 96, 60 98 C52 96, 44 86, 44 68 Z" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
      <path d="M46 52 L60 46 L74 52 L63 68 L60 76 L57 68 Z" fill="#475569" stroke="#94a3b8" stroke-width="1"/>
      <ellipse cx="52" cy="60" rx="3.5" ry="2" fill="#7dd3fc" filter="url(#glow_thor)"/>
      <ellipse cx="68" cy="60" rx="3.5" ry="2" fill="#7dd3fc" filter="url(#glow_thor)"/>
    </svg>`
  },
  {
    id: 'black-panther',
    name: 'Black Panther',
    category: 'Marvel',
    tagline: "King T'Challa • Wakanda",
    quote: 'Wakanda Forever!',
    franchise: 'Marvel Studios',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_bp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#240738"/>
          <stop offset="100%" stop-color="#08010d"/>
        </radialGradient>
        <filter id="glow_bp">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_bp)"/>
      <!-- Panther Ears -->
      <polygon points="36,46 32,22 46,34" fill="#09090b" stroke="#3f3f46" stroke-width="1"/>
      <polygon points="84,46 88,22 74,34" fill="#09090b" stroke="#3f3f46" stroke-width="1"/>
      <!-- Head Mask -->
      <path d="M36 40 C36 24, 84 24, 84 40 L84 70 C84 88, 72 102, 60 104 C48 102, 36 88, 36 70 Z" fill="#18181b" stroke="#27272a" stroke-width="1.5"/>
      <!-- Vibranium Purple Lines -->
      <path d="M46 32 L60 44 L74 32" fill="none" stroke="#a855f7" stroke-width="1.5" filter="url(#glow_bp)"/>
      <path d="M42 56 L52 64 L68 64 L78 56" fill="none" stroke="#a855f7" stroke-width="1.5" filter="url(#glow_bp)"/>
      <!-- Silver Tooth Necklace Outline -->
      <polygon points="60,98 56,88 64,88" fill="#e4e4e7"/>
      <polygon points="50,94 48,86 54,87" fill="#e4e4e7"/>
      <polygon points="70,94 72,86 66,87" fill="#e4e4e7"/>
      <!-- Glowing Eyes -->
      <polygon points="46,50 56,52 54,58 45,56" fill="#c084fc" filter="url(#glow_bp)"/>
      <polygon points="74,50 64,52 66,58 75,56" fill="#c084fc" filter="url(#glow_bp)"/>
    </svg>`
  },

  // ================= STAR WARS =================
  {
    id: 'darth-vader',
    name: 'Darth Vader',
    category: 'Star Wars',
    tagline: 'Lord Vader • Galactic Empire',
    quote: 'You underestimate the power of the dark side.',
    franchise: 'Lucasfilm',
    accentColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.5)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_vader" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2a0003"/>
          <stop offset="100%" stop-color="#080808"/>
        </radialGradient>
        <filter id="glow_vader">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_vader)"/>
      <path d="M24 78 C24 40, 36 18, 60 18 C84 18, 96 40, 96 78 C98 88, 88 90, 84 84 C80 60, 76 38, 60 38 C44 38, 40 60, 36 84 C32 90, 22 88, 24 78 Z" fill="#171717" stroke="#333" stroke-width="1.5"/>
      <path d="M42 48 Q60 54 78 48 Q82 62 76 65 Q60 62 44 65 Z" fill="#050505" stroke="#ef4444" stroke-width="1" filter="url(#glow_vader)"/>
      <polygon points="46,52 56,53 54,60 45,59" fill="#7f1d1d"/>
      <polygon points="74,52 64,53 66,60 75,59" fill="#7f1d1d"/>
      <polygon points="60,66 72,92 48,92" fill="#1c1917" stroke="#44403c" stroke-width="1.5"/>
      <line x1="54" y1="78" x2="66" y2="78" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="51" y1="84" x2="69" y2="84" stroke="#78716c" stroke-width="1.5"/>
      <line x1="49" y1="90" x2="71" y2="90" stroke="#78716c" stroke-width="1.5"/>
      <circle cx="48" cy="94" r="2.5" fill="#a8a29e"/>
      <circle cx="72" cy="94" r="2.5" fill="#a8a29e"/>
    </svg>`
  },
  {
    id: 'mandalorian',
    name: 'The Mandalorian',
    category: 'Star Wars',
    tagline: 'Din Djarin • Beskar Armor',
    quote: 'This is the way.',
    franchise: 'Lucasfilm',
    accentColor: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_mando" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#090d16"/>
        </radialGradient>
        <linearGradient id="beskar_mando" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f1f5f9"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_mando)"/>
      <path d="M38 32 C38 18, 82 18, 82 32 L84 66 C84 88, 72 100, 60 102 C48 100, 36 88, 36 66 Z" fill="url(#beskar_mando)" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M40 68 L50 82 L46 92 Z" fill="#1e293b" opacity="0.8"/>
      <path d="M80 68 L70 82 L74 92 Z" fill="#1e293b" opacity="0.8"/>
      <polygon points="44,50 76,50 75,56 63,56 63,84 57,84 57,56 45,56" fill="#020617" stroke="#0f172a" stroke-width="2"/>
      <line x1="48" y1="52" x2="54" y2="52" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    </svg>`
  },
  {
    id: 'grogu',
    name: 'Grogu',
    category: 'Star Wars',
    tagline: 'The Child • Clan of Two',
    quote: 'Patu!',
    franchise: 'Lucasfilm',
    accentColor: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_grogu" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#14331e"/>
          <stop offset="100%" stop-color="#050e08"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_grogu)"/>
      <!-- Huge Pointy Ears -->
      <path d="M42 56 C24 50, 6 62, 2 68 C12 60, 28 66, 42 68 Z" fill="#86efac" stroke="#4ade80" stroke-width="1"/>
      <path d="M78 56 C96 50, 114 62, 118 68 C108 60, 92 66, 78 68 Z" fill="#86efac" stroke="#4ade80" stroke-width="1"/>
      <!-- Inner Pink Ears -->
      <path d="M38 58 C26 56, 12 64, 8 67 C16 63, 26 66, 36 67 Z" fill="#fda4af" opacity="0.75"/>
      <path d="M82 58 C94 56, 108 64, 112 67 C104 63, 94 66, 84 67 Z" fill="#fda4af" opacity="0.75"/>
      <!-- Head -->
      <ellipse cx="60" cy="62" rx="22" ry="18" fill="#86efac" stroke="#4ade80" stroke-width="1"/>
      <!-- Soulful Glossy Black Eyes -->
      <circle cx="50" cy="60" r="6" fill="#09090b"/>
      <circle cx="70" cy="60" r="6" fill="#09090b"/>
      <circle cx="48" cy="58" r="2" fill="#ffffff"/>
      <circle cx="68" cy="58" r="2" fill="#ffffff"/>
      <!-- Tiny Smile -->
      <path d="M57 70 Q60 72 63 70" stroke="#166534" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <!-- Fluffy Beige Robe Collar -->
      <path d="M38 78 Q60 72 82 78 L86 106 Q60 112 34 106 Z" fill="#d4b483" stroke="#b08968" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'stormtrooper',
    name: 'Stormtrooper',
    category: 'Star Wars',
    tagline: 'Imperial Legion • TK-421',
    quote: 'Move along.',
    franchise: 'Lucasfilm',
    accentColor: '#e2e8f0',
    glowColor: 'rgba(226, 232, 240, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_st" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_st)"/>
      <!-- Helmet Outer Dome -->
      <path d="M36 42 C36 20, 84 20, 84 42 L88 74 C88 94, 76 102, 60 102 C44 102, 32 94, 32 74 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <!-- Black Brow Line -->
      <line x1="36" y1="42" x2="84" y2="42" stroke="#09090b" stroke-width="3"/>
      <!-- Grey Lens Visor / Eyes -->
      <polygon points="42,50 56,52 54,58 44,56" fill="#0f172a"/>
      <polygon points="78,50 64,52 66,58 76,56" fill="#0f172a"/>
      <!-- Cheek Indents / Black Grilles -->
      <polygon points="38,68 46,74 44,82 36,78" fill="#334155"/>
      <polygon points="82,68 74,74 76,82 84,78" fill="#334155"/>
      <!-- Nose & Mouth Vocoder -->
      <polygon points="60,68 67,86 53,86" fill="#09090b"/>
      <circle cx="50" cy="94" r="3" fill="#64748b"/>
      <circle cx="70" cy="94" r="3" fill="#64748b"/>
    </svg>`
  },

  // ================= CINEMA ICONS =================
  {
    id: 'batman',
    name: 'The Dark Knight',
    category: 'Cinema Icons',
    tagline: 'Bruce Wayne • Gotham Vigilante',
    quote: 'I am vengeance. I am the night.',
    franchise: 'DC Films',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_bat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#181308"/>
          <stop offset="100%" stop-color="#050505"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_bat)"/>
      <polygon points="36,65 30,16 48,46" fill="#1a1a1a" stroke="#262626" stroke-width="1"/>
      <polygon points="84,65 90,16 72,46" fill="#1a1a1a" stroke="#262626" stroke-width="1"/>
      <path d="M38 52 C38 35, 82 35, 82 52 L84 76 C84 94, 72 102, 60 104 C48 102, 36 94, 36 76 Z" fill="#0f0f0f" stroke="#262626" stroke-width="1.5"/>
      <polygon points="60,60 63,74 57,74" fill="#262626"/>
      <polygon points="44,60 55,64 53,68 45,66" fill="#ffffff" opacity="0.95"/>
      <polygon points="76,60 65,64 67,68 75,66" fill="#ffffff" opacity="0.95"/>
      <path d="M50 82 L70 82 L66 94 L54 94 Z" fill="#d4a373" stroke="#0a0a0a" stroke-width="2"/>
      <line x1="56" y1="88" x2="64" y2="88" stroke="#8c5836" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'joker',
    name: 'The Joker',
    category: 'Cinema Icons',
    tagline: 'Clown Prince of Crime',
    quote: 'Why so serious?',
    franchise: 'DC Films',
    accentColor: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_joker" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2a083b"/>
          <stop offset="100%" stop-color="#0d0114"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_joker)"/>
      <!-- Wild Acid Green Hair -->
      <path d="M30 45 C25 18, 95 18, 90 45 C96 65, 88 80, 84 84 C80 62, 78 40, 72 34 C64 26, 50 28, 46 36 C42 46, 38 68, 30 45 Z" fill="#65a30d" stroke="#84cc16" stroke-width="1"/>
      <!-- Pale White Face -->
      <path d="M42 42 C42 34, 78 34, 78 42 L78 72 C78 88, 70 96, 60 98 C50 96, 42 88, 42 72 Z" fill="#f4f4f5"/>
      <!-- Dark Smudged Eyes -->
      <ellipse cx="50" cy="54" rx="6" ry="5" fill="#27272a"/>
      <ellipse cx="70" cy="54" rx="6" ry="5" fill="#27272a"/>
      <circle cx="51" cy="54" r="2" fill="#ffffff"/>
      <circle cx="69" cy="54" r="2" fill="#ffffff"/>
      <!-- Manic Glasgow Smile Crimson -->
      <path d="M42 74 Q60 88 78 74" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 76 Q60 80 72 76" fill="none" stroke="#991b1b" stroke-width="2"/>
    </svg>`
  },
  {
    id: 'john-wick',
    name: 'John Wick',
    category: 'Cinema Icons',
    tagline: 'Baba Yaga • Continental Legend',
    quote: 'Yeah, I’m thinking I’m back.',
    franchise: 'Lionsgate',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_wick" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0c1d2e"/>
          <stop offset="100%" stop-color="#030710"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_wick)"/>
      <path d="M34 45 C32 20, 88 20, 86 45 C90 70, 88 88, 86 94 C82 80, 80 50, 76 42 C72 35, 48 35, 44 42 C40 50, 38 80, 34 94 Z" fill="#090a0f" stroke="#1e293b" stroke-width="1"/>
      <path d="M44 46 C44 40, 76 40, 76 46 L76 74 C76 86, 68 96, 60 98 C52 96, 44 86, 44 74 Z" fill="#d4a373"/>
      <path d="M48 58 Q54 56 57 58" stroke="#1e293b" stroke-width="2" fill="none"/>
      <path d="M72 58 Q66 56 63 58" stroke="#1e293b" stroke-width="2" fill="none"/>
      <circle cx="53" cy="62" r="2" fill="#0f172a"/>
      <circle cx="67" cy="62" r="2" fill="#0f172a"/>
      <path d="M46 76 C46 88, 52 96, 60 96 C68 96, 74 88, 74 76 C70 80, 50 80, 46 76 Z" fill="#1c1917" opacity="0.85"/>
      <line x1="55" y1="74" x2="65" y2="74" stroke="#1c1917" stroke-width="2"/>
      <polygon points="40,105 52,94 60,108 68,94 80,105 84,120 36,120" fill="#090a0f"/>
      <polygon points="57,98 63,98 62,118 58,118" fill="#111827"/>
    </svg>`
  },
  {
    id: 'neo',
    name: 'Neo',
    category: 'Cinema Icons',
    tagline: 'Thomas Anderson • The One',
    quote: 'I know kung fu.',
    franchise: 'Warner Bros',
    accentColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_neo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#022c15"/>
          <stop offset="100%" stop-color="#000d05"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_neo)"/>
      <!-- Digital Matrix Code Rain Lines -->
      <line x1="20" y1="10" x2="20" y2="40" stroke="#22c55e" stroke-width="1" stroke-dasharray="2 4" opacity="0.4"/>
      <line x1="100" y1="20" x2="100" y2="70" stroke="#22c55e" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>
      <!-- Slicked Black Hair -->
      <path d="M40 38 C40 22, 80 22, 80 38 L82 50 C82 52, 78 50, 76 46 C70 42, 50 42, 44 46 C42 50, 38 52, 38 50 Z" fill="#09090b"/>
      <!-- Face -->
      <path d="M42 46 C42 40, 78 40, 78 46 L78 72 C78 88, 70 96, 60 98 C50 96, 42 88, 42 72 Z" fill="#d4a373"/>
      <!-- Iconic Rimless Dark Sunglasses -->
      <ellipse cx="50" cy="56" rx="9" ry="5.5" fill="#09090b" stroke="#16a34a" stroke-width="0.8"/>
      <ellipse cx="70" cy="56" rx="9" ry="5.5" fill="#09090b" stroke="#16a34a" stroke-width="0.8"/>
      <line x1="59" y1="56" x2="61" y2="56" stroke="#18181b" stroke-width="1.5"/>
      <line x1="45" y1="55" x2="55" y2="55" stroke="#4ade80" stroke-width="1" opacity="0.7"/>
      <line x1="65" y1="55" x2="75" y2="55" stroke="#4ade80" stroke-width="1" opacity="0.7"/>
      <!-- Mouth line -->
      <line x1="55" y1="78" x2="65" y2="78" stroke="#78350f" stroke-width="1.5"/>
      <!-- High Collar Black Trench Coat -->
      <polygon points="36,104 48,94 60,102 72,94 84,104 88,120 32,120" fill="#09090b"/>
    </svg>`
  },

  // ================= SCI-FI =================
  {
    id: 'dune-paul',
    name: 'Paul Atreides',
    category: 'Sci-Fi',
    tagline: "Muad'Dib • Arrakis",
    quote: 'Fear is the mind-killer.',
    franchise: 'Legendary',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_dune" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3d1b06"/>
          <stop offset="100%" stop-color="#140702"/>
        </radialGradient>
        <filter id="glow_dune">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_dune)"/>
      <path d="M34 50 C30 20, 90 20, 86 50 C92 70, 88 88, 86 96 C82 80, 78 52, 74 44 C68 36, 52 36, 46 44 C42 52, 38 80, 34 96 Z" fill="#1c140e"/>
      <path d="M44 48 C44 40, 76 40, 76 48 L76 74 C76 86, 68 94, 60 96 C52 94, 44 86, 44 74 Z" fill="#d6a782"/>
      <ellipse cx="52" cy="62" rx="4" ry="2.5" fill="#00d2ff" filter="url(#glow_dune)"/>
      <ellipse cx="68" cy="62" rx="4" ry="2.5" fill="#00d2ff" filter="url(#glow_dune)"/>
      <circle cx="52" cy="62" r="1.5" fill="#ffffff"/>
      <circle cx="68" cy="62" r="1.5" fill="#ffffff"/>
      <path d="M52 68 Q56 74 58 75" fill="none" stroke="#292524" stroke-width="2" stroke-linecap="round"/>
      <rect x="54" y="74" width="12" height="14" rx="3" fill="#292524" stroke="#44403c" stroke-width="1"/>
      <circle cx="60" cy="81" r="2" fill="#78716c"/>
    </svg>`
  },
  {
    id: 'interstellar',
    name: 'Cooper',
    category: 'Sci-Fi',
    tagline: 'Endurance Pilot • Interstellar',
    quote: 'Mankind was born on Earth. It was never meant to die here.',
    franchise: 'Syncopy',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_space" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#02182b"/>
          <stop offset="100%" stop-color="#010811"/>
        </radialGradient>
        <linearGradient id="gold_visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe259"/>
          <stop offset="40%" stop-color="#ffa751"/>
          <stop offset="100%" stop-color="#4a2800"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_space)"/>
      <ellipse cx="60" cy="60" rx="36" ry="38" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <ellipse cx="60" cy="58" rx="26" ry="24" fill="url(#gold_visor)" stroke="#1e293b" stroke-width="2"/>
      <path d="M42 56 Q60 48 78 56 Q60 68 42 56 Z" fill="#000000" opacity="0.65"/>
      <circle cx="60" cy="58" r="4" fill="#ffffff" opacity="0.8"/>
      <path d="M38 90 L82 90 L86 106 L34 106 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
      <rect x="52" y="94" width="16" height="6" rx="2" fill="#0284c7"/>
    </svg>`
  },
  {
    id: 'cyber-ronin',
    name: 'Cyber Ronin',
    category: 'Sci-Fi',
    tagline: 'Neo Tokyo 2077 • Holographic Ghost',
    quote: 'Wake up, samurai.',
    franchise: 'Cyber Cinema',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <radialGradient id="bg_cyber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2d062e"/>
          <stop offset="100%" stop-color="#0a010a"/>
        </radialGradient>
        <filter id="glow_cyber">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="120" rx="20" fill="url(#bg_cyber)"/>
      <!-- Cyber Oni Horns -->
      <polygon points="38,44 26,18 46,36" fill="#ec4899" filter="url(#glow_cyber)"/>
      <polygon points="82,44 94,18 74,36" fill="#ec4899" filter="url(#glow_cyber)"/>
      <!-- Mask Base -->
      <path d="M38 42 C38 28, 82 28, 82 42 L82 72 C82 92, 70 102, 60 104 C50 102, 38 92, 38 72 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5"/>
      <!-- Neon Cyan Visor Bar -->
      <rect x="42" y="52" width="36" height="8" rx="2" fill="#06b6d4" filter="url(#glow_cyber)"/>
      <!-- Oni Teeth Grille -->
      <path d="M48 76 L72 76 L68 88 L52 88 Z" fill="#09090b" stroke="#ec4899" stroke-width="1.5"/>
      <line x1="54" y1="76" x2="54" y2="88" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="60" y1="76" x2="60" y2="88" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="66" y1="76" x2="66" y2="88" stroke="#ffffff" stroke-width="1.5"/>
    </svg>`
  }
];

// 1. Write individual SVGs to public/avatars/characters/
const outDir = path.resolve('public/avatars/characters');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const char of characters) {
  const filePath = path.join(outDir, `${char.id}.svg`);
  fs.writeFileSync(filePath, char.svg.trim(), 'utf-8');
}
console.log(`Successfully wrote ${characters.length} SVGs to ${outDir}`);

// 2. Generate lib/constants/avatars.ts
function svgToUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim().replace(/\s+/g, ' '))}`;
}

const avatarsCode = `export interface CharacterAvatar {
  id: string;
  name: string;
  category: 'Marvel' | 'Star Wars' | 'Cinema Icons' | 'Sci-Fi';
  tagline: string;
  quote: string;
  franchise: string;
  accentColor: string;
  glowColor: string;
  avatarUrl: string;
  svgDataUri: string;
}

export const PREMIUM_AVATARS: CharacterAvatar[] = ${JSON.stringify(
  characters.map((c) => ({
    ...c,
    avatarUrl: `/avatars/characters/${c.id}.svg`,
    svgDataUri: svgToUri(c.svg),
    svg: undefined,
  })),
  null,
  2
)};

export const AVATAR_CATEGORIES = ['All', 'Marvel', 'Star Wars', 'Cinema Icons', 'Sci-Fi'] as const;
export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];
`;

fs.writeFileSync(path.resolve('lib/constants/avatars.ts'), avatarsCode, 'utf-8');
console.log('Successfully updated lib/constants/avatars.ts');
