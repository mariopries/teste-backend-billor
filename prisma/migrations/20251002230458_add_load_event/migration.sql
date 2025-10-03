-- CreateTable
CREATE TABLE "LoadEvent" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadEvent_loadId_createdAt_idx" ON "LoadEvent"("loadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoadEvent" ADD CONSTRAINT "LoadEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
