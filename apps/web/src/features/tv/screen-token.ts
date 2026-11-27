const KEY = 'bloom.screenToken';

/**
 * Token de dispositivo de la pantalla (AC-005-02). Se guarda en el navegador del televisor para que
 * siga emparejado al reiniciar. Si el almacenamiento no está disponible, dura lo que la pestaña.
 */
let memory: string | null = null;

export function readScreenToken(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function saveScreenToken(token: string): void {
  memory = token;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    // Sin almacenamiento: se queda en memoria.
  }
}

export function clearScreenToken(): void {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}
