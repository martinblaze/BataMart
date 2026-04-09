-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('PENDING', 'RIDER_ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "public"."DeliveryBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "riderId" TEXT,
    "universityId" TEXT NOT NULL,
    "paymentReference" TEXT,
    "referralPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBatch_batchNumber_key" ON "public"."DeliveryBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "DeliveryBatch_buyerId_idx" ON "public"."DeliveryBatch"("buyerId");

-- CreateIndex
CREATE INDEX "DeliveryBatch_riderId_idx" ON "public"."DeliveryBatch"("riderId");

-- CreateIndex
CREATE INDEX "DeliveryBatch_status_idx" ON "public"."DeliveryBatch"("status");

-- CreateIndex
CREATE INDEX "DeliveryBatch_universityId_idx" ON "public"."DeliveryBatch"("universityId");

-- CreateIndex
CREATE INDEX "Order_batchId_idx" ON "public"."Order"("batchId");

-- AddForeignKey
ALTER TABLE "public"."DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."DeliveryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
