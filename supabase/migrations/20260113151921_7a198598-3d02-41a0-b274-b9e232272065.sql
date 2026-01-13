-- Add separate deposit and withdrawal fee columns
ALTER TABLE public.merchants 
ADD COLUMN deposit_fee_percentage numeric NOT NULL DEFAULT 1.50,
ADD COLUMN withdrawal_fee_percentage numeric NOT NULL DEFAULT 1.50;

-- Migrate existing fee_percentage values to deposit_fee_percentage
UPDATE public.merchants 
SET deposit_fee_percentage = fee_percentage,
    withdrawal_fee_percentage = fee_percentage;

-- Drop the old fee_percentage column
ALTER TABLE public.merchants 
DROP COLUMN fee_percentage;