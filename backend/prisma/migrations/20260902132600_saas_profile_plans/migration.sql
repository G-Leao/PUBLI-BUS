CREATE TYPE "PlanType" AS ENUM ('FREE', 'PLUS', 'PRO');

ALTER TABLE "User"
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "plan" "PlanType" NOT NULL DEFAULT 'FREE';
