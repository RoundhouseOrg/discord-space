import { describe, expect, it } from 'vitest';
import { commands } from './index';

describe('commands registry', () => {
  it('starts empty until gameplay commands are implemented', () => {
    expect(commands).toEqual([]);
  });
});
