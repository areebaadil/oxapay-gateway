-- Add success and failure redirect URLs to deposit_intents
ALTER TABLE public.deposit_intents 
ADD COLUMN success_url text,
ADD COLUMN failure_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.deposit_intents.success_url IS 'URL to redirect user after successful payment';
COMMENT ON COLUMN public.deposit_intents.failure_url IS 'URL to redirect user after failed/expired payment';