CREATE TABLE "expense_vendors" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT,
  "name" TEXT NOT NULL,
  "tax_id" TEXT,
  "address" TEXT,
  "office" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expense_vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expenses" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "vendor_id" TEXT,
  "vendor_name" TEXT,
  "vendor_tax_id" TEXT,
  "vendor_address" TEXT,
  "vendor_office" TEXT,
  "expense_date" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "document_number" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expense_attachments" (
  "id" TEXT NOT NULL,
  "expense_id" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_vendors_branch_id_is_active_idx" ON "expense_vendors"("branch_id", "is_active");
CREATE INDEX "expenses_branch_id_expense_date_idx" ON "expenses"("branch_id", "expense_date");
CREATE INDEX "expenses_status_expense_date_idx" ON "expenses"("status", "expense_date");
ALTER TABLE "expense_vendors" ADD CONSTRAINT "expense_vendors_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "expense_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
