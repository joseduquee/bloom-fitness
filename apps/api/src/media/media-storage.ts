/**
 * Puerto del almacenamiento de archivos públicos, como los GIF de los ejercicios (spec 003).
 * En local se usa el disco; en el diseño objetivo de AWS, un bucket de S3 servido por CloudFront.
 */
export interface MediaStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Borra el archivo. Si no existe no hace nada. */
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

/** Las claves las genera el API; aun así se validan para que nunca salgan de la carpeta. */
const SAFE_KEY = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.[a-z0-9]+$/;

export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key)) {
    throw new Error(`Clave de archivo no válida: ${key}`);
  }
}
