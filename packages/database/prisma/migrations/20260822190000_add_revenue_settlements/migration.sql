CREATE TABLE "revenue_settlements" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "settlement_date" TIMESTAMP(3) NOT NULL,
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "reference_number" TEXT,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "deductions_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_amount" DECIMAL(12,2) NOT NULL,
  "note" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "revenue_settlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_deductions" (
  "id" TEXT NOT NULL,
  "settlement_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revenue_deductions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_attachments" (
  "id" TEXT NOT NULL,
  "settlement_id" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revenue_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revenue_settlements_branch_id_source_settlement_date_idx" ON "revenue_settlements"("branch_id", "source", "settlement_date");
ALTER TABLE "revenue_settlements" ADD CONSTRAINT "revenue_settlements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revenue_deductions" ADD CONSTRAINT "revenue_deductions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "revenue_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revenue_attachments" ADD CONSTRAINT "revenue_attachments_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "revenue_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
