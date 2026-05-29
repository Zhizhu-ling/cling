-- AlterTable: Make ai_jobs fields non-nullable as per task requirements
-- request_id: UUID string for tracing (was nullable, now required)
-- input_payload: Json input data sent to AI (was nullable, now required)
-- prompt_version: version of the prompt template used (was nullable, now required)
-- schema_version: version of the output schema (was nullable, now required)

-- First set default values for any existing NULL rows (safety measure)
UPDATE "ai_jobs" SET "request_id" = '' WHERE "request_id" IS NULL;
UPDATE "ai_jobs" SET "input_payload" = '{}' WHERE "input_payload" IS NULL;
UPDATE "ai_jobs" SET "prompt_version" = 'v1.0' WHERE "prompt_version" IS NULL;
UPDATE "ai_jobs" SET "schema_version" = 'v1.0' WHERE "schema_version" IS NULL;

-- AlterTable
ALTER TABLE "ai_jobs" ALTER COLUMN "request_id" SET NOT NULL;
ALTER TABLE "ai_jobs" ALTER COLUMN "input_payload" SET NOT NULL;
ALTER TABLE "ai_jobs" ALTER COLUMN "prompt_version" SET NOT NULL;
ALTER TABLE "ai_jobs" ALTER COLUMN "schema_version" SET NOT NULL;
