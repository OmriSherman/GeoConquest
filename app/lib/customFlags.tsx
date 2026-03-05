/**
 * Custom gaming-world SVG flags.
 * Each flag is a 60×60 SVG illustration of an in-game faction/world banner.
 * Keys are stored in the avatar_flag profile field (prefixed with "flag_svg_").
 */

import React from 'react';
import Svg, { Circle, Rect, Path, Ellipse } from 'react-native-svg';

interface FlagSvgProps {
  size?: number;
}

// ─── The Witcher ──────────────────────────────────────────────────────────────

// ─── Nilfgaard Empire ────────────────────────────────────────────────────────
export function NilfgaardFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Black field */}
      <Rect x="0" y="0" width="60" height="60" fill="#0D0D0D" />
      {/* Gold border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#DAA520" strokeWidth="2" />
      {/* 8 radiating sun rays (triangular) */}
      <Path d="M30 8 L27 21 L33 21 Z" fill="#DAA520" />
      <Path d="M30 52 L27 39 L33 39 Z" fill="#DAA520" />
      <Path d="M8 30 L21 27 L21 33 Z" fill="#DAA520" />
      <Path d="M52 30 L39 27 L39 33 Z" fill="#DAA520" />
      <Path d="M13 13 L22 23 L18 27 Z" fill="#DAA520" />
      <Path d="M47 13 L38 23 L42 27 Z" fill="#DAA520" />
      <Path d="M13 47 L22 37 L18 33 Z" fill="#DAA520" />
      <Path d="M47 47 L38 37 L42 33 Z" fill="#DAA520" />
      {/* Outer ring */}
      <Circle cx="30" cy="30" r="11" fill="#DAA520" />
      <Circle cx="30" cy="30" r="8" fill="#0D0D0D" />
      {/* Inner dot */}
      <Circle cx="30" cy="30" r="4" fill="#DAA520" />
    </Svg>
  );
}

// ─── Temeria ─────────────────────────────────────────────────────────────────
export function TemeriaFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Royal blue field */}
      <Rect x="0" y="0" width="60" height="60" fill="#1C3A8A" />
      {/* Gold border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#DAA520" strokeWidth="2" />
      {/* Central fleur-de-lis */}
      {/* Top petal */}
      <Path d="M30 14 Q26 18 27 24 Q28.5 20 30 22 Q31.5 20 33 24 Q34 18 30 14 Z" fill="#DAA520" />
      {/* Left wing */}
      <Path d="M21 23 Q24 26 26 28 L27 34 Q24 31 22 35 L25 35 L27 39 L30 37 L30 28 Q27 26 21 23 Z" fill="#DAA520" />
      {/* Right wing */}
      <Path d="M39 23 Q36 26 34 28 L33 34 Q36 31 38 35 L35 35 L33 39 L30 37 L30 28 Q33 26 39 23 Z" fill="#DAA520" />
      {/* Horizontal crossbar */}
      <Rect x="24" y="38" width="12" height="2.5" rx="1" fill="#DAA520" />
      {/* Corner ornaments */}
      <Circle cx="9" cy="9" r="3.5" fill="#DAA520" opacity={0.7} />
      <Circle cx="51" cy="9" r="3.5" fill="#DAA520" opacity={0.7} />
      <Circle cx="9" cy="51" r="3.5" fill="#DAA520" opacity={0.7} />
      <Circle cx="51" cy="51" r="3.5" fill="#DAA520" opacity={0.7} />
    </Svg>
  );
}

// ─── Skyrim ───────────────────────────────────────────────────────────────────

