"""
Script to set up Stripe products and prices for the application.
Run this script to create the necessary Stripe products and prices for multiple currencies.
"""

import os
import sys
import stripe

# Add the parent directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the config with currency rates and Stripe settings
from backend.config import PRICING, CURRENCY_RATES, STRIPE_SECRET_KEY

# Make sure we have the Stripe API key before initializing
if not STRIPE_SECRET_KEY:
    print("ERROR: STRIPE_SECRET_KEY is not set in environment variables.")
    print("Please set this in your .env or .env.local file or as an environment variable.")
    sys.exit(1)

# Initialize Stripe with secret key from config
stripe.api_key = STRIPE_SECRET_KEY

# Function to calculate price in different currencies
def calculate_price(base_price_usd, currency):
    """
    Calculate price in different currencies based on the exchange rate
    """
    if currency == 'usd':
        return int(base_price_usd * 100)  # Stripe prices are in cents
    
    # Get the currency rate relative to USD
    rate = CURRENCY_RATES.get(currency.lower(), 1.0)
    
    # Calculate price in the target currency
    price_in_currency = base_price_usd * rate
    
    # Round to 2 decimal places and convert to cents/smallest currency unit
    if currency == 'jpy':  # JPY doesn't use cents
        return int(round(price_in_currency, 0))
    else:
        return int(round(price_in_currency * 100, 0))

# Generate product and pricing information for all currencies
PRODUCTS_CONFIG = []

# Supported currencies (all lowercase)
SUPPORTED_CURRENCIES = [currency for currency in CURRENCY_RATES.keys() if currency != 'esp']

# Generate products for monthly plan across all currencies
for currency in SUPPORTED_CURRENCIES:
    # Calculate prices in the current currency
    monthly_price_usd = PRICING["monthly"]["usd"]
    monthly_price = calculate_price(monthly_price_usd, currency)
    
    # Monthly product config
    PRODUCTS_CONFIG.append({
        'name': f'Translide Monthly Subscription ({currency.upper()})',
        'description': 'Access to unlimited translations with Translide, billed monthly',
        'lookup_key': f'Translide-monthly-{currency}',
        'price': {
            'amount': monthly_price,
            'currency': currency,
            'interval': 'month',
            'interval_count': 1,
        }
    })
    
    # Calculate yearly price
    yearly_price_usd = PRICING["yearly"]["usd"]
    yearly_price = calculate_price(yearly_price_usd, currency)
    
    # Yearly product config
    PRODUCTS_CONFIG.append({
        'name': f'Translide Yearly Subscription ({currency.upper()})',
        'description': 'Access to unlimited translations with Translide, billed yearly (15% discount)',
        'lookup_key': f'Translide-yearly-{currency}',
        'price': {
            'amount': yearly_price,
            'currency': currency,
            'interval': 'year',
            'interval_count': 1,
        }
    })

def setup_products():
    """Set up the products and prices in Stripe."""
    print("Setting up Stripe products and prices...")
    
    for product_config in PRODUCTS_CONFIG:
        # Check if the product with this lookup key already exists
        existing_products = stripe.Product.list(active=True)
        existing_product = None
        
        for product in existing_products:
            if product.get('metadata', {}).get('lookup_key') == product_config['lookup_key']:
                existing_product = product
                break
        
        if existing_product:
            print(f"Product with lookup key '{product_config['lookup_key']}' already exists (ID: {existing_product.id})")
            product_id = existing_product.id
        else:
            # Create a new product
            product = stripe.Product.create(
                name=product_config['name'],
                description=product_config['description'],
                metadata={
                    'lookup_key': product_config['lookup_key']
                }
            )
            product_id = product.id
            print(f"Created new product: {product_config['name']} (ID: {product_id})")
        
        # Check if a price with this lookup key already exists
        existing_prices = stripe.Price.list(
            active=True,
            lookup_keys=[product_config['lookup_key']],
            limit=1
        )
        
        if existing_prices.data:
            price = existing_prices.data[0]
            print(f"Price with lookup key '{product_config['lookup_key']}' already exists (ID: {price.id})")
        else:
            # Create a new price
            price = stripe.Price.create(
                product=product_id,
                unit_amount=product_config['price']['amount'],
                currency=product_config['price']['currency'],
                recurring={
                    'interval': product_config['price']['interval'],
                    'interval_count': product_config['price']['interval_count'],
                },
                lookup_key=product_config['lookup_key']
            )
            print(f"Created new price for '{product_config['name']}': {price.unit_amount/100} {price.currency}/{price.recurring.interval} (ID: {price.id})")
    
    print("Stripe products and prices setup complete!")

if __name__ == "__main__":
    setup_products() 