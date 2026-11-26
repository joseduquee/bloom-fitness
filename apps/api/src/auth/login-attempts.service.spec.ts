import { describe, expect, it } from 'vitest';
import { LoginAttemptsService } from './login-attempts.service';

function createService(clock: () => number): LoginAttemptsService {
  const service = new LoginAttemptsService();
  service.now = clock;
  return service;
}

describe('LoginAttemptsService', () => {
  const ip = '10.0.0.1';
  const email = 'ana@bloom.test';

  it('AC-001-03: bloquea tras 5 fallos en 15 minutos', () => {
    const service = createService(() => 0);
    for (let i = 0; i < 4; i++) service.registerFailure(ip, email);
    expect(service.isBlocked(ip, email)).toBe(false);
    service.registerFailure(ip, email);
    expect(service.isBlocked(ip, email)).toBe(true);
  });

  it('AC-001-03: desbloquea cuando los fallos salen de la ventana', () => {
    let now = 0;
    const service = createService(() => now);
    for (let i = 0; i < 5; i++) service.registerFailure(ip, email);
    now = 15 * 60 * 1000 + 1;
    expect(service.isBlocked(ip, email)).toBe(false);
  });

  it('cuenta por separado cada combinación de IP y correo', () => {
    const service = createService(() => 0);
    for (let i = 0; i < 5; i++) service.registerFailure(ip, email);
    expect(service.isBlocked('10.0.0.2', email)).toBe(false);
    expect(service.isBlocked(ip, 'otro@bloom.test')).toBe(false);
  });

  it('un acceso correcto reinicia el contador', () => {
    const service = createService(() => 0);
    for (let i = 0; i < 5; i++) service.registerFailure(ip, email);
    service.reset(ip, email);
    expect(service.isBlocked(ip, email)).toBe(false);
  });
});
