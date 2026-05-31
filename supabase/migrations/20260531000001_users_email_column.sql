-- Ajoute la colonne email à public.users.
-- Le trigger handle_new_user (migration 20260525000002) y écrit déjà mais
-- la colonne n'avait jamais été créée → tous les signups renvoyaient 500
-- "Database error saving new user".

alter table public.users add column if not exists email text;

-- Backfill depuis auth.users pour les comptes existants
update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and u.email is null;
