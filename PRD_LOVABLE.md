# PRD — monptitbudget · Refonte UI/UX & Logique catégories

> **Pour Lovable** — Ce document décrit l'état actuel de l'app après refonte, la logique métier des catégories/sous-catégories/plafonds, et les migrations Supabase à appliquer. Il sert de référence pour continuer le développement.

---

## 1. Philosophie produit

### Vision
Une app de budget **ultra-simple et mobile-first**. L'utilisateur doit pouvoir ajouter une dépense en moins de 3 secondes. Tout le reste est secondaire.

### Principes de design
- **Progressive disclosure** : on ne montre que l'essentiel. Les options avancées sont cachées derrière un clic supplémentaire.
- **Mobile-first** : tout se passe dans des bottom sheets (panneaux qui montent du bas). Zéro page de navigation.
- **Touch targets** : minimum 44×44px sur tout ce qui est cliquable.
- **Dark fintech aesthetic** : fond sombre, accents néon (jaune primaire, mint pour les états positifs, rouge pour les alertes).
- **Typographie** : `Fredoka` (font-display) pour les chiffres et titres, système pour le reste.

### Ce qu'on a enlevé
- La section Épargne (trop complexe, peu utilisée)
- Les 5 boutons d'icônes en header (non-labelisés, illisibles)
- La barre d'alertes `AlertsBanner` (trop bruyante)
- `CategoryBudgetsOverview` (section séparée, redondante)
- `CategoryBudgetSetupSheet` et `CategoryTreeManagerSheet` (fusionnés en un seul)

---

## 2. Architecture de l'écran principal (BudgetDashboard)

### Structure visuelle

```
┌─────────────────────────────────────┐
│  HEADER                             │
│  [AccountSelector + nav mois]  [⚙️🔴]│
├─────────────────────────────────────┤
│  HERO CARD                          │
│  "Reste aujourd'hui"                │
│  [chiffre géant néon]               │
│  [barre de progression mensuelle]   │
├─────────────────────────────────────┤
│  GRILLE CATÉGORIES (4 colonnes)     │
│  [🏠][🛒][👶][🚗]                    │
│  [📺][🍝][🧾][📦]                    │
│  [  +  ]                            │
├─────────────────────────────────────┤
│  DÉPENSES DU JOUR (si > 0)          │
│  liste des 4 dernières dépenses     │
├─────────────────────────────────────┤
│         BOTTOM BAR                  │
│  [📋 Historique] [➕ Ajouter] [⚙️]  │
└─────────────────────────────────────┘
```

### Header
- **Gauche** : `AccountSelector` (selector de compte) + navigation mois (chevrons + mois cliquable)
- **Droite** : un seul bouton `⚙️` avec badge rouge si alertes ou transactions en attente
- Le mois cliquable ouvre directement `FullBudgetSetupSheet` (config salaire/budget)

### Bottom Bar (fixée en bas)
- `📋` Historique → `ExpenseHistorySheet`
- `➕ Ajouter` (bouton principal, style pill arrondi) → `AddExpenseSheet`
- `⚙️` Paramètres → `SettingsSheet`

### SettingsSheet (menu paramètres)
Accessible depuis le bouton ⚙️ — liste de `MenuRow` :
1. **Transactions à catégoriser** (badge amber, visible seulement si pendingCount > 0) → `PendingTransactionsSheet`
2. **Configuration du mois** → `FullBudgetSetupSheet`
3. **Gérer les comptes** → `ManageAccountsSheet`
4. **Connexion bancaire** → `BankConnectionSheet`
5. ─── séparateur ───
6. **Déconnexion** (rouge/danger)

---

## 3. Grille Catégories — logique d'affichage

### CategoryTile (tuile 4 colonnes)
Chaque catégorie parente est affichée sous forme de tuile carrée avec :
- **Arc SVG circulaire** (MiniArc) indiquant le % du plafond utilisé
- **Emoji** centré dans l'arc
- **Nom** tronqué (10px, max 1 ligne)
- **Chiffre bas** :
  - Si `uncapped` → montant dépensé brut (ex: `47€`)
  - Si `ok/warning` → pourcentage (ex: `62%`)
  - Si `exceeded` → dépassement en rouge (ex: `+23€`)

