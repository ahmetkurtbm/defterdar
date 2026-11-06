-- Kiracı bağlamı olmayan iç işler (giriş, kayıt, oturum, portal token araması) artık bağlantı
-- kullanıcısıyla değil `app_system` rolüyle çalışır. FORCE RLS tablo sahibine de uygulandığı için
-- süper kullanıcı olmayan bir bağlantıda (Supabase/Neon) bu işler aksi hâlde hiç satır göremezdi.
-- `app_system` yalnızca bu işlerin dokunduğu tablolara açılır.

do $$
begin
  create role app_system nologin;
exception when duplicate_object then null;
end
$$;

do $$
begin
  execute format('grant app_system to %I', current_user);
exception when others then null;
end
$$;

grant usage on schema public to app_system;
grant select, insert, update on offices to app_system;
grant select, insert on users to app_system;
grant select, insert, delete on sessions to app_system;
grant select, insert on document_types to app_system;
grant select on clients to app_system;

create policy offices_system on offices to app_system using (true) with check (true);
create policy users_system on users to app_system using (true) with check (true);
create policy sessions_system on sessions to app_system using (true) with check (true);
create policy document_types_system on document_types to app_system using (true) with check (true);
create policy clients_system on clients for select to app_system using (true);

-- Token araması artık çağıranın (app_system) yetkisiyle çalışır; tanımlayıcı ayrıcalığı gerekmez.
alter function portal_lookup(text) security invoker;
grant execute on function portal_lookup(text) to app_system;
