"""
API endpoints for handling payment processing with Stripe.
"""

import os
import json
import time
import requests
import stripe
import logging
from flask import Blueprint, jsonify, request, redirect, url_for, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import User, PaymentTransaction, db
from services.user_service import get_membership_status, process_membership_purchase
from config import PRICING, CURRENCY_RATES, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, FLASK_API_URL, FRONTEND_URL
from utils.api_utils import error_response, success_response
from utils.payment_utils import (
    verify_alipay_signature, 
    generate_order_number, 
    parse_alipay_order_number,
    calculate_payment_amount,
    validate_payment_parameters,
    validate_payment_amount,
    get_expected_amount,
    create_signed_payment_data,
    verify_payment_signature,
    generate_payment_signature,
    verify_alipay_response_signature
)

payment_bp = Blueprint('payment', __name__)

# Set up logging
logger = logging.getLogger(__name__)

# Check if Stripe API key is available
if not STRIPE_SECRET_KEY:
    logger.error("STRIPE_SECRET_KEY is not set. Payment features will not work correctly.")

# Initialize Stripe with your secret key
stripe.api_key = STRIPE_SECRET_KEY

# Webhook signing secret for verifying webhook events
WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET

# Define your success and cancel URLs
SUCCESS_URL = STRIPE_SUCCESS_URL
CANCEL_URL = STRIPE_CANCEL_URL

# Stripe Price lookup keys
MONTHLY_PRICE_LOOKUP_KEY = 'Translide-monthly'
YEARLY_PRICE_LOOKUP_KEY = 'Translide-yearly'

# Flask API URL is imported from config

# Import pricing configuration
try:
    from config import PRICING, CURRENCY_RATES
except ImportError:
    # Fallback pricing if config is not available
    PRICING = {
        'monthly': {'usd': 9.99},
        'yearly': {'usd': 99.99}
    }
    CURRENCY_RATES = {'usd': 1.0}

########## Stripe endpoints ##########
@payment_bp.route('/api/payment/test', methods=['GET'])
def test_endpoint():
    """A simple endpoint to test if the payment API is accessible."""
    prices = stripe.Price.list(active=True, limit=10)
    price_data = [{
        'id': price.id,
        'lookup_key': getattr(price, 'lookup_key', None),
        'unit_amount': price.unit_amount,
        'currency': price.currency,
        'product': price.product
    } for price in prices.data]
    
    return jsonify({
        'status': 'success',
        'message': 'Payment API is working correctly',
        'prices': price_data
    })

