-- Platform admin: additive migration (no drops, no data changes).
-- Equivalent to running `npx prisma db push` with the updated schema.prisma.
-- Apply with: psql "$DATABASE_URL" -f prisma/platform-admin.sql

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'VIEWER');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "platformNotes" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "pricing_payments" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'checkout';

-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "handledAt" TIMESTAMP(3),
ADD COLUMN     "handledById" TEXT,
ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPPORT',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cycle" TEXT NOT NULL DEFAULT 'month',
    "months" INTEGER NOT NULL DEFAULT 1,
    "durationDays" INTEGER,
    "price" INTEGER NOT NULL DEFAULT 0,
    "comparePrice" INTEGER,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "maxBranches" INTEGER NOT NULL DEFAULT 50,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB,
    "modules" JSONB,
    "tiers" JSONB,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscription_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromPlanId" TEXT,
    "toPlanId" TEXT,
    "fromExpiry" TIMESTAMP(3),
    "toExpiry" TIMESTAMP(3),
    "fromBranches" INTEGER,
    "toBranches" INTEGER,
    "amount" INTEGER,
    "paymentId" TEXT,
    "note" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "category" TEXT NOT NULL DEFAULT 'support',
    "startedBy" TEXT NOT NULL DEFAULT 'ADMIN',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "lastSenderType" TEXT,
    "unreadForAdmin" INTEGER NOT NULL DEFAULT 0,
    "unreadForRestaurant" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "adminId" TEXT,
    "userAccountId" TEXT,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "readByAdminAt" TIMESTAMP(3),
    "readByRestaurantAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_follow_ups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "channel" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "organizationId" TEXT,
    "enquiryId" TEXT,
    "conversationId" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_follow_up_activities" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_follow_up_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT,
    "path" TEXT NOT NULL,
    "headers" JSONB,
    "payload" JSONB,
    "rawSize" INTEGER,
    "statusCode" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "signatureValid" BOOLEAN,
    "error" TEXT,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_error_logs" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "organizationId" TEXT,
    "userId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_health_snapshots" (
    "id" TEXT NOT NULL,
    "requests" INTEGER NOT NULL,
    "errors5xx" INTEGER NOT NULL,
    "errors4xx" INTEGER NOT NULL,
    "avgResponseMs" INTEGER NOT NULL,
    "p95ResponseMs" INTEGER NOT NULL,
    "maxResponseMs" INTEGER NOT NULL,
    "dbLatencyMs" INTEGER,
    "dbOk" BOOLEAN NOT NULL DEFAULT true,
    "memoryMb" INTEGER NOT NULL,
    "cpuLoad" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_usage_daily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "module" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "writes" INTEGER NOT NULL DEFAULT 0,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "platform_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_plans_code_key" ON "platform_plans"("code");

-- CreateIndex
CREATE INDEX "platform_plans_isActive_idx" ON "platform_plans"("isActive");

-- CreateIndex
CREATE INDEX "platform_subscription_events_organizationId_createdAt_idx" ON "platform_subscription_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_subscription_events_type_idx" ON "platform_subscription_events"("type");

-- CreateIndex
CREATE INDEX "platform_conversations_organizationId_idx" ON "platform_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "platform_conversations_status_lastMessageAt_idx" ON "platform_conversations"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "platform_messages_conversationId_createdAt_idx" ON "platform_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_follow_ups_status_dueAt_idx" ON "platform_follow_ups"("status", "dueAt");

-- CreateIndex
CREATE INDEX "platform_follow_ups_organizationId_idx" ON "platform_follow_ups"("organizationId");

-- CreateIndex
CREATE INDEX "platform_follow_ups_assignedToId_idx" ON "platform_follow_ups"("assignedToId");

-- CreateIndex
CREATE INDEX "platform_follow_up_activities_followUpId_createdAt_idx" ON "platform_follow_up_activities"("followUpId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_webhook_logs_provider_createdAt_idx" ON "platform_webhook_logs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "platform_webhook_logs_success_idx" ON "platform_webhook_logs"("success");

-- CreateIndex
CREATE INDEX "platform_error_logs_resolved_createdAt_idx" ON "platform_error_logs"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "platform_health_snapshots_createdAt_idx" ON "platform_health_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "platform_usage_daily_day_idx" ON "platform_usage_daily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "platform_usage_daily_organizationId_day_module_key" ON "platform_usage_daily"("organizationId", "day", "module");

-- CreateIndex
CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");

-- CreateIndex
CREATE INDEX "pricing_payments_organizationId_idx" ON "pricing_payments"("organizationId");

-- CreateIndex
CREATE INDEX "pricing_payments_createdAt_idx" ON "pricing_payments"("createdAt");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- AddForeignKey
ALTER TABLE "pricing_payments" ADD CONSTRAINT "pricing_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscription_events" ADD CONSTRAINT "platform_subscription_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_conversations" ADD CONSTRAINT "platform_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_conversations" ADD CONSTRAINT "platform_conversations_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_messages" ADD CONSTRAINT "platform_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "platform_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_messages" ADD CONSTRAINT "platform_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_ups" ADD CONSTRAINT "platform_follow_ups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_ups" ADD CONSTRAINT "platform_follow_ups_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "contact_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_ups" ADD CONSTRAINT "platform_follow_ups_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "platform_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_ups" ADD CONSTRAINT "platform_follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_ups" ADD CONSTRAINT "platform_follow_ups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_up_activities" ADD CONSTRAINT "platform_follow_up_activities_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "platform_follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_follow_up_activities" ADD CONSTRAINT "platform_follow_up_activities_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_usage_daily" ADD CONSTRAINT "platform_usage_daily_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

