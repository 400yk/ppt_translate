import apiClient from './api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface UserAnalytics {
  total_users: number;
  new_users: {
    today: number;
    this_week: number;
    this_month: number;
  };
  membership_status: {
    paid: number;
    free: number;
  };
  membership_breakdown: {
    stripe: number;
    invitation: number;
    referral: number;
    bonus: number;
  };
  email_verification: {
    verified: number;
    unverified: number;
  };
  registration_source: {
    invitation: number;
    referral: number;
    google: number;
    regular: number;
  };
  growth_data: Array<{
    date: string;
    count: number;
  }>;
}

export interface TranslationAnalytics {
  total_translations: number;
  status_breakdown: {
    successful: number;
    failed: number;
    processing: number;
  };
  success_rate: number;
  translations_by_period: {
    today: number;
    this_week: number;
    this_month: number;
  };
  guest_translations: {
    total: number;
    today: number;
  };
  character_usage: {
    total: number;
    average: number;
  };
  performance: {
    average_processing_time: number;
  };
  top_language_pairs: Array<{
    source: string;
    target: string;
    count: number;
  }>;
  growth_data: Array<{
    date: string;
    count: number;
  }>;
  volume_data: Array<{
    date: string;
    successful: number;
    failed: number;
  }>;
  success_rate_data: Array<{
    date: string;
    success_rate: number;
  }>;
  processing_time_data: Array<{
    date: string;
    avg_time: number;
  }>;
  error_distribution: Array<{
    name: string;
    count: number;
  }>;
  peak_usage_hours: Array<{
    hour: string;
    translations: number;
  }>;
  file_size_distribution: Array<{
    size_range: string;
    count: number;
  }>;
  language_pairs: Array<{
    pair: string;
    count: number;
  }>;
}

export interface ReferralAnalytics {
  total_referrals: number;
  status_breakdown: {
    pending: number;
    completed: number;
    expired: number;
  };
  conversion_rate: number;
  referrals_by_period: {
    today: number;
    this_week: number;
    this_month: number;
  };
  top_referrers: Array<{
    username: string;
    referrals: number;
  }>;
  growth_data: Array<{
    date: string;
    count: number;
  }>;
  performance_data: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
  conversion_rate_data: Array<{
    date: string;
    conversion_rate: number;
  }>;
}

export interface RevenueAnalytics {
  total_revenue_usd: number;
  mrr_usd: number;
  arr_usd: number;
  arpu_usd: number;
  clv_usd: number;
  total_paid_users: number;
  revenue_by_period: {
    today: number;
    this_week: number;
    this_month: number;
  };
  revenue_by_currency: {
    USD: number;
    EUR: number;
    GBP: number;
  };
  revenue_by_plan: {
    monthly: number;
    yearly: number;
  };
  subscription_breakdown: {
    monthly_subscribers: number;
    yearly_subscribers: number;
  };
  growth_data: Array<{
    date: string;
    revenue: number;
  }>;
}

export interface TranslationLog {
  id: number;
  filename: string;
  status: 'processing' | 'success' | 'failed';
  source_language: string;
  target_language: string;
  character_count: number;
  processing_time: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
}

export interface TranslationLogsResponse {
  logs: TranslationLog[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_email_verified: boolean;
  is_admin: boolean;
  membership_status: 'free' | 'paid';
  membership_type: string;
  membership_sources: string[];
  stripe_customer_id?: string;
  created_at: string;
  last_login: string | null;
  translation_count: number;
  total_characters: number;
  invitation_code?: string;
  referred_by_code?: string;
  bonus_membership_days: number;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface Referral {
  id: number;
  referrer_user_id: number;
  referrer_username: string;
  referrer_email: string;
  referee_email: string | null;
  referee_user_id: number | null;
  referee_username: string | null;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired';
  reward_claimed: boolean;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

export interface ReferralsResponse {
  referrals: Referral[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export class AdminService {
  static async getUserAnalytics(days: number = 30): Promise<UserAnalytics> {
    const response = await apiClient.get(`/api/admin/analytics/users?days=${days}`);
    return response.data;
  }

  static async getTranslationAnalytics(days: number = 30): Promise<TranslationAnalytics> {
    const response = await apiClient.get(`/api/admin/analytics/translations?days=${days}`);
    return response.data;
  }

  static async getReferralAnalytics(days: number = 30): Promise<ReferralAnalytics> {
    const response = await apiClient.get(`/api/admin/analytics/referrals?days=${days}`);
    return response.data;
  }

  static async getRevenueAnalytics(days: number = 30): Promise<RevenueAnalytics> {
    const response = await apiClient.get(`/api/admin/analytics/revenue?days=${days}`);
    return response.data;
  }

  static async getTranslationLogs(params: {
    page?: number;
    per_page?: number;
    status?: string;
    user_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
  } = {}): Promise<TranslationLogsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.user_id) searchParams.append('user_id', params.user_id.toString());
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.search) searchParams.append('search', params.search);

    const response = await apiClient.get(`/api/admin/translations/logs?${searchParams.toString()}`);
    return response.data;
  }

  static async getTranslationLogDetail(translationId: number): Promise<TranslationLog> {
    const response = await apiClient.get(`/api/admin/translations/logs/${translationId}`);
    return response.data;
  }

  static async getUsers(params: {
    page?: number;
    per_page?: number;
    search?: string;
    membership_status?: string;
    email_verified?: string;
    admin_status?: string;
  } = {}): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.membership_status) searchParams.append('membership_status', params.membership_status);
    if (params.email_verified) searchParams.append('email_verified', params.email_verified);
    if (params.admin_status) searchParams.append('admin_status', params.admin_status);

    const response = await apiClient.get(`/api/admin/users?${searchParams.toString()}`);
    return response.data;
  }

  static async getReferrals(params: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    reward_claimed?: string;
  } = {}): Promise<ReferralsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    if (params.reward_claimed) searchParams.append('reward_claimed', params.reward_claimed);

    const response = await apiClient.get(`/api/admin/referrals?${searchParams.toString()}`);
    return response.data;
  }

  static async getSystemConfig(): Promise<any> {
    const response = await apiClient.get('/api/admin/config');
    return response.data;
  }

  static async updateSystemConfig(config: any): Promise<any> {
    const response = await apiClient.put('/api/admin/config', config);
    return response.data;
  }

  static async getInvitationCodes(): Promise<any> {
    const response = await apiClient.get('/api/admin/invitation-codes');
    return response.data;
  }

  static async createInvitationCode(code: string): Promise<any> {
    const response = await apiClient.post('/api/admin/invitation-codes', { code });
    return response.data;
  }

  static async createInvitationCodeWithCount(count: number): Promise<any> {
    const response = await apiClient.post('/api/admin/invitation-codes', { count });
    return response.data;
  }

  static async updateInvitationCode(codeId: number, active: boolean): Promise<any> {
    const response = await apiClient.put(`/api/admin/invitation-codes/${codeId}`, { active });
    return response.data;
  }

  static async deleteInvitationCode(codeId: number): Promise<any> {
    const response = await apiClient.delete(`/api/admin/invitation-codes/${codeId}`);
    return response.data;
  }
} 