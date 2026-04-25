import { Platform } from 'react-native';

export const Colors = {
  // Core
  bg:          '#050B14',
  bgCard:      '#0D1B2E',
  bgSurface:   '#112036',
  border:      'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(14,165,233,0.5)',

  // Brand
  primary:     '#0EA5E9',
  primaryDark: '#0284C7',
  accent:      '#06B6D4',
  wave:        '#38BDF8',

  // Text
  text:        '#F0F9FF',
  textMuted:   '#94A3B8',
  textSubtle:  '#475569',

  // Status
  success:     '#10B981',
  warning:     '#F59E0B',
  error:       '#EF4444',

  // Legacy theme object (for ThemedText/ThemedView components)
  light: {
    text: '#F0F9FF',
    background: '#050B14',
    tint: '#0EA5E9',
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: '#0EA5E9',
  },
  dark: {
    text: '#F0F9FF',
    background: '#050B14',
    tint: '#0EA5E9',
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: '#0EA5E9',
  },
};

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