// ─── Stormcloaks ─────────────────────────────────────────────────────────────
export function StormcloakFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Nordic blue-grey field */}
      <Rect x="0" y="0" width="60" height="60" fill="#2E4A7A" />
      {/* Light grey border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#BBCCDD" strokeWidth="2" />
      {/* Bear ears */}
      <Circle cx="21" cy="18" r="6" fill="#18305A" />
      <Circle cx="39" cy="18" r="6" fill="#18305A" />
      <Circle cx="21" cy="18" r="3" fill="#243A6A" />
      <Circle cx="39" cy="18" r="3" fill="#243A6A" />
      {/* Bear head */}
      <Ellipse cx="30" cy="30" rx="15" ry="14" fill="#18305A" />
      {/* Snout */}
      <Ellipse cx="30" cy="37" rx="7" ry="5" fill="#1E3A6A" />
      {/* Nose */}
      <Ellipse cx="30" cy="34" rx="3.5" ry="2.5" fill="#0D2040" />
      {/* Nostrils */}
      <Circle cx="28.5" cy="34.5" r="1" fill="#0A1830" />
      <Circle cx="31.5" cy="34.5" r="1" fill="#0A1830" />
      {/* Eyes */}
      <Circle cx="24" cy="27" r="2.5" fill="#7799BB" />
      <Circle cx="36" cy="27" r="2.5" fill="#7799BB" />
      <Circle cx="24" cy="27" r="1" fill="#0D1A30" />
      <Circle cx="36" cy="27" r="1" fill="#0D1A30" />
      {/* Fur brow lines */}
      <Path d="M18 24 Q21 20 24 22" stroke="#243A6A" strokeWidth="1.5" fill="none" />
      <Path d="M42 24 Q39 20 36 22" stroke="#243A6A" strokeWidth="1.5" fill="none" />
      {/* Bottom banner strip */}
      <Rect x="0" y="52" width="60" height="8" fill="#18305A" opacity={0.6} />
    </Svg>
  );
}

// ─── Imperial Legion ─────────────────────────────────────────────────────────
export function ImperialFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Dark crimson field */}
      <Rect x="0" y="0" width="60" height="60" fill="#8A1A1A" />
      {/* Gold border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#DAA520" strokeWidth="2.5" />
      {/* Imperial Dragon — spread wings */}
      {/* Left wing */}
      <Path d="M12 28 Q14 18 20 20 Q23 24 25 28 Q20 24 12 28 Z" fill="#DAA520" />
      <Path d="M10 34 Q14 26 20 26 Q22 30 24 32 Q18 28 10 34 Z" fill="#DAA520" />
      {/* Right wing */}
      <Path d="M48 28 Q46 18 40 20 Q37 24 35 28 Q40 24 48 28 Z" fill="#DAA520" />
      <Path d="M50 34 Q46 26 40 26 Q38 30 36 32 Q42 28 50 34 Z" fill="#DAA520" />
      {/* Body */}
      <Ellipse cx="30" cy="30" rx="6" ry="8" fill="#DAA520" />
      {/* Head */}
      <Circle cx="30" cy="21" r="5" fill="#DAA520" />
      {/* Crown / laurels */}
      <Path d="M25 18 L26 13 L30 16 L34 13 L35 18" fill="#DAA520" />
      <Circle cx="30" cy="13" r="1.5" fill="#DAA520" />
      {/* Tail */}
      <Path d="M29 38 Q26 44 24 46" stroke="#DAA520" strokeWidth="2" fill="none" />
      <Path d="M31 38 Q34 44 36 46" stroke="#DAA520" strokeWidth="2" fill="none" />
      {/* Claws */}
      <Path d="M27 37 Q23 42 21 44" stroke="#DAA520" strokeWidth="1.5" fill="none" />
      <Path d="M33 37 Q37 42 39 44" stroke="#DAA520" strokeWidth="1.5" fill="none" />
      {/* Gold stripe at base */}
      <Rect x="0" y="54" width="60" height="6" fill="#DAA520" opacity={0.3} />
    </Svg>
  );
}

// ─── Cyberpunk 2077 ───────────────────────────────────────────────────────────

