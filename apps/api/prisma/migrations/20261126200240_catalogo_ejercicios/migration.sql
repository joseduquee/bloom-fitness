-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'CORE', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'FULL_BODY', 'CARDIO');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BODYWEIGHT', 'BARBELL', 'DUMBBELL', 'KETTLEBELL', 'MACHINE', 'CABLE', 'BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "centerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "primaryMuscle" "MuscleGroup" NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "instructions" TEXT,
    "mediaKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercises_centerId_isActive_idx" ON "exercises"("centerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_centerId_name_key" ON "exercises"("centerId", "name");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
