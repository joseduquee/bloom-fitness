import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assertSafeKey, type MediaStorage } from './media-storage';

/** Adaptador local: guarda los archivos en una carpeta que el API sirve en `/media/`. */
export class LocalDiskMediaStorage implements MediaStorage {
  constructor(
    private readonly directory: string,
    private readonly publicBaseUrl: string,
  ) {}

  /** En disco el tipo no se guarda: Express lo deduce de la extensión al servirlo. */
  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  publicUrl(key: string): string {
    assertSafeKey(key);
    return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }

  private pathOf(key: string): string {
    assertSafeKey(key);
    return join(this.directory, ...key.split('/'));
  }
}
