import { describe, expect, it } from 'vitest';
import { isGif } from './gif';

describe('isGif', () => {
  it('AC-003-02: reconoce las dos versiones del formato GIF por su firma', () => {
    expect(isGif(Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1'))).toBe(true);
    expect(isGif(Buffer.from('GIF87a\x01\x00\x01\x00', 'latin1'))).toBe(true);
  });

  it('AC-003-02: rechaza otros formatos aunque se llamen .gif', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isGif(png)).toBe(false);
    expect(isGif(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(false);
    expect(isGif(Buffer.from('GIF'))).toBe(false);
  });
});
