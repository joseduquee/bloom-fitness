/*
  Warnings:

  - A unique constraint covering the columns `[centerId,externalSource,externalId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalMissingSince" TIMESTAMP(3),
ADD COLUMN     "externalSource" TEXT;

-- CreateTable
CREATE TABLE "member_imports" (
    "id" UUID NOT NULL,
    "centerId" UUID NOT NULL,
    "triggeredById" UUID,
    "source" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "deactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "failureReason" TEXT,

    CONSTRAINT "member_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_imports_centerId_startedAt_idx" ON "member_imports"("centerId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_centerId_externalSource_externalId_key" ON "users"("centerId", "externalSource", "externalId");

-- AddForeignKey
ALTER TABLE "member_imports" ADD CONSTRAINT "member_imports_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_imports" ADD CONSTRAINT "member_imports_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
