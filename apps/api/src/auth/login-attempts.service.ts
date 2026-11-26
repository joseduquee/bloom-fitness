import { Injectable } from '@nestjs/common';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Limita los intentos fallidos de inicio de sesión por IP y correo (AC-001-03).
 * Ventana deslizante en memoria: válido con una instancia del API. Con varias instancias
 * habría que compartir el estado (por ejemplo, en Redis).
 */
@Injectable()
export class LoginAttemptsService {
  private readonly failures = new Map<string, number[]>();

  /** Reloj inyectable para las pruebas. */
  now: () => number = Date.now;

  isBlocked(ip: string, email: string): boolean {
    return this.recentFailures(this.key(ip, email)).length >= MAX_FAILURES;
  }

  registerFailure(ip: string, email: string): void {
    const key = this.key(ip, email);
    this.failures.set(key, [...this.recentFailures(key), this.now()]);
  }

  reset(ip: string, email: string): void {
    this.failures.delete(this.key(ip, email));
  }

  /** Olvida todos los intentos (se usa en las pruebas). */
  clear(): void {
    this.failures.clear();
  }

  private recentFailures(key: string): number[] {
    const limit = this.now() - WINDOW_MS;
    const recent = (this.failures.get(key) ?? []).filter((time) => time > limit);
    if (recent.length === 0) {
      this.failures.delete(key);
    }
    return recent;
  }

  private key(ip: string, email: string): string {
    return `${ip}|${email.toLowerCase()}`;
  }
}
