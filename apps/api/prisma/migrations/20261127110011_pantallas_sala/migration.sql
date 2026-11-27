-- CreateTable
CREATE TABLE "screens" (
    "id" UUID NOT NULL,
    "centerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT,
    "pairedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_pairing_codes" (
    "id" UUID NOT NULL,
    "screenId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "screens_tokenHash_key" ON "screens"("tokenHash");

-- CreateIndex
CREATE INDEX "screens_centerId_idx" ON "screens"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "screen_pairing_codes_codeHash_key" ON "screen_pairing_codes"("codeHash");

-- CreateIndex
CREATE INDEX "screen_pairing_codes_screenId_idx" ON "screen_pairing_codes"("screenId");

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_pairing_codes" ADD CONSTRAINT "screen_pairing_codes_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
