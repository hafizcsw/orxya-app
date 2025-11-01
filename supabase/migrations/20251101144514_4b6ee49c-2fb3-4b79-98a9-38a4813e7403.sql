-- إنشاء enum للأدوار
create type public.app_role as enum ('admin', 'moderator', 'user');

-- جدول أدوار المستخدمين
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

-- تفعيل RLS
alter table public.user_roles enable row level security;

-- سياسات RLS: الجميع يمكنهم قراءة أدوارهم
create policy "Users can view their own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- دالة للتحقق من الدور (security definer لتجنب recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- دالة لإضافة admin role تلقائيًا لبريد admin@admin.com
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- إذا كان البريد admin@admin.com، أضف دور admin
  if new.email = 'admin@admin.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  else
    -- باقي المستخدمين يحصلون على دور user
    insert into public.user_roles (user_id, role)
    values (new.id, 'user');
  end if;
  return new;
end;
$$;

-- trigger لتطبيق الأدوار عند إنشاء مستخدم جديد
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();