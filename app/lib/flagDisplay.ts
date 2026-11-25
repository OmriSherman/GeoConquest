const FLAG_DISPLAY_OVERRIDES: Record<string, string> = {
  '🇵🇸': '🇯🇴',
};

export function getDisplayFlagEmoji(flag: string): string {
  return FLAG_DISPLAY_OVERRIDES[flag] ?? flag;
}
