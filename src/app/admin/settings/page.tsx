'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Users, 
  FileText, 
  Share2, 
  Bell,
  Database,
  Shield,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Copy,
  Check
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminService } from '@/lib/admin-service';

interface InvitationCode {
  id: number;
  code: string;
  created_at: string;
  active: boolean;
  last_used: string | null;
  usage_count: number;
}

interface SystemConfig {
  file_limits: {
    max_file_size_mb: number;
    free_user_characters_per_file: number;
  };
  translation_limits: {
    guest_translation_limit: number;
    free_user_translation_limit: number;
    free_user_characters_monthly: number;
    paid_user_characters_monthly: number;
  };
  referral_settings: {
    referral_reward_days: number;
    referral_expiry_days: number;
    invitation_code_reward_days: number;
    max_referrals_per_user: number;
    referral_feature_paid_members_only: boolean;
  };
  invitation_settings: {
    invitation_membership_months: number;
  };
  security_settings: {
    email_verification_required: boolean;
    guest_translations_enabled: boolean;
  };
  pricing: {
    monthly: { usd: number; discount: number };
    yearly: { usd: number; discount: number };
  };
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    file_limits: {
      max_file_size_mb: 50,
      free_user_characters_per_file: 50000
    },
    translation_limits: {
      guest_translation_limit: 1,
      free_user_translation_limit: 1,
      free_user_characters_monthly: 200000,
      paid_user_characters_monthly: 5000000
    },
    referral_settings: {
      referral_reward_days: 3,
      referral_expiry_days: 30,
      invitation_code_reward_days: 3,
      max_referrals_per_user: 5,
      referral_feature_paid_members_only: false
    },
    invitation_settings: {
      invitation_membership_months: 0.5,
    },
    security_settings: {
      email_verification_required: true,
      guest_translations_enabled: true
    },
    pricing: {
      monthly: { usd: 7.99, discount: 0 },
      yearly: { usd: 81.48, discount: 15 }
    }
  });
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [numCodes, setNumCodes] = useState(5);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [useChinese, setUseChinese] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchInvitationCodes();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await AdminService.getSystemConfig();
      setConfig(response);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitationCodes = async () => {
    try {
      const response = await AdminService.getInvitationCodes();
      setInvitationCodes(response.codes);
    } catch (error) {
      console.error('Error fetching invitation codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitation codes',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      await AdminService.updateSystemConfig(config);
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvitationCode = async () => {
    try {
      setIsGeneratingCode(true);
      setGeneratedCodes([]);
      setCopiedCode(null);
      const response = await AdminService.createInvitationCodeWithCount(numCodes);
      if (response.codes) {
        setGeneratedCodes(response.codes.map((c: any) => c.code));
      } else if (response.code) {
        setGeneratedCodes([response.code.code]);
      }
      await fetchInvitationCodes(); // Refresh the list
      toast({
        title: 'Success',
        description: `${numCodes > 1 ? numCodes : 1} invitation code(s) generated successfully`,
      });
    } catch (error) {
      console.error('Error generating invitation code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invitation code',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const getInvitationText = (code: string, isChinese: boolean) => {
    return isChinese 
      ? `网站：translide.co，邀请码：${code}`
      : `Website: translide.co, Invitation Code: ${code}`;
  };

  const copyInvitationText = async (code: string) => {
    const textToCopy = getInvitationText(code, useChinese);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedCode(code);
      toast({
        title: 'Copied',
        description: 'Invitation text copied to clipboard',
      });
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleToggleInvitationCode = async (codeId: number, active: boolean) => {
    try {
      await AdminService.updateInvitationCode(codeId, active);
      
      setInvitationCodes(prev => 
        prev.map(code => 
          code.id === codeId ? { ...code, active } : code
        )
      );
      
      toast({
        title: 'Success',
        description: `Invitation code ${active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling invitation code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invitation code',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInvitationCode = async (codeId: number) => {
    try {
      await AdminService.deleteInvitationCode(codeId);
      
      setInvitationCodes(prev => prev.filter(code => code.id !== codeId));
      
      toast({
        title: 'Success',
        description: 'Invitation code deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting invitation code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invitation code',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage system configuration and settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSettings} disabled={isLoading} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Invitations
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Pricing
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Translation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_file_size">Free Users - Maximum File Size (MB)</Label>
                    <Input
                      id="max_file_size"
                      type="number"
                      value={config.file_limits.max_file_size_mb}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        file_limits: { 
                          ...prev.file_limits, 
                          max_file_size_mb: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="free_characters_per_file">Free Users - Characters Per File</Label>
                    <Input
                      id="free_characters_per_file"
                      type="number"
                      value={config.file_limits.free_user_characters_per_file}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        file_limits: { 
                          ...prev.file_limits, 
                          free_user_characters_per_file: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="free_characters">Free Users - Monthly Character Limit</Label>
                    <Input
                      id="free_characters"
                      type="number"
                      value={config.translation_limits.free_user_characters_monthly}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        translation_limits: { 
                          ...prev.translation_limits, 
                          free_user_characters_monthly: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paid_characters">Paid Users - Monthly Character Limit</Label>
                    <Input
                      id="paid_characters"
                      type="number"
                      value={config.translation_limits.paid_user_characters_monthly}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        translation_limits: { 
                          ...prev.translation_limits, 
                          paid_user_characters_monthly: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="guest_translations"
                    checked={config.security_settings.guest_translations_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ 
                      ...prev, 
                      security_settings: { 
                        ...prev.security_settings, 
                        guest_translations_enabled: checked 
                      } 
                    }))}
                  />
                  <Label htmlFor="guest_translations">Enable Guest Translations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="email_verification"
                    checked={config.security_settings.email_verification_required}
                    onCheckedChange={(checked) => setConfig(prev => ({ 
                      ...prev, 
                      security_settings: { 
                        ...prev.security_settings, 
                        email_verification_required: checked 
                      } 
                    }))}
                  />
                  <Label htmlFor="email_verification">Require Email Verification</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            {/* Invitation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Send Invitation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invitation_membership_months">Invitation Membership Months</Label>
                    <Input
                      id="invitation_membership_months"
                      type="number"
                      step="0.1"
                      value={config.invitation_settings.invitation_membership_months}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        invitation_settings: { 
                          ...prev.invitation_settings, 
                          invitation_membership_months: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Number of months of paid membership for users who register with invitation codes
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="num_codes">Number of Codes</Label>
                      <Input
                        id="num_codes"
                        type="number"
                        min={1}
                        value={numCodes}
                        onChange={e => setNumCodes(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <Button onClick={handleGenerateInvitationCode} disabled={isGeneratingCode}>
                      <Plus className="w-4 h-4 mr-2" />
                      {isGeneratingCode ? 'Generating...' : 'Generate Code'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generated Codes Display */}
            {generatedCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Generated Codes
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="language-toggle" className="text-sm font-normal cursor-pointer">
                        English
                      </Label>
                      <Switch
                        id="language-toggle"
                        checked={useChinese}
                        onCheckedChange={setUseChinese}
                      />
                      <Label htmlFor="language-toggle" className="text-sm font-normal cursor-pointer">
                        中文
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invitation Text</TableHead>
                          <TableHead className="w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generatedCodes.map((code) => (
                          <TableRow key={code}>
                            <TableCell className="font-mono text-sm">
                              {getInvitationText(code, useChinese)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyInvitationText(code)}
                                className="h-8 w-8 p-0"
                              >
                                {copiedCode === code ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Invitation Code Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manage invitation codes for user registration
                    </p>
                  </div>

                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Usage Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {code.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {code.active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(code.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {code.last_used ? new Date(code.last_used).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>{code.usage_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleInvitationCode(code.id, !code.active)}
                            >
                              {code.active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvitationCode(code.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Referral Settings */}
          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Referral System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referral_bonus">Referral Bonus Days</Label>
                    <Input
                      id="referral_bonus"
                      type="number"
                      value={config.referral_settings.referral_reward_days}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        referral_settings: { 
                          ...prev.referral_settings, 
                          referral_reward_days: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invitation_expiry">Referral Code Expiry (days)</Label>
                    <Input
                      id="invitation_expiry"
                      type="number"
                      value={config.referral_settings.referral_expiry_days}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        referral_settings: { 
                          ...prev.referral_settings, 
                          referral_expiry_days: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invitation_code_reward_days">Reward Days for Referer</Label>
                    <Input
                      id="invitation_code_reward_days"
                      type="number"
                      value={config.referral_settings.invitation_code_reward_days}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        referral_settings: { 
                          ...prev.referral_settings, 
                          invitation_code_reward_days: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_referrals_per_user">Max Referrals Per User</Label>
                    <Input
                      id="max_referrals_per_user"
                      type="number"
                      value={config.referral_settings.max_referrals_per_user}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        referral_settings: { 
                          ...prev.referral_settings, 
                          max_referrals_per_user: parseInt(e.target.value) 
                        } 
                      }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="referral_feature_paid_members_only"
                    checked={config.referral_settings.referral_feature_paid_members_only}
                    onCheckedChange={(checked) => setConfig(prev => ({ 
                      ...prev, 
                      referral_settings: { 
                        ...prev.referral_settings, 
                        referral_feature_paid_members_only: checked 
                      } 
                    }))}
                  />
                  <Label htmlFor="referral_feature_paid_members_only">Referral Feature Paid Members Only</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Settings */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pricing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthly_price">Monthly Price (USD)</Label>
                    <Input
                      id="monthly_price"
                      type="number"
                      step="0.01"
                      value={config.pricing.monthly.usd}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        pricing: { 
                          ...prev.pricing, 
                          monthly: { 
                            ...prev.pricing.monthly, 
                            usd: parseFloat(e.target.value) 
                          } 
                        } 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearly_price">Yearly Price (USD)</Label>
                    <Input
                      id="yearly_price"
                      type="number"
                      step="0.01"
                      value={config.pricing.yearly.usd}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        pricing: { 
                          ...prev.pricing, 
                          yearly: { 
                            ...prev.pricing.yearly, 
                            usd: parseFloat(e.target.value) 
                          } 
                        } 
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
} 