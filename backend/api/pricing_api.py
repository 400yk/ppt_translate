"""
API endpoints for pricing information.
"""

from flask import Blueprint, jsonify, request
from config import PRICING, CURRENCY_RATES, LOCALE_TO_CURRENCY
from utils.payment_utils import format_currency_amount, get_currency_symbol, calculate_payment_amount

pricing_bp = Blueprint('pricing', __name__)

@pricing_bp.route('/api/pricing', methods=['GET'])
def get_pricing():
    """
    Get pricing information in the appropriate currency.
    Query parameters:
    - locale: The user's locale (e.g., 'en', 'zh')
    - currency: Optional override for currency (e.g., 'usd', 'cny')
    """
    # Get locale from query parameter, default to 'en'
    locale = request.args.get('locale', 'en')
    
    # Get currency from query parameter or determine based on locale
    currency_param = request.args.get('currency')
    
    if currency_param and currency_param.lower() in CURRENCY_RATES:
        # Use the provided currency if valid
        currency = currency_param.lower()
        # Map ESP to EUR
        if currency == 'esp':
            currency = 'eur'
    else:
        # Otherwise determine from locale
        currency = LOCALE_TO_CURRENCY.get(locale, 'usd')
    
    # Get currency symbol
    symbol = get_currency_symbol(currency)
    
    # Calculate prices using the utility function
    monthly_price = calculate_payment_amount(PRICING['monthly']['usd'], currency, CURRENCY_RATES)
    yearly_price_per_month = calculate_payment_amount(PRICING['yearly']['usd'] / 12, currency, CURRENCY_RATES)
    yearly_total = calculate_payment_amount(PRICING['yearly']['usd'], currency, CURRENCY_RATES)
    
    # Format prices as strings with proper precision
    # For JPY, KRW, and currencies with large denominators, use 0 decimal places
    if currency in ['jpy', 'krw', 'ars']:
        decimal_places = 0
    else:
        decimal_places = 2
    
    format_price = lambda price: f"{price:.{decimal_places}f}"
    
    response = {
        "currency": currency,
        "symbol": symbol,
        "monthly": {
            "price": format_price(monthly_price),
            "display": f"{symbol}{format_price(monthly_price)}",
            "discount": PRICING['monthly']['discount']
        },
        "yearly": {
            "price_per_month": format_price(yearly_price_per_month),
            "display_per_month": f"{symbol}{format_price(yearly_price_per_month)}",
            "total_price": format_price(yearly_total),
            "display_total": f"{symbol}{format_price(yearly_total)}",
            "discount": PRICING['yearly']['discount']
        }
    }
    
    return jsonify(response) 