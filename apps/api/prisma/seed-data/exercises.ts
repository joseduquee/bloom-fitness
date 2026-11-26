import type { CreateExerciseRequest } from '@bloom/shared';

/**
 * Catálogo inicial de ejercicios (AC-003-06). Sin GIF: el entrenador los sube desde la aplicación,
 * así no se reparten animaciones con derechos de terceros dentro del repositorio.
 */
// prettier-ignore
export const seedExercises: CreateExerciseRequest[] = [
  // Pierna
  { name: 'Sentadilla con barra', primaryMuscle: 'QUADRICEPS', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', instructions: 'Barra sobre los trapecios, pies a la anchura de los hombros. Baja con la espalda neutra hasta que los muslos queden paralelos al suelo y sube empujando con todo el pie.' },
  { name: 'Sentadilla goblet', primaryMuscle: 'QUADRICEPS', equipment: 'KETTLEBELL', difficulty: 'BEGINNER', instructions: 'Sujeta la kettlebell pegada al pecho. Baja entre las piernas con el torso erguido y sube sin despegar los talones.' },
  { name: 'Prensa de piernas', primaryMuscle: 'QUADRICEPS', equipment: 'MACHINE', difficulty: 'BEGINNER', instructions: 'Pies en el centro de la plataforma. Baja hasta formar unos 90° con las rodillas y empuja sin bloquearlas al final.' },
  { name: 'Zancada con mancuernas', primaryMuscle: 'QUADRICEPS', equipment: 'DUMBBELL', difficulty: 'INTERMEDIATE', instructions: 'Da un paso largo al frente y baja la rodilla de atrás casi hasta el suelo. Vuelve a la posición inicial y alterna piernas.' },
  { name: 'Sentadilla búlgara', primaryMuscle: 'QUADRICEPS', equipment: 'DUMBBELL', difficulty: 'ADVANCED', instructions: 'Empeine trasero apoyado en un banco. Baja con el peso en la pierna delantera, manteniendo la rodilla alineada con el pie.' },
  { name: 'Peso muerto rumano', primaryMuscle: 'HAMSTRINGS', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', instructions: 'Rodillas ligeramente flexionadas. Lleva la cadera atrás deslizando la barra por los muslos hasta notar estiramiento en los isquiotibiales y vuelve a subir.' },
  { name: 'Curl femoral tumbado', primaryMuscle: 'HAMSTRINGS', equipment: 'MACHINE', difficulty: 'BEGINNER', instructions: 'Tumbado boca abajo, flexiona las rodillas llevando el rodillo hacia los glúteos sin levantar la cadera.' },
  { name: 'Hip thrust con barra', primaryMuscle: 'GLUTES', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', instructions: 'Espalda alta apoyada en un banco y barra sobre la cadera. Eleva la cadera hasta alinear tronco y muslos y aprieta los glúteos arriba.' },
  { name: 'Puente de glúteo', primaryMuscle: 'GLUTES', equipment: 'BODYWEIGHT', difficulty: 'BEGINNER', instructions: 'Tumbado boca arriba con las rodillas flexionadas. Eleva la cadera apretando los glúteos y baja controlando.' },
  { name: 'Patada de glúteo en polea', primaryMuscle: 'GLUTES', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Tobillera enganchada a la polea baja. Lleva la pierna hacia atrás sin arquear la zona lumbar.' },
  { name: 'Elevación de talones de pie', primaryMuscle: 'CALVES', equipment: 'MACHINE', difficulty: 'BEGINNER', instructions: 'Puntas de los pies en el borde. Sube todo lo posible, mantén un segundo y baja hasta notar el estiramiento.' },
  // Empuje
  { name: 'Press de banca con barra', primaryMuscle: 'CHEST', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', instructions: 'Escápulas juntas y pies firmes. Baja la barra a la parte media del pecho y empuja hasta extender los brazos.' },
  { name: 'Press inclinado con mancuernas', primaryMuscle: 'CHEST', equipment: 'DUMBBELL', difficulty: 'INTERMEDIATE', instructions: 'Banco a unos 30°. Baja las mancuernas a los lados del pecho y súbelas juntándolas ligeramente arriba.' },
  { name: 'Aperturas en polea', primaryMuscle: 'CHEST', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Codos ligeramente flexionados. Junta las manos delante del pecho describiendo un arco y vuelve despacio.' },
  { name: 'Flexiones', primaryMuscle: 'CHEST', equipment: 'BODYWEIGHT', difficulty: 'BEGINNER', instructions: 'Cuerpo en línea recta de la cabeza a los talones. Baja el pecho cerca del suelo y empuja hasta extender los brazos.' },
  { name: 'Press militar con barra', primaryMuscle: 'SHOULDERS', equipment: 'BARBELL', difficulty: 'ADVANCED', instructions: 'De pie, glúteos y abdomen activos. Empuja la barra por encima de la cabeza sin arquear la espalda.' },
  { name: 'Press de hombro con mancuernas', primaryMuscle: 'SHOULDERS', equipment: 'DUMBBELL', difficulty: 'BEGINNER', instructions: 'Sentado con respaldo. Sube las mancuernas desde la altura de las orejas hasta casi juntarlas arriba.' },
  { name: 'Elevaciones laterales', primaryMuscle: 'SHOULDERS', equipment: 'DUMBBELL', difficulty: 'BEGINNER', instructions: 'Eleva las mancuernas a los lados hasta la altura de los hombros con los codos ligeramente flexionados.' },
  { name: 'Fondos en paralelas', primaryMuscle: 'TRICEPS', equipment: 'BODYWEIGHT', difficulty: 'ADVANCED', instructions: 'Baja flexionando los codos hasta unos 90° con el torso ligeramente inclinado y vuelve a subir.' },
  { name: 'Extensión de tríceps en polea', primaryMuscle: 'TRICEPS', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Codos pegados al cuerpo. Extiende los brazos hacia abajo y vuelve sin separar los codos.' },
  // Tracción
  { name: 'Dominadas', primaryMuscle: 'BACK', equipment: 'BODYWEIGHT', difficulty: 'ADVANCED', instructions: 'Agarre algo más ancho que los hombros. Sube hasta pasar la barbilla por encima de la barra y baja con control.' },
  { name: 'Jalón al pecho', primaryMuscle: 'BACK', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Lleva la barra hacia la parte alta del pecho juntando las escápulas, sin balancear el tronco.' },
  { name: 'Remo con barra', primaryMuscle: 'BACK', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', instructions: 'Tronco inclinado unos 45° y espalda neutra. Lleva la barra hacia el ombligo y baja controlando.' },
  { name: 'Remo con mancuerna a una mano', primaryMuscle: 'BACK', equipment: 'DUMBBELL', difficulty: 'BEGINNER', instructions: 'Mano y rodilla apoyadas en un banco. Tira de la mancuerna hacia la cadera con el codo cerca del cuerpo.' },
  { name: 'Remo sentado en polea', primaryMuscle: 'BACK', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Espalda recta. Tira del agarre hacia el abdomen juntando las escápulas y vuelve estirando los brazos.' },
  { name: 'Face pull', primaryMuscle: 'SHOULDERS', equipment: 'CABLE', difficulty: 'BEGINNER', instructions: 'Cuerda a la altura de la cara. Tira separando las manos y llevando los codos hacia atrás y arriba.' },
  { name: 'Curl de bíceps con barra', primaryMuscle: 'BICEPS', equipment: 'BARBELL', difficulty: 'BEGINNER', instructions: 'Codos pegados al cuerpo. Sube la barra sin balancear el tronco y baja despacio.' },
  { name: 'Curl martillo', primaryMuscle: 'BICEPS', equipment: 'DUMBBELL', difficulty: 'BEGINNER', instructions: 'Palmas enfrentadas. Sube las mancuernas alternando brazos sin mover los codos.' },
  // Core y cuerpo completo
  { name: 'Plancha frontal', primaryMuscle: 'CORE', equipment: 'BODYWEIGHT', difficulty: 'BEGINNER', instructions: 'Antebrazos bajo los hombros y cuerpo en línea recta. Mantén la posición apretando abdomen y glúteos.' },
  { name: 'Pallof press', primaryMuscle: 'CORE', equipment: 'BAND', difficulty: 'INTERMEDIATE', instructions: 'De lado a la polea o banda. Extiende los brazos al frente sin dejar que el tronco gire y vuelve al pecho.' },
  { name: 'Rueda abdominal', primaryMuscle: 'CORE', equipment: 'OTHER', difficulty: 'ADVANCED', instructions: 'De rodillas, rueda hacia delante manteniendo la zona lumbar neutra y vuelve contrayendo el abdomen.' },
  { name: 'Swing con kettlebell', primaryMuscle: 'FULL_BODY', equipment: 'KETTLEBELL', difficulty: 'INTERMEDIATE', instructions: 'Bisagra de cadera. Proyecta la kettlebell hasta la altura del pecho con un golpe de cadera, sin tirar con los brazos.' },
  { name: 'Burpees', primaryMuscle: 'FULL_BODY', equipment: 'BODYWEIGHT', difficulty: 'INTERMEDIATE', instructions: 'Baja a plancha, haz una flexión, recoge las piernas y termina con un salto vertical.' },
  { name: 'Remo en ergómetro', primaryMuscle: 'CARDIO', equipment: 'MACHINE', difficulty: 'BEGINNER', instructions: 'Empuja primero con las piernas, después inclina el tronco y termina tirando con los brazos. Vuelve en orden inverso.' },
];
