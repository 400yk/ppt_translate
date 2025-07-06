"""
API endpoints for handling payment processing with Stripe.
"""

import os
import json
import stripe
import logging
from flask import Blueprint, jsonify, request, redirect, url_for, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import User, db
from services.user_service import get_membership_status, process_membership_purchase
from config import PRICING, CURRENCY_RATES, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, FLASK_API_URL, FRONTEND_URL
from utils.api_utils import error_response, success_response

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
                'currency': currency
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
            'url': checkout_session.url
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
        
        # Calculate price in selected currency
        base_price = PRICING[plan_type]['usd']
        rate = CURRENCY_RATES.get(currency, 1.0)
        price_in_currency = base_price * rate
        
        # Convert to cents/smallest currency unit
        if currency == 'jpy':  # JPY doesn't use cents
            amount = int(round(price_in_currency, 0))
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

@payment_bp.route('/api/payment/success', methods=['GET'])
def payment_success():
    """
    Handle successful Checkout session completion.
    """
    session_id = request.args.get('session_id')
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
            
            if username:
                # Find the user
                user = User.query.filter_by(username=username).first()
                
                if user:
                    # Store the Stripe customer ID
                    customer_id = session.get('customer')
                    if customer_id and not user.stripe_customer_id:
                        user.stripe_customer_id = customer_id
                        db.session.commit()
                    
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