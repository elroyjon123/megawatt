-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "catalogId" TEXT;

-- CreateTable
CREATE TABLE "VehicleCatalog" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "connectorType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCatalog_make_idx" ON "VehicleCatalog"("make");

-- CreateIndex
CREATE INDEX "VehicleCatalog_model_idx" ON "VehicleCatalog"("model");

-- CreateIndex
CREATE INDEX "VehicleCatalog_isActive_idx" ON "VehicleCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCatalog_make_model_year_connectorType_key" ON "VehicleCatalog"("make", "model", "year", "connectorType");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "VehicleCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
