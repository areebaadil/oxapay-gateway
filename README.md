# CryptoGate Payment Gateway

A crypto payment gateway that enables merchants to accept cryptocurrency payments (BTC, ETH, USDT, USDC, LTC, TRX) with automatic conversion tracking and settlement management.

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Merchant App   │────▶│  CryptoGate API  │────▶│  OxaPay         │
│  (Your Backend) │◀────│  (Edge Functions)│◀────│  (Processor)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Supabase DB     │
                        │  (Transactions)  │
                        └──────────────────┘
```

## 🔐 Authentication

All API requests require authentication via API key. Include your API key in the request headers:

```bash
# Option 1: Authorization header
Authorization: Bearer YOUR_API_KEY

# Option 2: X-API-Key header
X-API-Key: YOUR_API_KEY
```

### Getting Your API Key

1. Log in to the merchant dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New API Key**
4. Copy and securely store your key (it won't be shown again)

> ⚠️ **Security Note**: Never expose your API key in client-side code. Always make API calls from your backend server.

## 🌐 Base URL

```
https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api
```

## 📋 Complete Payment Flow

### Step 1: Create a Payment

When a customer wants to pay with crypto, create a payment intent:

```bash
curl -X POST https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "coin": "USDT",
    "user_reference": "order_12345",
    "callback_url": "https://yoursite.com/webhooks/crypto"
  }'
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "abc123-...",
    "address": "TXyz...abc",
    "amount": 99.99,
    "coin": "USDT",
    "qr_code": "data:image/png;base64,...",
    "expires_at": "2024-01-15T12:30:00Z",
    "status": "PENDING"
  }
}
```

### Step 2: Display Payment UI to Customer

Show the customer:
- **Deposit Address**: The crypto address to send funds to
- **Amount**: Exact amount in the selected cryptocurrency
- **QR Code**: For easy mobile wallet scanning
- **Expiration Timer**: Payment window countdown

```html
<!-- Example payment page -->
<div class="payment-container">
  <h2>Send exactly 99.99 USDT</h2>
  <img src="{qr_code}" alt="Payment QR Code" />
  <p>Address: <code>{address}</code></p>
  <p>Expires in: <span id="countdown"></span></p>
</div>
```

### Step 3: Customer Sends Payment

The customer sends the exact crypto amount to the provided address using their wallet.

### Step 4: Receive Webhook Notification

When the payment status changes, CryptoGate sends a webhook to your `callback_url`:

```json
{
  "event": "payment.confirmed",
  "payment_id": "abc123-...",
  "transaction_id": "tx_456...",
  "status": "CONFIRMED",
  "coin": "USDT",
  "amount": 99.99,
  "usd_value": 99.99,
  "tx_hash": "0x123...abc",
  "user_reference": "order_12345",
  "confirmed_at": "2024-01-15T12:25:00Z"
}
```

### Step 5: Verify & Fulfill Order

1. Verify the webhook signature (recommended)
2. Check the payment status
3. Fulfill the customer's order

```javascript
// Example webhook handler (Node.js/Express)
app.post('/webhooks/crypto', async (req, res) => {
  const { event, payment_id, status, user_reference } = req.body;
  
  if (event === 'payment.confirmed' && status === 'CONFIRMED') {
    // Find order by user_reference
    const order = await db.orders.findOne({ id: user_reference });
    
    // Mark order as paid
    await db.orders.update(order.id, { status: 'paid' });
    
    // Fulfill order (send product, activate subscription, etc.)
    await fulfillOrder(order);
  }
  
  res.status(200).json({ received: true });
});
```

## 📡 API Endpoints

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments` | Create a new payment |
| `GET` | `/payments` | List all payments |
| `GET` | `/payments/{id}` | Get payment details |

#### Create Payment

```bash
POST /payments
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ | Payment amount in USD |
| `coin` | string | ✅ | Cryptocurrency (BTC, ETH, USDT, USDC, LTC, TRX) |
| `user_reference` | string | ✅ | Your unique order/customer ID |
| `callback_url` | string | ❌ | Webhook URL for status updates |

#### Get Payment Status

```bash
GET /payments/{payment_id}
```

**Response:**
```json
{
  "id": "abc123-...",
  "status": "CONFIRMED",
  "coin": "USDT",
  "amount": 99.99,
  "usd_value": 99.99,
  "tx_hash": "0x123...abc",
  "created_at": "2024-01-15T12:00:00Z",
  "confirmed_at": "2024-01-15T12:25:00Z"
}
```

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List all transactions |
| `GET` | `/transactions/{id}` | Get transaction details |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (PENDING, CONFIRMED, FAILED, EXPIRED) |
| `coin` | string | Filter by cryptocurrency |
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset |

### Balance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/balance` | Get current balance per coin |

**Response:**
```json
{
  "balances": [
    {
      "coin": "USDT",
      "amount": 1250.50,
      "usd_value": 1250.50
    },
    {
      "coin": "BTC",
      "amount": 0.05,
      "usd_value": 2150.00
    }
  ],
  "total_usd_value": 3400.50
}
```