// ─── Arasaka Corp ────────────────────────────────────────────────────────────
export function ArasakaFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Black field */}
      <Rect x="0" y="0" width="60" height="60" fill="#060606" />
      {/* Red border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#CC0000" strokeWidth="1.5" />
      {/* Outer diamond frame */}
      <Path d="M30 8 L52 30 L30 52 L8 30 Z" fill="none" stroke="#CC0000" strokeWidth="2" />
      {/* Diagonal cross lines */}
      <Path d="M30 8 L30 52" stroke="#CC0000" strokeWidth="0.8" opacity={0.4} />
      <Path d="M8 30 L52 30" stroke="#CC0000" strokeWidth="0.8" opacity={0.4} />
      {/* Central stylised A emblem */}
      <Path d="M30 16 L22 40 L27 40 L29 34 L31 34 L33 40 L38 40 Z" fill="#CC0000" />
      <Rect x="26" y="31" width="8" height="2.5" rx="0.5" fill="#060606" />
      {/* Corner tech brackets */}
      <Path d="M4 4 L10 4 M4 4 L4 10" stroke="#CC0000" strokeWidth="1.5" fill="none" opacity={0.8} />
      <Path d="M56 4 L50 4 M56 4 L56 10" stroke="#CC0000" strokeWidth="1.5" fill="none" opacity={0.8} />
      <Path d="M4 56 L10 56 M4 56 L4 50" stroke="#CC0000" strokeWidth="1.5" fill="none" opacity={0.8} />
      <Path d="M56 56 L50 56 M56 56 L56 50" stroke="#CC0000" strokeWidth="1.5" fill="none" opacity={0.8} />
    </Svg>
  );
}

// ─── Militech Corp ───────────────────────────────────────────────────────────
export function MilitechFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Military olive-green field */}
      <Rect x="0" y="0" width="60" height="60" fill="#2A3A1A" />
      {/* Light border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#AABBAA" strokeWidth="1.5" />
      {/* Eagle wings */}
      <Path d="M7 27 Q14 19 21 23 Q23 27 25 28 Q18 23 7 27 Z" fill="#CCDDCC" />
      <Path d="M7 33 Q14 27 21 28 Q23 32 25 32 Q17 29 7 33 Z" fill="#AABBAA" />
      <Path d="M53 27 Q46 19 39 23 Q37 27 35 28 Q42 23 53 27 Z" fill="#CCDDCC" />
      <Path d="M53 33 Q46 27 39 28 Q37 32 35 32 Q43 29 53 33 Z" fill="#AABBAA" />
      {/* Eagle body */}
      <Ellipse cx="30" cy="31" rx="6" ry="7" fill="#CCDDCC" />
      {/* Head */}
      <Circle cx="30" cy="22" r="5" fill="#CCDDCC" />
      {/* Beak */}
      <Path d="M33 23 L39 25 L33 27 Z" fill="#DDBB44" />
      {/* Eye */}
      <Circle cx="31" cy="22" r="1.5" fill="#2A3A1A" />
      <Circle cx="31.5" cy="21.5" r="0.5" fill="#CCDDCC" />
      {/* Tail feathers */}
      <Path d="M26 37 L22 46 L25 44 L27 49 L30 44 L33 49 L35 44 L38 46 L34 37" fill="#CCDDCC" />
      {/* Militech "M" badge on chest */}
      <Rect x="26" y="27" width="8" height="6" rx="1" fill="#2A3A1A" />
      <Path d="M27 32 L27 28 L30 31 L33 28 L33 32" stroke="#CCDDCC" strokeWidth="1.2" fill="none" />
    </Svg>
  );
}

// ─── Red Dead Redemption 2 ────────────────────────────────────────────────────

