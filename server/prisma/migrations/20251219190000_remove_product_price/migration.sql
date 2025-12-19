-- Drop base price column from Product (denomination-based pricing only)
ALTER TABLE "Product" DROP COLUMN IF EXISTS "price";
