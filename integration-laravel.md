# Laravel Integration Guide — Payment Gateway

> **Important:** The payment page is hosted on our platform. You only need to handle the redirect and webhook on your Laravel backend.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Configuration](#configuration)
3. [Routes](#routes)
4. [Controller](#controller)
5. [Views](#views)
6. [Webhook Handler](#webhook-handler)
7. [Model (Optional)](#model-optional)
8. [Testing](#testing)

---

## Requirements

- PHP 8.1+
- Laravel 10+
- `guzzlehttp/guzzle` (included with Laravel by default)

---

## Configuration

### Step 1: Add your API key to `.env`

```env
PAYMENT_GATEWAY_URL=https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api
PAYMENT_GATEWAY_API_KEY=pk_XXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

### Step 2: Create a config file

```bash
php artisan make:config payment
```

Create `config/payment.php`:

```php
<?php

return [
    'base_url' => env('PAYMENT_GATEWAY_URL', 'https://hhioqglejbjcqcmqqsnj.supabase.co/functions/v1/merchant-api'),
    'api_key'  => env('PAYMENT_GATEWAY_API_KEY'),
];
```

---

## Routes

Add to `routes/web.php`:

```php
use App\Http\Controllers\PaymentController;

Route::post('/checkout', [PaymentController::class, 'checkout'])->name('payment.checkout');
Route::get('/payment/success', [PaymentController::class, 'success'])->name('payment.success');
Route::get('/payment/failed', [PaymentController::class, 'failed'])->name('payment.failed');
Route::get('/payment/status/{paymentId}', [PaymentController::class, 'status'])->name('payment.status');
```

Add to `routes/api.php`:

```php
use App\Http\Controllers\PaymentWebhookController;

Route::post('/webhook/payment', [PaymentWebhookController::class, 'handle']);
```

---

## Controller

### Step 1: Create the Payment Controller

```bash
php artisan make:controller PaymentController
```

`app/Http/Controllers/PaymentController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Base URL for the Payment Gateway API.
     */
    private function baseUrl(): string
    {
        return config('payment.base_url');
    }

    /**
     * API Key for authentication.
     */
    private function apiKey(): string
    {
        return config('payment.api_key');
    }

    /**
     * Create a payment and redirect user to the hosted payment page.
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'amount'   => 'required|numeric|min:1',
            'order_id' => 'required|string',
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey(),
                'Content-Type'  => 'application/json',
            ])->post($this->baseUrl() . '/payments', [
                'amount'       => (float) $request->amount,
                'currency'     => 'USD',
                'pay_currency' => 'USDT',
                'order_id'     => $request->order_id,
                'description'  => $request->input('description', 'Payment for Order #' . $request->order_id),
                'success_url'  => route('payment.success'),
                'failure_url'  => route('payment.failed'),
                'callback_url' => url('/api/webhook/payment'),
            ]);

            $data = $response->json();

            if ($response->successful() && isset($data['data']['hosted_payment_url'])) {
                // Store payment_id in session for later reference
                session(['payment_id' => $data['data']['payment_id']]);

                // Redirect to the hosted payment page (on our platform)
                return redirect()->away($data['data']['hosted_payment_url']);
            }

            Log::error('Payment creation failed', ['response' => $data]);
            return back()->with('error', $data['error'] ?? 'Failed to create payment. Please try again.');

        } catch (\Exception $e) {
            Log::error('Payment gateway error', ['message' => $e->getMessage()]);
            return back()->with('error', 'Payment service is temporarily unavailable.');
        }
    }

    /**
     * Payment success callback page.
     */
    public function success(Request $request)
    {
        return view('payment.success', [
            'payment_id' => session('payment_id'),
        ]);
    }

    /**
     * Payment failure callback page.
     */
    public function failed(Request $request)
    {
        return view('payment.failed');
    }

    /**
     * Check payment status (optional polling).
     */
    public function status(string $paymentId)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey(),
            ])->get($this->baseUrl() . '/payments/' . $paymentId);

            return response()->json($response->json());

        } catch (\Exception $e) {
            return response()->json(['error' => 'Unable to fetch status'], 500);
        }
    }
}
```

---

## Webhook Handler

```bash
php artisan make:controller PaymentWebhookController
```

`app/Http/Controllers/PaymentWebhookController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    /**
     * Handle incoming payment webhook notifications.
     */
    public function handle(Request $request)
    {
        $payload = $request->all();

        Log::info('Payment webhook received', $payload);

        $status  = $payload['status'] ?? null;
        $orderId = $payload['orderId'] ?? $payload['order_id'] ?? null;
        $trackId = $payload['trackId'] ?? $payload['track_id'] ?? null;
        $amount  = $payload['amount'] ?? 0;

        switch ($status) {
            case 'CONFIRMED':
                // Payment successful — fulfill the order
                $this->fulfillOrder($orderId, $amount);
                break;

            case 'FAILED':
                // Payment failed
                $this->cancelOrder($orderId);
                break;

            case 'EXPIRED':
                // Payment expired — customer didn't pay in time
                $this->expireOrder($orderId);
                break;

            default:
                Log::info("Unhandled payment status: {$status}", $payload);
                break;
        }

        return response()->json(['received' => true], 200);
    }

    private function fulfillOrder(?string $orderId, float $amount): void
    {
        // TODO: Update your orders table
        // Order::where('order_id', $orderId)->update([
        //     'status'   => 'paid',
        //     'paid_amount' => $amount,
        //     'paid_at'  => now(),
        // ]);

        Log::info("Order fulfilled: {$orderId}");
    }

    private function cancelOrder(?string $orderId): void
    {
        // TODO: Mark order as failed
        // Order::where('order_id', $orderId)->update(['status' => 'failed']);

        Log::info("Order cancelled: {$orderId}");
    }

    private function expireOrder(?string $orderId): void
    {
        // TODO: Mark order as expired
        // Order::where('order_id', $orderId)->update(['status' => 'expired']);

        Log::info("Order expired: {$orderId}");
    }
}
```

### Disable CSRF for Webhook Route

In `app/Http/Middleware/VerifyCsrfToken.php` (Laravel 10) or `bootstrap/app.php` (Laravel 11):

**Laravel 10:**
```php
protected $except = [
    'api/webhook/payment',
];
```

**Laravel 11:** Webhooks in `routes/api.php` are CSRF-exempt by default — no changes needed.

---

## Views

### Checkout Form

`resources/views/payment/checkout.blade.php`:

```blade
@extends('layouts.app')

@section('content')
<div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
    <h2 class="text-2xl font-bold mb-6">Checkout</h2>

    @if(session('error'))
        <div class="bg-red-100 text-red-700 p-3 rounded mb-4">
            {{ session('error') }}
        </div>
    @endif

    <form action="{{ route('payment.checkout') }}" method="POST">
        @csrf

        <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Order ID</label>
            <input type="text" name="order_id" value="ORD-{{ rand(1000, 9999) }}"
                   class="w-full border rounded px-3 py-2" required>
        </div>

        <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Amount (USD)</label>
            <input type="number" name="amount" step="0.01" min="1" placeholder="50.00"
                   class="w-full border rounded px-3 py-2" required>
        </div>

        <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Description</label>
            <input type="text" name="description" placeholder="Payment for services"
                   class="w-full border rounded px-3 py-2">
        </div>

        <button type="submit"
                class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            Pay with Crypto (USDT)
        </button>

        <p class="text-xs text-gray-500 mt-3 text-center">
            You will be redirected to a secure hosted payment page.
        </p>
    </form>
</div>
@endsection
```

### Success Page

`resources/views/payment/success.blade.php`:

```blade
@extends('layouts.app')

@section('content')
<div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow text-center">
    <div class="text-green-500 text-5xl mb-4">✓</div>
    <h2 class="text-2xl font-bold mb-2">Payment Successful!</h2>
    <p class="text-gray-600 mb-4">Your payment has been confirmed.</p>

    @if($payment_id)
        <p class="text-sm text-gray-500">Payment ID: {{ $payment_id }}</p>
    @endif

    <a href="/" class="inline-block mt-4 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
        Return to Home
    </a>
</div>
@endsection
```

### Failure Page

`resources/views/payment/failed.blade.php`:

```blade
@extends('layouts.app')

@section('content')
<div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow text-center">
    <div class="text-red-500 text-5xl mb-4">✕</div>
    <h2 class="text-2xl font-bold mb-2">Payment Failed</h2>
    <p class="text-gray-600 mb-4">Your payment could not be completed. Please try again.</p>

    <a href="/" class="inline-block mt-4 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
        Try Again
    </a>
</div>
@endsection
```

---

## Model (Optional)

If you want to store payment records locally:

```bash
php artisan make:model Payment -m
```

Migration:

```php
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->string('order_id')->index();
    $table->string('payment_id')->nullable()->index(); // from gateway
    $table->decimal('amount', 10, 2);
    $table->string('currency')->default('USD');
    $table->string('status')->default('pending'); // pending, paid, failed, expired
    $table->string('tx_hash')->nullable();
    $table->timestamp('paid_at')->nullable();
    $table->timestamps();
});
```

---

## Testing

1. Add your API key to `.env`
2. Visit `/checkout` (or wherever you mount the checkout view)
3. Enter an amount and submit — you will be **redirected to the hosted payment page**
4. Complete the payment on the hosted page
5. After payment, you are redirected back to your `success_url` or `failure_url`
6. Check your Laravel logs (`storage/logs/laravel.log`) for webhook events

### Quick Test with Artisan Tinker

```php
$response = Http::withHeaders([
    'Authorization' => 'Bearer ' . config('payment.api_key'),
])->get(config('payment.base_url') . '/balance');

dd($response->json());
```

---

## Summary

| Step | What Happens | Where |
|------|-------------|-------|
| 1 | User clicks "Pay" | Your Laravel app |
| 2 | Your server calls POST `/payments` | Your Laravel backend → Gateway API |
| 3 | User is redirected to hosted payment page | **Our platform** (not your server) |
| 4 | User pays via QR / wallet | Hosted payment page |
| 5 | Webhook notifies your server | Gateway → Your `/api/webhook/payment` |
| 6 | User redirected back | Hosted page → Your success/failure URL |