### Couleur de l'arc
- `exceeded` → rouge `#ef4444` + glow rouge sur la tuile entière
- `warning` → amber `#f59e0b`
- `ok` → couleur custom de la config (défaut `#10b981` vert mint)
- `uncapped` → cercle gris sans arc (pas de plafond défini)

### Tri
Les catégories sont affichées dans l'ordre de `sort_order` en DB.
Le `getCategorySpending` trie par statut : exceeded > warning > ok > uncapped.

---

## 4. Modèle de données — Catégories

### Table `expense_categories`

```sql
id          UUID PRIMARY KEY
account_id  UUID REFERENCES accounts(id) ON DELETE CASCADE
name        TEXT NOT NULL
emoji       TEXT NOT NULL DEFAULT '📦'
parent_id   UUID REFERENCES expense_categories(id) ON DELETE CASCADE  -- NULL = catégorie parente
sort_order  INTEGER NOT NULL DEFAULT 0
```

### Logique parent/enfant

- **Catégorie parente** : `parent_id IS NULL` — affichée dans la grille principale
- **Sous-catégorie** : `parent_id = <uuid parent>` — visible uniquement dans `CategoryMergedSheet`
- La suppression d'une catégorie parente supprime en CASCADE toutes ses sous-catégories

### Catégories par défaut (seed automatique au premier accès)

Catégories parentes créées automatiquement si le compte n'en a aucune :

| Emoji | Nom                    |
|-------|------------------------|
| 🏠    | Logement               |
| 🛒    | Courses                |
| 👶    | Enfant                 |
| 🚗    | Transport              |
| 📺    | Médias & Abonnements   |
| 🍝    | Plaisirs               |
| 🧾    | Administratif          |
| 📦    | Autre                  |

Sous-catégories pré-seedées par parent :

- **Logement** : Mensualité prêt 🏦, Assurance prêt 🛡️, Assurance habitation 🏡, Eau 💧, Électricité ⚡, Gaz 🔥, Alarme 🔔, Ménage 🧹
- **Courses** : Supermarché 🛒, Boucherie 🥩, Boulangerie 🥖, Pharmacie 💊
- **Enfant** : Cantine 🍱, Centre de loisirs 🎠, Shopping enfant 👕, Pédiatre 👨‍⚕️
- **Transport** : Location voiture 🚙, Carburant ⛽, Péage 🛣️
- **Médias & Abonnements** : Box internet 📡, Netflix 🎬, Amazon Prime 📦
- **Plaisirs** : Restaurant 🍽️, Vacances / Week-end 🏖️
- **Administratif** : Impôts / Taxe foncière 🏛️, Frais bancaires 🏦

### Hook `useExpenseCategories`

```typescript
const {
  categories,          // toutes les catégories (parents + enfants)
  parentCategories,    // categories.filter(c => !c.parentId)
  subcategoriesOf,     // (parentId: string) => ExpenseCategory[]
  addCategory,         // crée une catégorie parente
  addSubcategory,      // crée une sous-catégorie sous un parent
  updateCategory,      // rename + emoji
  deleteCategory,      // supprime (CASCADE côté DB)
  refetch,
} = useExpenseCategories(accountId)
```

---

## 5. Modèle de données — Plafonds (CategoryBudgetConfig)

### Table `category_budget_configs`

