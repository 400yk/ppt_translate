# Deployment Guide

## Environment Variables

Before deploying, you need to set up the following environment variables:

1. **NEXT_PUBLIC_API_URL**: Your production API URL
   - This should point to your backend API server
   - Example: `https://api.yourdomain.com`
   - Currently using a fallback in code: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'`

2. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Your Stripe publishable key
   - This is required for Stripe payments integration
   - Make sure to use the production key for deployment
   - The code has been updated to read from this environment variable

## Setting Up Environment Variables

### Local Development

Create a `.env.local` file in the root directory with:

```
API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
```

### Production Deployment

Depending on your hosting provider, set these environment variables:

#### Vercel

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add both variables with their production values

#### Netlify

1. Go to your site settings
2. Navigate to "Build & deploy" → "Environment"
3. Add both variables with their production values

#### Other Providers

Consult your hosting provider's documentation on how to set environment variables.

## Important Security Notes

1. Never commit your Stripe keys to your codebase
2. Ensure `.env.local` and other environment files are in your `.gitignore`
3. Use different Stripe keys for development and production environments
4. The `pk_live_` prefix indicates a production key, while `pk_test_` indicates a test key

## Deployment Checklist

- [ ] Set up environment variables in production
- [ ] Test Stripe integration with test keys before using live keys
- [ ] Update API_URL to production endpoint
- [ ] Ensure `.env.local` is not committed to your repository 