-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "createdBy" TEXT;

-- CreateIndex
CREATE INDEX "Message_createdBy_idx" ON "Message"("createdBy");

-- CreateIndex
CREATE INDEX "Message_batchId_idx" ON "Message"("batchId");
