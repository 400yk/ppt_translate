# Alipay Payment Integration

This document explains how the Alipay payment integration works in the Translide application.

## Overview

The Alipay integration follows the standard Alipay payment flow with both synchronous return URLs and asynchronous notifications.

## Payment Flow

### 1. Payment Initiation
- User selects Alipay as payment method
- Frontend calls the payment creation endpoint
- Backend creates an Alipay payment order
- User is redirected to Alipay payment page

### 2. Payment Processing
- User completes payment on Alipay
- Alipay redirects user back to our return URL (`/payment/success`)
- **Important**: The return URL does NOT include `trade_status` parameter

### 3. Asynchronous Notification
- Alipay sends a POST request to our notification URL (`/api/payment/alipay/notify`)
- This notification includes the `trade_status` parameter
- Backend processes the payment and updates user membership

### 4. Frontend Verification
- Frontend polls the status check endpoint to verify payment completion
- Once payment is confirmed, user sees success message

## Key Endpoints

### `/api/payment/success` (GET)
- **Purpose**: Handle user redirection after payment
- **Parameters**: `out_trade_no`, `trade_no`, `payment_method=alipay`
- **Note**: Does NOT include `trade_status` - this is normal
- **Action**: Only displays success page, does not update membership

### `/api/payment/alipay/notify` (POST)
- **Purpose**: Process asynchronous payment notifications from Alipay
- **Parameters**: Full payment data including `trade_status`
- **Action**: Updates user membership based on `trade_status`
- **Response**: Must return exactly `'success'` or `'fail'`

### `/api/payment/alipay/status` (GET)
- **Purpose**: Check if payment has been processed
- **Parameters**: `out_trade_no`
- **Action**: Returns payment status and membership info

## Configuration

Add these environment variables to your `.env` file:

```bash
# Alipay Configuration
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=alipay_public_key
ALIPAY_GATEWAY_URL=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://yourdomain.com/api/payment/alipay/notify
ALIPAY_RETURN_URL=https://yourdomain.com/payment/success
```

## Security

### Signature Verification
The notification endpoint verifies Alipay signatures using RSA2:

```python
def verify_alipay_signature(data):
    # Extract signature
    signature = data.get('sign')
    
    # Remove signature from data
    data_to_verify = {k: v for k, v in data.items() if k != 'sign' and k != 'sign_type'}
    
    # Sort parameters and build query string
    sorted_params = sorted(data_to_verify.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Verify signature using Alipay public key
    # ... signature verification logic
```

### Dependencies
Add to `requirements.txt`:
```
pycryptodome==3.20.0
```

## Testing

Use the test script to verify the integration:

```bash
cd backend
python test_alipay.py
```

## Common Issues

### 1. Missing `trade_status` in Return URL
**Problem**: Frontend expects `trade_status` but it's not in the return URL.

**Solution**: This is normal behavior. The `trade_status` is only sent to the notification URL. The frontend should poll the status endpoint instead.

### 2. Payment Not Being Processed
**Problem**: Payment shows as successful but membership isn't updated.

**Solution**: 
1. Check that the notification URL is correctly configured in Alipay dashboard
2. Verify the notification endpoint is accessible from the internet
3. Check server logs for notification processing errors

### 3. Signature Verification Fails
**Problem**: Notification endpoint returns `'fail'` due to signature verification.

**Solution**:
1. Ensure `ALIPAY_PUBLIC_KEY` is correctly set
2. Verify the public key format (should be the full RSA public key)
3. Check that `pycryptodome` is installed

## Order Number Format

Alipay order numbers follow this format:
```
translide_{plan_type}_{timestamp}_{user_email}
```

Example: `translide_monthly_1754552475_kevin.yang@long-agi.com`

## Response Codes

### Notification Endpoint
- `'success'` - Payment processed successfully
- `'fail'` - Payment processing failed

### Status Check Endpoint
```json
{
  "success": true,
  "payment_processed": true,
  "membership": {
    "is_paid": true,
    "plan_type": "monthly",
    "expires_at": "2025-09-07T15:41:39"
  },
  "order_no": "translide_monthly_1754552475_kevin.yang@long-agi.com"
}
```

## Monitoring

Monitor these logs for payment processing:
- `Alipay notify data: {...}` - Notification received
- `Processing Alipay notification: out_trade_no=..., trade_status=...` - Processing notification
- `Alipay payment successful for user ...` - Payment processed successfully
- `Alipay signature verification successful` - Signature verified

## Troubleshooting

1. **Check notification URL accessibility**: Ensure Alipay can reach your notification endpoint
2. **Verify signature**: Use the test script to verify signature verification works
3. **Monitor logs**: Check server logs for processing errors
4. **Test with sandbox**: Use Alipay sandbox environment for testing 