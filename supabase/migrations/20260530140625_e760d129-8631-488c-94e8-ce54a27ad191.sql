
DROP POLICY IF EXISTS "Account owners can add members" ON public.account_members;

CREATE POLICY "Account owners can add members"
ON public.account_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = account_members.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = account_members.account_id
  )
);
