-- One-off repair for project euyvfaokdzwjnhjvjavp.
-- Run in Supabase Dashboard > SQL Editor for that project.
-- Source of truth: public.profiles
-- Temporary password applied to profile-backed Auth rows: 12345678

begin;

update auth.users as auth_user
set
  aud = 'authenticated',
  role = 'authenticated',
  email = profile.email,
  encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(auth_user.email_confirmed_at, timezone('utc', now())),
  confirmed_at = coalesce(auth_user.confirmed_at, timezone('utc', now())),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email')
  ),
  raw_user_meta_data = jsonb_build_object(
    'full_name', coalesce(nullif(trim(profile.full_name), ''), profile.email)
  ),
  is_sso_user = false,
  is_anonymous = false,
  deleted_at = null,
  updated_at = timezone('utc', now())
from public.profiles as profile
where auth_user.id = profile.id;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  email
)
select
  gen_random_uuid(),
  profile.id::text,
  profile.id,
  jsonb_build_object(
    'sub', profile.id::text,
    'email', profile.email,
    'email_verified', false,
    'phone_verified', false
  ),
  'email',
  null,
  timezone('utc', now()),
  timezone('utc', now()),
  profile.email
from public.profiles as profile
where not exists (
  select 1
  from auth.identities as identity
  where identity.user_id = profile.id
    and identity.provider = 'email'
);

update public.profiles
set
  password_enabled = true,
  requires_password_change = true,
  temporary_password_set_at = timezone('utc', now()),
  password_changed_at = null,
  updated_at = timezone('utc', now());

commit;

select
  (select count(*) from public.profiles) as profiles_count,
  (
    select count(*)
    from public.profiles as profile
    join auth.users as auth_user on auth_user.id = profile.id
    where auth_user.aud = 'authenticated'
      and auth_user.role = 'authenticated'
      and auth_user.encrypted_password is not null
      and auth_user.email_confirmed_at is not null
      and auth_user.deleted_at is null
  ) as valid_profile_auth_users,
  (
    select count(*)
    from public.profiles as profile
    join auth.identities as identity on identity.user_id = profile.id
    where identity.provider = 'email'
  ) as profile_email_identities,
  (
    select count(*)
    from public.profiles
    where requires_password_change is true
      and temporary_password_set_at is not null
      and password_changed_at is null
  ) as profiles_requiring_temp_password_change;
