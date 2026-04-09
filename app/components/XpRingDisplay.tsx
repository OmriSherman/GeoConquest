/**
 * XpRingDisplay — circular XP progress ring with level number in the center.
 * The ring fills clockwise as the user approaches the next level.
 * Visualization only for now; logic will be wired up later.
 */

import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface XpRingDisplayProps {
  level: number;
  /** Current XP within the current level */
  xpCurrent: number;
  /** XP required to reach the next level */
  xpMax: number;
  size?: number;
  isPremium?: boolean;
}

export default function XpRingDisplay({ level, xpCurrent, xpMax, size = 38, isPremium = false }: XpRingDisplayProps) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = xpMax > 0 ? Math.min(xpCurrent / xpMax, 1) : 0;
  const strokeDashoffset = circumference * (1 - pct);
  const center = size / 2;
  const accentColor = isPremium ? '#a78bfa' : '#FFD700';

  // Font scales with size: small sizes use proportionally larger text
  const fontSize = Math.round(size * 0.32);

  return (
    <Svg width={size} height={size}>
      {/* Background track */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="#2a2a5e"
        strokeWidth={strokeWidth}
        fill="#0e0e2a"
      />
      {/* XP progress arc — starts from top (rotation -90) */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={accentColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
      />
      {/* Level number */}
      <SvgText
        x={center}
        y={center + fontSize * 0.38}
        textAnchor="middle"
        fill={accentColor}
        fontSize={fontSize}
        fontWeight="bold"
      >
        {level}
      </SvgText>
    </Svg>
  );
}