```sql
id                UUID PRIMARY KEY
account_id        UUID REFERENCES accounts(id) ON DELETE CASCADE
category_name     TEXT NOT NULL          -- correspond au `name` de expense_categories
budget_type       TEXT DEFAULT 'uncapped' CHECK IN ('fixed', 'variable', 'uncapped')
cap_amount        NUMERIC(10,2)          -- NULL si uncapped
warning_threshold INTEGER DEFAULT 80     -- % à partir duquel l'état passe en "warning"
color             TEXT DEFAULT '#6366f1' -- couleur de l'arc SVG
group_name        TEXT                   -- optionnel, pour regrouper les catégories
month             INTEGER                -- 0-11, NULL = config globale (tous les mois)
year              INTEGER                -- ex: 2026, NULL = config globale
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

**Index unique** (gère NULL comme -1 pour l'unicité) :
```sql
UNIQUE (account_id, category_name, COALESCE(month, -1), COALESCE(year, -1))
```

### Types de budget

| Type       | Comportement                                        |
|------------|-----------------------------------------------------|
| `uncapped` | Aucune limite. Arc gris. Affiche le montant brut.   |
| `variable` | Objectif souple (violet). Alerte si > threshold%.  |
| `fixed`    | Plafond strict (bleu). Identique à variable en UX.  |

### Résolution par mois (priorité)

```
1. Config spécifique mois/année (month=X, year=Y)
   → si pas trouvée :
2. Config globale (month=NULL, year=NULL)
```

Implémenté dans `resolveConfig(categoryName)` du hook `useCategoryBudgets`.

### Statuts calculés

```
spent / capAmount * 100 → percentage

percentage >= 100%         → status = 'exceeded' (rouge)
percentage >= warningThreshold → status = 'warning'  (amber)
sinon                      → status = 'ok'       (vert/custom)
aucune config ou uncapped  → status = 'uncapped' (gris)
```

### Hook `useCategoryBudgets`

```typescript
const {
  configs,              // CategoryBudgetConfig[]
  saveConfig,           // upsert config pour une catégorie
  resolveConfig,        // retourne la config effective (mois-aware)
  getCategorySpending,  // calcule spending + status pour toutes les catégories
  getAlerts,            // filtre exceeded + warning
} = useCategoryBudgets(accountId, expenses, activeMonth, activeYear)
```

---

## 6. CategoryMergedSheet — UX fusionnée catégorie + plafond

C'est le panneau central de gestion d'une catégorie. Il s'ouvre en tappant une tuile de la grille.

### Sections du panneau (de haut en bas)

1. **Header** : emoji + nom de la catégorie, bouton ✏️ pour éditer inline
   - En mode édition : input texte + picker emoji (grille de 38 emojis) + boutons ✓/✗

2. **Résumé de dépense** (affiché seulement si budget configuré) :
   - Montant dépensé / plafond
   - Barre de progression colorée
   - "XX€ restants ce mois" ou "🚨 Dépassé de XX€"

3. **Type de budget** (3 pills en grille) :
   - `∞ Libre` — aucune limite
   - `≈ Variable` — objectif souple (violet)
   - `🔒 Fixe` — plafond strict (bleu)

4. **Plafond mensuel** (affiché si type ≠ Libre) :
   - Input numérique grand format avec `€`
   - Toggle "Options avancées" → slider "Alerte à X%" (50% à 95%)

5. **Bouton "Enregistrer"** (apparaît uniquement si des changements non sauvegardés)

6. **Sous-catégories** :
   - Chips horizontaux avec emoji + nom
   - Chaque chip : bouton ✏️ (édition inline) + bouton ✗ (suppression)
   - Bouton `+ Ajouter` (dashed border) → formulaire inline avec emoji picker cyclique + input nom

7. **Supprimer cette catégorie** (bouton rouge en bas, avec confirmation `window.confirm`)

---

## 7. AddExpenseSheet — formulaire ajout dépense

### Ordre des champs (optimisé pour la rapidité)

1. **Montant** — input centré, text-5xl, autoFocus, `h-24`
2. **Montants rapides** — 6 boutons : 5€ / 10€ / 15€ / 20€ / 25€ / 50€
3. **Catégorie** + indicateur de plafond (si catégorie sélectionnée et plafond configuré)
4. **Nom** — input optionnel, placeholder "Nom (optionnel) — Café, Courses…"
5. **Date** — pill collapsible (par défaut "Aujourd'hui"), ouvre un calendrier Popover limité au mois du budget
6. **[📷 Scanner] + [✓ Ajouter]** côte à côte

### Signature `onAddExpense`
```typescript
onAddExpense(
  amount: number,
  name?: string,
  category?: string,
  date?: string,        // "YYYY-MM-DD"
  subcategory?: string
)
```

### Logique de date par défaut
- Si l'utilisateur est sur un mois passé/futur (hors du mois courant), la date par défaut est le 1er du mois du budget (pas aujourd'hui).

### Indicateur de plafond inline
Quand une catégorie avec plafond est sélectionnée, une mini-bannière s'affiche entre le sélecteur de catégorie et le champ nom :
- Barre de progression compacte
- `"XX€ restant"` ou `"Dépassé de XX€"`
- Couleur selon statut (vert/amber/rouge)

---

## 8. Flux bancaire DSP2 — Transactions en attente

### Table `bank_synced_transactions` (colonnes ajoutées)

```sql
validation_status    TEXT DEFAULT 'pending' CHECK IN ('pending', 'validated', 'ignored')
suggested_category   TEXT    -- suggestion AI de catégorie
suggested_subcategory TEXT   -- suggestion AI de sous-catégorie
```

### Flux utilisateur
1. Les transactions bancaires importées arrivent avec `validation_status = 'pending'`
2. Badge amber sur le bouton ⚙️ (Settings) indique le nombre de transactions en attente
3. `PendingTransactionsSheet` : l'utilisateur peut **valider** (choisir une catégorie → crée une dépense) ou **ignorer** chaque transaction
4. Les transactions existantes déjà liées (`expense_id IS NOT NULL`) sont rétroactivement marquées `'validated'`

---

## 9. Migrations SQL à appliquer dans Supabase

### Migration 1 — Création table `category_budget_configs`

```sql
CREATE TABLE IF NOT EXISTS category_budget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'uncapped' CHECK (budget_type IN ('fixed', 'variable', 'uncapped')),
  cap_amount NUMERIC(10,2),
  warning_threshold INTEGER NOT NULL DEFAULT 80 CHECK (warning_threshold BETWEEN 0 AND 100),
  color TEXT NOT NULL DEFAULT '#6366f1',
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, category_name)
);