// ─── Van der Linde Gang ───────────────────────────────────────────────────────
export function VanDerLindeFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Aged dark-crimson field */}
      <Rect x="0" y="0" width="60" height="60" fill="#5C1A0A" />
      {/* Weathered texture streaks */}
      <Path d="M0 18 Q30 16 60 18" stroke="#3A0A00" strokeWidth="1" fill="none" opacity={0.5} />
      <Path d="M0 36 Q30 34 60 36" stroke="#3A0A00" strokeWidth="1" fill="none" opacity={0.5} />
      {/* Rough stitched border */}
      <Rect x="2" y="2" width="56" height="56" fill="none" stroke="#7A3A2A" strokeWidth="2" strokeDasharray="5,3" />
      {/* Skull dome */}
      <Path d="M21 29 Q21 18 30 16 Q39 18 39 29" fill="#EAD9C8" />
      <Rect x="21" y="27" width="18" height="9" rx="2" fill="#EAD9C8" />
      {/* Eye sockets */}
      <Ellipse cx="26" cy="26" rx="3.5" ry="3.5" fill="#5C1A0A" />
      <Ellipse cx="34" cy="26" rx="3.5" ry="3.5" fill="#5C1A0A" />
      {/* Nose cavity */}
      <Path d="M29 30 L30 28 L31 30 L30 31 Z" fill="#5C1A0A" />
      {/* Teeth */}
      <Rect x="22.5" y="35" width="3" height="4.5" rx="0.5" fill="#EAD9C8" />
      <Rect x="26.5" y="35" width="3" height="4.5" rx="0.5" fill="#EAD9C8" />
      <Rect x="30.5" y="35" width="3" height="4.5" rx="0.5" fill="#EAD9C8" />
      <Rect x="34.5" y="35" width="3" height="4.5" rx="0.5" fill="#EAD9C8" />
      {/* Crossbones */}
      <Path d="M12 48 Q30 44 48 48" stroke="#EAD9C8" strokeWidth="2.5" fill="none" />
      <Path d="M14 52 Q30 48 46 52" stroke="#EAD9C8" strokeWidth="2" fill="none" opacity={0.6} />
    </Svg>
  );
}

// ─── Lawman (US Marshal) ─────────────────────────────────────────────────────
export function LawmanFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Deep navy field */}
      <Rect x="0" y="0" width="60" height="60" fill="#1A2A5A" />
      {/* Gold border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#DAA520" strokeWidth="2" />
      {/* 6-pointed marshal star */}
      <Path d="M30 10 L33 22 L45 20 L37 28 L42 40 L30 34 L18 40 L23 28 L15 20 L27 22 Z" fill="#DAA520" />
      {/* Star inner circle */}
      <Circle cx="30" cy="30" r="9" fill="#1A2A5A" />
      {/* Inner gold ring */}
      <Circle cx="30" cy="30" r="7" fill="none" stroke="#DAA520" strokeWidth="1.5" />
      {/* Shield in center */}
      <Path d="M26 24 L34 24 L35 33 Q30 37 25 33 Z" fill="#DAA520" opacity={0.7} />
      <Path d="M27 25.5 L33 25.5 L33.5 32 Q30 35 26.5 32 Z" fill="#1A2A5A" />
      {/* US text hint - decorative lines */}
      <Path d="M16 48 L44 48" stroke="#DAA520" strokeWidth="1.5" opacity={0.6} />
      <Path d="M20 52 L40 52" stroke="#DAA520" strokeWidth="1" opacity={0.4} />
    </Svg>
  );
}

// ─── Fallout ──────────────────────────────────────────────────────────────────

// ─── Vault-Tec ───────────────────────────────────────────────────────────────
export function VaultTecFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Blue top half */}
      <Rect x="0" y="0" width="60" height="30" fill="#1144AA" />
      {/* Yellow bottom half */}
      <Rect x="0" y="30" width="60" height="30" fill="#FFD700" />
      {/* White dividing stripe */}
      <Rect x="0" y="28" width="60" height="4" fill="#FFFFFF" />
      {/* Vault gear emblem */}
      <Circle cx="30" cy="26" r="15" fill="#FFD700" />
      <Circle cx="30" cy="26" r="11" fill="#1144AA" />
      {/* Gear teeth (8 evenly spaced) */}
      <Rect x="28.5" y="9" width="3" height="5" rx="1" fill="#FFD700" />
      <Rect x="28.5" y="38" width="3" height="5" rx="1" fill="#FFD700" />
      <Rect x="13" y="24.5" width="5" height="3" rx="1" fill="#FFD700" />
      <Rect x="42" y="24.5" width="5" height="3" rx="1" fill="#FFD700" />
      <Rect x="17.5" y="13.5" width="3.5" height="3.5" rx="0.5" fill="#FFD700" transform="rotate(45 19.5 15.5)" />
      <Rect x="39" y="13.5" width="3.5" height="3.5" rx="0.5" fill="#FFD700" transform="rotate(45 41 15.5)" />
      <Rect x="17.5" y="34" width="3.5" height="3.5" rx="0.5" fill="#FFD700" transform="rotate(45 19.5 36)" />
      <Rect x="39" y="34" width="3.5" height="3.5" rx="0.5" fill="#FFD700" transform="rotate(45 41 36)" />
      {/* V-T logo in gear center */}
      <Path d="M25 20 L30 30 L35 20" stroke="#FFD700" strokeWidth="2.5" fill="none" />
      <Rect x="25" y="20" width="10" height="2.5" rx="1" fill="#FFD700" />
    </Svg>
  );
}

