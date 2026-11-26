import { zodResolver } from '@hookform/resolvers/zod';
import {
  createExerciseRequestSchema,
  difficultyLabels,
  difficultySchema,
  equipmentLabels,
  equipmentSchema,
  EXERCISE_MEDIA_MAX_BYTES,
  EXERCISE_MEDIA_TYPE,
  muscleGroupLabels,
  muscleGroupSchema,
  type CreateExerciseRequest,
} from '@bloom/shared';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input, Select, Textarea } from '../../components/ui/input';
import { ExerciseThumbnail } from './exercise-thumbnail';

interface ExerciseFormProps {
  defaultValues?: Partial<CreateExerciseRequest>;
  /** URL del GIF que ya tiene el ejercicio. */
  currentMediaUrl?: string | null;
  submitLabel: string;
  submitting: boolean;
  /** `media`: archivo nuevo, `null` para quitar el actual o `undefined` si no cambia. */
  onSubmit: (values: CreateExerciseRequest, media: File | null | undefined) => void;
  onCancel?: () => void;
}

/** Comprueba en el navegador lo mismo que el API, para avisar antes de subir (AC-003-02). */
export function mediaError(file: File): string | null {
  if (file.type !== EXERCISE_MEDIA_TYPE) return 'El archivo debe ser un GIF.';
  if (file.size > EXERCISE_MEDIA_MAX_BYTES) return 'El GIF no puede superar 5 MB.';
  return null;
}

/** Formulario de alta y edición de un ejercicio con su GIF (AC-003-01, AC-003-02). */
export function ExerciseForm({
  defaultValues,
  currentMediaUrl = null,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: ExerciseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateExerciseRequest>({
    resolver: zodResolver(createExerciseRequestSchema),
    defaultValues: {
      name: '',
      primaryMuscle: 'QUADRICEPS',
      equipment: 'BARBELL',
      difficulty: 'BEGINNER',
      instructions: '',
      ...defaultValues,
    },
  });
  const [media, setMedia] = useState<File | null | undefined>(undefined);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputId = useId();

  const selectedUrl = useMemo(() => (media ? URL.createObjectURL(media) : null), [media]);
  useEffect(() => {
    return () => {
      if (selectedUrl) URL.revokeObjectURL(selectedUrl);
    };
  }, [selectedUrl]);
  const previewUrl = media === undefined ? currentMediaUrl : selectedUrl;

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const error = mediaError(file);
    setFileError(error);
    if (!error) setMedia(file);
  };

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values, media))}
      noValidate
      className="space-y-4"
    >
      <Field label="Nombre" error={errors.name?.message}>
        <Input {...register('name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Músculo principal" error={errors.primaryMuscle?.message}>
          <Select {...register('primaryMuscle')}>
            {muscleGroupSchema.options.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscleGroupLabels[muscle]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Equipamiento" error={errors.equipment?.message}>
          <Select {...register('equipment')}>
            {equipmentSchema.options.map((equipment) => (
              <option key={equipment} value={equipment}>
                {equipmentLabels[equipment]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dificultad" error={errors.difficulty?.message}>
          <Select {...register('difficulty')}>
            {difficultySchema.options.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficultyLabels[difficulty]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Instrucciones" error={errors.instructions?.message}>
        <Textarea {...register('instructions')} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">Demostración (GIF)</legend>
        <div className="flex items-center gap-4">
          <ExerciseThumbnail
            url={previewUrl}
            name={defaultValues?.name ?? 'nuevo ejercicio'}
            className="size-24"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={fileInputId}
                className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-slate-900 ring-1 ring-slate-300 ring-inset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-700 hover:bg-slate-50"
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                {previewUrl ? 'Cambiar GIF' : 'Elegir GIF'}
                <input
                  id={fileInputId}
                  type="file"
                  accept={EXERCISE_MEDIA_TYPE}
                  className="sr-only"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMedia(currentMediaUrl ? null : undefined);
                    setFileError(null);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Quitar
                </Button>
              )}
            </div>
            {fileError ? (
              <p role="alert" className="text-sm text-red-600">
                {fileError}
              </p>
            ) : (
              <p className="text-sm text-slate-500">GIF de 5 MB como máximo.</p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
