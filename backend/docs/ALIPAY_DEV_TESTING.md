# Alipay Development Testing Guide

## Option 1: Using ngrok (Recommended)

### Step 1: Install ngrok
```bash
# Download from https://ngrok.com/download
# Or install via npm
npm install -g ngrok
```

### Step 2: Start your backend server
```bash
cd backend
python app.py
```

### Step 3: Create ngrok tunnel
```bash
ngrok http 5000
```

You'll get output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:5000
```

### Step 4: Update your PHP server configuration

Update your PHP server's `getOptions()` function:

```php
function getOptions()
{
    $options = new Config();
    $options->protocol = 'https';
    $options->gatewayHost = 'openapi.alipay.com';
    $options->signType = 'RSA2';

    // Your Alipay App ID
    $options->appId = '2021005180670685';

    // Your private key
    $options->merchantPrivateKey = 'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQD4jWhg3lBO2nNJ6+yRUwLEgoBdNZkQjRRDjmQqr0Cp8L1JoZ5xRjUS4MD1VbSKuxvgdAO+fUm9b5eYVLCOJRBHwhTgxn8NrlKZBwVeZlYCEUhM8PN8iTK+zAvBpNN5E5Yqzbe5KupE/WDyD2vhCOTQOx3yQgdeaS+kVVIDKQ5tXtubNy3jgyeWOWHYgJOgRUDy+zLdZUsZqlCDUytAQbuthMHCyE3rpQFMgIQXej233wFPK0bU0Z7JOl78LRWsgcf2E28xYBOUFJAJ5rTeUTy94Aa1utq0Wh73gcs1jQJ1pZkc4ST4hjxYWdqOysHXaoZ0aUaKfNw/NnZh37foTozDAgMBAAECggEBAMXv3wLdqHjTcOKaln+46shR4SXZjDbpEw0ltVFk1YtAY43ivooYziVlhWUbRrcAgRfDbEPkBLhuyPwP3balf4yV3AiRKxdbDv484CKoPrBQ0RItBMrVe+sEFgy1VY/jcEBQKZK1wXEFk5HRhCjm60mE+rk1qiaef8lQBQrtREcFpPYKr6/cF6RflMqoogGqjpl/J9Ewu9lurcIWgKUqLLy1ZrM0vFLXJcXvtajQAVtLcJhB0GysuUwzUtX19lFbHZwfGLd+qPe9y7VOpLD4sTtTiNO6Vuz3UrOqZonsEyD/m/dOh+Gyn9555L67nUQ2cCDce06jyzGvQGVrpvr30WECgYEA/s/AelRomH+/kMpI/8GfRDMUzVgw2eIt/UwSmjhEUjaKqmlgeqhtTsv8wD+RL+buwGhzh8w97TO1csG7+hfclFFUAMT5IQNk8FEzPZ7ulZXa+ycnSCPeFtSy3dwZhLvGEveFpP23WRgQ4ES4VM5ZbNjLn5ULRjMc3M0SiqMujVMCgYEA+bYuroYTGcz1LFUm6W/hKmGRK2sO5NGBwQgN8BQEmm/8jTH7QQj1NgkjTJbJm1ckVgOciNXIyAKnXa0Qc8CgenOrT8OQLp2pPD3QFjt4IFXzq7Dvgn+yutAKMakdudPROdab8RHVvgBoWrH6oGbtNAAjG7Vaiv+sXSSIwlOspNECgYEArURvyb8j8K7NgJNM2Dy9JA7oEknpzf7y7s6Px7aDHrRfzkkhhcaJrY8gK0oOW9hYeRWNmcXURjtnIsWCISmgoGo9CNjn3v8D4DYW9cvgyG7CHQ4es/tPxY6UojBMWemlYrhVdD/iMP8gWp/gCCrYvB8fN0CODgorkikQdp1HxmkCgYAZDGtWWmCkH+kgD1Kd6/kcNTlIr66IyXNIl7Q+NuPXUhB1YWQgu/NM/lGqJx4GFRGyBx62oytG1O1Q+kFCOzpdziiLEcTuyCXnwxOSh1ifdb/BozgDUSfukVvUa3Bt6Y99S8fMwMs+CfBt2JiZanm006ax6tkwREFX/ogxZg9VYQKBgQDrbRjiH4DIygj3EdE7T9dpuVc0ZJT/6Ui14whs2WCO71y3n0z+nIfkr9OpP7kZ8B6ZbmusFiJdSapWM5GJReZYBlAUt+CsAhYUkNSxGya5TG2+P3dulqinMVik9aWRPLXlXpRETDcVVRnv+Kuizz42Epuk9+8GSLHuvCscVG5NzA==';

    // Alipay public key
    $options->alipayPublicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvKkMZuF1I6QCnYPZuskgcT+ljlQkX+s9IsXiCVinZw8KFMJqKAyI+unk0TkkqJcg2HPC2kyYyoMybPDI1uk/+LRbCknkeznqj0ShJcUQqSqz6tmlfKyxWvyEUFoidnHIHxIFHRvkW2GOJGIE0dYK39kd92JAuIabrBMNkeeqzAXir26IBnR4BVi9yMIIqJ+4SJtgjJMtzCap1m1YLNucoPQaH0jtlHeamkCMMjRvWvF5UwyFMK0jG9AF/aqlfpvrfnJXquNGpgQieoUp98MMud2osempUypd+jYWMlzQeeEO9Z92yzf48v/bcvoGUMBj+fBzUqUHBYQURmmRbRqCdwIDAQAB';

    // Use ngrok URL for development
    $options->notifyUrl = 'https://abc123.ngrok.io/api/payment/alipay/notify';

    return $options;
}
```

### Step 5: Update frontend environment

Add to your `.env.local`:
```
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
```

### Step 6: Test the flow

1. Start your frontend: `npm run dev`
2. Make a test payment
3. Check ngrok web interface at `http://localhost:4040` to see requests

