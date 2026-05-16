-- AlterTable
ALTER TABLE "OcppLog" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "OcppLog_sessionId_idx" ON "OcppLog"("sessionId");
