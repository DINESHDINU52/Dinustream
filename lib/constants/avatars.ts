export interface CharacterAvatar {
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

export const PREMIUM_AVATARS: CharacterAvatar[] = [
  {
    "id": "iron-man",
    "name": "Iron Man",
    "category": "Marvel",
    "tagline": "Tony Stark • Mark 85",
    "quote": "I am Iron Man.",
    "franchise": "Marvel Studios",
    "accentColor": "#e50914",
    "glowColor": "rgba(229, 9, 20, 0.45)",
    "avatarUrl": "/avatars/characters/iron-man.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_iron%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234a0004%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230e0002%22%2F%3E%20%3C%2FradialGradient%3E%20%3ClinearGradient%20id%3D%22gold_iron%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffd700%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23d4af37%22%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D%22red_iron%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ff1a2b%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2399000a%22%2F%3E%20%3C%2FlinearGradient%3E%20%3Cfilter%20id%3D%22glow_iron%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%222.5%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_iron)%22%2F%3E%20%3Cpath%20d%3D%22M35%2030%20C35%2015%2C%2085%2015%2C%2085%2030%20L88%2065%20C88%2088%2C%2070%20102%2C%2060%20106%20C50%20102%2C%2032%2088%2C%2032%2065%20Z%22%20fill%3D%22url(%23red_iron)%22%20stroke%3D%22%23ff4d5a%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M42%2036%20L78%2036%20L76%2076%20L60%2092%20L44%2076%20Z%22%20fill%3D%22url(%23gold_iron)%22%20opacity%3D%220.95%22%2F%3E%20%3Cpath%20d%3D%22M46%2036%20L60%2048%20L74%2036%22%20fill%3D%22none%22%20stroke%3D%22%2399000a%22%20stroke-width%3D%222%22%2F%3E%20%3Cpath%20d%3D%22M44%2058%20L52%2064%20L68%2064%20L76%2058%22%20fill%3D%22none%22%20stroke%3D%22%2399000a%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpolygon%20points%3D%2246%2C54%2057%2C56%2056%2C60%2047%2C58%22%20fill%3D%22%2358d9ff%22%20filter%3D%22url(%23glow_iron)%22%2F%3E%20%3Cpolygon%20points%3D%2274%2C54%2063%2C56%2064%2C60%2073%2C58%22%20fill%3D%22%2358d9ff%22%20filter%3D%22url(%23glow_iron)%22%2F%3E%20%3Cline%20x1%3D%2253%22%20y1%3D%2280%22%20x2%3D%2267%22%20y2%3D%2280%22%20stroke%3D%22%23800000%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%2F%3E%20%3Cpolygon%20points%3D%2260%2C98%2052%2C90%2068%2C90%22%20fill%3D%22%2399000a%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "spider-man",
    "name": "Spider-Man",
    "category": "Marvel",
    "tagline": "Miles Morales • Web-Warrior",
    "quote": "Anyone can wear the mask.",
    "franchise": "Marvel Studios",
    "accentColor": "#ff003c",
    "glowColor": "rgba(255, 0, 60, 0.45)",
    "avatarUrl": "/avatars/characters/spider-man.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_spidey%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231f0307%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230a0102%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_spidey%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%222.5%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_spidey)%22%2F%3E%20%3Cpath%20d%3D%22M34%2038%20C34%2016%2C%2086%2016%2C%2086%2038%20C86%2064%2C%2082%2085%2C%2060%20104%20C38%2085%2C%2034%2064%2C%2034%2038%20Z%22%20fill%3D%22%23b30018%22%20stroke%3D%22%23ff2a43%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2260%22%20y1%3D%2220%22%20x2%3D%2260%22%20y2%3D%22104%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.5%22%20opacity%3D%220.6%22%2F%3E%20%3Cline%20x1%3D%2234%22%20y1%3D%2240%22%20x2%3D%2286%22%20y2%3D%2240%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.2%22%20opacity%3D%220.5%22%2F%3E%20%3Cline%20x1%3D%2238%22%20y1%3D%2265%22%20x2%3D%2282%22%20y2%3D%2265%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.2%22%20opacity%3D%220.5%22%2F%3E%20%3Cpath%20d%3D%22M42%2030%20Q60%2042%2078%2030%22%20fill%3D%22none%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.2%22%20opacity%3D%220.6%22%2F%3E%20%3Cpath%20d%3D%22M38%2052%20Q60%2068%2082%2052%22%20fill%3D%22none%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.2%22%20opacity%3D%220.6%22%2F%3E%20%3Cpath%20d%3D%22M44%2076%20Q60%2090%2076%2076%22%20fill%3D%22none%22%20stroke%3D%22%231a0004%22%20stroke-width%3D%221.2%22%20opacity%3D%220.6%22%2F%3E%20%3Cpath%20d%3D%22M40%2045%20Q55%2042%2057%2060%20Q48%2068%2039%2058%20Z%22%20fill%3D%22%23080808%22%20stroke%3D%22%23000%22%20stroke-width%3D%223%22%2F%3E%20%3Cpath%20d%3D%22M80%2045%20Q65%2042%2063%2060%20Q72%2068%2081%2058%20Z%22%20fill%3D%22%23080808%22%20stroke%3D%22%23000%22%20stroke-width%3D%223%22%2F%3E%20%3Cpath%20d%3D%22M42%2047%20Q53%2045%2055%2058%20Q48%2065%2041%2057%20Z%22%20fill%3D%22%23ffffff%22%20filter%3D%22url(%23glow_spidey)%22%2F%3E%20%3Cpath%20d%3D%22M78%2047%20Q67%2045%2065%2058%20Q72%2065%2079%2057%20Z%22%20fill%3D%22%23ffffff%22%20filter%3D%22url(%23glow_spidey)%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "deadpool",
    "name": "Deadpool",
    "category": "Marvel",
    "tagline": "Wade Wilson • Merc with a Mouth",
    "quote": "Maximum effort!",
    "franchise": "Marvel Studios",
    "accentColor": "#dc2626",
    "glowColor": "rgba(220, 38, 38, 0.45)",
    "avatarUrl": "/avatars/characters/deadpool.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_dp%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%233b0307%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230c0102%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_dp)%22%2F%3E%20%3C!--%20Mask%20Base%20--%3E%20%3Cpath%20d%3D%22M34%2038%20C34%2016%2C%2086%2016%2C%2086%2038%20C86%2064%2C%2082%2085%2C%2060%20104%20C38%2085%2C%2034%2064%2C%2034%2038%20Z%22%20fill%3D%22%23be123c%22%20stroke%3D%22%23e11d48%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Black%20Eye%20Patches%20--%3E%20%3Cpath%20d%3D%22M40%2038%20C54%2036%2C%2056%2068%2C%2042%2072%20C34%2066%2C%2032%2046%2C%2040%2038%20Z%22%20fill%3D%22%2318181b%22%20stroke%3D%22%2309090b%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M80%2038%20C66%2036%2C%2064%2068%2C%2078%2072%20C86%2066%2C%2088%2046%2C%2080%2038%20Z%22%20fill%3D%22%2318181b%22%20stroke%3D%22%2309090b%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Expressive%20Squint%20Eyes%20--%3E%20%3Cellipse%20cx%3D%2246%22%20cy%3D%2252%22%20rx%3D%224.5%22%20ry%3D%223%22%20fill%3D%22%23ffffff%22%20transform%3D%22rotate(-10%2046%2052)%22%2F%3E%20%3Cellipse%20cx%3D%2274%22%20cy%3D%2252%22%20rx%3D%223.5%22%20ry%3D%224.5%22%20fill%3D%22%23ffffff%22%20transform%3D%22rotate(10%2074%2052)%22%2F%3E%20%3C!--%20Center%20Seam%20--%3E%20%3Cline%20x1%3D%2260%22%20y1%3D%2220%22%20x2%3D%2260%22%20y2%3D%22104%22%20stroke%3D%22%23881337%22%20stroke-width%3D%221.5%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "wolverine",
    "name": "Wolverine",
    "category": "Marvel",
    "tagline": "Logan • Weapon X",
    "quote": "I'm the best there is at what I do.",
    "franchise": "Marvel Studios",
    "accentColor": "#eab308",
    "glowColor": "rgba(234, 179, 8, 0.45)",
    "avatarUrl": "/avatars/characters/wolverine.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_wolv%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23332204%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230a0701%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_wolv)%22%2F%3E%20%3C!--%20Signature%20Cowl%20Wings%20Black%20--%3E%20%3Cpath%20d%3D%22M38%2058%20C22%2030%2C%2016%2012%2C%2012%206%20C18%2018%2C%2030%2040%2C%2044%2052%20Z%22%20fill%3D%22%2309090b%22%20stroke%3D%22%2327272a%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M82%2058%20C98%2030%2C%20104%2012%2C%20108%206%20C102%2018%2C%2090%2040%2C%2076%2052%20Z%22%20fill%3D%22%2309090b%22%20stroke%3D%22%2327272a%22%20stroke-width%3D%221%22%2F%3E%20%3C!--%20Yellow%20Mask%20Face%20--%3E%20%3Cpath%20d%3D%22M40%2040%20C40%2024%2C%2080%2024%2C%2080%2040%20L80%2066%20C80%2082%2C%2070%2096%2C%2060%2098%20C50%2096%2C%2040%2082%2C%2040%2066%20Z%22%20fill%3D%22%23eab308%22%20stroke%3D%22%23ca8a04%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Cowl%20Face%20Eye%20Accents%20Black%20--%3E%20%3Cpolygon%20points%3D%2240%2C54%2058%2C48%2056%2C60%2042%2C66%22%20fill%3D%22%2309090b%22%2F%3E%20%3Cpolygon%20points%3D%2280%2C54%2062%2C48%2064%2C60%2078%2C66%22%20fill%3D%22%2309090b%22%2F%3E%20%3C!--%20Angry%20White%20Slit%20Eyes%20--%3E%20%3Cpolygon%20points%3D%2244%2C56%2054%2C52%2052%2C58%2045%2C60%22%20fill%3D%22%23ffffff%22%2F%3E%20%3Cpolygon%20points%3D%2276%2C56%2066%2C52%2068%2C58%2075%2C60%22%20fill%3D%22%23ffffff%22%2F%3E%20%3C!--%20Stubble%20Chin%20--%3E%20%3Cpolygon%20points%3D%2254%2C82%2066%2C82%2064%2C92%2056%2C92%22%20fill%3D%22%23d4a373%22%2F%3E%20%3Cline%20x1%3D%2256%22%20y1%3D%2288%22%20x2%3D%2264%22%20y2%3D%2288%22%20stroke%3D%22%231c1917%22%20stroke-width%3D%221.5%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "loki",
    "name": "Loki",
    "category": "Marvel",
    "tagline": "God of Stories & Mischief",
    "quote": "Glorious purpose!",
    "franchise": "Marvel Studios",
    "accentColor": "#10b981",
    "glowColor": "rgba(16, 185, 129, 0.45)",
    "avatarUrl": "/avatars/characters/loki.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_loki%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23022919%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23010e08%22%2F%3E%20%3C%2FradialGradient%3E%20%3ClinearGradient%20id%3D%22gold_loki%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffe259%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23ffa751%22%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_loki)%22%2F%3E%20%3Cpath%20d%3D%22M40%2050%20C25%2020%2C%2010%2015%2C%208%208%20C15%2016%2C%2030%2035%2C%2048%2045%20Z%22%20fill%3D%22url(%23gold_loki)%22%20stroke%3D%22%23ffd700%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M80%2050%20C95%2020%2C%20110%2015%2C%20112%208%20C105%2016%2C%2090%2035%2C%2072%2045%20Z%22%20fill%3D%22url(%23gold_loki)%22%20stroke%3D%22%23ffd700%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M38%2052%20L60%2038%20L82%2052%20L76%2062%20L60%2056%20L44%2062%20Z%22%20fill%3D%22url(%23gold_loki)%22%20stroke%3D%22%23e5a93b%22%20stroke-width%3D%221%22%2F%3E%20%3Cpolygon%20points%3D%2260%2C45%2064%2C51%2060%2C57%2056%2C51%22%20fill%3D%22%2334d399%22%2F%3E%20%3Cpath%20d%3D%22M46%2060%20C46%2054%2C%2074%2054%2C%2074%2060%20C74%2078%2C%2068%2088%2C%2060%2094%20C52%2088%2C%2046%2078%2C%2046%2060%20Z%22%20fill%3D%22%230d1f15%22%20stroke%3D%22%2310b981%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M50%2070%20Q55%2067%2058%2070%22%20stroke%3D%22%2334d399%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%20%3Cpath%20d%3D%22M70%2070%20Q65%2067%2062%2070%22%20stroke%3D%22%2334d399%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%20%3Cpath%20d%3D%22M54%2084%20Q62%2088%2068%2082%22%20stroke%3D%22%2310b981%22%20stroke-width%3D%221.8%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "thor",
    "name": "Thor",
    "category": "Marvel",
    "tagline": "God of Thunder • Asgard",
    "quote": "Bring me Thanos!",
    "franchise": "Marvel Studios",
    "accentColor": "#38bdf8",
    "glowColor": "rgba(56, 189, 248, 0.45)",
    "avatarUrl": "/avatars/characters/thor.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_thor%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2304263e%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020d17%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_thor%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%223%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_thor)%22%2F%3E%20%3Cpath%20d%3D%22M20%2020%20L40%2045%20L32%2055%20L52%2080%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20opacity%3D%220.4%22%20filter%3D%22url(%23glow_thor)%22%2F%3E%20%3Cpath%20d%3D%22M100%2020%20L80%2045%20L88%2055%20L68%2085%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20opacity%3D%220.4%22%20filter%3D%22url(%23glow_thor)%22%2F%3E%20%3Cpath%20d%3D%22M34%2050%20C24%2035%2C%2020%2020%2C%2024%2015%20C30%2025%2C%2034%2038%2C%2042%2046%20Z%22%20fill%3D%22%2394a3b8%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M86%2050%20C96%2035%2C%20100%2020%2C%2096%2015%20C90%2025%2C%2086%2038%2C%2078%2046%20Z%22%20fill%3D%22%2394a3b8%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M42%2045%20C42%2028%2C%2078%2028%2C%2078%2045%20L76%2068%20C76%2086%2C%2068%2096%2C%2060%2098%20C52%2096%2C%2044%2086%2C%2044%2068%20Z%22%20fill%3D%22%23334155%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M46%2052%20L60%2046%20L74%2052%20L63%2068%20L60%2076%20L57%2068%20Z%22%20fill%3D%22%23475569%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221%22%2F%3E%20%3Cellipse%20cx%3D%2252%22%20cy%3D%2260%22%20rx%3D%223.5%22%20ry%3D%222%22%20fill%3D%22%237dd3fc%22%20filter%3D%22url(%23glow_thor)%22%2F%3E%20%3Cellipse%20cx%3D%2268%22%20cy%3D%2260%22%20rx%3D%223.5%22%20ry%3D%222%22%20fill%3D%22%237dd3fc%22%20filter%3D%22url(%23glow_thor)%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "black-panther",
    "name": "Black Panther",
    "category": "Marvel",
    "tagline": "King T'Challa • Wakanda",
    "quote": "Wakanda Forever!",
    "franchise": "Marvel Studios",
    "accentColor": "#a855f7",
    "glowColor": "rgba(168, 85, 247, 0.45)",
    "avatarUrl": "/avatars/characters/black-panther.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_bp%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23240738%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2308010d%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_bp%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%222%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_bp)%22%2F%3E%20%3C!--%20Panther%20Ears%20--%3E%20%3Cpolygon%20points%3D%2236%2C46%2032%2C22%2046%2C34%22%20fill%3D%22%2309090b%22%20stroke%3D%22%233f3f46%22%20stroke-width%3D%221%22%2F%3E%20%3Cpolygon%20points%3D%2284%2C46%2088%2C22%2074%2C34%22%20fill%3D%22%2309090b%22%20stroke%3D%22%233f3f46%22%20stroke-width%3D%221%22%2F%3E%20%3C!--%20Head%20Mask%20--%3E%20%3Cpath%20d%3D%22M36%2040%20C36%2024%2C%2084%2024%2C%2084%2040%20L84%2070%20C84%2088%2C%2072%20102%2C%2060%20104%20C48%20102%2C%2036%2088%2C%2036%2070%20Z%22%20fill%3D%22%2318181b%22%20stroke%3D%22%2327272a%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Vibranium%20Purple%20Lines%20--%3E%20%3Cpath%20d%3D%22M46%2032%20L60%2044%20L74%2032%22%20fill%3D%22none%22%20stroke%3D%22%23a855f7%22%20stroke-width%3D%221.5%22%20filter%3D%22url(%23glow_bp)%22%2F%3E%20%3Cpath%20d%3D%22M42%2056%20L52%2064%20L68%2064%20L78%2056%22%20fill%3D%22none%22%20stroke%3D%22%23a855f7%22%20stroke-width%3D%221.5%22%20filter%3D%22url(%23glow_bp)%22%2F%3E%20%3C!--%20Silver%20Tooth%20Necklace%20Outline%20--%3E%20%3Cpolygon%20points%3D%2260%2C98%2056%2C88%2064%2C88%22%20fill%3D%22%23e4e4e7%22%2F%3E%20%3Cpolygon%20points%3D%2250%2C94%2048%2C86%2054%2C87%22%20fill%3D%22%23e4e4e7%22%2F%3E%20%3Cpolygon%20points%3D%2270%2C94%2072%2C86%2066%2C87%22%20fill%3D%22%23e4e4e7%22%2F%3E%20%3C!--%20Glowing%20Eyes%20--%3E%20%3Cpolygon%20points%3D%2246%2C50%2056%2C52%2054%2C58%2045%2C56%22%20fill%3D%22%23c084fc%22%20filter%3D%22url(%23glow_bp)%22%2F%3E%20%3Cpolygon%20points%3D%2274%2C50%2064%2C52%2066%2C58%2075%2C56%22%20fill%3D%22%23c084fc%22%20filter%3D%22url(%23glow_bp)%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "darth-vader",
    "name": "Darth Vader",
    "category": "Star Wars",
    "tagline": "Lord Vader • Galactic Empire",
    "quote": "You underestimate the power of the dark side.",
    "franchise": "Lucasfilm",
    "accentColor": "#dc2626",
    "glowColor": "rgba(220, 38, 38, 0.5)",
    "avatarUrl": "/avatars/characters/darth-vader.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_vader%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232a0003%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23080808%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_vader%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%223%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_vader)%22%2F%3E%20%3Cpath%20d%3D%22M24%2078%20C24%2040%2C%2036%2018%2C%2060%2018%20C84%2018%2C%2096%2040%2C%2096%2078%20C98%2088%2C%2088%2090%2C%2084%2084%20C80%2060%2C%2076%2038%2C%2060%2038%20C44%2038%2C%2040%2060%2C%2036%2084%20C32%2090%2C%2022%2088%2C%2024%2078%20Z%22%20fill%3D%22%23171717%22%20stroke%3D%22%23333%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M42%2048%20Q60%2054%2078%2048%20Q82%2062%2076%2065%20Q60%2062%2044%2065%20Z%22%20fill%3D%22%23050505%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%221%22%20filter%3D%22url(%23glow_vader)%22%2F%3E%20%3Cpolygon%20points%3D%2246%2C52%2056%2C53%2054%2C60%2045%2C59%22%20fill%3D%22%237f1d1d%22%2F%3E%20%3Cpolygon%20points%3D%2274%2C52%2064%2C53%2066%2C60%2075%2C59%22%20fill%3D%22%237f1d1d%22%2F%3E%20%3Cpolygon%20points%3D%2260%2C66%2072%2C92%2048%2C92%22%20fill%3D%22%231c1917%22%20stroke%3D%22%2344403c%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2254%22%20y1%3D%2278%22%20x2%3D%2266%22%20y2%3D%2278%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2251%22%20y1%3D%2284%22%20x2%3D%2269%22%20y2%3D%2284%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2249%22%20y1%3D%2290%22%20x2%3D%2271%22%20y2%3D%2290%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%221.5%22%2F%3E%20%3Ccircle%20cx%3D%2248%22%20cy%3D%2294%22%20r%3D%222.5%22%20fill%3D%22%23a8a29e%22%2F%3E%20%3Ccircle%20cx%3D%2272%22%20cy%3D%2294%22%20r%3D%222.5%22%20fill%3D%22%23a8a29e%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "mandalorian",
    "name": "The Mandalorian",
    "category": "Star Wars",
    "tagline": "Din Djarin • Beskar Armor",
    "quote": "This is the way.",
    "franchise": "Lucasfilm",
    "accentColor": "#94a3b8",
    "glowColor": "rgba(148, 163, 184, 0.45)",
    "avatarUrl": "/avatars/characters/mandalorian.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_mando%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23090d16%22%2F%3E%20%3C%2FradialGradient%3E%20%3ClinearGradient%20id%3D%22beskar_mando%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23f1f5f9%22%2F%3E%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%2394a3b8%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23475569%22%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_mando)%22%2F%3E%20%3Cpath%20d%3D%22M38%2032%20C38%2018%2C%2082%2018%2C%2082%2032%20L84%2066%20C84%2088%2C%2072%20100%2C%2060%20102%20C48%20100%2C%2036%2088%2C%2036%2066%20Z%22%20fill%3D%22url(%23beskar_mando)%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpath%20d%3D%22M40%2068%20L50%2082%20L46%2092%20Z%22%20fill%3D%22%231e293b%22%20opacity%3D%220.8%22%2F%3E%20%3Cpath%20d%3D%22M80%2068%20L70%2082%20L74%2092%20Z%22%20fill%3D%22%231e293b%22%20opacity%3D%220.8%22%2F%3E%20%3Cpolygon%20points%3D%2244%2C50%2076%2C50%2075%2C56%2063%2C56%2063%2C84%2057%2C84%2057%2C56%2045%2C56%22%20fill%3D%22%23020617%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%222%22%2F%3E%20%3Cline%20x1%3D%2248%22%20y1%3D%2252%22%20x2%3D%2254%22%20y2%3D%2252%22%20stroke%3D%22%2338bdf8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.8%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "grogu",
    "name": "Grogu",
    "category": "Star Wars",
    "tagline": "The Child • Clan of Two",
    "quote": "Patu!",
    "franchise": "Lucasfilm",
    "accentColor": "#4ade80",
    "glowColor": "rgba(74, 222, 128, 0.45)",
    "avatarUrl": "/avatars/characters/grogu.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_grogu%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2314331e%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23050e08%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_grogu)%22%2F%3E%20%3C!--%20Huge%20Pointy%20Ears%20--%3E%20%3Cpath%20d%3D%22M42%2056%20C24%2050%2C%206%2062%2C%202%2068%20C12%2060%2C%2028%2066%2C%2042%2068%20Z%22%20fill%3D%22%2386efac%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M78%2056%20C96%2050%2C%20114%2062%2C%20118%2068%20C108%2060%2C%2092%2066%2C%2078%2068%20Z%22%20fill%3D%22%2386efac%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%221%22%2F%3E%20%3C!--%20Inner%20Pink%20Ears%20--%3E%20%3Cpath%20d%3D%22M38%2058%20C26%2056%2C%2012%2064%2C%208%2067%20C16%2063%2C%2026%2066%2C%2036%2067%20Z%22%20fill%3D%22%23fda4af%22%20opacity%3D%220.75%22%2F%3E%20%3Cpath%20d%3D%22M82%2058%20C94%2056%2C%20108%2064%2C%20112%2067%20C104%2063%2C%2094%2066%2C%2084%2067%20Z%22%20fill%3D%22%23fda4af%22%20opacity%3D%220.75%22%2F%3E%20%3C!--%20Head%20--%3E%20%3Cellipse%20cx%3D%2260%22%20cy%3D%2262%22%20rx%3D%2222%22%20ry%3D%2218%22%20fill%3D%22%2386efac%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%221%22%2F%3E%20%3C!--%20Soulful%20Glossy%20Black%20Eyes%20--%3E%20%3Ccircle%20cx%3D%2250%22%20cy%3D%2260%22%20r%3D%226%22%20fill%3D%22%2309090b%22%2F%3E%20%3Ccircle%20cx%3D%2270%22%20cy%3D%2260%22%20r%3D%226%22%20fill%3D%22%2309090b%22%2F%3E%20%3Ccircle%20cx%3D%2248%22%20cy%3D%2258%22%20r%3D%222%22%20fill%3D%22%23ffffff%22%2F%3E%20%3Ccircle%20cx%3D%2268%22%20cy%3D%2258%22%20r%3D%222%22%20fill%3D%22%23ffffff%22%2F%3E%20%3C!--%20Tiny%20Smile%20--%3E%20%3Cpath%20d%3D%22M57%2070%20Q60%2072%2063%2070%22%20stroke%3D%22%23166534%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%20%3C!--%20Fluffy%20Beige%20Robe%20Collar%20--%3E%20%3Cpath%20d%3D%22M38%2078%20Q60%2072%2082%2078%20L86%20106%20Q60%20112%2034%20106%20Z%22%20fill%3D%22%23d4b483%22%20stroke%3D%22%23b08968%22%20stroke-width%3D%221.5%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "stormtrooper",
    "name": "Stormtrooper",
    "category": "Star Wars",
    "tagline": "Imperial Legion • TK-421",
    "quote": "Move along.",
    "franchise": "Lucasfilm",
    "accentColor": "#e2e8f0",
    "glowColor": "rgba(226, 232, 240, 0.45)",
    "avatarUrl": "/avatars/characters/stormtrooper.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_st%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%231e293b%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020617%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_st)%22%2F%3E%20%3C!--%20Helmet%20Outer%20Dome%20--%3E%20%3Cpath%20d%3D%22M36%2042%20C36%2020%2C%2084%2020%2C%2084%2042%20L88%2074%20C88%2094%2C%2076%20102%2C%2060%20102%20C44%20102%2C%2032%2094%2C%2032%2074%20Z%22%20fill%3D%22%23f8fafc%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Black%20Brow%20Line%20--%3E%20%3Cline%20x1%3D%2236%22%20y1%3D%2242%22%20x2%3D%2284%22%20y2%3D%2242%22%20stroke%3D%22%2309090b%22%20stroke-width%3D%223%22%2F%3E%20%3C!--%20Grey%20Lens%20Visor%20%2F%20Eyes%20--%3E%20%3Cpolygon%20points%3D%2242%2C50%2056%2C52%2054%2C58%2044%2C56%22%20fill%3D%22%230f172a%22%2F%3E%20%3Cpolygon%20points%3D%2278%2C50%2064%2C52%2066%2C58%2076%2C56%22%20fill%3D%22%230f172a%22%2F%3E%20%3C!--%20Cheek%20Indents%20%2F%20Black%20Grilles%20--%3E%20%3Cpolygon%20points%3D%2238%2C68%2046%2C74%2044%2C82%2036%2C78%22%20fill%3D%22%23334155%22%2F%3E%20%3Cpolygon%20points%3D%2282%2C68%2074%2C74%2076%2C82%2084%2C78%22%20fill%3D%22%23334155%22%2F%3E%20%3C!--%20Nose%20%26%20Mouth%20Vocoder%20--%3E%20%3Cpolygon%20points%3D%2260%2C68%2067%2C86%2053%2C86%22%20fill%3D%22%2309090b%22%2F%3E%20%3Ccircle%20cx%3D%2250%22%20cy%3D%2294%22%20r%3D%223%22%20fill%3D%22%2364748b%22%2F%3E%20%3Ccircle%20cx%3D%2270%22%20cy%3D%2294%22%20r%3D%223%22%20fill%3D%22%2364748b%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "batman",
    "name": "The Dark Knight",
    "category": "Cinema Icons",
    "tagline": "Bruce Wayne • Gotham Vigilante",
    "quote": "I am vengeance. I am the night.",
    "franchise": "DC Films",
    "accentColor": "#f59e0b",
    "glowColor": "rgba(245, 158, 11, 0.45)",
    "avatarUrl": "/avatars/characters/batman.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_bat%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23181308%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23050505%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_bat)%22%2F%3E%20%3Cpolygon%20points%3D%2236%2C65%2030%2C16%2048%2C46%22%20fill%3D%22%231a1a1a%22%20stroke%3D%22%23262626%22%20stroke-width%3D%221%22%2F%3E%20%3Cpolygon%20points%3D%2284%2C65%2090%2C16%2072%2C46%22%20fill%3D%22%231a1a1a%22%20stroke%3D%22%23262626%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M38%2052%20C38%2035%2C%2082%2035%2C%2082%2052%20L84%2076%20C84%2094%2C%2072%20102%2C%2060%20104%20C48%20102%2C%2036%2094%2C%2036%2076%20Z%22%20fill%3D%22%230f0f0f%22%20stroke%3D%22%23262626%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cpolygon%20points%3D%2260%2C60%2063%2C74%2057%2C74%22%20fill%3D%22%23262626%22%2F%3E%20%3Cpolygon%20points%3D%2244%2C60%2055%2C64%2053%2C68%2045%2C66%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.95%22%2F%3E%20%3Cpolygon%20points%3D%2276%2C60%2065%2C64%2067%2C68%2075%2C66%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.95%22%2F%3E%20%3Cpath%20d%3D%22M50%2082%20L70%2082%20L66%2094%20L54%2094%20Z%22%20fill%3D%22%23d4a373%22%20stroke%3D%22%230a0a0a%22%20stroke-width%3D%222%22%2F%3E%20%3Cline%20x1%3D%2256%22%20y1%3D%2288%22%20x2%3D%2264%22%20y2%3D%2288%22%20stroke%3D%22%238c5836%22%20stroke-width%3D%221.5%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "joker",
    "name": "The Joker",
    "category": "Cinema Icons",
    "tagline": "Clown Prince of Crime",
    "quote": "Why so serious?",
    "franchise": "DC Films",
    "accentColor": "#84cc16",
    "glowColor": "rgba(132, 204, 22, 0.45)",
    "avatarUrl": "/avatars/characters/joker.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_joker%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232a083b%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230d0114%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_joker)%22%2F%3E%20%3C!--%20Wild%20Acid%20Green%20Hair%20--%3E%20%3Cpath%20d%3D%22M30%2045%20C25%2018%2C%2095%2018%2C%2090%2045%20C96%2065%2C%2088%2080%2C%2084%2084%20C80%2062%2C%2078%2040%2C%2072%2034%20C64%2026%2C%2050%2028%2C%2046%2036%20C42%2046%2C%2038%2068%2C%2030%2045%20Z%22%20fill%3D%22%2365a30d%22%20stroke%3D%22%2384cc16%22%20stroke-width%3D%221%22%2F%3E%20%3C!--%20Pale%20White%20Face%20--%3E%20%3Cpath%20d%3D%22M42%2042%20C42%2034%2C%2078%2034%2C%2078%2042%20L78%2072%20C78%2088%2C%2070%2096%2C%2060%2098%20C50%2096%2C%2042%2088%2C%2042%2072%20Z%22%20fill%3D%22%23f4f4f5%22%2F%3E%20%3C!--%20Dark%20Smudged%20Eyes%20--%3E%20%3Cellipse%20cx%3D%2250%22%20cy%3D%2254%22%20rx%3D%226%22%20ry%3D%225%22%20fill%3D%22%2327272a%22%2F%3E%20%3Cellipse%20cx%3D%2270%22%20cy%3D%2254%22%20rx%3D%226%22%20ry%3D%225%22%20fill%3D%22%2327272a%22%2F%3E%20%3Ccircle%20cx%3D%2251%22%20cy%3D%2254%22%20r%3D%222%22%20fill%3D%22%23ffffff%22%2F%3E%20%3Ccircle%20cx%3D%2269%22%20cy%3D%2254%22%20r%3D%222%22%20fill%3D%22%23ffffff%22%2F%3E%20%3C!--%20Manic%20Glasgow%20Smile%20Crimson%20--%3E%20%3Cpath%20d%3D%22M42%2074%20Q60%2088%2078%2074%22%20fill%3D%22none%22%20stroke%3D%22%23dc2626%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%20%3Cpath%20d%3D%22M48%2076%20Q60%2080%2072%2076%22%20fill%3D%22none%22%20stroke%3D%22%23991b1b%22%20stroke-width%3D%222%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "john-wick",
    "name": "John Wick",
    "category": "Cinema Icons",
    "tagline": "Baba Yaga • Continental Legend",
    "quote": "Yeah, I’m thinking I’m back.",
    "franchise": "Lionsgate",
    "accentColor": "#38bdf8",
    "glowColor": "rgba(56, 189, 248, 0.45)",
    "avatarUrl": "/avatars/characters/john-wick.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_wick%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230c1d2e%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23030710%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_wick)%22%2F%3E%20%3Cpath%20d%3D%22M34%2045%20C32%2020%2C%2088%2020%2C%2086%2045%20C90%2070%2C%2088%2088%2C%2086%2094%20C82%2080%2C%2080%2050%2C%2076%2042%20C72%2035%2C%2048%2035%2C%2044%2042%20C40%2050%2C%2038%2080%2C%2034%2094%20Z%22%20fill%3D%22%23090a0f%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%221%22%2F%3E%20%3Cpath%20d%3D%22M44%2046%20C44%2040%2C%2076%2040%2C%2076%2046%20L76%2074%20C76%2086%2C%2068%2096%2C%2060%2098%20C52%2096%2C%2044%2086%2C%2044%2074%20Z%22%20fill%3D%22%23d4a373%22%2F%3E%20%3Cpath%20d%3D%22M48%2058%20Q54%2056%2057%2058%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%20%3Cpath%20d%3D%22M72%2058%20Q66%2056%2063%2058%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%20%3Ccircle%20cx%3D%2253%22%20cy%3D%2262%22%20r%3D%222%22%20fill%3D%22%230f172a%22%2F%3E%20%3Ccircle%20cx%3D%2267%22%20cy%3D%2262%22%20r%3D%222%22%20fill%3D%22%230f172a%22%2F%3E%20%3Cpath%20d%3D%22M46%2076%20C46%2088%2C%2052%2096%2C%2060%2096%20C68%2096%2C%2074%2088%2C%2074%2076%20C70%2080%2C%2050%2080%2C%2046%2076%20Z%22%20fill%3D%22%231c1917%22%20opacity%3D%220.85%22%2F%3E%20%3Cline%20x1%3D%2255%22%20y1%3D%2274%22%20x2%3D%2265%22%20y2%3D%2274%22%20stroke%3D%22%231c1917%22%20stroke-width%3D%222%22%2F%3E%20%3Cpolygon%20points%3D%2240%2C105%2052%2C94%2060%2C108%2068%2C94%2080%2C105%2084%2C120%2036%2C120%22%20fill%3D%22%23090a0f%22%2F%3E%20%3Cpolygon%20points%3D%2257%2C98%2063%2C98%2062%2C118%2058%2C118%22%20fill%3D%22%23111827%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "neo",
    "name": "Neo",
    "category": "Cinema Icons",
    "tagline": "Thomas Anderson • The One",
    "quote": "I know kung fu.",
    "franchise": "Warner Bros",
    "accentColor": "#22c55e",
    "glowColor": "rgba(34, 197, 94, 0.45)",
    "avatarUrl": "/avatars/characters/neo.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_neo%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23022c15%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000d05%22%2F%3E%20%3C%2FradialGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_neo)%22%2F%3E%20%3C!--%20Digital%20Matrix%20Code%20Rain%20Lines%20--%3E%20%3Cline%20x1%3D%2220%22%20y1%3D%2210%22%20x2%3D%2220%22%20y2%3D%2240%22%20stroke%3D%22%2322c55e%22%20stroke-width%3D%221%22%20stroke-dasharray%3D%222%204%22%20opacity%3D%220.4%22%2F%3E%20%3Cline%20x1%3D%22100%22%20y1%3D%2220%22%20x2%3D%22100%22%20y2%3D%2270%22%20stroke%3D%22%2322c55e%22%20stroke-width%3D%221%22%20stroke-dasharray%3D%223%203%22%20opacity%3D%220.4%22%2F%3E%20%3C!--%20Slicked%20Black%20Hair%20--%3E%20%3Cpath%20d%3D%22M40%2038%20C40%2022%2C%2080%2022%2C%2080%2038%20L82%2050%20C82%2052%2C%2078%2050%2C%2076%2046%20C70%2042%2C%2050%2042%2C%2044%2046%20C42%2050%2C%2038%2052%2C%2038%2050%20Z%22%20fill%3D%22%2309090b%22%2F%3E%20%3C!--%20Face%20--%3E%20%3Cpath%20d%3D%22M42%2046%20C42%2040%2C%2078%2040%2C%2078%2046%20L78%2072%20C78%2088%2C%2070%2096%2C%2060%2098%20C50%2096%2C%2042%2088%2C%2042%2072%20Z%22%20fill%3D%22%23d4a373%22%2F%3E%20%3C!--%20Iconic%20Rimless%20Dark%20Sunglasses%20--%3E%20%3Cellipse%20cx%3D%2250%22%20cy%3D%2256%22%20rx%3D%229%22%20ry%3D%225.5%22%20fill%3D%22%2309090b%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%220.8%22%2F%3E%20%3Cellipse%20cx%3D%2270%22%20cy%3D%2256%22%20rx%3D%229%22%20ry%3D%225.5%22%20fill%3D%22%2309090b%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%220.8%22%2F%3E%20%3Cline%20x1%3D%2259%22%20y1%3D%2256%22%20x2%3D%2261%22%20y2%3D%2256%22%20stroke%3D%22%2318181b%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2245%22%20y1%3D%2255%22%20x2%3D%2255%22%20y2%3D%2255%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%221%22%20opacity%3D%220.7%22%2F%3E%20%3Cline%20x1%3D%2265%22%20y1%3D%2255%22%20x2%3D%2275%22%20y2%3D%2255%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%221%22%20opacity%3D%220.7%22%2F%3E%20%3C!--%20Mouth%20line%20--%3E%20%3Cline%20x1%3D%2255%22%20y1%3D%2278%22%20x2%3D%2265%22%20y2%3D%2278%22%20stroke%3D%22%2378350f%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20High%20Collar%20Black%20Trench%20Coat%20--%3E%20%3Cpolygon%20points%3D%2236%2C104%2048%2C94%2060%2C102%2072%2C94%2084%2C104%2088%2C120%2032%2C120%22%20fill%3D%22%2309090b%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "dune-paul",
    "name": "Paul Atreides",
    "category": "Sci-Fi",
    "tagline": "Muad'Dib • Arrakis",
    "quote": "Fear is the mind-killer.",
    "franchise": "Legendary",
    "accentColor": "#f97316",
    "glowColor": "rgba(249, 115, 22, 0.45)",
    "avatarUrl": "/avatars/characters/dune-paul.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_dune%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%233d1b06%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23140702%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_dune%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%222.5%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_dune)%22%2F%3E%20%3Cpath%20d%3D%22M34%2050%20C30%2020%2C%2090%2020%2C%2086%2050%20C92%2070%2C%2088%2088%2C%2086%2096%20C82%2080%2C%2078%2052%2C%2074%2044%20C68%2036%2C%2052%2036%2C%2046%2044%20C42%2052%2C%2038%2080%2C%2034%2096%20Z%22%20fill%3D%22%231c140e%22%2F%3E%20%3Cpath%20d%3D%22M44%2048%20C44%2040%2C%2076%2040%2C%2076%2048%20L76%2074%20C76%2086%2C%2068%2094%2C%2060%2096%20C52%2094%2C%2044%2086%2C%2044%2074%20Z%22%20fill%3D%22%23d6a782%22%2F%3E%20%3Cellipse%20cx%3D%2252%22%20cy%3D%2262%22%20rx%3D%224%22%20ry%3D%222.5%22%20fill%3D%22%2300d2ff%22%20filter%3D%22url(%23glow_dune)%22%2F%3E%20%3Cellipse%20cx%3D%2268%22%20cy%3D%2262%22%20rx%3D%224%22%20ry%3D%222.5%22%20fill%3D%22%2300d2ff%22%20filter%3D%22url(%23glow_dune)%22%2F%3E%20%3Ccircle%20cx%3D%2252%22%20cy%3D%2262%22%20r%3D%221.5%22%20fill%3D%22%23ffffff%22%2F%3E%20%3Ccircle%20cx%3D%2268%22%20cy%3D%2262%22%20r%3D%221.5%22%20fill%3D%22%23ffffff%22%2F%3E%20%3Cpath%20d%3D%22M52%2068%20Q56%2074%2058%2075%22%20fill%3D%22none%22%20stroke%3D%22%23292524%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%20%3Crect%20x%3D%2254%22%20y%3D%2274%22%20width%3D%2212%22%20height%3D%2214%22%20rx%3D%223%22%20fill%3D%22%23292524%22%20stroke%3D%22%2344403c%22%20stroke-width%3D%221%22%2F%3E%20%3Ccircle%20cx%3D%2260%22%20cy%3D%2281%22%20r%3D%222%22%20fill%3D%22%2378716c%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "interstellar",
    "name": "Cooper",
    "category": "Sci-Fi",
    "tagline": "Endurance Pilot • Interstellar",
    "quote": "Mankind was born on Earth. It was never meant to die here.",
    "franchise": "Syncopy",
    "accentColor": "#38bdf8",
    "glowColor": "rgba(56, 189, 248, 0.45)",
    "avatarUrl": "/avatars/characters/interstellar.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_space%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2302182b%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23010811%22%2F%3E%20%3C%2FradialGradient%3E%20%3ClinearGradient%20id%3D%22gold_visor%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ffe259%22%2F%3E%20%3Cstop%20offset%3D%2240%25%22%20stop-color%3D%22%23ffa751%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%234a2800%22%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_space)%22%2F%3E%20%3Cellipse%20cx%3D%2260%22%20cy%3D%2260%22%20rx%3D%2236%22%20ry%3D%2238%22%20fill%3D%22%23f8fafc%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%2F%3E%20%3Cellipse%20cx%3D%2260%22%20cy%3D%2258%22%20rx%3D%2226%22%20ry%3D%2224%22%20fill%3D%22url(%23gold_visor)%22%20stroke%3D%22%231e293b%22%20stroke-width%3D%222%22%2F%3E%20%3Cpath%20d%3D%22M42%2056%20Q60%2048%2078%2056%20Q60%2068%2042%2056%20Z%22%20fill%3D%22%23000000%22%20opacity%3D%220.65%22%2F%3E%20%3Ccircle%20cx%3D%2260%22%20cy%3D%2258%22%20r%3D%224%22%20fill%3D%22%23ffffff%22%20opacity%3D%220.8%22%2F%3E%20%3Cpath%20d%3D%22M38%2090%20L82%2090%20L86%20106%20L34%20106%20Z%22%20fill%3D%22%23e2e8f0%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%2F%3E%20%3Crect%20x%3D%2252%22%20y%3D%2294%22%20width%3D%2216%22%20height%3D%226%22%20rx%3D%222%22%20fill%3D%22%230284c7%22%2F%3E%20%3C%2Fsvg%3E"
  },
  {
    "id": "cyber-ronin",
    "name": "Cyber Ronin",
    "category": "Sci-Fi",
    "tagline": "Neo Tokyo 2077 • Holographic Ghost",
    "quote": "Wake up, samurai.",
    "franchise": "Cyber Cinema",
    "accentColor": "#ec4899",
    "glowColor": "rgba(236, 72, 153, 0.45)",
    "avatarUrl": "/avatars/characters/cyber-ronin.svg",
    "svgDataUri": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%20%3Cdefs%3E%20%3CradialGradient%20id%3D%22bg_cyber%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%232d062e%22%2F%3E%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230a010a%22%2F%3E%20%3C%2FradialGradient%3E%20%3Cfilter%20id%3D%22glow_cyber%22%3E%20%3CfeGaussianBlur%20stdDeviation%3D%223%22%20result%3D%22blur%22%2F%3E%20%3CfeMerge%3E%3CfeMergeNode%20in%3D%22blur%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%20%3C%2Ffilter%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2220%22%20fill%3D%22url(%23bg_cyber)%22%2F%3E%20%3C!--%20Cyber%20Oni%20Horns%20--%3E%20%3Cpolygon%20points%3D%2238%2C44%2026%2C18%2046%2C36%22%20fill%3D%22%23ec4899%22%20filter%3D%22url(%23glow_cyber)%22%2F%3E%20%3Cpolygon%20points%3D%2282%2C44%2094%2C18%2074%2C36%22%20fill%3D%22%23ec4899%22%20filter%3D%22url(%23glow_cyber)%22%2F%3E%20%3C!--%20Mask%20Base%20--%3E%20%3Cpath%20d%3D%22M38%2042%20C38%2028%2C%2082%2028%2C%2082%2042%20L82%2072%20C82%2092%2C%2070%20102%2C%2060%20104%20C50%20102%2C%2038%2092%2C%2038%2072%20Z%22%20fill%3D%22%2318181b%22%20stroke%3D%22%233f3f46%22%20stroke-width%3D%221.5%22%2F%3E%20%3C!--%20Neon%20Cyan%20Visor%20Bar%20--%3E%20%3Crect%20x%3D%2242%22%20y%3D%2252%22%20width%3D%2236%22%20height%3D%228%22%20rx%3D%222%22%20fill%3D%22%2306b6d4%22%20filter%3D%22url(%23glow_cyber)%22%2F%3E%20%3C!--%20Oni%20Teeth%20Grille%20--%3E%20%3Cpath%20d%3D%22M48%2076%20L72%2076%20L68%2088%20L52%2088%20Z%22%20fill%3D%22%2309090b%22%20stroke%3D%22%23ec4899%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2254%22%20y1%3D%2276%22%20x2%3D%2254%22%20y2%3D%2288%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2260%22%20y1%3D%2276%22%20x2%3D%2260%22%20y2%3D%2288%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%221.5%22%2F%3E%20%3Cline%20x1%3D%2266%22%20y1%3D%2276%22%20x2%3D%2266%22%20y2%3D%2288%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%221.5%22%2F%3E%20%3C%2Fsvg%3E"
  }
];

export const AVATAR_CATEGORIES = ['All', 'Marvel', 'Star Wars', 'Cinema Icons', 'Sci-Fi'] as const;
export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];
