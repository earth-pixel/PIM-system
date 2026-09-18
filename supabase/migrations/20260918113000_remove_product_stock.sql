begin;

-- Remove stock column from products table as stock is not tracked in PIM
alter table public.products
  drop column if exists stock;

commit;