ALTER TABLE category_budget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_budget_configs_account_access"
  ON category_budget_configs FOR ALL
  USING (has_account_access(account_id))
  WITH CHECK (has_account_access(account_id));
```

### Migration 2 — Colonnes workflow

```sql
-- Sous-catégories : parent_id + sort_order sur expense_categories
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_expense_categories_parent
  ON public.expense_categories(parent_id);

-- Sous-catégorie sur les dépenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Plafonds par mois/année
ALTER TABLE public.category_budget_configs
  ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month IS NULL OR (month BETWEEN 0 AND 11)),
  ADD COLUMN IF NOT EXISTS year  INTEGER CHECK (year  IS NULL OR year >= 2020);

ALTER TABLE public.category_budget_configs
  DROP CONSTRAINT IF EXISTS category_budget_configs_account_id_category_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS category_budget_configs_monthly_uidx
  ON public.category_budget_configs (
    account_id,
    category_name,
    COALESCE(month, -1),
    COALESCE(year,  -1)
  );

-- Validation DSP2
ALTER TABLE public.bank_synced_transactions
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'validated', 'ignored')),
  ADD COLUMN IF NOT EXISTS suggested_category    TEXT,
  ADD COLUMN IF NOT EXISTS suggested_subcategory TEXT;

UPDATE public.bank_synced_transactions
  SET validation_status = 'validated'
  WHERE expense_id IS NOT NULL
    AND validation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bank_synced_tx_pending
  ON public.bank_synced_transactions(account_id, validation_status)
  WHERE validation_status = 'pending';
