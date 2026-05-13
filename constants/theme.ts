import { Platform } from 'react-native';

export const DarkColors = {
  bg:          '#050B14',
  bgCard:      '#0D1B2E',
  bgSurface:   '#112036',
  border:      'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(14,165,233,0.5)',
  primary:     '#0EA5E9',
  primaryDark: '#0284C7',
  accent:      '#06B6D4',
  wave:        '#38BDF8',
  text:        '#F0F9FF',
  textMuted:   '#94A3B8',
  textSubtle:  '#475569',
  success:     '#10B981',
  warning:     '#F59E0B',
  error:       '#EF4444',
};

export const LightColors = {
  bg:          '#F0F9FF',
  bgCard:      '#FFFFFF',
  bgSurface:   '#F1F5F9',
  border:      'rgba(0,0,0,0.1)',
  borderFocus: 'rgba(14,165,233,0.5)',
  primary:     '#0284C7',
  primaryDark: '#0369A1',
  accent:      '#0891B2',
  wave:        '#0EA5E9',
  text:        '#0F172A',
  textMuted:   '#475569',
  textSubtle:  '#94A3B8',
  success:     '#059669',
  warning:     '#D97706',
  error:       '#DC2626',
};

export type ThemeColors = typeof DarkColors;

// Static export for files that haven't migrated to useTheme() yet (always dark)
export const Colors = DarkColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
