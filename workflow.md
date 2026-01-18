# Payment Gateway Workflows

This document describes the complete workflows for each role in the payment gateway system, including API endpoints, actions, and webhook responses.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Role Definitions](#role-definitions)
3. [Admin Workflows](#admin-workflows)
4. [Agent Workflows](#agent-workflows)
5. [Merchant Workflows](#merchant-workflows)
6. [Deposit/Payment Workflow](#depositpayment-workflow)
7. [Webhook Events](#webhook-events)
8. [API Reference](#api-reference)
9. [Settlement Workflow](#settlement-workflow)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT GATEWAY SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐   │
│   │  ADMIN   │─────▶│  AGENT   │─────▶│   MERCHANT   │─────▶│   USER   │   │
│   └──────────┘      └──────────┘      └──────────────┘      └──────────┘   │
│        │                 │                    │                    │        │
│        │                 │                    │                    │        │
│        ▼                 ▼                    ▼                    ▼        │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                      SUPABASE DATABASE                           │     │
│   │  • merchants  • transactions  • ledger_entries  • settlements    │     │
│   │  • agents     • api_keys      • deposit_intents • webhook_logs   │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                     OXAPAY PAYMENT PROCESSOR                      │     │
│   │          • Generates wallet addresses                             │     │
│   │          • Monitors blockchain transactions                       │     │
│   │          • Sends webhooks on status changes                       │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Role Definitions

### Admin
- Full system access
- Manages agents and merchants
- Views all transactions and settlements
- Processes settlement requests
- Views webhook logs
- Access to API documentation

### Agent
- Manages their own merchants
- Sets merchant fee percentages (within limits)
- Views transactions for their merchants
- Views and manages settlements for their merchants
- Earns commission on merchant fees

### Merchant
- Integrates payment gateway via API
- Views their transactions and balance
- Requests settlements
- Manages API keys
- Receives webhook notifications

---

## Admin Workflows

### 1. Create Agent

```
Admin Dashboard → Agents → Create Agent
```

**Flow:**
1. Admin fills in agent details (name, email, password)
2. System creates auth user
3. System creates agent record
4. System assigns 'agent' role
5. Agent receives login credentials

**Edge Function:** `create-agent-with-user`

**Request:**
```json
{
  "email": "agent@example.com",
  "password": "secure-password",
  "name": "Agent Name",
  "deposit_fee_percentage": 1.5,
  "withdrawal_fee_percentage": 1.0,
  "max_deposit_fee_percentage": 3.0,
  "max_withdrawal_fee_percentage": 2.0
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com",
    "deposit_fee_percentage": 1.5,
    "withdrawal_fee_percentage": 1.0
  }
}
```

### 2. Create Merchant (Direct)

```
Admin Dashboard → Merchants → Create Merchant
```

**Edge Function:** `create-merchant-with-user`

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "secure-password",
  "name": "Merchant Name",
  "webhook_url": "https://merchant-site.com/webhook",
  "deposit_fee_percentage": 2.0,
  "withdrawal_fee_percentage": 1.5
}
```

### 3. Process Settlement

```
Admin Dashboard → Settlements → Pending → Approve/Reject
```

**Edge Function:** `process-settlement`

**Request:**
```json
{
  "settlement_id": "uuid",
  "action": "approve" | "reject",
  "tx_hash": "blockchain-tx-hash" // for approve
}
```

**Database Changes on Approve:**
1. Update settlement status to APPROVED
2. Create ledger entry (DEBIT) for settlement
3. Update to COMPLETED when tx confirmed

---

## Agent Workflows

### 1. Create Merchant

```
Agent Dashboard → Merchants → Create Merchant
```

**Edge Function:** `create-merchant-for-agent`

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "secure-password",
  "name": "Merchant Name",
  "webhook_url": "https://merchant-site.com/webhook",
  "deposit_fee_percentage": 2.5 // must be <= agent's max
}
```

**Response:**
```json
{
  "success": true,
  "merchant": {
    "id": "uuid",
    "name": "Merchant Name",
    "email": "merchant@example.com"
  }
}
```

### 2. View Merchant Performance

```
Agent Dashboard → Overview
```

**Data Displayed:**
- Total merchants count
- Total transaction volume
- Revenue from fees
- Settlement requests status

### 3. Manage Merchant Settings

```
Agent Dashboard → Merchants → Edit
```

**Editable Fields:**
- Merchant name
- Webhook URL
- Fee percentages (within agent's limits)
- Enable/Disable merchant

---

## Merchant Workflows

### 1. Generate API Key

```
Merchant Dashboard → API Keys → Generate New Key
```

**Edge Function:** `generate-api-key`

**Flow:**
1. Merchant clicks "Generate New Key"
2. System generates cryptographic random key
3. System stores SHA-256 hash in database
4. System deactivates previous keys
5. Key displayed ONCE to merchant (must copy immediately)

**Response:**
```json
{
  "success": true,
  "api_key": "mgk_live_xxxxxxxxxxxxxxxxxxxx",
  "merchant_id": "uuid",
  "merchant_name": "Merchant Name"
}
```

### 2. View Balance

```
Merchant Dashboard → Overview
```

**Edge Function:** `GET /merchant-api/balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "coin": "USDT",
        "amount": 1500.50,
        "usd_value": 1500.50
      },
      {
        "coin": "BTC",
        "amount": 0.05,
        "usd_value": 2150.00
      }
    ],
    "total_usd": 3650.50
  }
}
```

### 3. Request Settlement

```
Merchant Dashboard → Settlements → Request Settlement
```

**Database Insert:** `settlements` table

**Request Fields:**
- Coin (BTC, ETH, USDT, etc.)
- Amount
- Wallet Address

**Response:**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "amount": 100.00,
  "coin": "USDT",
  "wallet_address": "TXxxxxx...",
  "requested_at": "2024-01-18T10:30:00Z"
}
```

---

## Deposit/Payment Workflow

### Complete Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   MERCHANT   │     │    GATEWAY   │     │    OXAPAY   │     │     USER     │
│   SERVER     │     │    SYSTEM    │     │             │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                    │                    │
       │ 1. Create Payment   │                    │                    │
       │────────────────────▶│                    │                    │
       │                     │                    │                    │
       │                     │ 2. Create Payment  │                    │
       │                     │───────────────────▶│                    │
       │                     │                    │                    │
       │                     │ 3. Return Address  │                    │
       │                     │◀───────────────────│                    │
       │                     │                    │                    │
       │ 4. Payment Details  │                    │                    │
       │◀────────────────────│                    │                    │
       │                     │                    │                    │
       │ 5. Redirect to Pay  │                    │                    │
       │─────────────────────┼────────────────────┼───────────────────▶│
       │                     │                    │                    │
       │                     │                    │    6. User Pays    │
       │                     │                    │◀───────────────────│
       │                     │                    │                    │
       │                     │ 7. Webhook: Paid   │                    │
       │                     │◀───────────────────│                    │
       │                     │                    │                    │
       │                     │ 8. Update DB       │                    │
       │                     │ (CONFIRMED)        │                    │
       │                     │                    │                    │
       │ 9. Webhook: Success │                    │                    │
       │◀────────────────────│                    │                    │
       │                     │                    │                    │
       ▼                     ▼                    ▼                    ▼
```

### Step-by-Step Process

#### Step 1: Merchant Creates Payment Intent

**Option A: Via Merchant API**

```bash
POST /functions/v1/merchant-api/payments
Authorization: Bearer mgk_live_xxxx
Content-Type: application/json

{
  "amount": 50.00,
  "coin": "USDT",
  "user_reference": "order-12345",
  "callback_url": "https://merchant.com/payment-webhook"
}
```

**Option B: Via Direct Deposit Intent**

```bash
POST /functions/v1/create-deposit-intent
Content-Type: application/json

{
  "merchant_id": "uuid",
  "user_reference": "order-12345",
  "coin": "USDT",
  "expected_amount": 50.00,
  "callback_url": "https://merchant.com/webhook"
}
```

#### Step 2: System Response

```json
{
  "success": true,
  "data": {
    "deposit_intent_id": "uuid",
    "hosted_deposit_page_url": "https://app.example.com/deposit/uuid",
    "payment_address": "TRx1234567890abcdef",
    "amount": 50.00,
    "coin": "USDT",
    "network": "TRC20",
    "qr_code_url": "https://chart.googleapis.com/...",
    "expires_at": "2024-01-18T11:30:00Z"
  }
}
```

#### Step 3: User Payment Page

The hosted deposit page (`/deposit/:id`) displays:
- QR code for wallet address
- Wallet address (copyable)
- Expected amount
- Coin type
- Countdown timer
- Real-time status updates

#### Step 4: User Sends Crypto

User sends crypto from their wallet to the provided address.

#### Step 5: OxaPay Detection

OxaPay monitors the blockchain and detects the incoming transaction.

#### Step 6: Webhook Processing

**OxaPay sends webhook to:** `POST /functions/v1/oxapay-webhook`

```json
{
  "status": "Paid",
  "trackId": "oxapay-track-id",
  "amount": "50.00",
  "coin": "USDT",
  "network": "TRC20",
  "txID": "0xabc123...",
  "address": "TRx1234567890abcdef",
  "date": 1705577400
}
```

#### Step 7: System Updates

When payment is confirmed:

1. **Update Transaction:**
   ```sql
   UPDATE transactions 
   SET status = 'CONFIRMED', 
       tx_hash = '0xabc123...', 
       confirmed_at = NOW()
   WHERE deposit_intent_id = 'uuid';
   ```

2. **Create Ledger Entries:**
   ```sql
   -- Credit: Deposit amount
   INSERT INTO ledger_entries (merchant_id, transaction_id, entry_type, category, amount, coin)
   VALUES ('merchant-uuid', 'tx-uuid', 'CREDIT', 'DEPOSIT', 50.00, 'USDT');
   
   -- Debit: Platform fee
   INSERT INTO ledger_entries (merchant_id, transaction_id, entry_type, category, amount, coin)
   VALUES ('merchant-uuid', 'tx-uuid', 'DEBIT', 'FEE', 1.00, 'USDT');
   ```

3. **Log Webhook Attempt:**
   ```sql
   INSERT INTO webhook_logs (merchant_id, event_type, payload, attempts)
   VALUES ('merchant-uuid', 'payment.confirmed', '{"tx_id": "..."}', 1);
   ```

#### Step 8: Merchant Webhook

System sends webhook to merchant's callback URL:

```bash
POST https://merchant.com/payment-webhook
Content-Type: application/json
X-Webhook-Signature: sha256=xxxx

{
  "event": "payment.confirmed",
  "timestamp": "2024-01-18T10:35:00Z",
  "data": {
    "transaction_id": "uuid",
    "deposit_intent_id": "uuid",
    "user_reference": "order-12345",
    "amount": 50.00,
    "coin": "USDT",
    "tx_hash": "0xabc123...",
    "status": "CONFIRMED",
    "net_amount": 49.00,
    "fee": 1.00,
    "fee_percentage": 2.0
  }
}
```

---

## Webhook Events

### Event Types

| Event | Description | Trigger |
|-------|-------------|---------|
| `payment.created` | Payment intent created | New payment request |
| `payment.pending` | Transaction detected | Blockchain tx found |
| `payment.confirmed` | Payment completed | Sufficient confirmations |
| `payment.expired` | Payment window closed | Timeout without payment |
| `payment.failed` | Payment failed | Various errors |
| `settlement.approved` | Settlement approved | Admin approves |
| `settlement.completed` | Funds sent | Blockchain confirmed |
| `settlement.rejected` | Settlement rejected | Admin rejects |

### Webhook Payload Structure

```json
{
  "event": "payment.confirmed",
  "timestamp": "2024-01-18T10:35:00Z",
  "webhook_id": "uuid",
  "data": {
    // Event-specific data
  }
}
```

### Webhook Retry Logic

```
Attempt 1: Immediate
Attempt 2: 5 minutes
Attempt 3: 30 minutes
Attempt 4: 2 hours
Attempt 5: 12 hours
```

**Edge Function:** `webhook-retry`

Triggered by scheduled cron job or manual retry from admin panel.

### Webhook Security

**Signature Verification (Merchant Side):**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

---

## API Reference

### Authentication

All merchant API requests require authentication via API key:

```
Authorization: Bearer mgk_live_xxxxxxxxxxxx
```

or

```
X-API-Key: mgk_live_xxxxxxxxxxxx
```

### Endpoints

#### GET /merchant-api/info

Get merchant information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Merchant Name",
    "fee_percentage": 2.0,
    "is_enabled": true
  }
}
```

#### GET /merchant-api/balance

Get merchant balance by coin.

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "coin": "USDT",
        "amount": 1500.50,
        "historical_usd_value": 1480.00,
        "current_usd_value": 1500.50
      }
    ]
  }
}
```

#### POST /merchant-api/payments

Create a new payment.

**Request:**
```json
{
  "amount": 100.00,
  "coin": "USDT",
  "user_reference": "order-123",
  "callback_url": "https://merchant.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "track_id": "oxapay-track-id",
    "address": "TRx...",
    "amount": 100.00,
    "coin": "USDT",
    "network": "TRC20",
    "qr_code": "base64...",
    "expires_at": "2024-01-18T11:30:00Z"
  }
}
```

#### GET /merchant-api/payments/:id

Get payment status.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "amount": 100.00,
    "coin": "USDT",
    "tx_hash": "0x...",
    "confirmed_at": "2024-01-18T10:45:00Z"
  }
}
```

#### GET /merchant-api/transactions

List transactions with optional filters.

**Query Parameters:**
- `status`: PENDING, CONFIRMED, FAILED, EXPIRED
- `coin`: BTC, ETH, USDT, USDC, LTC, TRX
- `page`: Page number
- `limit`: Items per page (max 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

---

## Settlement Workflow

### Settlement Request Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   MERCHANT   │     │    SYSTEM    │     │    ADMIN     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                    │
       │ 1. Request          │                    │
       │    Settlement       │                    │
       │────────────────────▶│                    │
       │                     │                    │
       │                     │ 2. Validate        │
       │                     │    Balance         │
       │                     │                    │
       │                     │ 3. Create          │
       │                     │    Settlement      │
       │                     │    (PENDING)       │
       │                     │                    │
       │ 4. Confirmation     │                    │
       │◀────────────────────│                    │
       │                     │                    │
       │                     │                    │ 5. Review
       │                     │                    │    Settlement
       │                     │                    │
       │                     │ 6. Approve/Reject  │
       │                     │◀───────────────────│
       │                     │                    │
       │                     │ 7. Process         │
       │                     │    (If Approved)   │
       │                     │                    │
       │ 8. Webhook:         │                    │
       │    settlement.done  │                    │
       │◀────────────────────│                    │
       │                     │                    │
       ▼                     ▼                    ▼
```

### Settlement States

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting admin review |
| `APPROVED` | Approved, processing |
| `COMPLETED` | Funds sent successfully |
| `REJECTED` | Rejected by admin |

### Ledger Impact

**On Settlement Completion:**

```sql
INSERT INTO ledger_entries (
  merchant_id, 
  transaction_id, 
  entry_type, 
  category, 
  amount, 
  coin,
  description
) VALUES (
  'merchant-uuid',
  'settlement-uuid',
  'DEBIT',
  'SETTLEMENT',
  100.00,
  'USDT',
  'Settlement to TRx... completed'
);
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for settlement",
    "details": {
      "requested": 1000.00,
      "available": 500.00,
      "coin": "USDT"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Action not permitted |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds |
| `MERCHANT_DISABLED` | 403 | Merchant account disabled |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Testing

### Test Page

Access the API test console at:
```
/api-test.html
```

### Test Credentials

For development/testing, use the sandbox environment:
- Supabase URL: Your project URL
- API Key: Generated from merchant dashboard
- Merchant ID: From database

### Simulating Webhooks

Use the webhook simulator tab to test payment flow without actual blockchain transactions.

---

## Security Best Practices

1. **Store API keys securely** - Never commit to version control
2. **Verify webhook signatures** - Always validate incoming webhooks
3. **Use HTTPS** - All API calls must use HTTPS
4. **Implement idempotency** - Handle duplicate webhooks gracefully
5. **Rate limiting** - Implement on your webhook endpoint
6. **IP whitelisting** - Consider restricting API access by IP
