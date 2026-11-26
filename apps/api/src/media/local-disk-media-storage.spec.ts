import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDiskMediaStorage } from './local-disk-media-storage';

describe('LocalDiskMediaStorage', () => {
  let directory: string;
  let storage: LocalDiskMediaStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bloom-media-'));
    storage = new LocalDiskMediaStorage(directory, 'http://localhost:3000/media/');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('guarda el archivo en subcarpetas y construye su URL pública', async () => {
    await storage.put('exercises/abc-123.gif', Buffer.from('GIF89a'), 'image/gif');
    expect(await readFile(join(directory, 'exercises', 'abc-123.gif'), 'utf8')).toBe('GIF89a');
    expect(storage.publicUrl('exercises/abc-123.gif')).toBe(
      'http://localhost:3000/media/exercises/abc-123.gif',
    );
  });

  it('borra el archivo y no falla si ya no existe', async () => {
    await storage.put('exercises/x.gif', Buffer.from('GIF89a'), 'image/gif');
    await storage.delete('exercises/x.gif');
    await expect(storage.delete('exercises/x.gif')).resolves.toBeUndefined();
    await expect(readFile(join(directory, 'exercises', 'x.gif'))).rejects.toThrow();
  });

  it('rechaza claves que podrían salir de la carpeta', async () => {
    for (const key of ['../secreto.gif', 'exercises/../../x.gif', '/etc/passwd', 'a\\b.gif']) {
      await expect(storage.put(key, Buffer.from(''), 'image/gif')).rejects.toThrow(
        'Clave de archivo no válida',
      );
    }
  });
});
