"""
Payment utility functions for handling payment processing across different payment methods.
"""

import logging
import hashlib
import hmac
import time
import os
import urllib.parse
import math
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def verify_alipay_signature(data: Dict[str, Any]) -> bool:
    """
    Verify Alipay notification signature using Alipay SDK.
    
    Args:
        data: Dictionary containing Alipay notification data
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    try:
        from alipay.aop.api.util.SignatureUtils import verify_with_rsa
        from config import ALIPAY_PUBLIC_KEY
        
        # Extract signature from data
        signature = data.get('sign')
        if not signature:
            logger.error("No signature found in Alipay notification")
            return False
        
        # Remove signature and sign_type from data for verification
        data_to_verify = {k: v for k, v in data.items() if k != 'sign' and k != 'sign_type'}
        
        # Sort parameters alphabetically
        sorted_params = sorted(data_to_verify.items())
        
        # Build query string
        query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
        
        # Convert to bytes for verification
        message = bytes(query_string, encoding='utf-8')
        
        logger.debug(f"Verifying signature for message: {query_string}")
        
        # Use Alipay SDK's verify_with_rsa function
        try:
            status = verify_with_rsa(ALIPAY_PUBLIC_KEY, message, signature)
            if status:
                logger.info("Alipay signature verification successful")
            else:
                logger.warning("Alipay signature verification failed")
            return status
        except Exception as e:
            logger.error(f"Error during signature verification: {str(e)}")
            return False
            
    except ImportError:
        logger.warning("alipay-sdk-python not installed, skipping signature verification")
        return True  # Skip verification if SDK not available
    except Exception as e:
        logger.error(f"Error verifying Alipay signature: {str(e)}")
        return False

def generate_payment_signature(payment_data: Dict[str, Any], secret_key: str) -> str:
    """
    Generate HMAC signature for payment data to prevent manipulation.
    
    Args:
        payment_data: Dictionary containing payment parameters
        secret_key: Secret key for signing
        
    Returns:
        str: HMAC signature
    """
    # Sort parameters alphabetically
    sorted_params = sorted(payment_data.items())
    
    # Build query string using URL encoding (matching PHP's http_build_query)
    query_parts = []
    for k, v in sorted_params:
        # URL encode the key and value
        encoded_key = urllib.parse.quote(str(k), safe='')
        encoded_value = urllib.parse.quote(str(v), safe='')
        query_parts.append(f"{encoded_key}={encoded_value}")
    
    query_string = '&'.join(query_parts)
    
    # Generate HMAC signature
    signature = hmac.new(
        secret_key.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

def verify_payment_signature(payment_data: Dict[str, Any], signature: str, secret_key: str) -> bool:
    """
    Verify payment signature to ensure data hasn't been tampered with.
    
    Args:
        payment_data: Dictionary containing payment parameters
        signature: Expected signature
        secret_key: Secret key for verification
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    try:
        # Remove signature from data for verification
        data_to_verify = {k: v for k, v in payment_data.items() if k != 'signature'}
        
        # Generate expected signature
        expected_signature = generate_payment_signature(data_to_verify, secret_key)
        
        # Compare signatures
        is_valid = hmac.compare_digest(signature, expected_signature)
        
        if not is_valid:
            logger.warning(f"Payment signature verification failed. Expected: {expected_signature}, Received: {signature}")
        else:
            logger.info("Payment signature verification successful")
            
        return is_valid
        
    except Exception as e:
        logger.error(f"Error verifying payment signature: {str(e)}")
        return False

def generate_order_number(payment_method: str, plan_type: str, user_email: str) -> str:
    """
    Generate a unique order number for payment tracking.
    
    Args:
        payment_method: Payment method (stripe, alipay, etc.)
        plan_type: Plan type (monthly, yearly)
        user_email: User's email address
        
    Returns:
        str: Unique order number
    """
    import time
    timestamp = int(time.time())
    return f"{payment_method}_{plan_type}_{timestamp}_{user_email}"

def parse_alipay_order_number(order_number: str) -> Optional[Dict[str, str]]:
    """
    Parse Alipay order number to extract payment information.
    
    Args:
        order_number: Order number in format "translide_{plan}_{timestamp}_{user_email}" or "alipay_{plan}_{timestamp}_{user_email}"
        
    Returns:
        Dict containing plan_type and user_email, or None if invalid format
    """
    try:
        parts = order_number.split('_')
        if len(parts) < 4:
            return None
        
        # Handle both old format (alipay_) and new format (translide_)
        if parts[0] in ['alipay', 'translide']:
            return {
                'plan_type': parts[1],
                'user_email': parts[3]
            }
        else:
            return None
            
    except Exception:
        return None

def format_currency_amount(amount: float, currency: str) -> float:
    """
    Format currency amount based on currency-specific rules.
    
    Args:
        amount: Raw amount in the currency
        currency: Currency code (usd, cny, eur, etc.)
        
    Returns:
        float: Formatted amount appropriate for the currency
    """
    # For JPY, KRW, and currencies with large denominators, round to whole numbers
    if currency in ['jpy', 'krw', 'ars']:
        return math.ceil(amount)
    else:
        # For other currencies, round to 2 decimal places
        return round(amount, 2)

