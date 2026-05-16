-- CreateTable
CREATE TABLE "OcppLog" (
    "id" TEXT NOT NULL,
    "ocppId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcppLog_ocppId_idx" ON "OcppLog"("ocppId");

-- CreateIndex
CREATE INDEX "OcppLog_createdAt_idx" ON "OcppLog"("createdAt");
