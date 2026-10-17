import { describe, expect, it } from 'vitest';
import { homePathFor, joinUrl, loginPath, safeNext } from './routes';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/join?code=HANGUL')).toBe('/join?code=HANGUL');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'join', '', null])(
    'rejects %s',
    (value) => {
      expect(safeNext(value, '/home')).toBe('/home');
    },
  );
});

describe('route helpers', () => {
  it('sends each role to its home', () => {
    expect(homePathFor('teacher')).toBe('/classes');
    expect(homePathFor('student')).toBe('/home');
    expect(homePathFor(null)).toBe('/onboarding');
  });

  it('encodes the return path for login', () => {
    expect(loginPath('/join?code=HANGUL')).toBe('/login?next=%2Fjoin%3Fcode%3DHANGUL');
    expect(loginPath('/')).toBe('/login');
  });

  it('builds the QR join link', () => {
    expect(joinUrl('https://dasi.app', 'HANGUL')).toBe('https://dasi.app/join?code=HANGUL');
  });
});
