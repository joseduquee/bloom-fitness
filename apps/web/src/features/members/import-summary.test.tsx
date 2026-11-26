import type { MemberImport } from '@bloom/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportSummary } from './import-summary';

const result: MemberImport = {
  id: '3b0b3c84-6c0e-4c1a-9a65-1f9f6c2e2a03',
  source: 'mock',
  status: 'SUCCEEDED',
  startedAt: '2026-11-26T18:00:00.000Z',
  finishedAt: '2026-11-26T18:00:01.250Z',
  durationMs: 1250,
  triggeredBy: 'Ana Admin',
  created: 3,
  updated: 2,
  unchanged: 25,
  deactivated: 1,
  errorCount: 1,
  errors: [{ externalId: 'SOC-0009', message: 'Introduce un correo electrónico válido.' }],
  failureReason: null,
};

describe('ImportSummary', () => {
  it('AC-002-02: muestra altas, actualizaciones, sin cambios, desactivados y errores', () => {
    render(<ImportSummary result={result} />);

    const value = (label: string) =>
      within(screen.getByText(label).parentElement as HTMLElement).getByRole('definition');
    expect(value('Altas')).toHaveTextContent('3');
    expect(value('Actualizados')).toHaveTextContent('2');
    expect(value('Sin cambios')).toHaveTextContent('25');
    expect(value('Desactivados')).toHaveTextContent('1');
    expect(value('Errores')).toHaveTextContent('1');
    expect(screen.getByRole('status')).toHaveTextContent('Importación completada en 1,3 s.');
  });

  it('lista los socios que no se han podido importar y el motivo', () => {
    render(<ImportSummary result={result} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('SOC-0009');
    expect(item).toHaveTextContent('Introduce un correo electrónico válido.');
  });

  it('AC-002-04: si la importación falló lo indica y aclara que no se tocó nada', () => {
    render(
      <ImportSummary
        result={{ ...result, status: 'FAILED', failureReason: 'TIMP no ha respondido a tiempo.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La importación ha fallado: TIMP no ha respondido a tiempo. No se ha modificado ningún dato.',
    );
  });
});
