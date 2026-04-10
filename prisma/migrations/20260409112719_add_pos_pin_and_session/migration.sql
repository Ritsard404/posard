-- AlterTable
ALTER TABLE "pos_terminal_info" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "pin" VARCHAR(6);

-- CreateTable
CREATE TABLE "pos_session" (
    "uuid_pos_session" UUID NOT NULL DEFAULT gen_random_uuid(),
    "login_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "pos_terminal_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,

    CONSTRAINT "pos_session_pkey" PRIMARY KEY ("uuid_pos_session")
);

-- CreateTable
CREATE TABLE "approval_log" (
    "uuid_approval_log" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action_type" TEXT NOT NULL,
    "reference_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_log_pkey" PRIMARY KEY ("uuid_approval_log")
);

-- CreateIndex
CREATE INDEX "pos_session_pos_terminal_id_idx" ON "pos_session"("pos_terminal_id");

-- CreateIndex
CREATE INDEX "pos_session_profile_id_idx" ON "pos_session"("profile_id");

-- CreateIndex
CREATE INDEX "approval_log_manager_id_idx" ON "approval_log"("manager_id");

-- AddForeignKey
ALTER TABLE "pos_session" ADD CONSTRAINT "pos_session_pos_terminal_id_fkey" FOREIGN KEY ("pos_terminal_id") REFERENCES "pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_session" ADD CONSTRAINT "pos_session_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_log" ADD CONSTRAINT "approval_log_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
