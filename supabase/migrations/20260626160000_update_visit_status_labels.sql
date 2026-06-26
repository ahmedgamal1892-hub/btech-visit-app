-- Align visit_statuses labels and sort order with the agreed workflow.

INSERT INTO public.visit_statuses (code, label, sort_order, is_active)
VALUES
  ('saleable', 'Sellable', 1, TRUE),
  ('display',  'Display',  2, TRUE),
  ('delisted', 'Delisted', 3, TRUE),
  ('dead',     'Dead',     4, TRUE),
  ('damaged',  'Damaged',  5, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active  = EXCLUDED.is_active,
  updated_at = NOW();

UPDATE public.visit_statuses
SET is_active = FALSE, updated_at = NOW()
WHERE code NOT IN ('saleable', 'display', 'delisted', 'dead', 'damaged');
