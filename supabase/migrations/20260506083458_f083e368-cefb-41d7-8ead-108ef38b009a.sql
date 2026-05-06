DELETE FROM expenses WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY budget_id, name, amount, date ORDER BY created_at) AS rn
    FROM expenses WHERE name LIKE '🏦%'
  ) t WHERE rn > 1
);