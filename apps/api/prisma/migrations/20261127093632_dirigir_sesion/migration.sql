-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('PRESENT', 'ABSENT');

-- AlterTable
ALTER TABLE "session_attendees" ADD COLUMN     "attendance" "Attendance" NOT NULL DEFAULT 'PRESENT',
ADD COLUMN     "currentIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "routineId" UUID,
ADD COLUMN     "routineName" TEXT,
ADD COLUMN     "routinePosition" INTEGER,
ADD COLUMN     "templateId" UUID,
ADD COLUMN     "templateName" TEXT;

-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" UUID NOT NULL,
    "attendeeId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "exerciseId" UUID NOT NULL,
    "originalExerciseId" UUID,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "targetLoadKg" DECIMAL(6,2),
    "restSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "skippedAt" TIMESTAMP(3),

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_logs" (
    "id" UUID NOT NULL,
    "sessionExerciseId" UUID NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "reps" INTEGER NOT NULL,
    "rpe" INTEGER,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_exercises_attendeeId_position_key" ON "session_exercises"("attendeeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "set_logs_sessionExerciseId_setNumber_key" ON "set_logs"("sessionExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "session_attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
