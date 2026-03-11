

# Fix: Dashboard Stats, Withdrawal Fee Ledger, and Commission Verification

## Issue Analysis

### Issue 1: Withdrawals counted in deposits
**Root cause**: In `useTransactions.ts`, both `useTransactionStats` and `useDailyTransactionStats` include `SETTLED` status transactions in the "confirmed" filter. When `process-settlement` completes a withdrawal, it creates a pseudo-transaction with status `SETTLED` in the `transactions` table. These get counted in "Total Deposits" and "Confirmed" counts.

**Fix**: Filter to only `CONFIRMED` (exclude `SETTLED`) for deposit-related stats. The hook already has a `depositOnly` variable that does this correctly but it's not used consistently.

### Issue 2: Withdrawal fees not deducted from balance
**Root cause**: When a merchant requests a settlement, the frontend sends `netAmount` (after fee deduction) as the settlement amount. The `process-settlement` edge function then creates only one ledger DEBIT for that net amount. The fee portion is never debited from the merchant's ledger, so it remains in their "Available Balance."

Example: Merchant withdraws 100 USDT with 5% fee → sends 95 USDT as settlement amount → ledger debits 95 → the 5 USDT fee stays in balance forever.

**Fix**: Send the **gross amount** to the settlement request. Update `process-settlement` to calculate the fee, create two ledger entries (settlement DEBIT for net + fee DEBIT for fee), and record the net amount as what's actually sent.

### Issue 3: Commission cutting more than set percentage
**Verified**: After reviewing both `approve-transaction` and `oxapay-webhook`, the fee charged is exactly `merchant.deposit_fee_percentage` with **no** 2% OxaPay addition. The code on line 99/252 uses only `deposit_fee_percentage`. The 2% OxaPay cost is an internal platform cost tracked separately on the admin side -- it is NOT added to the merchant's fee. The apparent over-deduction you're seeing is most likely caused by **Issue 1** (settlements inflating the "Total Deposits" number, making the gap between deposits and net balance look bigger than expected).

## Changes Required

### Frontend changes (requires dist/ rebuild + upload to Hostinger)

**1. `src/hooks/useTransactions.ts`**
- In `useTransactionStats`: Change `totalVolume` to use `depositOnly` filter (only `CONFIRMED`, not `SETTLED`)
- Change `confirmedTransactions` count to exclude `SETTLED`
- In `useDailyTransactionStats`: Same fix -- exclude `SETTLED` from confirmed filter

**2. `src/pages/merchant/MerchantSettlements.tsx`**
- Send **gross amount** (not net) in the settlement request so the backend can properly handle the fee deduction

### Edge function change (requires redeployment to your Supabase project)

**3. `supabase/functions/process-settlement/index.ts`**
- Fetch merchant's `withdrawal_fee_percentage`
- Calculate fee from the gross settlement amount
- Create **two** ledger entries: settlement DEBIT (net) + fee DEBIT (withdrawal fee)
- The settlement record stores the gross amount; the ledger tracks the breakdown

## Deployment Impact

| What changed | Deploy where | Affects existing users? |
|---|---|---|
| `useTransactions.ts` | Hostinger (dist/) | No -- just fixes display math |
| `MerchantSettlements.tsx` | Hostinger (dist/) | No -- only affects new settlement requests |
| `process-settlement` | Your Supabase project (edge functions) | No -- only affects future settlement completions. Existing completed settlements keep their current ledger entries |

**Existing users/data are safe.** These changes only affect how new transactions are displayed and how future settlements are processed. No database schema changes needed.

### What you need to do after this update:
1. **Rebuild** the project (`npm run build`) and upload the new `dist/` to Hostinger
2. **Redeploy** the `process-settlement` edge function to your Supabase project (`supabase functions deploy process-settlement`)
3. Existing 20+ users will not be affected -- their past data stays intact