// ─── Brotherhood of Steel ─────────────────────────────────────────────────────
export function BrotherhoodFlag({ size = 60 }: FlagSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Steel grey field */}
      <Rect x="0" y="0" width="60" height="60" fill="#4A5A5A" />
      {/* Dark border */}
      <Rect x="1" y="1" width="58" height="58" fill="none" stroke="#2A3838" strokeWidth="2" />
      {/* Cog ring (outer) */}
      <Circle cx="30" cy="30" r="17" fill="#2A3838" />
      {/* Cog teeth — 8 evenly placed */}
      <Rect x="28.5" y="11" width="3" height="5" rx="1" fill="#2A3838" />
      <Rect x="28.5" y="44" width="3" height="5" rx="1" fill="#2A3838" />
      <Rect x="11" y="28.5" width="5" height="3" rx="1" fill="#2A3838" />
      <Rect x="44" y="28.5" width="5" height="3" rx="1" fill="#2A3838" />
      <Rect x="16" y="16" width="4" height="4" rx="0.5" fill="#2A3838" transform="rotate(45 18 18)" />
      <Rect x="40" y="16" width="4" height="4" rx="0.5" fill="#2A3838" transform="rotate(45 42 18)" />
      <Rect x="16" y="40" width="4" height="4" rx="0.5" fill="#2A3838" transform="rotate(45 18 42)" />
      <Rect x="40" y="40" width="4" height="4" rx="0.5" fill="#2A3838" transform="rotate(45 42 42)" />
      {/* Cog inner circle */}
      <Circle cx="30" cy="30" r="12" fill="#3A4A4A" />
      <Circle cx="30" cy="30" r="9" fill="#2E3E3E" />
      {/* Sword blade */}
      <Rect x="29" y="16" width="2" height="22" rx="1" fill="#AABBAA" />
      {/* Crossguard */}
      <Rect x="24" y="23" width="12" height="2.5" rx="1" fill="#AABBAA" />
      {/* Hilt / grip */}
      <Rect x="28" y="37" width="4" height="5" rx="1" fill="#887766" />
      {/* Pommel */}
      <Circle cx="30" cy="43" r="2" fill="#998877" />
      {/* Wings (left) */}
      <Path d="M18 28 Q12 22 8 28 Q10 28 14 30 Q12 26 18 28 Z" fill="#6A7A7A" />
      <Path d="M18 32 Q10 30 8 36 Q12 34 16 34 Q14 32 18 32 Z" fill="#596969" />
      {/* Wings (right) */}
      <Path d="M42 28 Q48 22 52 28 Q50 28 46 30 Q48 26 42 28 Z" fill="#6A7A7A" />
      <Path d="M42 32 Q50 30 52 36 Q48 34 44 34 Q46 32 42 32 Z" fill="#596969" />
    </Svg>
  );
}

// ─── Registry: key → component ────────────────────────────────────────────────
export const CUSTOM_FLAG_COMPONENTS: Record<string, React.FC<FlagSvgProps>> = {
  // The Witcher
  flag_svg_nilfgaard: NilfgaardFlag,
  flag_svg_temeria: TemeriaFlag,
  // Skyrim
  flag_svg_stormcloak: StormcloakFlag,
  flag_svg_imperial: ImperialFlag,
  // Cyberpunk 2077
  flag_svg_arasaka: ArasakaFlag,
  flag_svg_militech: MilitechFlag,
  // Red Dead Redemption 2
  flag_svg_vanderlinde: VanDerLindeFlag,
  flag_svg_lawman: LawmanFlag,
  // Fallout
  flag_svg_vaulttec: VaultTecFlag,
  flag_svg_brotherhood: BrotherhoodFlag,
};

export function isCustomFlag(value: string): boolean {
  return value.startsWith('flag_svg_');
}
