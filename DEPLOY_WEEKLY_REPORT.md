# Déploiement — Rapport budget hebdomadaire

## Ce que ça fait

Chaque **lundi à 8h** (Paris), un email est envoyé automatiquement aux adresses configurées dans le secret `REPORT_RECIPIENTS`.

L'email contient :
- Total dépensé la semaine passée + comparaison avec les 3 semaines précédentes
- Détail par catégorie (avec indication des plafonds)
- Liste des dépenses de la semaine
- Projection de fin de mois vs budget

---

## Déploiement (5 min)

### Étape 1 — Déployer la Edge Function

```bash
supabase functions deploy weekly-budget-report --project-ref <project-ref>
```

### Étape 2 — Configurer les secrets

Dans [Settings > Edge Functions > Secrets](https://supabase.com/dashboard/project/_/settings/functions) :

| Secret | Valeur |
|--------|--------|
| `RESEND_API_KEY` | Clé API Resend (déjà configurée) |
| `REPORT_RECIPIENTS` | `alice@example.com,bob@example.com` |

### Étape 3 — Appliquer la migration pg_cron

Dans le SQL Editor Supabase :

```sql
-- Activer les extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprimer l'ancien schedule si existant
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-budget-report');
EXCEPTION WHEN others THEN NULL;
END;
$$;

-- Programmer l'envoi chaque lundi à 07:00 UTC (08:00 Paris hiver)
SELECT cron.schedule(
  'weekly-budget-report',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/weekly-budget-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Étape 4 — Tester manuellement

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/weekly-budget-report \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ou via la dashboard : Functions > weekly-budget-report > Invoke.

---

## Vérifier que le cron est actif

```sql
SELECT * FROM cron.job WHERE jobname = 'weekly-budget-report';
```

Pour voir les dernières exécutions :
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'weekly-budget-report' 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## Modifier les destinataires

Dans les secrets Edge Functions, modifier `REPORT_RECIPIENTS` :
```
alice@example.com,bob@example.com
```

---

## Modifier l'heure d'envoi

```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'weekly-budget-report'),
  schedule := '0 6 * * 1'  -- 06:00 UTC = 07:00 Paris hiver
);
```
