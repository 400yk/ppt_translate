"""
API endpoints for pricing information.
"""

from flask import Blueprint, jsonify, request
from config import PRICING, CURRENCY_RATES, LOCALE_TO_CURRENCY
import math

pricing_bp = Blueprint('pricing', __name__)

@pricing_bp.route('/api/pricing', methods=['GET'])
def get_pricing():
    """
    Get pricing information in the appropriate currency based on locale.
    Query parameters:
    - locale: The user's locale (e.g., 'en', 'zh')
    """
    # Get locale from query parameter, default to 'en'
    locale = request.args.get('locale', 'en')
    
    # Determine currency based on locale
    currency = LOCALE_TO_CURRENCY.get(locale, 'usd')
    
    # Get currency conversion rate
    rate = CURRENCY_RATES.get(currency, 1.0)
    
    # Format currency symbol based on currency code
    currency_symbols = {
        'usd': '$',
        'cny': '¥',
        'eur': '€',
        'gbp': '£',
        'jpy': '¥',
        'krw': '₩',
        'rub': '₽',
        'mxn': '$',
        'ars': '$',
        'esp': '€'
    }
    symbol = currency_symbols.get(currency, '$')
    
    # Calculate and format prices with appropriate precision
    monthly_price = PRICING['monthly']['usd'] * rate
    yearly_price_per_month = (PRICING['yearly']['usd'] / 12) * rate
    yearly_total = PRICING['yearly']['usd'] * rate
    
    # For JPY, KRW, and currencies with large denominators, round to whole numbers
    if currency in ['jpy', 'krw', 'ars']:
        monthly_price = math.ceil(monthly_price)
        yearly_price_per_month = math.ceil(yearly_price_per_month)
        yearly_total = math.ceil(yearly_total)
        decimal_places = 0
    else:
        decimal_places = 2
    
    # Format prices as strings with proper precision
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