## Option 2: Use Alipay Sandbox

### Step 1: Get Alipay Sandbox Credentials

1. Go to Alipay Open Platform: https://open.alipay.com/
2. Create a sandbox app
3. Get sandbox App ID and keys

### Step 2: Update PHP configuration for sandbox

```php
function getOptions()
{
    $options = new Config();
    $options->protocol = 'https';
    $options->gatewayHost = 'openapi.alipaydev.com'; // Sandbox URL
    $options->signType = 'RSA2';

    // Sandbox App ID
    $options->appId = 'your-sandbox-app-id';

    // Sandbox private key
    $options->merchantPrivateKey = 'your-sandbox-private-key';

    // Sandbox public key
    $options->alipayPublicKey = 'your-sandbox-public-key';

    // Use ngrok URL for development
    $options->notifyUrl = 'https://abc123.ngrok.io/api/payment/alipay/notify';

    return $options;
}
```

## Option 3: Mock Payment Testing

### Create a test endpoint that simulates Alipay

```php
<?php
// test_payment.php - For development testing only
require 'vendor/autoload.php';

// Configuration
$SECRET_KEY = 'your-secret-key-change-this';

// Verify signature
if (!verifyPaymentSignature($_GET, $_GET['signature'], $SECRET_KEY)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Simulate successful payment
$out_trade_no = $_GET['out_trade_no'];
$total_amount = $_GET['price'];

echo json_encode([
    'success' => true,
    'message' => 'Test payment successful',
    'order_no' => $out_trade_no,
    'amount' => $total_amount
]);
?>
```

### Update frontend to use test endpoint in development

```typescript
// In payment-modal.tsx
} else if (paymentMethod === 'alipay') {
  // Use test endpoint in development
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev ? 'http://localhost/test_payment.php' : 'https://long-agi.cn/pay/index.php';
  
  const signedResponse = await apiClient.post('/api/payment/alipay/signed-data', {
    plan_type: selectedPlan,
    currency: currency
  });
  
  const paymentData = signedResponse.data.payment_data;
  const redirectParams = new URLSearchParams(paymentData);
  const redirectUrl = `${baseUrl}?${redirectParams.toString()}`;
  window.location.href = redirectUrl;
}
```

## Environment Variables for Development

Add to your backend `.env`:
```
ALIPAY_PHP_SIGN_SECRET_KEY=your-secret-key-change-this
FLASK_ENV=development
```

Add to your frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
NEXT_PUBLIC_IS_DEV=true
```

## Testing Checklist

- [ ] ngrok tunnel is working
- [ ] Backend server is accessible via ngrok
- [ ] PHP server can reach ngrok URL
- [ ] Signature verification works
- [ ] PaymentTransaction records are created
- [ ] Webhook notifications are received
- [ ] User membership is updated correctly

## Debugging Tips

1. **Check ngrok web interface**: `http://localhost:4040`
2. **Monitor backend logs**: Check for webhook requests
3. **Check database**: Verify PaymentTransaction records
4. **Test signature verification**: Use the test endpoint
5. **Monitor PHP logs**: Check for signature verification errors

## Production Deployment

When ready for production:

1. Update `notifyUrl` to your production domain
2. Use production Alipay credentials
3. Remove test endpoints
4. Update environment variables
5. Deploy to production server 