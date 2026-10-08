-- All writes are authenticated, constrained server operations. No client DML.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.stores (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 120),
 is_active boolean not null default true
);
create table public.profiles (
 id uuid primary key references auth.users(id),
 full_name text not null check (length(btrim(full_name)) between 1 and 120),
 store_id uuid references public.stores(id),
 role text not null check (role in ('admin','seller')),
 is_active boolean not null default true,
 assignment_version integer not null default 1 check (assignment_version > 0),
 check (role = 'admin' or store_id is not null)
);
create index profiles_store_idx on public.profiles(store_id);
create table public.expenses (
 id uuid primary key,
 seller_id uuid not null references public.profiles(id),
 store_id uuid not null references public.stores(id),
 amount_uzs bigint not null check (amount_uzs between 1 and 9007199254740991),
 note text not null check (length(btrim(note)) between 1 and 1000),
 expense_date date not null check (expense_date >= date '2000-01-01'),
 occurred_at timestamptz not null,
 server_received_at timestamptz not null default clock_timestamp(),
 version integer not null default 1 check (version > 0),
 deleted_at timestamptz
);
create index expenses_store_date_idx on public.expenses(store_id,expense_date desc,id);
create index expenses_seller_date_idx on public.expenses(seller_id,expense_date desc,id);
create table public.expense_audit (
 id bigint generated always as identity primary key,
 expense_id uuid not null references public.expenses(id),
 old_values jsonb,
 new_values jsonb not null,
 actor_id uuid not null references public.profiles(id),
 server_time timestamptz not null default clock_timestamp()
);
create index audit_expense_idx on public.expense_audit(expense_id,id);
create index audit_actor_idx on public.expense_audit(actor_id);
create table public.device_sync (
 seller_id uuid not null references public.profiles(id),
 device_id uuid not null,
 last_synced_at timestamptz not null default clock_timestamp(),
 primary key(seller_id,device_id)
);
create table private.sync_operations (
 operation_id uuid primary key,
 seller_id uuid not null references public.profiles(id),
 expense_id uuid not null references public.expenses(id),
 payload jsonb not null,
 store_id uuid not null,
 assignment_version integer not null
);
create index sync_operations_seller_idx on private.sync_operations(seller_id);
create index sync_operations_expense_idx on private.sync_operations(expense_id);
alter table private.sync_operations enable row level security;

create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active)
$$;
create function private.my_store() returns uuid language sql stable security definer
set search_path = '' as $$
 select store_id from public.profiles where id=auth.uid() and is_active
$$;
create function private.active_user() returns boolean language sql stable security definer
set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and is_active)
$$;

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_audit enable row level security;
alter table public.device_sync enable row level security;
revoke all on public.stores,public.profiles,public.expenses,public.expense_audit,public.device_sync from anon,authenticated;
grant select on public.stores,public.profiles,public.expenses,public.expense_audit,public.device_sync to authenticated;
create policy stores_read on public.stores for select to authenticated
 using ((select private.is_admin()) or id=(select private.my_store()));
create policy profiles_read on public.profiles for select to authenticated
 using ((select private.is_admin()) or (id=(select auth.uid()) and is_active));
create policy expenses_read on public.expenses for select to authenticated
 using ((select private.is_admin()) or (seller_id=(select auth.uid()) and (select private.active_user())));
create policy audit_read on public.expense_audit for select to authenticated using ((select private.is_admin()));
create policy sync_read on public.device_sync for select to authenticated
 using ((select private.is_admin()) or (seller_id=(select auth.uid()) and (select private.active_user())));

create function private.audit_expense() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 insert into public.expense_audit(expense_id,old_values,new_values,actor_id)
 values(new.id,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),auth.uid());
 return new;
end $$;
create trigger expense_audit_trigger after insert or update on public.expenses
 for each row execute function private.audit_expense();

