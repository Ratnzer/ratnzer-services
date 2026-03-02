-- CreateTable
CREATE TABLE "WalletTopupRequest" (
    "id" VARCHAR(8) NOT NULL,
    "userId" VARCHAR(8) NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopupRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WalletTopupRequest" ADD CONSTRAINT "WalletTopupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
