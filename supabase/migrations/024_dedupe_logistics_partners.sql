-- 024: De-duplicate logistics_partners.
--
-- Each partner (GIG, Kwik, Sendbox) was seeded twice, so checkout showed two
-- of every courier. Keep the earliest row per name, repoint any orders/shipments
-- that reference a duplicate to the keeper, delete the rest, and add a unique
-- constraint on name so it can't recur.

-- Repoint orders from duplicates to the earliest row of the same name.
with ranked as (
  select id, name,
         row_number() over (partition by name order by created_at, id) as rn,
         first_value(id) over (partition by name order by created_at, id) as keep_id
  from logistics_partners
)
update orders o
set logistics_partner_id = r.keep_id
from ranked r
where o.logistics_partner_id = r.id
  and r.rn > 1;

-- Repoint shipments too (defensive — none reference dupes today).
with ranked as (
  select id, name,
         row_number() over (partition by name order by created_at, id) as rn,
         first_value(id) over (partition by name order by created_at, id) as keep_id
  from logistics_partners
)
update shipments s
set logistics_partner_id = r.keep_id
from ranked r
where s.logistics_partner_id = r.id
  and r.rn > 1;

-- Delete the duplicate rows.
with ranked as (
  select id, row_number() over (partition by name order by created_at, id) as rn
  from logistics_partners
)
delete from logistics_partners lp
using ranked r
where lp.id = r.id
  and r.rn > 1;

-- Prevent recurrence.
alter table logistics_partners
  drop constraint if exists logistics_partners_name_key;
alter table logistics_partners
  add constraint logistics_partners_name_key unique (name);