create function private.validate_expense(e jsonb) returns text language plpgsql set search_path='' as $$
declare d date; t timestamptz;
begin
 if jsonb_typeof(e) is distinct from 'object' then return 'INVALID_EXPENSE'; end if;
 if jsonb_typeof(e->'amount_uzs') is distinct from 'number' or (e->>'amount_uzs') !~ '^[0-9]+$' then return 'INVALID_AMOUNT'; end if;
 if (e->>'amount_uzs')::numeric not between 1 and 9007199254740991 then return 'INVALID_AMOUNT'; end if;
 if jsonb_typeof(e->'note') is distinct from 'string' or length(btrim(e->>'note')) not between 1 and 1000 then return 'INVALID_NOTE'; end if;
 if (e->>'expense_date') is null or (e->>'expense_date') !~ '^\d{4}-\d{2}-\d{2}$' then return 'INVALID_DATE'; end if;
 begin d:=(e->>'expense_date')::date; exception when others then return 'INVALID_DATE'; end;
 if d < date '2000-01-01' or d > (clock_timestamp() at time zone 'Asia/Tashkent')::date then return 'INVALID_DATE'; end if;
 if (e->>'occurred_at') is null or (e->>'occurred_at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then return 'INVALID_TIME'; end if;
 begin t:=(e->>'occurred_at')::timestamptz; exception when others then return 'INVALID_TIME'; end;
 if t < timestamptz '2000-01-01Z' or t > clock_timestamp()+interval '5 minutes' then return 'INVALID_TIME'; end if;
 return null;
end $$;

create function private.apply_sync(op jsonb, context_store uuid, context_version integer)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles; prior private.sync_operations; existing public.expenses;
 oid uuid; eid uuid; e jsonb; canonical jsonb; problem text;
begin
 select * into p from public.profiles where id=auth.uid() for share;
 if p.id is null or p.role <> 'seller' then problem:='FORBIDDEN';
 elsif not p.is_active then problem:='INACTIVE_PROFILE'; end if;
 if problem is null and octet_length(op::text)>8192 then problem:='INVALID_OPERATION'; end if;
 if problem is null then
  begin oid:=(op->>'operation_id')::uuid; eid:=(op->'expense'->>'id')::uuid;
  exception when others then problem:='INVALID_OPERATION'; end;
  if oid is null or eid is null or op->>'type' is distinct from 'create' then problem:='INVALID_OPERATION'; end if;
 end if;
 if problem is null then problem:=private.validate_expense(op->'expense'); end if;
 if problem is null then
  e:=op->'expense';
  canonical:=jsonb_build_object('id',eid,'amount_uzs',(e->>'amount_uzs')::bigint,'note',e->>'note',
   'expense_date',(e->>'expense_date')::date,'occurred_at',(e->>'occurred_at')::timestamptz);
  perform pg_advisory_xact_lock(hashtextextended(eid::text,0));
  perform pg_advisory_xact_lock(hashtextextended(oid::text,1));
  select * into prior from private.sync_operations where operation_id=oid;
  if found then
   if prior.seller_id=p.id and prior.expense_id=eid and prior.payload=canonical
    and prior.store_id=context_store and prior.assignment_version=context_version then
    return jsonb_build_object('operation_id',oid,'expense_id',eid,'status','duplicate','version',(select version from public.expenses where id=eid));
   end if;
   problem:='CONFLICT';
  else
   select * into existing from public.expenses where id=eid;
   if found then
    -- Compare original create, never the admin-corrected financial values.
    if existing.seller_id=p.id and exists(select 1 from private.sync_operations s where s.expense_id=eid and s.payload=canonical
      and s.store_id=context_store and s.assignment_version=context_version) then
     insert into private.sync_operations values(oid,p.id,eid,canonical,context_store,context_version);
     return jsonb_build_object('operation_id',oid,'expense_id',eid,'status','duplicate','version',existing.version);
    end if;
    problem:='CONFLICT';
   end if;
  end if;
 end if;
 if problem is null then
  if context_store is null or context_version is null then problem:='STORE_CONTEXT_REQUIRED';
  elsif context_store<>p.store_id or context_version<>p.assignment_version then problem:='STORE_ASSIGNMENT_CHANGED';
  else
   perform 1 from public.stores where id=p.store_id and is_active for share;
   if not found then problem:='INACTIVE_STORE'; end if;
  end if;
 end if;
 if problem is not null then
  return jsonb_build_object('operation_id',op->>'operation_id','expense_id',op->'expense'->>'id','status','rejected','error_code',problem);
 end if;
 insert into public.expenses(id,seller_id,store_id,amount_uzs,note,expense_date,occurred_at)
 values(eid,p.id,p.store_id,(e->>'amount_uzs')::bigint,e->>'note',(e->>'expense_date')::date,(e->>'occurred_at')::timestamptz);
 insert into private.sync_operations values(oid,p.id,eid,canonical,context_store,context_version);
 return jsonb_build_object('operation_id',oid,'expense_id',eid,'status','accepted','version',1);
end $$;

create function public.sync_expense(operation jsonb, context_store uuid default null, context_version integer default null)
 returns jsonb language sql security invoker set search_path='' as $$ select private.apply_sync(operation,context_store,context_version) $$;

create function private.finish_sync(device uuid, operation_ids uuid[]) returns timestamptz
 language plpgsql security definer set search_path='' as $$
declare t timestamptz:=clock_timestamp(); p public.profiles;
begin
 select * into p from public.profiles where id=auth.uid() for share;
 if p.id is null or not p.is_active or p.role<>'seller' then raise exception 'FORBIDDEN'; end if;
 if device is null or coalesce(cardinality(operation_ids),0) not between 1 and 100 then raise exception 'INVALID_OPERATION'; end if;
 if exists(select 1 from unnest(operation_ids) x where not exists(select 1 from private.sync_operations s where s.operation_id=x and s.seller_id=p.id)) then raise exception 'INVALID_OPERATION'; end if;
 insert into public.device_sync values(p.id,device,t) on conflict(seller_id,device_id) do update set last_synced_at=excluded.last_synced_at;
 return t;
end $$;
create function public.finish_expense_sync(device uuid, operation_ids uuid[]) returns timestamptz
 language sql security invoker set search_path='' as $$ select private.finish_sync(device,operation_ids) $$;

create function private.admin_command(action text, data jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s public.stores; p public.profiles; e public.expenses; problem text; out_data jsonb; n bigint; total numeric;
begin
 -- Share lock serializes authorization with account deactivation.
 perform 1 from public.profiles where id=auth.uid() and is_active and role='admin' for share;
 if not found then raise exception 'FORBIDDEN'; end if;
 if action='save_store' then
  if length(btrim(data->>'name')) not between 1 and 120 or data->>'name' is null then raise exception 'INVALID_NAME'; end if;
  if data->>'id' is null then
   insert into public.stores(name) values(btrim(data->>'name')) returning * into s;
  else
   update public.stores set name=btrim(data->>'name'),is_active=(data->>'is_active')::boolean where id=(data->>'id')::uuid returning * into s;
   if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  return to_jsonb(s);
 elsif action='save_seller' then
  if length(btrim(data->>'full_name')) not between 1 and 120 or data->>'full_name' is null then raise exception 'INVALID_NAME'; end if;
  select * into p from public.profiles where id=(data->>'id')::uuid for update;
  perform 1 from public.stores where id=(data->>'store_id')::uuid
   and (is_active or (p.id is not null and p.store_id=(data->>'store_id')::uuid)) for share;
  if not found then raise exception 'INACTIVE_STORE'; end if;
  if p.id is not null then
   if p.role<>'seller' then raise exception 'FORBIDDEN'; end if;
   if p.assignment_version<>(data->>'expected_assignment_version')::integer or data->>'expected_assignment_version' is null then raise exception 'VERSION_CONFLICT'; end if;
   update public.profiles set full_name=btrim(data->>'full_name'),store_id=(data->>'store_id')::uuid,
    assignment_version=assignment_version+case when store_id is distinct from (data->>'store_id')::uuid then 1 else 0 end,
    is_active=(data->>'is_active')::boolean where id=p.id returning * into p;
  else
   insert into public.profiles(id,full_name,store_id,role) values((data->>'id')::uuid,btrim(data->>'full_name'),(data->>'store_id')::uuid,'seller') returning * into p;
  end if;
  return to_jsonb(p);
 elsif action='edit_expense' or action='cancel_expense' then
  select * into e from public.expenses where id=(data->>'id')::uuid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if data->>'expected_version' is null or e.version<>(data->>'expected_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if e.deleted_at is not null then raise exception 'ALREADY_CANCELLED'; end if;
  if action='cancel_expense' then
   update public.expenses set deleted_at=clock_timestamp(),version=version+1 where id=e.id returning * into e;
  else
   problem:=private.validate_expense(data || jsonb_build_object('occurred_at',e.occurred_at));
   if problem is not null then raise exception '%',problem; end if;
   update public.expenses set amount_uzs=(data->>'amount_uzs')::bigint,note=data->>'note',expense_date=(data->>'expense_date')::date,version=version+1 where id=e.id returning * into e;
  end if;
  return to_jsonb(e);
 elsif action='admin_record_expense' then
  problem:=private.validate_expense(data);
  if problem is not null then raise exception '%',problem; end if;
  perform 1 from public.profiles where id=(data->>'seller_id')::uuid and role='seller';
  if not found then raise exception 'NOT_FOUND'; end if;
  -- Explicit historical store is admin-selected; the audit records this resolution.
  insert into public.expenses(id,seller_id,store_id,amount_uzs,note,expense_date,occurred_at)
   values((data->>'id')::uuid,(data->>'seller_id')::uuid,(data->>'store_id')::uuid,(data->>'amount_uzs')::bigint,data->>'note',(data->>'expense_date')::date,(data->>'occurred_at')::timestamptz) returning * into e;
  return to_jsonb(e);
 elsif action='dashboard' then
  return jsonb_build_object('stores',coalesce((select jsonb_agg(to_jsonb(st) || jsonb_build_object(
   'today_total',coalesce((select sum(amount_uzs)::text from public.expenses ex where ex.store_id=st.id and ex.expense_date=(clock_timestamp() at time zone 'Asia/Tashkent')::date and ex.deleted_at is null),'0'),
   'last_synced_at',(select max(ds.last_synced_at) from public.device_sync ds join public.profiles pr on pr.id=ds.seller_id where pr.store_id=st.id))) from public.stores st),'[]'),
   'profiles',coalesce((select jsonb_agg(to_jsonb(pr)) from public.profiles pr where pr.role='seller'),'[]'));
 elsif action='export' then
  if (data->>'from')::date>(data->>'to')::date then raise exception 'INVALID_DATE'; end if;
  -- One SQL snapshot; never paginate a moving export or silently truncate it.
  select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(q) || jsonb_build_object('amount_uzs',q.amount_uzs::text)
    order by q.expense_date,q.occurred_at,q.id),'[]'),'count',count(*),'total',coalesce(sum(q.amount_uzs),0)::text)
   into out_data from (
    select ex.* from public.expenses ex where ex.store_id=(data->>'store_id')::uuid and ex.deleted_at is null
     and ex.expense_date between (data->>'from')::date and (data->>'to')::date
     and (data->>'seller_id' is null or ex.seller_id=(data->>'seller_id')::uuid)
     order by ex.expense_date,ex.occurred_at,ex.id limit 10001
   ) q;
  if (out_data->>'count')::integer>10000 then raise exception 'EXPORT_LIMIT'; end if;
  return out_data;
 elsif action='report' then
  if (data->>'from')::date>(data->>'to')::date then raise exception 'INVALID_DATE'; end if;
  select count(*),coalesce(sum(amount_uzs) filter(where deleted_at is null),0) into n,total from public.expenses ex
   where ex.store_id=(data->>'store_id')::uuid and ex.expense_date between (data->>'from')::date and (data->>'to')::date
   and (data->>'seller_id' is null or ex.seller_id=(data->>'seller_id')::uuid);
  select coalesce(jsonb_agg(to_jsonb(q) || jsonb_build_object('amount_uzs',q.amount_uzs::text)),'[]') into out_data from (
   select ex.* from public.expenses ex where ex.store_id=(data->>'store_id')::uuid
    and ex.expense_date between (data->>'from')::date and (data->>'to')::date
    and (data->>'seller_id' is null or ex.seller_id=(data->>'seller_id')::uuid)
    order by ex.expense_date desc,ex.occurred_at desc,ex.id
    limit least(greatest(coalesce((data->>'limit')::integer,50),1),1000) offset greatest(coalesce((data->>'offset')::integer,0),0)
  ) q;
  return jsonb_build_object('rows',out_data,'count',n,'total',total::text);
 else raise exception 'INVALID_ACTION'; end if;
end $$;
create function public.admin_command(action text, data jsonb default '{}') returns jsonb
 language sql security invoker set search_path='' as $$ select private.admin_command(action,data) $$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_admin(),private.my_store(),private.active_user(),private.apply_sync(jsonb,uuid,integer),private.finish_sync(uuid,uuid[]),private.admin_command(text,jsonb) to authenticated;
revoke all on function public.sync_expense(jsonb,uuid,integer),public.finish_expense_sync(uuid,uuid[]),public.admin_command(text,jsonb) from public,anon;
grant execute on function public.sync_expense(jsonb,uuid,integer),public.finish_expense_sync(uuid,uuid[]),public.admin_command(text,jsonb) to authenticated;
