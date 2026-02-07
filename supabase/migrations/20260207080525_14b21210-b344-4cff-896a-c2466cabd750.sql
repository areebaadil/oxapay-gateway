-- Allow anonymous/public read access to deposit_intents by ID
-- The UUID serves as a capability token (hard to guess)
CREATE POLICY "Public can read deposit intents by id"
ON public.deposit_intents
FOR SELECT
USING (true);

-- Allow anonymous/public read access to transactions linked to a deposit_intent
CREATE POLICY "Public can read transactions by deposit_intent_id"
ON public.transactions
FOR SELECT
USING (deposit_intent_id IS NOT NULL);