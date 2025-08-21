"""
API endpoints for admin dashboard functionality.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from db.models import db, User, TranslationRecord, Referral, GuestTranslation, Feedback
from db.models import PaymentTransaction
from datetime import datetime, timedelta
import sqlalchemy as sa
from sqlalchemy import func
import os
import re
from db.models import InvitationCode

admin_bp = Blueprint('admin', __name__)

def check_admin_access():
    """Check if the current user has admin access."""
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not user.is_administrator():
        return jsonify({'error': 'Admin access required'}), 403
    
    return None  # No error, user is admin

@admin_bp.route('/api/admin/analytics/users', methods=['GET'])
@jwt_required()
def get_user_analytics():
    """Get user analytics for admin dashboard."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get date range from query parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Total users
        total_users = User.query.count()
        
        # New users in different time periods
        new_users_today = User.query.filter(
            User.created_at >= end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        new_users_week = User.query.filter(
            User.created_at >= end_date - timedelta(days=7)
        ).count()
        
        new_users_month = User.query.filter(
            User.created_at >= end_date - timedelta(days=30)
        ).count()
        
        # Users by membership status
        paid_users = User.query.filter_by(is_paid_user=True).count()
        free_users = total_users - paid_users
        
        # Detailed membership breakdown
        stripe_users = User.query.filter(User.stripe_customer_id.isnot(None)).count()
        invitation_users = User.query.filter(User.invitation_code_id.isnot(None)).count()
        referral_users = User.query.filter(User.referred_by_code.isnot(None)).count()
        bonus_users = User.query.filter(User.bonus_membership_days > 0).count()
        
        # Users by email verification status
        verified_users = User.query.filter_by(is_email_verified=True).count()
        unverified_users = total_users - verified_users
        
        # Users by registration source
        invitation_users = User.query.filter(User.invitation_code_id.isnot(None)).count()
        referral_users = User.query.filter(User.referred_by_code.isnot(None)).count()
        google_users = User.query.filter(User.google_id.isnot(None)).count()
        regular_users = total_users - invitation_users - referral_users - google_users
        
        # User growth over time (daily for the last 30 days)
        daily_growth = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.created_at >= start_date
        ).group_by(
            func.date(User.created_at)
        ).order_by(
            func.date(User.created_at)
        ).all()
        
        return jsonify({
            'total_users': total_users,
            'new_users': {
                'today': new_users_today,
                'this_week': new_users_week,
                'this_month': new_users_month
            },
            'membership_status': {
                'paid': paid_users,
                'free': free_users
            },
            'membership_breakdown': {
                'stripe': stripe_users,
                'invitation': invitation_users,
                'referral': referral_users,
                'bonus': bonus_users
            },
            'email_verification': {
                'verified': verified_users,
                'unverified': unverified_users
            },
            'registration_source': {
                'invitation': invitation_users,
                'referral': referral_users,
                'google': google_users,
                'regular': regular_users
            },
            'growth_data': [
                {
                    'date': str(day.date),
                    'count': day.count
                } for day in daily_growth
            ],
            'user_retention_data': [
                {
                    'date': str(day.date),
                    'new_users': day.count,
                    'active_users': User.query.filter(
                        User.last_login >= day.date
                    ).count()
                } for day in daily_growth[-7:]  # Last 7 days
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching user analytics: {str(e)}'}), 500

@admin_bp.route('/api/admin/analytics/translations', methods=['GET'])
@jwt_required()
def get_translation_analytics():
    """Get translation analytics for admin dashboard."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get date range from query parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Total translations
        total_translations = TranslationRecord.query.count()
        
        # Translations by status
        successful_translations = TranslationRecord.query.filter_by(status='success').count()
        failed_translations = TranslationRecord.query.filter_by(status='failed').count()
        processing_translations = TranslationRecord.query.filter_by(status='processing').count()
        
        # Success rate
        success_rate = (successful_translations / total_translations * 100) if total_translations > 0 else 0
        
        # Translations in different time periods
        translations_today = TranslationRecord.query.filter(
            TranslationRecord.created_at >= end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        translations_week = TranslationRecord.query.filter(
            TranslationRecord.created_at >= end_date - timedelta(days=7)
        ).count()
        
        translations_month = TranslationRecord.query.filter(
            TranslationRecord.created_at >= end_date - timedelta(days=30)
        ).count()
        
        # Guest translations
        guest_translations = GuestTranslation.query.count()
        guest_translations_today = GuestTranslation.query.filter(
            GuestTranslation.created_at >= end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        # Character usage statistics
        total_characters = db.session.query(func.sum(TranslationRecord.character_count)).scalar() or 0
        avg_characters = db.session.query(func.avg(TranslationRecord.character_count)).scalar() or 0
        
        # Average processing time
        avg_processing_time = db.session.query(
            func.avg(TranslationRecord.processing_time)
        ).filter(
            TranslationRecord.processing_time.isnot(None)
        ).scalar() or 0
        
        # Translations by language pair
        language_pairs = db.session.query(
            TranslationRecord.source_language,
            TranslationRecord.target_language,
            func.count(TranslationRecord.id).label('count')
        ).group_by(
            TranslationRecord.source_language,
            TranslationRecord.target_language
        ).order_by(
            func.count(TranslationRecord.id).desc()
        ).limit(10).all()
        
        # Translation growth over time
        daily_translations = db.session.query(
            func.date(TranslationRecord.created_at).label('date'),
            func.count(TranslationRecord.id).label('count')
        ).filter(
            TranslationRecord.created_at >= start_date
        ).group_by(
            func.date(TranslationRecord.created_at)
        ).order_by(
            func.date(TranslationRecord.created_at)
        ).all()
        
        # Additional analytics for charts
        # Translation volume over time with success/failure breakdown
        volume_data = db.session.query(
            func.date(TranslationRecord.created_at).label('date'),
            func.count(sa.case((TranslationRecord.status == 'success', 1))).label('successful'),
            func.count(sa.case((TranslationRecord.status == 'failed', 1))).label('failed')
        ).filter(
            TranslationRecord.created_at >= start_date
        ).group_by(
            func.date(TranslationRecord.created_at)
        ).order_by(
            func.date(TranslationRecord.created_at)
        ).all()
        
        # Success rate trend over time
        success_rate_data = db.session.query(
            func.date(TranslationRecord.created_at).label('date'),
            func.avg(sa.case((TranslationRecord.status == 'success', 100), else_=0)).label('success_rate')
        ).filter(
            TranslationRecord.created_at >= start_date
        ).group_by(
            func.date(TranslationRecord.created_at)
        ).order_by(
            func.date(TranslationRecord.created_at)
        ).all()
        
        # Processing time trend
        processing_time_data = db.session.query(
            func.date(TranslationRecord.created_at).label('date'),
            func.avg(TranslationRecord.processing_time).label('avg_time')
        ).filter(
            TranslationRecord.created_at >= start_date,
            TranslationRecord.processing_time.isnot(None)
        ).group_by(
            func.date(TranslationRecord.created_at)
        ).order_by(
            func.date(TranslationRecord.created_at)
        ).all()
        
        # Error distribution
        error_distribution = db.session.query(
            TranslationRecord.error_message,
            func.count(TranslationRecord.id).label('count')
        ).filter(
            TranslationRecord.status == 'failed',
            TranslationRecord.error_message.isnot(None)
        ).group_by(
            TranslationRecord.error_message
        ).order_by(
            func.count(TranslationRecord.id).desc()
        ).limit(5).all()
        
        # Peak usage hours
        peak_usage_hours = db.session.query(
            func.extract('hour', TranslationRecord.created_at).label('hour'),
            func.count(TranslationRecord.id).label('translations')
        ).filter(
            TranslationRecord.created_at >= start_date
        ).group_by(
            func.extract('hour', TranslationRecord.created_at)
        ).order_by(
            func.extract('hour', TranslationRecord.created_at)
        ).all()
        
        # File size distribution (character count ranges)
        file_size_ranges = [
            (0, 1000, '0-1K'),
            (1000, 5000, '1K-5K'),
            (5000, 10000, '5K-10K'),
            (10000, 50000, '10K-50K'),
            (50000, 100000, '50K-100K'),
            (100000, None, '100K+')
        ]
        
        file_size_distribution = []
        for min_chars, max_chars, label in file_size_ranges:
            if max_chars:
                count = TranslationRecord.query.filter(
                    TranslationRecord.character_count >= min_chars,
                    TranslationRecord.character_count < max_chars
                ).count()
            else:
                count = TranslationRecord.query.filter(
                    TranslationRecord.character_count >= min_chars
                ).count()
            file_size_distribution.append({
                'size_range': label,
                'count': count
            })
        
        return jsonify({
            'total_translations': total_translations,
            'status_breakdown': {
                'successful': successful_translations,
                'failed': failed_translations,
                'processing': processing_translations
            },
            'success_rate': round(success_rate, 2),
            'translations_by_period': {
                'today': translations_today,
                'this_week': translations_week,
                'this_month': translations_month
            },
            'guest_translations': {
                'total': guest_translations,
                'today': guest_translations_today
            },
            'character_usage': {
                'total': total_characters,
                'average': round(avg_characters, 2)
            },
            'performance': {
                'average_processing_time': round(avg_processing_time, 2)
            },
            'top_language_pairs': [
                {
                    'source': pair.source_language,
                    'target': pair.target_language,
                    'count': pair.count
                } for pair in language_pairs
            ],
            'growth_data': [
                {
                    'date': str(day.date),
                    'count': day.count
                } for day in daily_translations
            ],
            'volume_data': [
                {
                    'date': str(day.date),
                    'successful': day.successful,
                    'failed': day.failed
                } for day in volume_data
            ],
            'success_rate_data': [
                {
                    'date': str(day.date),
                    'success_rate': round(float(day.success_rate), 2)
                } for day in success_rate_data
            ],
            'processing_time_data': [
                {
                    'date': str(day.date),
                    'avg_time': round(float(day.avg_time), 2)
                } for day in processing_time_data
            ],
            'error_distribution': [
                {
                    'name': day.error_message[:50] + '...' if len(day.error_message) > 50 else day.error_message,
                    'count': day.count
                } for day in error_distribution
            ],
            'peak_usage_hours': [
                {
                    'hour': f"{int(day.hour):02d}:00",
                    'translations': day.translations
                } for day in peak_usage_hours
            ],
            'file_size_distribution': file_size_distribution,
            'language_pairs': [
                {
                    'pair': f"{pair.source_language} → {pair.target_language}",
                    'count': pair.count
                } for pair in language_pairs
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching translation analytics: {str(e)}'}), 500

@admin_bp.route('/api/admin/analytics/referrals', methods=['GET'])
@jwt_required()
def get_referral_analytics():
    """Get referral analytics for admin dashboard."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get date range from query parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Total referrals
        total_referrals = Referral.query.count()
        
        # Referrals by status
        pending_referrals = Referral.query.filter_by(status='pending').count()
        completed_referrals = Referral.query.filter_by(status='completed').count()
        expired_referrals = Referral.query.filter_by(status='expired').count()
        
        # Conversion rate
        conversion_rate = (completed_referrals / total_referrals * 100) if total_referrals > 0 else 0
        
        # Referrals in different time periods
        referrals_today = Referral.query.filter(
            Referral.created_at >= end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        referrals_week = Referral.query.filter(
            Referral.created_at >= end_date - timedelta(days=7)
        ).count()
        
        referrals_month = Referral.query.filter(
            Referral.created_at >= end_date - timedelta(days=30)
        ).count()
        
        # Top referrers
        top_referrers = db.session.query(
            User.username,
            func.count(Referral.id).label('total_referrals'),
            func.count(sa.case((Referral.status == 'completed', 1))).label('successful_referrals')
        ).join(
            Referral, User.id == Referral.referrer_user_id
        ).group_by(
            User.id, User.username
        ).order_by(
            func.count(sa.case((Referral.status == 'completed', 1))).desc()
        ).limit(10).all()
        
        # Referral growth over time
        daily_referrals = db.session.query(
            func.date(Referral.created_at).label('date'),
            func.count(Referral.id).label('count')
        ).filter(
            Referral.created_at >= start_date
        ).group_by(
            func.date(Referral.created_at)
        ).order_by(
            func.date(Referral.created_at)
        ).all()
        
        # Additional analytics for charts
        # Referral performance over time
        performance_data = db.session.query(
            func.date(Referral.created_at).label('date'),
            func.count(Referral.id).label('created'),
            func.count(sa.case((Referral.status == 'completed', 1))).label('completed')
        ).filter(
            Referral.created_at >= start_date
        ).group_by(
            func.date(Referral.created_at)
        ).order_by(
            func.date(Referral.created_at)
        ).all()
        
        # Conversion rate trend
        conversion_rate_data = db.session.query(
            func.date(Referral.created_at).label('date'),
            func.avg(sa.case((Referral.status == 'completed', 100), else_=0)).label('conversion_rate')
        ).filter(
            Referral.created_at >= start_date
        ).group_by(
            func.date(Referral.created_at)
        ).order_by(
            func.date(Referral.created_at)
        ).all()
        
        return jsonify({
            'total_referrals': total_referrals,
            'status_breakdown': {
                'pending': pending_referrals,
                'completed': completed_referrals,
                'expired': expired_referrals
            },
            'conversion_rate': round(conversion_rate, 2),
            'referrals_by_period': {
                'today': referrals_today,
                'this_week': referrals_week,
                'this_month': referrals_month
            },
            'top_referrers': [
                {
                    'username': referrer.username,
                    'referrals': referrer.total_referrals
                } for referrer in top_referrers
            ],
            'growth_data': [
                {
                    'date': str(day.date),
                    'count': day.count
                } for day in daily_referrals
            ],
            'performance_data': [
                {
                    'date': str(day.date),
                    'created': day.created,
                    'completed': day.completed
                } for day in performance_data
            ],
            'conversion_rate_data': [
                {
                    'date': str(day.date),
                    'conversion_rate': round(float(day.conversion_rate), 2)
                } for day in conversion_rate_data
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching referral analytics: {str(e)}'}), 500

@admin_bp.route('/api/admin/analytics/revenue', methods=['GET'])
@jwt_required()
def get_revenue_analytics():
    """Get revenue analytics for admin dashboard."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get date range from query parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # For now, we'll calculate revenue based on Stripe customers and pricing
        # In a real implementation, you'd want to track actual payments in a separate table
        from config import PRICING, CURRENCY_RATES
        
        # Get all users with Stripe customer IDs (paid users)
        stripe_users = User.query.filter(User.stripe_customer_id.isnot(None)).all()
        
        # Calculate revenue metrics
        total_paid_users = len(stripe_users)
        
        # Estimate revenue based on pricing (this is simplified - in production you'd track actual payments)
        monthly_price_usd = PRICING.get('monthly', {}).get('usd', 0)
        yearly_price_usd = PRICING.get('yearly', {}).get('usd', 0)
        
        # Assume 70% monthly, 30% yearly subscriptions (this would be tracked in real implementation)
        estimated_monthly_subscribers = int(total_paid_users * 0.7)
        estimated_yearly_subscribers = total_paid_users - estimated_monthly_subscribers
        
        # Calculate estimated revenue
        monthly_revenue_usd = estimated_monthly_subscribers * monthly_price_usd
        yearly_revenue_usd = estimated_yearly_subscribers * yearly_price_usd
        total_revenue_usd = monthly_revenue_usd + yearly_revenue_usd
        
        # Monthly Recurring Revenue (MRR)
        mrr_usd = estimated_monthly_subscribers * monthly_price_usd + (estimated_yearly_subscribers * yearly_price_usd / 12)
        
        # Annual Recurring Revenue (ARR)
        arr_usd = mrr_usd * 12
        
        # Average Revenue Per User (ARPU)
        arpu_usd = total_revenue_usd / total_paid_users if total_paid_users > 0 else 0
        
        # Revenue by period
        # For now, we'll estimate based on user growth
        new_paid_users_today = User.query.filter(
            User.stripe_customer_id.isnot(None),
            User.created_at >= end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        new_paid_users_week = User.query.filter(
            User.stripe_customer_id.isnot(None),
            User.created_at >= end_date - timedelta(days=7)
        ).count()
        
        new_paid_users_month = User.query.filter(
            User.stripe_customer_id.isnot(None),
            User.created_at >= end_date - timedelta(days=30)
        ).count()
        
        # Estimate revenue for these periods
        revenue_today = new_paid_users_today * arpu_usd
        revenue_week = new_paid_users_week * arpu_usd
        revenue_month = new_paid_users_month * arpu_usd
        
        # Revenue growth over time (based on user growth)
        daily_revenue_data = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('new_users')
        ).filter(
            User.stripe_customer_id.isnot(None),
            User.created_at >= start_date
        ).group_by(
            func.date(User.created_at)
        ).order_by(
            func.date(User.created_at)
        ).all()
        
        # For now, we'll assume all revenue is in USD
        from utils.payment_utils import calculate_payment_amount
        
        revenue_by_currency = {
            'USD': total_revenue_usd,
            'EUR': calculate_payment_amount(total_revenue_usd, 'eur', CURRENCY_RATES),
            'GBP': calculate_payment_amount(total_revenue_usd, 'gbp', CURRENCY_RATES)
        }
        
        # Revenue by subscription plan
        revenue_by_plan = {
            'monthly': monthly_revenue_usd,
            'yearly': yearly_revenue_usd
        }
        
        # Customer Lifetime Value (CLV) - simplified calculation
        # In production, this would be based on actual payment history
        clv_usd = arpu_usd * 12  # Assume 12 months average subscription
        
        return jsonify({
            'total_revenue_usd': round(total_revenue_usd, 2),
            'mrr_usd': round(mrr_usd, 2),
            'arr_usd': round(arr_usd, 2),
            'arpu_usd': round(arpu_usd, 2),
            'clv_usd': round(clv_usd, 2),
            'total_paid_users': total_paid_users,
            'revenue_by_period': {
                'today': round(revenue_today, 2),
                'this_week': round(revenue_week, 2),
                'this_month': round(revenue_month, 2)
            },
            'revenue_by_currency': revenue_by_currency,
            'revenue_by_plan': revenue_by_plan,
            'subscription_breakdown': {
                'monthly_subscribers': estimated_monthly_subscribers,
                'yearly_subscribers': estimated_yearly_subscribers
            },
            'growth_data': [
                {
                    'date': str(day.date),
                    'revenue': round(day.new_users * arpu_usd, 2)
                } for day in daily_revenue_data
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching revenue analytics: {str(e)}'}), 500

@admin_bp.route('/api/admin/translations/logs', methods=['GET'])
@jwt_required()
def get_translation_logs():
    """Get translation logs with filtering and pagination."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        # Build query
        query = TranslationRecord.query
        
        # Apply filters
        if status:
            query = query.filter_by(status=status)
        if user_id:
            query = query.filter_by(user_id=user_id)
        if start_date:
            query = query.filter(TranslationRecord.created_at >= start_date)
        if end_date:
            query = query.filter(TranslationRecord.created_at <= end_date)
        if search:
            query = query.filter(
                TranslationRecord.filename.ilike(f'%{search}%')
            )
        
        # Order by most recent first
        query = query.order_by(TranslationRecord.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        logs = []
        for record in pagination.items:
            user = User.query.get(record.user_id) if record.user_id else None
            logs.append({
                'id': record.id,
                'filename': record.filename,
                'status': record.status,
                'source_language': record.source_language,
                'target_language': record.target_language,
                'character_count': record.character_count,
                'processing_time': record.processing_time,
                'error_message': record.error_message,
                'started_at': record.started_at.isoformat() if record.started_at else None,
                'completed_at': record.completed_at.isoformat() if record.completed_at else None,
                'created_at': record.created_at.isoformat(),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                } if user else None
            })
        
        return jsonify({
            'logs': logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching translation logs: {str(e)}'}), 500

@admin_bp.route('/api/admin/translations/logs/<int:translation_id>', methods=['GET'])
@jwt_required()
def get_translation_log_detail(translation_id):
    """Get detailed log for a specific translation."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        record = TranslationRecord.query.get_or_404(translation_id)
        user = User.query.get(record.user_id) if record.user_id else None
        
        return jsonify({
            'id': record.id,
            'filename': record.filename,
            'status': record.status,
            'source_language': record.source_language,
            'target_language': record.target_language,
            'character_count': record.character_count,
            'processing_time': record.processing_time,
            'error_message': record.error_message,
            'started_at': record.started_at.isoformat() if record.started_at else None,
            'completed_at': record.completed_at.isoformat() if record.completed_at else None,
            'created_at': record.created_at.isoformat(),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            } if user else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching translation log: {str(e)}'}), 500

@admin_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get paginated list of users with filtering and search."""
    # Check admin access
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        membership_status = request.args.get('membership_status', '')
        email_verified = request.args.get('email_verified', '')
        admin_status = request.args.get('admin_status', '')
        
        # Build query
        query = User.query
        
        # Apply filters
        if search:
            query = query.filter(
                db.or_(
                    User.username.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )
        
        if membership_status and membership_status != 'all':
            if membership_status == 'paid':
                query = query.filter(User.is_paid_user == True)
            elif membership_status == 'stripe':
                query = query.filter(User.stripe_customer_id.isnot(None))
            elif membership_status == 'invitation':
                query = query.filter(User.invitation_code_id.isnot(None))
            elif membership_status == 'referral':
                query = query.filter(User.referred_by_code.isnot(None))
            elif membership_status == 'bonus':
                query = query.filter(User.bonus_membership_days > 0)
            elif membership_status == 'free':
                query = query.filter(User.is_paid_user == False)
        
        if email_verified and email_verified != 'all':
            if email_verified == 'verified':
                query = query.filter(User.is_email_verified == True)
            elif email_verified == 'unverified':
                query = query.filter(User.is_email_verified == False)
        
        if admin_status and admin_status != 'all':
            if admin_status == 'admin':
                query = query.filter(User.is_admin == True)
            elif admin_status == 'user':
                query = query.filter(User.is_admin == False)
        
        # Get paginated results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Prepare user data
        users = []
        for user in pagination.items:
            # Get user statistics
            translation_count = TranslationRecord.query.filter_by(user_id=user.id).count()
            total_characters = db.session.query(func.sum(TranslationRecord.character_count)).filter_by(user_id=user.id).scalar() or 0
            
            # Get detailed membership information
            membership_sources = user.get_membership_source_summary()
            membership_status = 'free'
            membership_type = 'Free'
            
            if 'payment' in membership_sources:
                membership_status = 'paid'
                membership_type = 'Stripe Payment'
            elif 'invitation_code' in membership_sources:
                membership_status = 'paid'
                membership_type = 'Invitation Code'
            elif 'referral' in membership_sources:
                membership_status = 'paid'
                membership_type = 'Referral Bonus'
            elif any(source.startswith('bonus_') for source in membership_sources):
                membership_status = 'paid'
                membership_type = 'Bonus Days'
            
            users.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_email_verified': user.is_email_verified,
                'is_admin': user.is_administrator(),
                'membership_status': membership_status,
                'membership_type': membership_type,
                'membership_sources': membership_sources,
                'stripe_customer_id': user.stripe_customer_id,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'translation_count': translation_count,
                'total_characters': total_characters,
                'invitation_code': user.invitation_code.code if user.invitation_code else None,
                'referred_by_code': user.referred_by_code,
                'bonus_membership_days': user.bonus_membership_days
            })
        
        return jsonify({
            'users': users,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching users: {str(e)}'}), 500

@admin_bp.route('/api/admin/referrals', methods=['GET'])
@jwt_required()
def get_referrals():
    """Get paginated list of referrals with filtering and search."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        reward_claimed = request.args.get('reward_claimed', '')
        
        query = Referral.query
        
        if search:
            query = query.filter(
                db.or_(
                    Referral.referral_code.ilike(f'%{search}%'),
                    Referral.referee_email.ilike(f'%{search}%')
                )
            )
        
        if status and status != 'all':
            query = query.filter(Referral.status == status)
        
        if reward_claimed and reward_claimed != 'all':
            if reward_claimed == 'claimed':
                query = query.filter(Referral.reward_claimed == True)
            elif reward_claimed == 'pending':
                query = query.filter(Referral.reward_claimed == False)
        
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        referrals = []
        for referral in pagination.items:
            # Get referrer user info
            referrer = User.query.get(referral.referrer_user_id)
            referrer_username = referrer.username if referrer else 'Unknown'
            referrer_email = referrer.email if referrer else 'Unknown'
            
            # Get referee user info if exists
            referee_username = None
            if referral.referee_user_id:
                referee = User.query.get(referral.referee_user_id)
                referee_username = referee.username if referee else 'Unknown'
            
            referrals.append({
                'id': referral.id,
                'referrer_user_id': referral.referrer_user_id,
                'referrer_username': referrer_username,
                'referrer_email': referrer_email,
                'referee_email': referral.referee_email,
                'referee_user_id': referral.referee_user_id,
                'referee_username': referee_username,
                'referral_code': referral.referral_code,
                'status': referral.status,
                'reward_claimed': referral.reward_claimed,
                'created_at': referral.created_at.isoformat(),
                'completed_at': referral.completed_at.isoformat() if referral.completed_at else None,
                'expires_at': referral.expires_at.isoformat()
            })
        
        return jsonify({
            'referrals': referrals,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching referrals: {str(e)}'}), 500 

@admin_bp.route('/api/admin/config', methods=['GET'])
@jwt_required()
def get_system_config():
    """Get current system configuration for admin settings."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        from config import (
            GUEST_USER_MAX_FILE_SIZE,
            FREE_USER_CHARACTER_MONTHLY_LIMIT,
            PAID_USER_CHARACTER_MONTHLY_LIMIT,
            REFERRAL_REWARD_DAYS,
            REFERRAL_EXPIRY_DAYS,
            REQUIRE_EMAIL_VERIFICATION,
            GUEST_TRANSLATION_LIMIT,
            FREE_USER_TRANSLATION_LIMIT,
            FREE_USER_CHARACTER_PER_FILE_LIMIT,
            INVITATION_MEMBERSHIP_MONTHS,
            INVITATION_CODE_REWARD_DAYS,
            MAX_REFERRALS_PER_USER,
            REFERRAL_FEATURE_PAID_MEMBERS_ONLY,
            PRICING,
            CURRENCY_RATES,
            LOCALE_TO_CURRENCY
        )
        
        return jsonify({
            'file_limits': {
                'max_file_size_mb': GUEST_USER_MAX_FILE_SIZE,
                'free_user_characters_per_file': FREE_USER_CHARACTER_PER_FILE_LIMIT
            },
            'translation_limits': {
                'guest_translation_limit': GUEST_TRANSLATION_LIMIT,
                'free_user_translation_limit': FREE_USER_TRANSLATION_LIMIT,
                'free_user_characters_monthly': FREE_USER_CHARACTER_MONTHLY_LIMIT,
                'paid_user_characters_monthly': PAID_USER_CHARACTER_MONTHLY_LIMIT
            },
            'referral_settings': {
                'referral_reward_days': REFERRAL_REWARD_DAYS,
                'referral_expiry_days': REFERRAL_EXPIRY_DAYS,
                'invitation_code_reward_days': INVITATION_CODE_REWARD_DAYS,
                'max_referrals_per_user': MAX_REFERRALS_PER_USER,
                'referral_feature_paid_members_only': REFERRAL_FEATURE_PAID_MEMBERS_ONLY
            },
            'invitation_settings': {
                'invitation_membership_months': INVITATION_MEMBERSHIP_MONTHS
            },
            'security_settings': {
                'email_verification_required': REQUIRE_EMAIL_VERIFICATION,
                'guest_translations_enabled': GUEST_TRANSLATION_LIMIT > 0
            },
            'pricing': PRICING,
            'currency_rates': CURRENCY_RATES,
            'locale_currency_mapping': LOCALE_TO_CURRENCY
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching system configuration: {str(e)}'}), 500

@admin_bp.route('/api/admin/config', methods=['PUT'])
@jwt_required()
def update_system_config():
    """Update system configuration (admin only)."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'file_limits', 'translation_limits', 'referral_settings', 
            'security_settings', 'pricing'
        ]
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Update configuration file
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config.py')
        
        # Read current config
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        # Update values in config content
        updates = {
            'GUEST_USER_MAX_FILE_SIZE': data['file_limits']['max_file_size_mb'],
            'FREE_USER_CHARACTER_PER_FILE_LIMIT': data['file_limits']['free_user_characters_per_file'],
            'GUEST_TRANSLATION_LIMIT': data['translation_limits']['guest_translation_limit'],
            'FREE_USER_TRANSLATION_LIMIT': data['translation_limits']['free_user_translation_limit'],
            'FREE_USER_CHARACTER_MONTHLY_LIMIT': data['translation_limits']['free_user_characters_monthly'],
            'PAID_USER_CHARACTER_MONTHLY_LIMIT': data['translation_limits']['paid_user_characters_monthly'],
            'REFERRAL_REWARD_DAYS': data['referral_settings']['referral_reward_days'],
            'REFERRAL_EXPIRY_DAYS': data['referral_settings']['referral_expiry_days'],
            'INVITATION_CODE_REWARD_DAYS': data['referral_settings']['invitation_code_reward_days'],
            'MAX_REFERRALS_PER_USER': data['referral_settings']['max_referrals_per_user'],
            'REFERRAL_FEATURE_PAID_MEMBERS_ONLY': data['referral_settings']['referral_feature_paid_members_only'],
            'INVITATION_MEMBERSHIP_MONTHS': data['invitation_settings']['invitation_membership_months'],
            'REQUIRE_EMAIL_VERIFICATION': data['security_settings']['email_verification_required']
        }
        
        # Apply updates to config content
        for key, value in updates.items():
            # Handle boolean values
            if isinstance(value, bool):
                value_str = str(value)
            else:
                value_str = str(value)
            
            # Update the line in config
            pattern = rf'^{key}\s*=\s*.*$'
            replacement = f'{key} = {value_str}'
            config_content = re.sub(pattern, replacement, config_content, flags=re.MULTILINE)
        
        # Update pricing if provided
        if 'pricing' in data:
            pricing_str = 'PRICING = {\n'
            for period, details in data['pricing'].items():
                pricing_str += f'    "{period}": {{\n'
                pricing_str += f'        "usd": {details["usd"]},\n'
                pricing_str += f'        "discount": {details["discount"]},\n'
                pricing_str += f'    }},\n'
            pricing_str += '}'
            
            # Find the start and end of the PRICING dictionary
            start_pattern = r'PRICING\s*=\s*\{'
            start_match = re.search(start_pattern, config_content)
            
            if start_match:
                start_pos = start_match.start()
                brace_count = 0
                end_pos = start_pos
                
                # Find the matching closing brace by counting braces
                for i, char in enumerate(config_content[start_pos:], start_pos):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_pos = i + 1
                            break
                
                # Replace the entire PRICING dictionary
                config_content = config_content[:start_pos] + pricing_str + config_content[end_pos:]
            else:
                # If PRICING dictionary not found, append it at the end
                config_content += f'\n{pricing_str}\n'
        
        # Write updated config
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        return jsonify({'message': 'Configuration updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Error updating system configuration: {str(e)}'}), 500

@admin_bp.route('/api/admin/invitation-codes', methods=['GET'])
@jwt_required()
def get_invitation_codes():
    """Get all invitation codes for admin management."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        codes = InvitationCode.query.all()
        
        invitation_codes = []
        for code in codes:
            invitation_codes.append({
                'id': code.id,
                'code': code.code,
                'created_at': code.created_at.isoformat(),
                'active': code.active,
                'last_used': code.last_used.isoformat() if code.last_used else None,
                'usage_count': code.usage_count
            })
        
        return jsonify({'codes': invitation_codes}), 200
        
    except Exception as e:
        return jsonify({'error': f'Error fetching invitation codes: {str(e)}'}), 500

@admin_bp.route('/api/admin/invitation-codes', methods=['POST'])
@jwt_required()
def create_invitation_code():
    """Create one or more invitation codes."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        data = request.get_json()
        count = int(data.get('count', 1))
        codes = []
        if count > 1:
            # Batch generation
            codes_batch = InvitationCode.generate_batch(count=count)
            for code_value in codes_batch:
                new_code = InvitationCode(
                    code=code_value,
                    active=True
                )
                db.session.add(new_code)
                codes.append(new_code)
            db.session.commit()
            return jsonify({
                'message': f'{len(codes)} invitation codes created successfully',
                'codes': [
                    {
                        'id': code.id,
                        'code': code.code,
                        'created_at': code.created_at.isoformat(),
                        'active': code.active
                    } for code in codes
                ]
            }), 201
        else:
            code_value = data.get('code', None)
            # If code is missing, empty, or whitespace, auto-generate
            if not code_value or not str(code_value).strip():
                code_value = InvitationCode.generate_batch(count=1)[0]
            else:
                # Only check for duplicates if a non-empty, non-whitespace code is provided
                existing_code = InvitationCode.query.filter_by(code=code_value).first()
                if existing_code:
                    return jsonify({'error': 'Invitation code already exists'}), 400
            new_code = InvitationCode(
                code=code_value,
                active=True
            )
            db.session.add(new_code)
            db.session.commit()
            return jsonify({
                'message': 'Invitation code created successfully',
                'code': {
                    'id': new_code.id,
                    'code': new_code.code,
                    'created_at': new_code.created_at.isoformat(),
                    'active': new_code.active
                }
            }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating invitation code: {str(e)}'}), 500

@admin_bp.route('/api/admin/invitation-codes/<int:code_id>', methods=['PUT'])
@jwt_required()
def update_invitation_code(code_id):
    """Update invitation code status."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        data = request.get_json()
        active = data.get('active', True)
        
        code = InvitationCode.query.get(code_id)
        if not code:
            return jsonify({'error': 'Invitation code not found'}), 404
        
        code.active = active
        db.session.commit()
        
        return jsonify({'message': 'Invitation code updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating invitation code: {str(e)}'}), 500

@admin_bp.route('/api/admin/invitation-codes/<int:code_id>', methods=['DELETE'])
@jwt_required()
def delete_invitation_code(code_id):
    """Delete an invitation code."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        code = InvitationCode.query.get(code_id)
        if not code:
            return jsonify({'error': 'Invitation code not found'}), 404
        
        db.session.delete(code)
        db.session.commit()
        
        return jsonify({'message': 'Invitation code deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting invitation code: {str(e)}'}), 500 

# Orders / Payment Transactions
@admin_bp.route('/api/admin/orders', methods=['GET'])
@jwt_required()
def get_orders():
    """Get paginated list of payment transactions with filtering and search."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        payment_method = request.args.get('payment_method')
        plan_type = request.args.get('plan_type')
        user_id = request.args.get('user_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')  # order_number or transaction_id

        query = PaymentTransaction.query

        if status and status != 'all':
            query = query.filter(PaymentTransaction.status == status)
        if payment_method and payment_method != 'all':
            query = query.filter(PaymentTransaction.payment_method == payment_method)
        if plan_type and plan_type != 'all':
            query = query.filter(PaymentTransaction.plan_type == plan_type)
        if user_id:
            query = query.filter(PaymentTransaction.user_id == user_id)
        if start_date:
            query = query.filter(PaymentTransaction.created_at >= start_date)
        if end_date:
            query = query.filter(PaymentTransaction.created_at <= end_date)
        if search:
            like_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    PaymentTransaction.order_number.ilike(like_term),
                    PaymentTransaction.transaction_id.ilike(like_term)
                )
            )

        query = query.order_by(PaymentTransaction.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        orders = []
        for tx in pagination.items:
            user = User.query.get(tx.user_id) if tx.user_id else None
            orders.append({
                'id': tx.id,
                'order_number': tx.order_number,
                'payment_method': tx.payment_method,
                'amount': float(tx.amount) if tx.amount is not None else 0.0,
                'currency': tx.currency,
                'plan_type': tx.plan_type,
                'status': tx.status,
                'transaction_id': tx.transaction_id,
                'created_at': tx.created_at.isoformat() if tx.created_at else None,
                'updated_at': tx.updated_at.isoformat() if tx.updated_at else None,
                'processed_at': tx.processed_at.isoformat() if tx.processed_at else None,
                'error_message': tx.error_message,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                } if user else None
            })

        return jsonify({
            'orders': orders,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching orders: {str(e)}'}), 500


@admin_bp.route('/api/admin/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_detail(order_id):
    """Get a single payment transaction detail."""
    admin_check = check_admin_access()
    if admin_check:
        return admin_check
    
    try:
        tx = PaymentTransaction.query.get_or_404(order_id)
        user = User.query.get(tx.user_id) if tx.user_id else None
        return jsonify({
            'id': tx.id,
            'order_number': tx.order_number,
            'payment_method': tx.payment_method,
            'amount': float(tx.amount) if tx.amount is not None else 0.0,
            'currency': tx.currency,
            'plan_type': tx.plan_type,
            'status': tx.status,
            'transaction_id': tx.transaction_id,
            'created_at': tx.created_at.isoformat() if tx.created_at else None,
            'updated_at': tx.updated_at.isoformat() if tx.updated_at else None,
            'processed_at': tx.processed_at.isoformat() if tx.processed_at else None,
            'error_message': tx.error_message,
            'payment_metadata': tx.payment_metadata,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            } if user else None
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching order: {str(e)}'}), 500