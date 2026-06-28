-- Allow negative Qty and Sales values in store_ranking.

ALTER TABLE public.store_ranking
  DROP CONSTRAINT IF EXISTS store_ranking_qty_check;

ALTER TABLE public.store_ranking
  DROP CONSTRAINT IF EXISTS store_ranking_sales_check;
