"""
Script to set up Stripe products and prices for the application.
Run this script to create the necessary Stripe products and prices for multiple currencies.
"""

import os
import sys
import stripe
import uuid

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

def fetch_all_stripe_products():
    """
    Fetch all active products from Stripe using pagination.
    
    Returns:
        list: A list of all active Stripe products
    """
    print("Fetching existing products from Stripe...")
    existing_products = []
    starting_after = None
    
    while True:
        if starting_after:
            products_page = stripe.Product.list(active=True, limit=100, starting_after=starting_after)
        else:
            products_page = stripe.Product.list(active=True, limit=100)
        
        existing_products.extend(products_page.data)
        
        if not products_page.has_more:
            break
        
        starting_after = products_page.data[-1].id
    
    print(f"Found {len(existing_products)} total products in Stripe")
    return existing_products

def setup_products():
    """Set up the products and prices in Stripe."""
    print("Setting up Stripe products and prices...")
    
    # Fetch all existing products once, outside the loop
    existing_products = fetch_all_stripe_products()
    
    for product_config in PRODUCTS_CONFIG:
        # Search for existing product with this lookup key in the already-fetched list
        existing_product = None
        for product in existing_products:
            if product.get('metadata', {}).get('lookup_key') == product_config['lookup_key']:
                existing_product = product
                break
        
        if existing_product:
            print(f"Product with lookup key '{product_config['lookup_key']}' already exists (ID: {existing_product.id})")
            
            # Check if the existing product matches our configuration
            product_matches = (
                existing_product.name == product_config['name'] and
                existing_product.description == product_config['description']
            )
            
            if product_matches:
                print(f"Product '{product_config['name']}' already matches configuration (ID: {existing_product.id})")
                product_id = existing_product.id
            else:
                print(f"Product '{product_config['name']}' exists but doesn't match configuration.")
                print(f"  Existing name: '{existing_product.name}'")
                print(f"  Expected name: '{product_config['name']}'")
                print(f"  Existing description: '{existing_product.description}'")
                print(f"  Expected description: '{product_config['description']}'")
                
                # Update the existing product to ensure name and description are current
                updated_product = stripe.Product.modify(
                    existing_product.id,
                    name=product_config['name'],
                    description=product_config['description'],
                    metadata={
                        'lookup_key': product_config['lookup_key']
                    }
                )
                product_id = updated_product.id
                print(f"Updated existing product: {product_config['name']} (ID: {product_id})")
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
            
            # Add the newly created product to our existing_products list for future iterations
            existing_products.append(product)
        
        # Check if a price with this lookup key already exists
        active_prices = stripe.Price.list(
            active=True,
            lookup_keys=[product_config['lookup_key']],
            limit=1
        )

        config_price_details = product_config['price']
        expected_amount = config_price_details['amount']
        expected_currency = config_price_details['currency']
        expected_interval = config_price_details['interval']
        expected_interval_count = config_price_details['interval_count']

        if active_prices.data:
            existing_price = active_prices.data[0]
            price_matches_config = (
                existing_price.unit_amount == expected_amount and
                existing_price.currency == expected_currency and
                existing_price.recurring.interval == expected_interval and
                existing_price.recurring.interval_count == expected_interval_count
            )

            if price_matches_config:
                print(f"Active price with lookup key '{product_config['lookup_key']}' already exists and matches configuration (ID: {existing_price.id})")
            else:
                print(f"Active price with lookup key '{product_config['lookup_key']}' exists but doesn't match configuration.")
                # To free up the lookup_key, first assign a temporary unique lookup_key to the old price, then deactivate it.
                temp_lookup_key = f"old_price_{existing_price.id}_{uuid.uuid4().hex}"
                stripe.Price.modify(existing_price.id, lookup_key=temp_lookup_key, active=False)
                print(f"Assigned temporary lookup_key '{temp_lookup_key}' to old price and archived it (ID: {existing_price.id})")

                # Now create the new price with the original lookup_key
                new_price = stripe.Price.create(
                    product=product_id,
                    unit_amount=expected_amount,
                    currency=expected_currency,
                    recurring={
                        'interval': expected_interval,
                        'interval_count': expected_interval_count,
                    },
                    lookup_key=product_config['lookup_key']
                )
                print(f"Created new price for '{product_config['name']}': {new_price.unit_amount/100} {new_price.currency}/{new_price.recurring.interval} (ID: {new_price.id})")
        else:
            # No active price found with the lookup_key. Check for inactive ones that might be using it.
            inactive_prices = stripe.Price.list(
                active=False,
                lookup_keys=[product_config['lookup_key']]
            )
            for inactive_price in inactive_prices.auto_paging_iter():
                print(f"Found inactive price (ID: {inactive_price.id}) using lookup key '{product_config['lookup_key']}'. Updating its lookup key.")
                temp_lookup_key = f"old_price_{inactive_price.id}_{uuid.uuid4().hex}"
                stripe.Price.modify(inactive_price.id, lookup_key=temp_lookup_key)
                print(f"Assigned temporary lookup_key '{temp_lookup_key}' to inactive price (ID: {inactive_price.id})")

            # Create the new price
            new_price = stripe.Price.create(
                product=product_id,
                unit_amount=expected_amount,
                currency=expected_currency,
                recurring={
                    'interval': expected_interval,
                    'interval_count': expected_interval_count,
                },
                lookup_key=product_config['lookup_key']
            )
            print(f"Created new price for '{product_config['name']}': {new_price.unit_amount/100} {new_price.currency}/{new_price.recurring.interval} (ID: {new_price.id})")
    
    print("Stripe products and prices setup complete!")

if __name__ == "__main__":
    setup_products() 