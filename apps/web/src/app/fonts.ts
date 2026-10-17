import {
  Be_Vietnam_Pro,
  IBM_Plex_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_KR,
  Noto_Sans_Thai,
} from 'next/font/google';

export const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const notoKr = Noto_Sans_KR({
  weight: ['400', '500', '700'],
  variable: '--font-noto-kr',
  preload: false,
});

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-plex-mono',
});

export const notoDevanagari = Noto_Sans_Devanagari({
  weight: ['400', '600'],
  variable: '--font-noto-devanagari',
  preload: false,
});

export const notoThai = Noto_Sans_Thai({
  weight: ['400', '600'],
  variable: '--font-noto-thai',
  preload: false,
});

export const fontVariables = [beVietnam, notoKr, plexMono, notoDevanagari, notoThai]
  .map((f) => f.variable)
  .join(' ');