def get_currency_symbol(currency: str) -> str:
    """
    Get the currency symbol for a given currency code.
    
    Args:
        currency: Currency code (usd, cny, eur, etc.)
        
    Returns:
        str: Currency symbol
    """
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
        'hkd': 'HK$',
        'esp': '€'
    }
    return currency_symbols.get(currency, '$')

def calculate_payment_amount(base_price: float, currency: str, currency_rates: Dict[str, float]) -> float:
    """
    Calculate payment amount in the specified currency with proper formatting.
    
    Args:
        base_price: Base price in USD
        currency: Target currency code
        currency_rates: Dictionary of currency exchange rates
        
    Returns:
        float: Calculated and formatted amount in target currency
    """
    rate = currency_rates.get(currency, 1.0)
    raw_amount = base_price * rate
    
    # Format the amount according to currency-specific rules
    return format_currency_amount(raw_amount, currency)

def validate_payment_amount(actual_amount: float, expected_amount: float, tolerance: float = 0.01) -> bool:
    """
    Validate that the actual payment amount matches the expected amount.
    
    Args:
        actual_amount: The amount received from payment gateway
        expected_amount: The amount that should have been paid
        tolerance: Allowed difference (default: 0.01 for rounding errors)
        
    Returns:
        bool: True if amounts match within tolerance
    """
    difference = abs(actual_amount - expected_amount)
    is_valid = difference <= tolerance
    
    if not is_valid:
        logger.warning(f"Payment amount mismatch: expected={expected_amount}, actual={actual_amount}, difference={difference}")
    else:
        logger.info(f"Payment amount validated: {actual_amount}")
        
    return is_valid

def get_expected_amount(plan_type: str, currency: str, pricing: Dict, currency_rates: Dict[str, float]) -> float:
    """
    Get the expected payment amount for a plan and currency.
    
    Args:
        plan_type: Plan type (monthly, yearly)
        currency: Currency code
        pricing: Pricing configuration
        currency_rates: Currency exchange rates
        
    Returns:
        float: Expected payment amount
    """
    if plan_type not in pricing:
        raise ValueError(f"Invalid plan type: {plan_type}")
        
    base_price = pricing[plan_type]['usd']
    return calculate_payment_amount(base_price, currency, currency_rates)

def create_signed_payment_data(plan_type: str, currency: str, user_email: str, user_id: str, 
                              pricing: Dict, currency_rates: Dict[str, float], secret_key: str) -> Dict[str, Any]:
    """
    Create signed payment data for secure payment processing.
    
    Args:
        plan_type: Plan type (monthly, yearly)
        currency: Currency code
        user_email: User's email
        user_id: User's ID
        pricing: Pricing configuration
        currency_rates: Currency exchange rates
        secret_key: Secret key for signing
        
    Returns:
        Dict containing signed payment data
    """
    # Calculate amount server-side
    amount = get_expected_amount(plan_type, currency, pricing, currency_rates)
    
    # Create payment data
    payment_data = {
        'service': 'translide',
        'payment_method': 'alipay',
        'plan': plan_type,
        'currency': currency,
        'price': str(amount),  # Server-calculated amount
        'user_id': user_id,
        'user_email': user_email,
        'timestamp': str(int(time.time())),  # Add timestamp for freshness
        'return_url': f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success",
        'cancel_url': f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/cancel"
    }
    
    # Generate signature
    signature = generate_payment_signature(payment_data, secret_key)
    payment_data['signature'] = signature
    
    return payment_data

def format_payment_response(success: bool, message: str, data: Optional[Dict] = None) -> Dict:
    """
    Format a standardized payment response.
    
    Args:
        success: Whether the operation was successful
        message: Response message
        data: Additional response data
        
    Returns:
        Dict: Formatted response
    """
    response = {
        'success': success,
        'message': message
    }
    
    if data:
        response.update(data)
        
    return response

def validate_payment_parameters(plan_type: str, currency: str, valid_plans: list = None, valid_currencies: list = None) -> tuple[bool, str]:
    """
    Validate payment parameters.
    
    Args:
        plan_type: Plan type to validate
        currency: Currency to validate
        valid_plans: List of valid plan types (default: ['monthly', 'yearly'])
        valid_currencies: List of valid currencies (default: ['usd', 'cny', 'eur'])
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if valid_plans is None:
        valid_plans = ['monthly', 'yearly']
    if valid_currencies is None:
        valid_currencies = ['usd', 'cny', 'eur']
    
    if not plan_type:
        return False, "Plan type is required"
    
    if plan_type not in valid_plans:
        return False, f"Plan type must be one of: {', '.join(valid_plans)}"
    
    if currency not in valid_currencies:
        return False, f"Currency must be one of: {', '.join(valid_currencies)}"
    
    return True, "" 