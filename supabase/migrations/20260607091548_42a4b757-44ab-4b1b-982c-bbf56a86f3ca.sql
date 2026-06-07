-- Backfill: flag all bank-synced expenses matching a direct-debit / recurring-subscription
-- pattern so they appear in the recurring-debits calendar and "Prélèvements" filter,
-- regardless of validation status.
UPDATE public.expenses
SET is_direct_debit = true
WHERE is_direct_debit = false
  AND name LIKE '🏦 %'
  AND (
    upper(name) ~ '^🏦 \s*PRLV\b'
    OR upper(name) ~ '\mECH\s+PRET\m'
    OR upper(name) ~ '\*?\s*COTIS\m'
    OR upper(name) ~ '(NETFLIX|SPOTIFY|APPLE\.COM/BILL|CLAUDE\.AI|OPENAI|LOVABLE|AMAZON PRIME|OVHCLOUD|DISNEY|YOUTUBE|ICLOUD|GOOGLE STORAGE|DEEZER|CANAL\+|CANALPLUS|PRIME VIDEO|MICROSOFT|ADOBE|DROPBOX|NOTION)'
  );