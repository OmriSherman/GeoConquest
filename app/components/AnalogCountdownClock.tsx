import React from 'react';
import { Text, View } from 'react-native';

type Format = 'mm:ss' | 'hh:mm' | 'hh:mm:ss';

type Props = {
  remainingSeconds: number;
  totalSeconds: number;
  format: Format;
  size?: number;
  color?: string;
};

export default function AnalogCountdownClock({
  remainingSeconds,
  format,
  size = 80,
  color = '#FFD700',
}: Props) {
  let label = '';
  if (format === 'mm:ss') {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (format === 'hh:mm') {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } else {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;
    label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const fontSize = Math.max(10, Math.round(size * 0.28));
  const boxPadH = Math.max(2, Math.round(fontSize * 0.25));
  const boxPadV = Math.max(1, Math.round(fontSize * 0.15));
  const groups = label.split(':');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <Text style={{ color, fontSize, fontWeight: '800', marginHorizontal: 1, lineHeight: fontSize + boxPadV * 2 }}>
              :
            </Text>
          )}
          {/* Each digit in its own box */}
          <View style={{ flexDirection: 'row', gap: 1 }}>
            {group.split('').map((digit, di) => (
              <View
                key={di}
                style={{
                  backgroundColor: '#0d0d1f',
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: color + '33',
                  paddingHorizontal: boxPadH,
                  paddingVertical: boxPadV,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color,
                    fontSize,
                    fontWeight: '800',
                    fontVariant: ['tabular-nums'],
                    lineHeight: fontSize + 2,
                  }}
                >
                  {digit}
                </Text>
              </View>
            ))}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}
