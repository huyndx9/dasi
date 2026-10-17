import { describe, expect, it } from 'vitest';
import { languageDistribution } from './classes';
import { joinErrorKey } from './join';

describe('languageDistribution', () => {
  it('counts students per language, largest group first', () => {
    const members = ['vi', 'zh', 'vi', 'en', 'vi', 'zh'].map((mother_tongue) => ({
      mother_tongue,
    }));
    expect(languageDistribution(members)).toEqual([
      { code: 'vi', count: 3, share: 0.5 },
      { code: 'zh', count: 2, share: 2 / 6 },
      { code: 'en', count: 1, share: 1 / 6 },
    ]);
  });

  it('ignores codes outside the registry and handles empty classes', () => {
    expect(languageDistribution([{ mother_tongue: 'xx' }])).toEqual([]);
    expect(languageDistribution([])).toEqual([]);
  });
});

describe('joinErrorKey', () => {
  it('explains the join_class errors', () => {
    expect(joinErrorKey('P0002')).toBe('join.errorNotFound');
    expect(joinErrorKey('42501')).toBe('join.errorRole');
    expect(joinErrorKey(undefined)).toBe('join.errorSave');
  });
});