@payment_bp.route('/api/payment/checkout-session', methods=['POST'])
@jwt_required()
def create_checkout_session():
    """
    Create a Stripe Checkout session for subscription payment.
    
    Request body:
    {
        "plan_type": "monthly" or "yearly",
        "currency": "usd", "cny", etc. (optional)
    }
    
    Returns:
    {
        "url": "https://checkout.stripe.com/..."
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Creating checkout session for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return error_response(
                'Request must be in JSON format',
                'errors.request_must_be_json',
                400
            )
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return error_response(
                'No data provided in request',
                'errors.no_data_provided',
                400
            )
            
        plan_type = data.get('plan_type')
        currency = data.get('currency', 'usd').lower()
        
        # Get custom URLs if provided
        success_url = data.get('success_url', SUCCESS_URL)
        cancel_url = data.get('cancel_url', CANCEL_URL)
        
        # Map ESP to EUR
        if currency == 'esp':
            currency = 'eur'
            
        print(f"Plan type: {plan_type}, Currency: {currency}")
        
        if not plan_type:
            print("Error: Missing plan_type")
            return error_response(
                'Plan type must be specified',
                'errors.plan_type_required',
                400
            )
            
        if plan_type not in ['monthly', 'yearly']:
            print(f"Error: Invalid plan type: {plan_type}")
            return error_response(
                'Plan type must be either "monthly" or "yearly"',
                'errors.plan_type_monthly_yearly',
                400
            )
        
        if currency not in CURRENCY_RATES:
            print(f"Error: Invalid currency: {currency}")
            currency = 'usd'  # Default to USD if currency is invalid
        
        # Get price based on the plan type and currency using lookup keys
        lookup_key = f"Translide-{plan_type}-{currency}"
        print(f"Looking up price with key: {lookup_key}")
        
        try:
            # List prices and print their lookup keys for debugging
            all_prices = stripe.Price.list(active=True, limit=20)
            print("Available active prices:")
            for price in all_prices.data:
                print(f"  Price ID: {price.id}, Lookup key: {price.get('lookup_key')}")
            
            # Now try to find the price with our lookup key
            prices = stripe.Price.list(
                lookup_keys=[lookup_key],
                active=True,
                expand=['data.product'],
                limit=1
            )
            
            if not prices.data:
                print(f"No price found with lookup key: {lookup_key}")
                
                # If we can't find the specific currency price, fall back to USD
                print(f"Falling back to USD price for {plan_type}")
                
                fallback_lookup_key = f"Translide-{plan_type}-usd"
                fallback_prices = stripe.Price.list(
                    lookup_keys=[fallback_lookup_key],
                    active=True,
                    expand=['data.product'],
                    limit=1
                )
                
                if not fallback_prices.data:
                    # Ultimate fallback to hardcoded price IDs
                    if plan_type == 'monthly':
                        price_id = 'price_1RLNnDQeLScrDDE3R51KUDEb'  # Use the ID printed during setup
                    else:
                        price_id = 'price_1RLNnFQeLScrDDE3cCuzt8tq'  # Use the ID printed during setup
                    
                    print(f"Using fallback hardcoded price ID: {price_id}")
                else:
                    price_id = fallback_prices.data[0].id
                    print(f"Using fallback USD price: {price_id}")
            else:
                price_id = prices.data[0].id
                print(f"Found price with lookup key: {price_id}")
        except Exception as e:
            print(f"Error retrieving price: {str(e)}")
            # Fallback to hardcoded price IDs as a last resort
            if plan_type == 'monthly':
                price_id = 'price_1RLNnDQeLScrDDE3R51KUDEb'  # Use the ID printed during setup
            else:
                price_id = 'price_1RLNnFQeLScrDDE3cCuzt8tq'  # Use the ID printed during setup
            
            print(f"Using fallback price ID after error: {price_id}")
        
        # Calculate amount for transaction record
        amount = calculate_payment_amount(PRICING[plan_type]['usd'], currency, CURRENCY_RATES)
        
        # Generate order number for tracking
        order_number = generate_order_number('stripe', plan_type, user.email)
        
        # Create PaymentTransaction record
        try:
            transaction = PaymentTransaction.create_pending_transaction(
                user_id=user.id,
                order_number=order_number,
                payment_method='stripe',
                amount=amount,
                currency=currency,
                plan_type=plan_type,
                metadata={
                    'stripe_price_id': price_id,
                    'user_email': user.email,
                    'username': username
                }
            )
            print(f"Created payment transaction: {transaction.order_number}")
        except Exception as e:
            print(f"Error creating payment transaction: {str(e)}")
            # Continue with checkout session creation even if transaction record fails
        
        # Create a new checkout session
        checkout_session = stripe.checkout.Session.create(
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            payment_method_types=['card'],
            mode='subscription',
            customer_email=user.email,  # Pre-fill customer email
            client_reference_id=username,  # Store username as reference ID
            metadata={
                'user_id': username,
                'plan_type': plan_type,
                'currency': currency,
                'order_number': order_number  # Include order number for webhook processing
            },
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
        )
        
        print(f"Created checkout session: {checkout_session.id}")
        
        # Return the session URL to the client
        return jsonify({
            'url': checkout_session.url,
            'order_number': order_number
        })
        
    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        return error_response(
            'Failed to create checkout session',
            'errors.failed_create_checkout',
            500
        )

@payment_bp.route('/api/payment/create-portal-session', methods=['POST'])
@jwt_required()
def create_portal_session():
    """
    Create a Stripe Customer Portal session for the user to manage their subscription.
    
    Request body:
    {
        "return_url": "URL to return to after portal session (optional)"
    }
    
    Returns:
    {
        "url": "https://billing.stripe.com/..."
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Creating customer portal session for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get return URL from request data, or use default
        data = request.get_json() or {}
        return_url = data.get('return_url', f'{FRONTEND_URL}/profile')
        
        # Get the customer ID from the user model
        # This assumes you store Stripe customer IDs in your user model
        customer_id = user.stripe_customer_id
        
        if not customer_id:
            print(f"No Stripe customer ID found for user: {username}")
            return error_response(
                'You do not have an active subscription to manage',
                'errors.no_active_subscription',
                400
            )
        
        # Create the portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        
        print(f"Created portal session: {portal_session.id}")
        
        # Return the portal URL to the client
        return jsonify({
            'url': portal_session.url
        })
        
    except Exception as e:
        print(f"Error creating portal session: {str(e)}")
        return error_response(
            'Failed to create portal session',
            'errors.failed_create_portal',
            500
        )

@payment_bp.route('/api/payment/create-payment-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
    """
    Create a new Stripe payment intent for the authenticated user.
    
    Request body:
    {
        "plan_type": "monthly" or "yearly",
        "currency": "usd", "cny", etc. (optional)
    }
    
    Returns:
    {
        "clientSecret": "pi_xxx_secret_xxx"
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Creating payment intent for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return error_response(
                'Request must be in JSON format',
                'errors.request_must_be_json',
                400
            )
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return error_response(
                'No data provided in request',
                'errors.no_data_provided',
                400
            )
            
        plan_type = data.get('plan_type')
        currency = data.get('currency', 'usd').lower()
        
        # Map ESP to EUR
        if currency == 'esp':
            currency = 'eur'
            
        print(f"Plan type: {plan_type}, Currency: {currency}")
        
        if not plan_type:
            print("Error: Missing plan_type")
            return error_response(
                'Plan type must be specified',
                'errors.plan_type_required',
                400
            )
            
        if plan_type not in ['monthly', 'yearly']:
            print(f"Error: Invalid plan type: {plan_type}")
            return error_response(
                'Plan type must be either "monthly" or "yearly"',
                'errors.plan_type_monthly_yearly',
                400
            )
        
        if currency not in CURRENCY_RATES:
            print(f"Error: Invalid currency: {currency}")
            currency = 'usd'  # Default to USD if currency is invalid
        
        # Get pricing based on plan type and currency
        from config import PRICING, CURRENCY_RATES
        
        # Calculate price in selected currency using utility function
        base_price = PRICING[plan_type]['usd']
        price_in_currency = calculate_payment_amount(base_price, currency, CURRENCY_RATES)
        
        # Convert to cents/smallest currency unit for Stripe
        if currency == 'jpy':  # JPY doesn't use cents
            amount = int(price_in_currency)
        else:
            amount = int(round(price_in_currency * 100, 0))
            
        print(f"Calculated amount: {amount} {currency}")
        
        # Create a new payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata={
                'user_id': username,
                'plan_type': plan_type,
                'currency': currency
            },
            description=f"{plan_type.capitalize()} subscription payment ({currency.upper()})"
        )
        
        print(f"Created payment intent: {payment_intent.id}")
        
        # Return the client secret to the client
        return jsonify({
            'clientSecret': payment_intent.client_secret
        })
        
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        return error_response(
            'Failed to create payment intent',
            'errors.failed_create_payment_intent',
            500
        )

@payment_bp.route('/api/membership/confirm', methods=['POST'])
@jwt_required()
def confirm_payment():
    """
    Confirm a successful payment and update the user's membership status.
    
    Request body:
    {
        "payment_intent_id": "pi_xxx",
        "plan_type": "monthly" or "yearly"
    }
    
    Returns membership status on success.
    """
    try:
        username = get_jwt_identity()
        print(f"Confirming payment for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return error_response(
                'Request must be in JSON format',
                'errors.request_must_be_json',
                400
            )
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return error_response(
                'No data provided in request',
                'errors.no_data_provided',
                400
            )
            
        payment_intent_id = data.get('payment_intent_id')
        plan_type = data.get('plan_type')
        
        if not payment_intent_id:
            print("Error: Missing payment_intent_id")
            return error_response(
                'Payment intent ID must be specified',
                'errors.missing_payment_intent_id',
                400
            )
            
        if not plan_type:
            print("Error: Missing plan_type")
            return error_response(
                'Plan type must be specified',
                'errors.plan_type_required',
                400
            )
        
        # Verify the payment intent with Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != 'succeeded':
            print(f"Payment intent not succeeded: {payment_intent.status}")
            return error_response(
                'Payment has not been completed',
                'errors.invalid_payment_intent',
                400
            )
        
        # Ensure the payment is for the correct user
        if payment_intent.metadata.get('user_id') != username:
            print(f"Payment intent user mismatch: {payment_intent.metadata.get('user_id')} != {username}")
            return error_response(
                'Payment does not belong to this user',
                'errors.invalid_payment_intent',
                403
            )
        
        # Update user membership status
        result = process_membership_purchase(username, plan_type)
        
        print(f"Membership updated: {result}")
        
        # Return the updated membership status
        return jsonify({
            'success': True,
            'message': f'Successfully purchased {plan_type} membership',
            'membership': result
        })
        
    except stripe.error.StripeError as e:
        print(f"Stripe error: {str(e)}")
        return error_response(
            'Stripe error',
            'errors.stripe_error',
            500
        )
    except Exception as e:
        print(f"Error confirming payment: {str(e)}")
        return error_response(
            'Failed to confirm payment',
            'errors.failed_confirm_payment',
            500
        )

@payment_bp.route('/api/payment/webhook', methods=['POST'])
def webhook():
    """
    Handle webhook events from Stripe.
    """
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        if WEBHOOK_SECRET:
            # Verify webhook signature and extract the event
            event = stripe.Webhook.construct_event(
                payload=payload, sig_header=sig_header, secret=WEBHOOK_SECRET
            )
            data = event['data']
        else:
            # If there is no webhook secret, just parse the payload directly (not recommended for production)
            data = json.loads(payload)['data']
            event = json.loads(payload)
        
        event_type = event['type']
        data_object = data['object']
        
        print(f"Received webhook: {event_type}")
        
        # Handle the event based on type
        if event_type == 'checkout.session.completed':
            # Payment is successful and the subscription is created
            session = data_object
            
            # Get user ID from client_reference_id or metadata
            username = session.get('client_reference_id') or session.get('metadata', {}).get('user_id')
            order_number = session.get('metadata', {}).get('order_number')
            
            if username:
                # Find the user
                user = User.query.filter_by(username=username).first()
                
                if user:
                    # Store the Stripe customer ID
                    customer_id = session.get('customer')
                    if customer_id and not user.stripe_customer_id:
                        user.stripe_customer_id = customer_id
                        db.session.commit()
                    
                    # Update PaymentTransaction record if order_number is available
                    if order_number:
                        transaction = PaymentTransaction.get_by_order_number(order_number)
                        if transaction:
                            transaction.mark_successful(
                                transaction_id=session.get('id'),
                                metadata={
                                    'stripe_session_id': session.get('id'),
                                    'stripe_customer_id': customer_id,
                                    'payment_intent_id': session.get('payment_intent'),
                                    'subscription_id': session.get('subscription')
                                }
                            )
                            print(f"Updated payment transaction: {order_number}")
                        else:
                            print(f"Payment transaction not found: {order_number}")
                    
                    # Update user membership status
                    plan_type = session.get('metadata', {}).get('plan_type')
                    if plan_type:
                        process_membership_purchase(username, plan_type)
                    
                    print(f"Successfully processed checkout.session.completed for user: {username}")
                else:
                    print(f"User not found for checkout.session.completed: {username}")
            else:
                print(f"No username found in checkout.session.completed")
                
        elif event_type == 'customer.subscription.created':
            # A subscription is created
            subscription = data_object
            customer_id = subscription.get('customer')
            
            # Find the user with this customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            
            if user:
                # Store the subscription ID if needed
                # user.stripe_subscription_id = subscription.get('id')
                # db.session.commit()
                print(f"Subscription created for user: {user.username}")
            else:
                print(f"User not found for customer.subscription.created: {customer_id}")
                
        elif event_type == 'customer.subscription.updated':
            # A subscription is updated
            subscription = data_object
            customer_id = subscription.get('customer')
            
            # Find the user with this customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            
            if user:
                # Update user subscription status if needed
                print(f"Subscription updated for user: {user.username}")
            else:
                print(f"User not found for customer.subscription.updated: {customer_id}")
                
        elif event_type == 'customer.subscription.deleted':
            # A subscription is canceled
            subscription = data_object
            customer_id = subscription.get('customer')
            
            # Find the user with this customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            
            if user:
                # Update user membership status to free or handle as needed
                print(f"Subscription canceled for user: {user.username}")
            else:
                print(f"User not found for customer.subscription.deleted: {customer_id}")
                
        elif event_type == 'invoice.payment_succeeded':
            # Invoice payment succeeded
            invoice = data_object
            customer_id = invoice.get('customer')
            
            # Find the user with this customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            
            if user:
                # Update user membership status with new renewal date if needed
                print(f"Invoice payment succeeded for user: {user.username}")
            else:
                print(f"User not found for invoice.payment_succeeded: {customer_id}")
                
        elif event_type == 'invoice.payment_failed':
            # Invoice payment failed
            invoice = data_object
            customer_id = invoice.get('customer')
            
            # Find the user with this customer ID
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            
            if user:
                # Handle failed payment as needed (notify user, etc.)
                print(f"Invoice payment failed for user: {user.username}")
            else:
                print(f"User not found for invoice.payment_failed: {customer_id}")
                
        # Return a 200 response to acknowledge receipt of the event
        return jsonify({'status': 'success'}), 200
        
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f"Webhook signature verification failed: {str(e)}")
        return error_response('Invalid signature', 'errors.invalid_signature', 400)
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return error_response('Webhook handling failed', 'errors.webhook_handling_failed', 500) 

########## End of Stripe endpoints ##########


########## Alipay endpoints ##########
def handle_alipay_success():
    """
    Handle Alipay payment success return.
    Note: The return URL does not include trade_status. This is only for user redirection.
    The actual payment verification should be done via the asynchronous notification.
    """
    try:
        # Get Alipay return parameters
        out_trade_no = request.args.get('out_trade_no')
        trade_no = request.args.get('trade_no')
        total_amount = request.args.get('total_amount')
        
        print(f"Alipay return parameters: {dict(request.args)}")
        print(f"Processing Alipay return: out_trade_no={out_trade_no}")
        
        if not out_trade_no:
            print("Error: No order number provided")
            return error_response('No order number provided', 'errors.no_order_number', 400)
        
        # URL decode the out_trade_no if needed (Flask should handle this automatically, but just in case)
        import urllib.parse
        if '%' in out_trade_no:
            out_trade_no = urllib.parse.unquote(out_trade_no)
            print(f"URL decoded out_trade_no: {out_trade_no}")
        
        # Note: We don't check trade_status here because it's not included in return URL
        # The actual payment status will be verified via the asynchronous notification
        
        # Parse order number to extract user and plan info
        order_info = parse_alipay_order_number(out_trade_no)
        if not order_info:
            print(f"Error: Invalid order number format: {out_trade_no}")
            return error_response('Invalid order number format', 'errors.invalid_order_number', 400)
        
        plan_type = order_info['plan_type']  # monthly or yearly
        user_email = order_info['user_email']    # user email
        
        print(f"Parsed order: plan_type={plan_type}, user_email={user_email}")
        
        # Find user by email
        user = User.query.filter_by(email=user_email).first()
        if not user:
            print(f"Error: User not found with email: {user_email}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        print(f"Found user: {user.username}")
        
        # For return URL, we don't update membership here
        # The actual membership update is done via the asynchronous notification
        # This is just for user redirection and display
        
        return jsonify({
            'success': True,
            'message': f'Alipay payment initiated. Please wait for confirmation.',
            'order_no': out_trade_no,
            'note': 'Payment verification is being processed asynchronously'
        })
        
    except Exception as e:
        print(f"Error handling Alipay success: {str(e)}")
        return error_response(
            'Failed to process Alipay payment',
            'errors.failed_process_alipay_payment',
            500
        )

@payment_bp.route('/api/payment/alipay/notify', methods=['POST'])
def alipay_notify():
    """
    Handle Alipay asynchronous notification (webhook).
    This endpoint receives POST data from Alipay with payment status updates.
    """
    try:
        # Get all POST data from Alipay
        notify_data = request.form.to_dict()
        print(f"Alipay notify data: {notify_data}")
        
        # Extract key parameters
        out_trade_no = notify_data.get('out_trade_no')
        trade_no = notify_data.get('trade_no')
        trade_status = notify_data.get('trade_status')
        total_amount = notify_data.get('total_amount')
        
        print(f"Processing Alipay notification: out_trade_no={out_trade_no}, trade_status={trade_status}")
        
        # Verify the notification signature
        if not verify_alipay_signature(notify_data):
            print("验签失败 (Signature verification failed)")
            return 'fail'
        
        print("验签成功 (Signature verification successful)")
        
        if not out_trade_no:
            print("Error: No order number in notification")
            return 'fail'
        
        # Parse order number to extract user and plan info
        order_info = parse_alipay_order_number(out_trade_no)
        if not order_info:
            print(f"Error: Invalid order number format: {out_trade_no}")
            return 'fail'
        
        plan_type = order_info['plan_type']  # monthly or yearly
        user_email = order_info['user_email']    # user email
        
        # Validate payment amount if total_amount is provided
        if total_amount:
            try:
                actual_amount = float(total_amount)
                expected_amount = get_expected_amount(plan_type, 'cny', PRICING, CURRENCY_RATES)
                
                if not validate_payment_amount(actual_amount, expected_amount):
                    print(f"Error: Payment amount mismatch. Expected: {expected_amount}, Actual: {actual_amount}")
                    return 'fail'
                    
            except (ValueError, TypeError) as e:
                print(f"Error: Invalid amount format: {total_amount}")
                return 'fail'
        
        # Find user by email
        user = User.query.filter_by(email=user_email).first()
        if not user:
            print(f"Error: User not found with email: {user_email}")
            return 'fail'
        
        # Find and update PaymentTransaction record
        transaction = PaymentTransaction.get_by_order_number(out_trade_no)
        if not transaction:
            print(f"Payment transaction not found: {out_trade_no}")
            # Create a new transaction record if not found (for backward compatibility)
            try:
                # Calculate amount from total_amount
                amount = float(total_amount) if total_amount else 0.0
                transaction = PaymentTransaction.create_pending_transaction(
                    user_id=user.id,
                    order_number=out_trade_no,
                    payment_method='alipay',
                    amount=amount,
                    currency='cny',  # Alipay typically uses CNY
                    plan_type=plan_type,
                    metadata={
                        'user_email': user_email,
                        'username': user.username
                    }
                )
                print(f"Created missing payment transaction: {out_trade_no}")
            except Exception as e:
                print(f"Error creating missing transaction: {str(e)}")
        
        # Handle different trade statuses
        if trade_status == 'TRADE_SUCCESS':
            # Payment successful - update membership
            result = process_membership_purchase(user.username, plan_type)
            print(f"Alipay payment successful for user {user.username}: {result}")
            
            # Update PaymentTransaction record
            if transaction:
                transaction.mark_successful(
                    transaction_id=trade_no,
                    metadata={
                        'alipay_trade_no': trade_no,
                        'total_amount': total_amount,
                        'trade_status': trade_status
                    }
                )
                print(f"Updated payment transaction: {out_trade_no}")
            
        elif trade_status == 'TRADE_CLOSED':
            # Payment failed or was closed
            print(f"Alipay payment closed for user {user.username}")
            
            # Update PaymentTransaction record
            if transaction:
                transaction.mark_failed(
                    error_message=f"Payment closed by Alipay: {trade_status}",
                    metadata={
                        'alipay_trade_no': trade_no,
                        'total_amount': total_amount,
                        'trade_status': trade_status
                    }
                )
                print(f"Marked payment transaction as failed: {out_trade_no}")
            
        elif trade_status == 'TRADE_FINISHED':
            # Payment finished (for some payment methods)
            result = process_membership_purchase(user.username, plan_type)
            print(f"Alipay payment finished for user {user.username}: {result}")
            
            # Update PaymentTransaction record
            if transaction:
                transaction.mark_successful(
                    transaction_id=trade_no,
                    metadata={
                        'alipay_trade_no': trade_no,
                        'total_amount': total_amount,
                        'trade_status': trade_status
                    }
                )
                print(f"Updated payment transaction: {out_trade_no}")
        
        # Return success to Alipay to stop asynchronous notifications
        # 验签成功返回 success,支付宝将停止此订单的异步推送否则将会一共推送8次
        return 'success'
        
    except Exception as e:
        print(f"Error handling Alipay notification: {str(e)}")
        return 'fail'

@payment_bp.route('/api/payment/alipay/signed-data', methods=['POST'])
@jwt_required()
def create_signed_alipay_payment():
    """
    Create signed Alipay payment data for secure payment processing.
    
    Request body:
    {
        "plan_type": "monthly" or "yearly",
        "currency": "cny" (optional, defaults to cny)
    }
    
    Returns:
    {
        "success": true,
        "payment_data": {
            "service": "translide",
            "payment_method": "alipay",
            "plan": "monthly",
            "currency": "cny",
            "price": "9.99",
            "user_id": "123",
            "user_email": "user@example.com",
            "timestamp": "1234567890",
            "return_url": "...",
            "cancel_url": "...",
            "signature": "abc123..."
        }
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Creating signed Alipay payment for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return error_response(
                'Request must be in JSON format',
                'errors.request_must_be_json',
                400
            )
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return error_response(
                'No data provided in request',
                'errors.no_data_provided',
                400
            )
            
        plan_type = data.get('plan_type')
        currency = data.get('currency', 'cny').lower()
        
        print(f"Plan type: {plan_type}, Currency: {currency}")
        
        if not plan_type:
            print("Error: Missing plan_type")
            return error_response(
                'Plan type must be specified',
                'errors.plan_type_required',
                400
            )
            
        if plan_type not in ['monthly', 'yearly']:
            print(f"Error: Invalid plan type: {plan_type}")
            return error_response(
                'Plan type must be either "monthly" or "yearly"',
                'errors.plan_type_monthly_yearly',
                400
            )
        
        # Create signed payment data
        secret_key = os.environ.get('ALIPAY_PHP_SIGN_SECRET_KEY', 'your-secret-key-change-this')
        return_url = os.environ.get('ALIPAY_PHP_RETURN_URL', 'https://long-agi.cn/pay/index.php')
        payment_data = create_signed_payment_data(
            plan_type=plan_type,
            currency=currency,
            user_email=user.email,
            user_id=str(user.id),
            pricing=PRICING,
            currency_rates=CURRENCY_RATES,
            secret_key=secret_key
        )
        
        # Create PaymentTransaction record
        try:
            amount = float(payment_data['price'])
            order_number = generate_order_number('alipay', plan_type, user.email)
            
            transaction = PaymentTransaction.create_pending_transaction(
                user_id=user.id,
                order_number=order_number,
                payment_method='alipay',
                amount=amount,
                currency=currency,
                plan_type=plan_type,
                metadata={
                    'user_email': user.email,
                    'username': username,
                    'signed_payment_data': payment_data
                }
            )
            print(f"Created Alipay payment transaction: {transaction.order_number}")
        except Exception as e:
            print(f"Error creating Alipay payment transaction: {str(e)}")
            return error_response(
                'Failed to create payment transaction',
                'errors.failed_create_transaction',
                500
            )
        
        return success_response(
            'Signed payment data created successfully',
            'payment.signed_data_created',
            {
                'payment_data': payment_data,
                'order_number': order_number,
                'return_url': return_url
            }
        )
        
    except Exception as e:
        print(f"Error creating signed Alipay payment: {str(e)}")
        return error_response(
            'Failed to create signed payment data',
            'errors.failed_create_signed_payment',
            500
        )

@payment_bp.route('/api/payment/alipay/create', methods=['POST'])
@jwt_required()
def create_alipay_payment():
    """
    Create an Alipay payment transaction record.
    
    Request body:
    {
        "plan_type": "monthly" or "yearly",
        "currency": "cny" (optional, defaults to cny)
    }
    
    Returns:
    {
        "order_number": "alipay_monthly_1234567890_user@email.com",
        "amount": 9.99,
        "currency": "cny"
    }
    """
    try:
        username = get_jwt_identity()
        print(f"Creating Alipay payment for user: {username}")
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"User not found: {username}")
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get request data
        if not request.is_json:
            print("Error: Request data is not JSON")
            return error_response(
                'Request must be in JSON format',
                'errors.request_must_be_json',
                400
            )
            
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data:
            print("Error: Empty request data")
            return error_response(
                'No data provided in request',
                'errors.no_data_provided',
                400
            )
            
        plan_type = data.get('plan_type')
        currency = data.get('currency', 'cny').lower()
        
        print(f"Plan type: {plan_type}, Currency: {currency}")
        
        if not plan_type:
            print("Error: Missing plan_type")
            return error_response(
                'Plan type must be specified',
                'errors.plan_type_required',
                400
            )
            
        if plan_type not in ['monthly', 'yearly']:
            print(f"Error: Invalid plan type: {plan_type}")
            return error_response(
                'Plan type must be either "monthly" or "yearly"',
                'errors.plan_type_monthly_yearly',
                400
            )
        
        # Calculate amount based on plan type and currency
        amount = calculate_payment_amount(PRICING[plan_type]['usd'], currency, CURRENCY_RATES)
        
        # Generate order number for Alipay
        order_number = generate_order_number('alipay', plan_type, user.email)
        
        # Create PaymentTransaction record
        try:
            transaction = PaymentTransaction.create_pending_transaction(
                user_id=user.id,
                order_number=order_number,
                payment_method='alipay',
                amount=amount,
                currency=currency,
                plan_type=plan_type,
                metadata={
                    'user_email': user.email,
                    'username': username
                }
            )
            print(f"Created Alipay payment transaction: {transaction.order_number}")
        except Exception as e:
            print(f"Error creating Alipay payment transaction: {str(e)}")
            return error_response(
                'Failed to create payment transaction',
                'errors.failed_create_transaction',
                500
            )
        
        # Return the order information for frontend to use with Alipay
        return jsonify({
            'order_number': order_number,
            'amount': float(amount),
            'currency': currency,
            'plan_type': plan_type,
            'user_email': user.email
        })
        
    except Exception as e:
        print(f"Error creating Alipay payment: {str(e)}")
        return error_response(
            'Failed to create Alipay payment',
            'errors.failed_create_alipay_payment',
            500
        )



@payment_bp.route('/api/payment/alipay/status', methods=['GET'])
def check_alipay_payment_status():
    """
    Check the status of an Alipay payment.
    This endpoint can be called by the frontend to check if payment was processed.
    """
    try:
        out_trade_no = request.args.get('out_trade_no')

        if not out_trade_no:
            return error_response('No order number provided', 'errors.no_order_number', 400)

        # Prefer authoritative source: PaymentTransaction row
        transaction = PaymentTransaction.get_by_order_number(out_trade_no)
        if transaction:
            # Retrieve membership info for context
            user = User.query.get(transaction.user_id)
            membership_status = get_membership_status(user) if user else {}

            return jsonify({
                'success': True,
                'payment_processed': transaction.status == 'success',
                'membership': membership_status,
                'order_no': out_trade_no
            })

        # Fallback for legacy orders where a transaction row might not exist
        order_info = parse_alipay_order_number(out_trade_no)
        if not order_info:
            return error_response('Invalid order number format', 'errors.invalid_order_number', 400)

        user_email = order_info['user_email']

        user = User.query.filter_by(email=user_email).first()
        if not user:
            return error_response('User not found', 'errors.user_not_found', 404)

        membership_status = get_membership_status(user)

        return jsonify({
            'success': True,
            'payment_processed': False,
            'membership': membership_status,
            'order_no': out_trade_no
        })
        
    except Exception as e:
        print(f"Error checking Alipay payment status: {str(e)}")
        return error_response(
            'Failed to check payment status',
            'errors.failed_check_payment_status',
            500
        ) 
    

@payment_bp.route('/api/payment/alipay/query', methods=['GET'])
def alipay_trade_query():
    """
    Fallback endpoint to query Alipay trade status via trusted PHP proxy.
    - Uses HMAC signature with shared secret to authorize the proxy call
    - Updates PaymentTransaction and membership based on query result
    """
    try:
        out_trade_no = request.args.get('out_trade_no')
        if not out_trade_no:
            return error_response('No order number provided', 'errors.no_order_number', 400)

        transaction = PaymentTransaction.get_by_order_number(out_trade_no)
        if not transaction:
            return error_response('Transaction not found', 'errors.transaction_not_found', 404)

        # If already successful, short-circuit
        if transaction.status == 'success':
            user = User.query.get(transaction.user_id)
            membership_status = get_membership_status(user) if user else {}
            return jsonify({
                'success': True,
                'payment_processed': True,
                'membership': membership_status,
                'order_no': out_trade_no
            })

        php_query_url = os.environ.get('ALIPAY_PHP_QUERY_URL', 'https://long-agi.cn/pay/query.php')
        secret_key = os.environ.get('ALIPAY_PHP_SIGN_SECRET_KEY', 'your-secret-key-change-this')

        payload = {
            'service': 'translide',
            'action': 'trade_query',
            'out_trade_no': out_trade_no,
            'timestamp': str(int(time.time()))
        }
        signature = generate_payment_signature(payload, secret_key)
        params = dict(payload)
        params['signature'] = signature

        resp = requests.get(php_query_url, params=params, timeout=8)
        if not resp.ok:
            return error_response('Alipay query failed', 'errors.alipay_query_failed', 502)

        raw_json = resp.text

        # Verify RSA2 signature on the raw JSON response (strongest integrity)
        if not verify_alipay_response_signature(raw_json, 'alipay_trade_query_response'):
            return error_response('Invalid Alipay response signature', 'errors.invalid_alipay_response_signature', 502)

        data_json = json.loads(raw_json)
        response_obj = data_json.get('alipay_trade_query_response', {})
        trade_status = response_obj.get('trade_status')
        trade_no = response_obj.get('trade_no')
        total_amount = response_obj.get('total_amount')
        alipay_code = response_obj.get('code')
        alipay_sub_code = response_obj.get('sub_code')
        alipay_sub_msg = response_obj.get('sub_msg')

        # Update transaction and membership accordingly
        user = User.query.get(transaction.user_id)

        # Handle Alipay response code failures (e.g., ACQ.TRADE_NOT_EXIST)
        if alipay_code and str(alipay_code) != '10000':
            # Mark as failed for definite not-exist/closed cases
            if alipay_sub_code in ('ACQ.TRADE_NOT_EXIST', 'ACQ.TRADE_CLOSED'):
                transaction.mark_failed(
                    error_message=f"Alipay query failed: {alipay_sub_code} ({alipay_sub_msg})",
                    metadata={
                        'alipay_trade_no': trade_no,
                        'total_amount': total_amount,
                        'trade_status': trade_status,
                        'queried_via': 'php_proxy',
                        'alipay_code': alipay_code,
                        'alipay_sub_code': alipay_sub_code,
                        'alipay_sub_msg': alipay_sub_msg
                    }
                )
            membership_status = get_membership_status(user) if user else {}
            return jsonify({
                'success': True,
                'payment_processed': False,
                'membership': membership_status,
                'order_no': out_trade_no,
                'trade_status': trade_status,
                'alipay_code': alipay_code,
                'alipay_sub_code': alipay_sub_code
            })

        if trade_status in ('TRADE_SUCCESS', 'TRADE_FINISHED'):
            if user:
                process_membership_purchase(user.username, transaction.plan_type)
            transaction.mark_successful(
                transaction_id=trade_no,
                metadata={
                    'alipay_trade_no': trade_no,
                    'total_amount': total_amount,
                    'trade_status': trade_status,
                    'queried_via': 'php_proxy'
                }
            )
            membership_status = get_membership_status(user) if user else {}
            return jsonify({
                'success': True,
                'payment_processed': True,
                'membership': membership_status,
                'order_no': out_trade_no
            })
        elif trade_status == 'TRADE_CLOSED':
            transaction.mark_failed(
                error_message='Payment closed (queried via PHP proxy)',
                metadata={
                    'alipay_trade_no': trade_no,
                    'total_amount': total_amount,
                    'trade_status': trade_status,
                    'queried_via': 'php_proxy'
                }
            )
            membership_status = get_membership_status(user) if user else {}
            return jsonify({
                'success': True,
                'payment_processed': False,
                'membership': membership_status,
                'order_no': out_trade_no,
                'trade_status': trade_status
            })

        # Unknown or pending status
        membership_status = get_membership_status(user) if user else {}
        return jsonify({
            'success': True,
            'payment_processed': False,
            'membership': membership_status,
            'order_no': out_trade_no,
            'trade_status': trade_status,
            'alipay_code': alipay_code,
            'alipay_sub_code': alipay_sub_code
        })
    except Exception as e:
        print(f"Error in alipay_trade_query: {str(e)}")
        return error_response('Failed to query Alipay trade', 'errors.failed_query_alipay', 500)

########## End of Alipay endpoints ##########

########## Common endpoints ##########
@payment_bp.route('/api/payment/success', methods=['GET'])
def payment_success():
    """
    Handle successful payment completion for both Stripe and Alipay.
    """
    session_id = request.args.get('session_id')
    payment_method = request.args.get('method', 'stripe')
    
    # Debug logging
    print(f"Payment success called with method: {payment_method}")
    print(f"All request args: {dict(request.args)}")
    
    # Handle Alipay payment return - check for various Alipay method patterns or Alipay-specific parameters
    if (payment_method and ('alipay' in payment_method.lower() or 'trade' in payment_method.lower())) or \
       request.args.get('out_trade_no') or request.args.get('trade_no'):
        print(f"Detected Alipay payment method: {payment_method}")
        return handle_alipay_success()
    
    # Handle Stripe payment return
    if not session_id:
        return error_response('No session ID provided', 'errors.no_session_id', 400)
    
    try:
        # Retrieve the session to get customer information
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Get user ID from client_reference_id or metadata
        username = checkout_session.client_reference_id or checkout_session.metadata.get('user_id')
        plan_type = checkout_session.metadata.get('plan_type')
        
        if not username:
            return error_response('Invalid session metadata', 'errors.invalid_session_metadata', 400)
        
        # Find the user
        user = User.query.filter_by(username=username).first()
        if not user:
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Store the Stripe customer ID if not already stored
        if checkout_session.customer and not user.stripe_customer_id:
            user.stripe_customer_id = checkout_session.customer
            db.session.commit()
        
        # Update user membership status
        if plan_type:
            result = process_membership_purchase(username, plan_type)
        else:
            result = get_membership_status(user)
        
        return jsonify({
            'success': True,
            'message': f'Successfully purchased membership',
            'membership': result
        })
        
    except Exception as e:
        print(f"Error handling payment success: {str(e)}")
        return error_response(
            'Failed to process successful payment',
            'errors.failed_process_payment',
            500
        )

@payment_bp.route('/api/payment/transactions', methods=['GET'])
@jwt_required()
def get_user_transactions():
    """
    Get payment transaction history for the authenticated user.
    
    Query parameters:
    - status: Filter by status (pending, success, failed, cancelled)
    - limit: Number of transactions to return (default: 10)
    
    Returns:
    {
        "transactions": [
            {
                "id": 1,
                "order_number": "stripe_monthly_1234567890_user@email.com",
                "payment_method": "stripe",
                "amount": 9.99,
                "currency": "usd",
                "plan_type": "monthly",
                "status": "success",
                "created_at": "2023-12-01T12:00:00Z",
                "processed_at": "2023-12-01T12:05:00Z"
            }
        ]
    }
    """
    try:
        username = get_jwt_identity()
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return error_response('User not found', 'errors.user_not_found', 404)
        
        # Get query parameters
        status = request.args.get('status')
        limit = request.args.get('limit', 10, type=int)
        
        # Get transactions for the user
        transactions = PaymentTransaction.get_user_transactions(
            user_id=user.id,
            status=status,
            limit=limit
        )
        
        # Format transaction data
        transaction_data = []
        for transaction in transactions:
            transaction_data.append({
                'id': transaction.id,
                'order_number': transaction.order_number,
                'payment_method': transaction.payment_method,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'plan_type': transaction.plan_type,
                'status': transaction.status,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'processed_at': transaction.processed_at.isoformat() if transaction.processed_at else None,
                'error_message': transaction.error_message,
                'transaction_id': transaction.transaction_id
            })
        
        return jsonify({
            'transactions': transaction_data,
            'total': len(transaction_data)
        })
        
    except Exception as e:
        print(f"Error getting user transactions: {str(e)}")
        return error_response(
            'Failed to get transaction history',
            'errors.failed_get_transactions',
            500
        )