```

> ⚠️ **À appliquer dans cet ordre** depuis le SQL Editor Supabase :
> 1. Migration 1 (crée `category_budget_configs`)
> 2. Migration 2 (ajoute les colonnes workflow)

---

## 10. Stack technique

| Élément        | Version / Outil               |
|----------------|-------------------------------|
| Framework      | React 18 + TypeScript + Vite  |
| Styling        | Tailwind CSS v3               |
| Composants UI  | shadcn/ui (Radix UI)          |
| Backend        | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Font           | Fredoka (Google Fonts) via `font-display` |
| Icônes         | lucide-react                  |
| Toast          | sonner                        |
| Date           | date-fns (locale `fr`)        |

### Tokens Tailwind custom (dans `tailwind.config.ts`)
```
text-budget-ok / text-budget-warning / text-budget-danger
shadow-glow-ok / shadow-glow-warning / shadow-glow-danger
font-display   → Fredoka
animate-fade-in-up / animate-bounce-in / animate-number-pop
```

### Variables d'environnement
```
VITE_SUPABASE_URL=https://qqpmmehdowmsprkfhfle.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=qqpmmehdowmsprkfhfle
```

---

## 11. Composants — inventaire

| Composant                  | Rôle                                                         |
|---------------------------|--------------------------------------------------------------|
| `BudgetDashboard`         | Écran principal, orchestre tout                              |
| `AddExpenseSheet`         | Bottom sheet ajout de dépense                                |
| `CategoryMergedSheet`     | Bottom sheet gestion catégorie (fusionné : infos + plafond + sous-cats) |
| `SettingsSheet`           | Menu paramètres (liste de rows)                              |
| `ExpenseHistorySheet`     | Historique de toutes les dépenses                            |
| `EditExpenseSheet`        | Édition d'une dépense existante                              |
| `FullBudgetSetupSheet`    | Config mensuelle (salaire, budget, déductions)               |
| `ManageAccountsSheet`     | Gestion des comptes (multi-compte)                           |
| `AccountMembersSheet`     | Membres d'un compte partagé                                  |
| `AccountSelector`         | Dropdown sélection compte en header                          |
| `DailyForecastSheet`      | Prévision journalière pour le mois                           |
| `BankConnectionSheet`     | Connexion bancaire DSP2                                      |
| `PendingTransactionsSheet`| Validation des transactions importées                        |
| `CategorySelector`        | Selector catégorie + sous-catégorie (utilisé dans AddExpenseSheet) |
| `DonaldSticker`           | Animation fun lors d'un ajout de dépense                     |
| `MiniArc` (inline)        | Arc SVG circulaire pour la tuile catégorie                   |
| `CategoryTile` (inline)   | Tuile 4-col avec arc, emoji, nom, montant                    |

---

## 12. Points d'attention pour Lovable

### Priorité 1 — Migrations SQL (bloquant)
L'app est en prod mais les migrations ne sont pas appliquées. Les requêtes vers `expense_categories` (colonnes `parent_id`, `sort_order`), `category_budget_configs` (table entière) et `bank_synced_transactions` (colonnes validation) échouent en 400/404.

**Action** : appliquer les 2 migrations SQL ci-dessus dans le SQL Editor Supabase du projet `qqpmmehdowmsprkfhfle`.

### Priorité 2 — Bouton "+" de la grille catégories
Le bouton `+` dans la grille (pour ajouter une nouvelle catégorie) est non-fonctionnel (`onClick` vide). Il faut le connecter à un flow d'ajout de catégorie. Options :
- A) Ouvrir un mini-modal inline directement dans la grille
- B) Ouvrir `CategoryMergedSheet` en mode "nouvelle catégorie" (sans catégorie existante, champs vides)

### Priorité 3 — `subcategory` dans `onAddExpense`
Le 5e argument de `onAddExpense` (`subcategory`) est transmis au hook mais pas encore persisté dans la DB expenses. À vérifier côté `useExpenses`.

### Bon à savoir
- Le seed des catégories par défaut se fait automatiquement dans `useExpenseCategories` au premier appel — aucune action manuelle nécessaire une fois la migration appliquée.
- La résolution de config "par mois" est ready dans le hook mais `BudgetDashboard` ne passe pas encore `activeMonth`/`activeYear` à `useCategoryBudgets` — les plafonds par mois sont donc ignorés pour l'instant (config globale uniquement).
