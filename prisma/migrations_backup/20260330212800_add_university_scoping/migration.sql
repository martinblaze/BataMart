/*
  Warnings:

  - You are about to drop the column `faceDescriptor` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `faceToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `faceTokenExpiry` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."NotificationType" ADD VALUE 'STOCK_ALERT';

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "universityId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "faceDescriptor",
DROP COLUMN "faceToken",
DROP COLUMN "faceTokenExpiry",
ADD COLUMN     "universityId" TEXT;

-- CreateTable
CREATE TABLE "public"."University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryAreas" JSONB NOT NULL DEFAULT '[]',
    "hostels" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "University_name_key" ON "public"."University"("name");

-- CreateIndex
CREATE UNIQUE INDEX "University_shortName_key" ON "public"."University"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "public"."University"("slug");

-- CreateIndex
CREATE INDEX "University_slug_idx" ON "public"."University"("slug");

-- CreateIndex
CREATE INDEX "University_isActive_idx" ON "public"."University"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Product_universityId_idx" ON "public"."Product"("universityId");

-- CreateIndex
CREATE INDEX "User_universityId_idx" ON "public"."User"("universityId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "public"."University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "public"."University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
