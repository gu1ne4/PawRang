-- Cleanup dummy inventory unit: Desk
-- Safe to run multiple times. It only updates inventory_items.unit values that are exactly "Desk"
-- after trimming spaces and ignoring letter case.

begin;

-- Preview affected inventory rows before the update.
select
  inventory_item_id,
  item_code,
  item_name,
  unit,
  category,
  current_stock,
  is_archived
from public.inventory_items
where lower(btrim(unit)) = 'desk'
order by inventory_item_id;

-- Replace the dummy unit with the normal default unit.
update public.inventory_items
set
  unit = 'Piece',
  updated_at = timezone('utc', now())
where lower(btrim(unit)) = 'desk';

-- Confirm no Desk unit remains.
select
  count(*) as remaining_desk_unit_count
from public.inventory_items
where lower(btrim(unit)) = 'desk';

commit;
