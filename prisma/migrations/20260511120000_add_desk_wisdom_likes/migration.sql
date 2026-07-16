-- CreateTable
CREATE TABLE "DeskWisdomLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskWisdomLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeskWisdomLike_userId_quoteId_key" ON "DeskWisdomLike"("userId", "quoteId");

-- CreateIndex
CREATE INDEX "DeskWisdomLike_userId_idx" ON "DeskWisdomLike"("userId");

-- AddForeignKey
ALTER TABLE "DeskWisdomLike" ADD CONSTRAINT "DeskWisdomLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
