-- CreateTable
CREATE TABLE "AppPrivacy" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "contentAr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppPrivacy_pkey" PRIMARY KEY ("id")
);
