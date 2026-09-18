begin;

-- customers is the current master record. Region belongs here, and updated_at
-- makes it clear when the master data last changed.
alter table public.customers
  add column if not exists region text,
  add column if not exists updated_at timestamptz;

update public.customers
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.customers
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- Give ambiguous quotation columns explicit document-oriented names.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'doc_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'document_type'
  ) then
    alter table public.quotations rename column doc_type to document_type;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'issued_date'
  ) then
    alter table public.quotations rename column date to issued_date;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'customer_info'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'customer_snapshot'
  ) then
    alter table public.quotations rename column customer_info to customer_snapshot;
  end if;
end $$;

alter table public.quotations
  add column if not exists updated_at timestamptz;

-- customer_snapshot is the historical customer data printed on this document.
-- Remove values that already have dedicated quotation columns, while retaining
-- region before the old duplicate column is dropped. The conditional block also
-- makes this safe when the migration is manually run more than once.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'customer_region'
  ) then
    update public.quotations
    set customer_snapshot = jsonb_strip_nulls(
      (
        coalesce(customer_snapshot, '{}'::jsonb)
          - 'customerRegion'
          - 'salespersonName'
          - 'salespersonPhone'
          - 'salesName'
          - 'salesPhone'
          - 'projectName'
          - 'projName'
          - 'approvedBy'
          - 'approvedDate'
      ) || jsonb_build_object(
        'region', coalesce(
          nullif(customer_snapshot ->> 'region', ''),
          nullif(customer_snapshot ->> 'customerRegion', ''),
          nullif(customer_region, '')
        )
      )
    ),
    updated_at = coalesce(updated_at, created_at, now());

    alter table public.quotations drop column customer_region;
  else
    update public.quotations
    set customer_snapshot = coalesce(customer_snapshot, '{}'::jsonb)
      - 'customerRegion'
      - 'salespersonName'
      - 'salespersonPhone'
      - 'salesName'
      - 'salesPhone'
      - 'projectName'
      - 'projName'
      - 'approvedBy'
      - 'approvedDate',
    updated_at = coalesce(updated_at, created_at, now());
  end if;
end $$;

alter table public.quotations
  alter column updated_at set default now(),
  alter column updated_at set not null;


comment on column public.customers.region is
  'Customer sales region; the single source for current customer data.';
comment on column public.quotations.customer_id is
  'Optional link to the current customers master record.';
comment on column public.quotations.customer_snapshot is
  'Customer details frozen when the document is saved, used to preserve historical documents.';
comment on column public.quotations.items is
  'Line-item snapshot for this document. Kept as JSON because this design is limited to two tables.';

commit;