### Merchant Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/info` | Get merchant account details |

## 🔔 Webhook Events

Configure your webhook URL to receive real-time payment notifications.

### Event Types

| Event | Description |
|-------|-------------|
| `payment.pending` | Payment created, awaiting customer |
| `payment.confirmed` | Payment confirmed on blockchain |
| `payment.failed` | Payment failed |
| `payment.expired` | Payment window expired |

### Webhook Payload Structure

```json
{
  "event": "payment.confirmed",
  "payment_id": "uuid",
  "transaction_id": "uuid",
  "status": "CONFIRMED",
  "coin": "USDT",
  "amount": 99.99,
  "usd_value": 99.99,
  "tx_hash": "blockchain_tx_hash",
  "user_reference": "your_order_id",
  "fee_amount": 0.99,
  "net_amount": 99.00,
  "confirmed_at": "ISO8601_timestamp"
}
```

### Webhook Retry Policy

- Failed webhooks are retried up to **5 times**
- Retry intervals: 1min, 5min, 30min, 2hr, 24hr
- Respond with `2xx` status to acknowledge receipt

## 💻 Integration Examples

### Node.js / Express

```javascript
const express = require('express');
const axios = require('axios');

const CRYPTOGATE_API = 'https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api';
const API_KEY = process.env.CRYPTOGATE_API_KEY;

const api = axios.create({
  baseURL: CRYPTOGATE_API,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// Create a payment
app.post('/checkout', async (req, res) => {
  const { orderId, amount, coin } = req.body;
  
  const { data } = await api.post('/payments', {
    amount,
    coin,
    user_reference: orderId,
    callback_url: 'https://yoursite.com/webhooks/crypto'
  });
  
  res.json({
    paymentAddress: data.payment.address,
    paymentAmount: data.payment.amount,
    qrCode: data.payment.qr_code,
    expiresAt: data.payment.expires_at
  });
});

// Handle webhook
app.post('/webhooks/crypto', async (req, res) => {
  const { event, status, user_reference } = req.body;
  
  if (event === 'payment.confirmed') {
    await Order.updateOne(
      { _id: user_reference },
      { status: 'paid', paidAt: new Date() }
    );
  }
  
  res.status(200).send('OK');
});
```

### Python / Flask

```python
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

CRYPTOGATE_API = 'https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api'
API_KEY = os.environ['CRYPTOGATE_API_KEY']

headers = {'Authorization': f'Bearer {API_KEY}'}

@app.route('/checkout', methods=['POST'])
def checkout():
    data = request.json
    
    response = requests.post(
        f'{CRYPTOGATE_API}/payments',
        headers=headers,
        json={
            'amount': data['amount'],
            'coin': data['coin'],
            'user_reference': data['order_id'],
            'callback_url': 'https://yoursite.com/webhooks/crypto'
        }
    )
    
    payment = response.json()['payment']
    return jsonify({
        'address': payment['address'],
        'amount': payment['amount'],
        'qr_code': payment['qr_code']
    })

@app.route('/webhooks/crypto', methods=['POST'])
def webhook():
    data = request.json
    
    if data['event'] == 'payment.confirmed':
        # Update order status in your database
        update_order_status(data['user_reference'], 'paid')
    
    return 'OK', 200
```

### PHP

```php
<?php
$apiKey = getenv('CRYPTOGATE_API_KEY');
$baseUrl = 'https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api';

// Create payment
function createPayment($amount, $coin, $orderId) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init("$baseUrl/payments");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $apiKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'amount' => $amount,
        'coin' => $coin,
        'user_reference' => $orderId,
        'callback_url' => 'https://yoursite.com/webhooks/crypto'
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Handle webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    
    if ($payload['event'] === 'payment.confirmed') {
        // Update order in database
        updateOrderStatus($payload['user_reference'], 'paid');
    }
    
    http_response_code(200);
    echo 'OK';
}
```

## 📊 Payment Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting customer payment |
| `CONFIRMED` | Payment confirmed on blockchain |
| `FAILED` | Payment failed or underpaid |
| `EXPIRED` | Payment window expired (30 min default) |
| `SETTLED` | Funds settled to merchant |

## 🔒 Security Best Practices

1. **Store API keys securely** - Use environment variables, never commit to code
2. **Validate webhooks** - Verify the source and signature of webhook requests
3. **Use HTTPS** - All webhook endpoints should use HTTPS
4. **Idempotency** - Handle duplicate webhooks gracefully
5. **Verify amounts** - Always verify payment amounts match expected values

## 🧪 Test Credentials

For testing purposes, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cryptogate.com | Admin123! |
| Merchant | merchant@techstore.com | Merchant123! |

## 📞 Support

- **Documentation**: [API Docs](/admin/api-docs)
- **Dashboard**: [Merchant Dashboard](/merchant)
- **Email**: support@cryptogate.com

## 📄 License

Proprietary - All rights reserved.
