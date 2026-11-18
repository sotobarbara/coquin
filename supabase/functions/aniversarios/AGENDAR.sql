-- Coquin · agenda o agente de aniversários para rodar todo dia às 8h (Fortaleza = 11h UTC).
-- 1) Database → Extensions: ligue "pg_cron" e "pg_net".
-- 2) Troque os 3 valores <...> abaixo e rode no SQL Editor:
--    <PROJECT_REF>  = o código do projeto (o que vem antes de .supabase.co na URL)
--    <ANON_KEY>     = Project Settings → API → anon public (a mesma que o app já usa)
--    <CRON_SECRET>  = a mesma senha que você pôs na Secret CRON_SECRET da função
select cron.unschedule('coquin-aniversarios') where exists (select 1 from cron.job where jobname = 'coquin-aniversarios');
select cron.schedule(
  'coquin-aniversarios',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/aniversarios',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{"mode":"run"}'::jsonb
  );
  $$
);
-- conferir:   select * from cron.job_run_details order by start_time desc limit 5;
-- desligar:   select cron.unschedule('coquin-aniversarios');
