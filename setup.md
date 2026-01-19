# CryptoQuest Game Payment Demo - Setup Guide

This guide explains how to set up and test the game payment demo page with the crypto payment gateway.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `public/game-payment-demo.html` | Sample game payment UI |
| `public/api-test.html` | API testing console |
| `workflow.md` | Detailed API and workflow documentation |

---

## 🚀 Quick Start

### Step 1: Access the Demo Page

Open the game payment demo in your browser:
```
https://your-project-url/game-payment-demo.html
```

### Step 2: Configure API Settings

1. Click the **⚙️ gear icon** in the bottom-right corner
2. Enter your configuration:
   - **API Endpoint**: Already pre-filled with the correct URL
   - **API Key**: Your merchant API key (see "Getting an API Key" below)
   - **Webhook URL**: (Optional) Your server endpoint for payment notifications
3. Click **Save Configuration**

### Step 3: Test a Purchase

1. Select a gem package (e.g., "Hero Pack - 1,200 Gems")
2. Choose a payment method (USDT, BTC, ETH, etc.)
3. Enter a test Player ID (e.g., `player_123` or `test@example.com`)
4. Click **Purchase** button
5. A payment modal will appear with:
   - QR code for the crypto address
   - Exact amount to send
   - Countdown timer (60 minutes)

---

## 🔑 Getting an API Key

### Option 1: Through the Admin Dashboard

1. Log in as an **Admin** user
2. Navigate to **Merchants** section
3. Select your merchant account
4. Go to **API Keys** tab
5. Click **Generate New Key**
6. Copy the key (shown only once!)

### Option 2: Through the Merchant Dashboard

1. Log in as a **Merchant** user
2. Navigate to **API Keys** page
3. Click **Generate New API Key**
4. Copy the key immediately

### Option 3: Using the API Test Console

1. Open `https://your-project-url/api-test.html`
2. Use the **Generate API Key** function (requires admin access)

---

## 🔄 Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME PAYMENT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. USER INITIATES PURCHASE
   ├── Selects gem package ($4.99 - $149.99)
   ├── Chooses crypto (USDT, BTC, ETH, LTC, TRX, USDC)
   └── Enters Player ID

2. GAME CALLS MERCHANT API
   ├── POST /payments
   ├── Headers: Authorization: Bearer <API_KEY>
   └── Body: { user_reference, coin, expected_amount, metadata }

3. SYSTEM CREATES PAYMENT
   ├── Creates deposit_intent in database
   ├── Calls OxaPay API for crypto address
   ├── Returns payment details (address, QR, amount)
   └── Sets 60-minute expiration

4. USER SENDS CRYPTO
   ├── Scans QR code or copies address
   └── Sends exact amount from their wallet

5. PAYMENT PROCESSING
   ├── OxaPay detects incoming transaction
   ├── Sends webhook to /oxapay-webhook
   ├── System updates transaction status
   └── Triggers merchant webhook callback

6. GAME RECEIVES CONFIRMATION
   ├── Polling detects CONFIRMED status
   ├── OR Webhook notification received
   └── Game credits gems to player account
