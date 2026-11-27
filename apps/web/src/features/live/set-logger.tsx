import { zodResolver } from '@hookform/resolvers/zod';
import {
  logSetRequestSchema,
  SET_WEIGHT_MAX_KG,
  targetRepsValue,
  type LiveExercise,
  type LogSetRequest,
} from '@bloom/shared';
import { RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const optionalNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value);

/** Valores precargados (AC-004-10): lo ya registrado, si no la última serie o el objetivo. */
export function setDefaults(exercise: LiveExercise, setNumber: number): LogSetRequest {
  const existing = exercise.logs.find((log) => log.setNumber === setNumber);
  if (existing) return { weightKg: existing.weightKg, reps: existing.reps, rpe: existing.rpe };
  const previous = exercise.logs.filter((log) => log.setNumber < setNumber).at(-1);
  return {
    weightKg: previous?.weightKg ?? exercise.targetLoadKg ?? 0,
    reps: previous?.reps ?? targetRepsValue(exercise.reps) ?? Number.NaN,
    rpe: null,
  };
}

interface SetLoggerProps {
  exercise: LiveExercise;
  setNumber: number;
  saving: boolean;
  /** Error del último intento. Los valores escritos se conservan para reintentar (AC-004-13). */
  error: string | null;
  /** Valores del intento fallido, para no perderlos al deshacer el cambio optimista. */
  failedValues?: LogSetRequest | null;
  onSave: (values: LogSetRequest) => void;
}

/** Registro de una serie del ejercicio en curso (AC-004-10, AC-004-11). */
export function SetLogger({
  exercise,
  setNumber,
  saving,
  error,
  failedValues,
  onSave,
}: SetLoggerProps) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LogSetRequest>({
    resolver: zodResolver(logSetRequestSchema),
    defaultValues: failedValues ?? setDefaults(exercise, setNumber),
  });
  const editing = exercise.logs.some((log) => log.setNumber === setNumber);

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-2">
      <p className="text-sm font-medium text-slate-800">
        {editing ? 'Corregir' : 'Registrar'} serie {setNumber} de {exercise.sets}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">Peso (kg)</span>
          <Input
            type="number"
            inputMode="decimal"
            step={0.25}
            min={0}
            max={SET_WEIGHT_MAX_KG}
            className="h-12 text-lg"
            {...register('weightKg', { valueAsNumber: true })}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">Repeticiones</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            className="h-12 text-lg"
            {...register('reps', { valueAsNumber: true })}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">RPE</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            placeholder="—"
            className="h-12 text-lg"
            {...register('rpe', { setValueAs: optionalNumber })}
          />
        </label>
      </div>
      {(errors.weightKg || errors.reps || errors.rpe) && (
        <p role="alert" className="text-sm text-red-600">
          {errors.weightKg?.message ?? errors.reps?.message ?? errors.rpe?.message}
        </p>
      )}
      {error && (
        <Alert>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {error}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => onSave(getValues())}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          </span>
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full" loading={saving}>
        {editing ? 'Guardar corrección' : 'Guardar serie'}
      </Button>
    </form>
  );
}
