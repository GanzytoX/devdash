ALTER TABLE "Service" ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Service" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "message" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "durationMs" INTEGER,
    CONSTRAINT "Incident_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PingResult_serviceId_timestamp_idx" ON "PingResult"("serviceId", "timestamp");
CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");
CREATE INDEX "Incident_serviceId_startedAt_idx" ON "Incident"("serviceId", "startedAt");
CREATE INDEX "Incident_status_startedAt_idx" ON "Incident"("status", "startedAt");
