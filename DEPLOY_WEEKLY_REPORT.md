# Déploiement — Rapport budget hebdomadaire

## Ce que ça fait

Chaque **lundi à 8h** (Paris), un email est envoyé automatiquement à :
- Chollet.eric@gmail.com
- Mathilde.Curien@gmail.com

L'email contient :
- Total dépensé la semaine passée + comparaison avec les 3 semaines précédentes
- Détail par catégorie (avec indication des plafonds)
- Liste des dépenses de la semaine
- Projection de fin de mois vs budget

---

## Déploiement (5 min)

### Étape 1 — Déployer la Edge Function

Ouvre [supabase.com/dashboard/project/qqpmmehdowmsprkfhfle/functions](https://supabase.com/dashboard/project/qqpmmehdowmsprkfhfle/functions) et déploie via CLI :

```bash
cd /Users/ericchollet/Documents/monptitbudget
npx supabase functions deploy weekly-budget-report --project-ref qqpmmehdowmsprkfhfle
```

Ou en déposant le fichier `supabase/functions/weekly-budget-report/index.ts` dans l'éditeur de la dashboard.

### Étape 2 — Vérifier que RESEND_API_KEY est déjà configuré

La clé est déjà utilisée par `send-invitation-email`. Si besoin, vérifie dans :
[Settings > Edge Functions > Secrets](https://supabase.com/dashboard/project/qqpmmehdowmsprkfhfle/settings/functions)

Clé requise : `RESEND_API_KEY`

### Étape 3 — Appliquer la migration pg_cron

Dans le SQL Editor Supabase ([lien direct](https://supabase.com/dashboard/project/qqpmmehdowmsprkfhfle/sql/new)), colle et exécute :

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
    url     := 'https://qqpmmehdowmsprkfhfle.supabase.co/functions/v1/weekly-budget-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcG1tZWhkb3dtc3Bya2ZoZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDg0OTYsImV4cCI6MjA4MjQyNDQ5Nn0.QdRleCAv0GDCsqStlt3kxizkngGaz5OP0F9C8zlcVGs"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Étape 4 — Tester manuellement

Pour recevoir un email de test maintenant :

```bash
curl -X POST https://qqpmmehdowmsprkfhfle.supabase.co/functions/v1/weekly-budget-report \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcG1tZWhkb3dtc3Bya2ZoZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDg0OTYsImV4cCI6MjA4MjQyNDQ5Nn0.QdRleCAv0GDCsqStlt3kxizkngGaz5OP0F9C8zlcVGs" \
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

Dans `supabase/functions/weekly-budget-report/index.ts`, ligne ~12 :
```typescript
const RECIPIENTS = [
  "Chollet.eric@gmail.com",
  "Mathilde.Curien@gmail.com",
];
```

---

## Modifier l'heure d'envoi

Dans la migration ou via SQL :
```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'weekly-budget-report'),
  schedule := '0 6 * * 1'  -- 06:00 UTC = 07:00 Paris hiver
);
```