```

---

## 🧪 Testing Scenarios

### Scenario 1: Successful Payment

1. Create a payment with the demo
2. Use OxaPay's test mode or sandbox (if available)
3. Watch the status update to "CONFIRMED"
4. Gems animation plays, balance updates

### Scenario 2: Expired Payment

1. Create a payment
2. Wait for the timer to expire (or use short expiry in test)
3. Status changes to "EXPIRED"
4. User prompted to try again

### Scenario 3: Webhook Testing

1. Set up a webhook receiver (e.g., webhook.site, RequestBin)
2. Enter the webhook URL in configuration
3. Complete a payment
4. Check webhook receiver for payment notification

---

## 📡 Webhook Integration

### Webhook Payload Example

When a payment is confirmed, your webhook URL receives:

```json
{
  "event": "payment.confirmed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "transaction_id": "txn_abc123",
    "deposit_intent_id": "dep_xyz789",
    "merchant_id": "merchant_123",
    "user_reference": "player_456",
    "coin": "USDT",
    "amount": 39.99,
    "usd_value": 39.99,
    "tx_hash": "0x1234...abcd",
    "status": "CONFIRMED",
    "metadata": {
      "package_name": "Hero Pack",
      "gems": 1200
    }
  }
}
```

### Webhook Signature Verification

Verify webhook authenticity using the signature header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 🎮 Integrating with Your Game

### JavaScript SDK Example

```javascript
class CryptoPayments {
  constructor(apiKey, endpoint) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async createPayment(playerId, packageId, coin = 'USDT') {
    const packages = {
      'starter': { gems: 100, price: 4.99 },
      'adventure': { gems: 500, price: 19.99 },
      'hero': { gems: 1200, price: 39.99 },
      'legend': { gems: 2500, price: 79.99 },
      'ultimate': { gems: 5500, price: 149.99 }
    };

    const pkg = packages[packageId];
    if (!pkg) throw new Error('Invalid package');

    const response = await fetch(`${this.endpoint}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        user_reference: playerId,
        coin: coin,
        expected_amount: pkg.price,
        metadata: { package: packageId, gems: pkg.gems }
      })
    });

    return response.json();
  }

  async checkPaymentStatus(paymentId) {
    const response = await fetch(`${this.endpoint}/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }
}

// Usage
const payments = new CryptoPayments('your_api_key', 'https://..../merchant-api');

// Create payment
const result = await payments.createPayment('player_123', 'hero', 'USDT');
console.log('Pay to:', result.data.address);
console.log('Amount:', result.data.amount, 'USDT');

// Poll for status
const interval = setInterval(async () => {
  const status = await payments.checkPaymentStatus(result.data.payment_id);
  if (status.data.status === 'CONFIRMED') {
    clearInterval(interval);
    creditGemsToPlayer('player_123', 1200);
  }
}, 5000);
```

### Unity C# Integration

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

public class CryptoPaymentManager : MonoBehaviour
{
    private string apiEndpoint = "https://.../merchant-api";
    private string apiKey = "your_api_key";

    public IEnumerator CreatePayment(string playerId, float amount, string coin)
    {
        var requestBody = JsonUtility.ToJson(new PaymentRequest {
            user_reference = playerId,
            coin = coin,
            expected_amount = amount
        });

        using (UnityWebRequest www = new UnityWebRequest(
            apiEndpoint + "/payments", "POST"))
        {
            byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(requestBody);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("Authorization", "Bearer " + apiKey);

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<PaymentResponse>(
                    www.downloadHandler.text);
                ShowPaymentUI(response.data.address, response.data.amount);
            }
        }
    }
}
```

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check API key is correct and active |
| Payment not created | Verify merchant is enabled |
| Webhook not received | Check webhook URL is accessible |
| Status stuck on PENDING | OxaPay may be processing, wait 1-2 min |
| QR code not showing | Check if address was returned |

### Debug Mode

Enable console logging in the demo page:
1. Open browser Developer Tools (F12)
2. Check Console tab for API responses
3. Check Network tab for failed requests

### API Test Console

For detailed API testing, use:
```
https://your-project-url/api-test.html
```

---

## 📊 Supported Cryptocurrencies

| Coin | Network | Min Amount | Confirmations |
|------|---------|------------|---------------|
| USDT | TRC-20 | $1.00 | 19 |
| USDT | ERC-20 | $10.00 | 12 |
| BTC | Bitcoin | $10.00 | 2 |
| ETH | Ethereum | $10.00 | 12 |
| LTC | Litecoin | $1.00 | 6 |
| TRX | TRON | $1.00 | 19 |
| USDC | ERC-20 | $10.00 | 12 |

---

## 🔒 Security Best Practices

1. **Never expose API keys** in client-side code for production
2. **Always verify webhooks** using signature validation
3. **Use HTTPS** for all API communications
4. **Implement idempotency** to prevent duplicate credits
5. **Log all transactions** for audit purposes
6. **Set reasonable expiry times** (30-60 minutes recommended)

---

## 📞 Support

For API issues or integration help:
- Check `workflow.md` for detailed API documentation
- Use `api-test.html` for debugging
- Review console logs for error messages

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2024 | Initial release |

