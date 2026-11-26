/** Firma de los GIF: los seis primeros bytes son `GIF87a` o `GIF89a` (AC-003-02). */
export function isGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false;
  const signature = buffer.subarray(0, 6).toString('latin1');
  return signature === 'GIF87a' || signature === 'GIF89a';
}
