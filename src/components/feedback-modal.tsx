'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  pageContext?: string;
}

export function FeedbackModal({ isVisible, onClose, pageContext }: FeedbackModalProps) {
  const { t } = useTranslation();
  const { user, fetchWithAuth } = useAuth();
  const { toast } = useToast();
  
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarClick = (starIndex: number) => {
    setRating(starIndex + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      toast({
        title: t('errors.generic_error_title'),
        description: t('feedback.error_empty_feedback'),
        variant: 'destructive',
      });
      return;
    }

    if (!user && !email.trim()) {
      toast({
        title: t('errors.generic_error_title'),
        description: t('feedback.error_email_required'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        feedback_text: feedbackText,
        rating: rating > 0 ? rating : null,
        user_email: !user ? email : null,
        page_context: pageContext || 'unknown'
      };

      let response;
      if (user) {
        // Authenticated user
        response = await fetchWithAuth('/api/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Anonymous user
        response = await fetch('/api/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        toast({
          title: t('success.title'),
          description: t('feedback.success_message'),
        });
        
        // Reset form
        setFeedbackText('');
        setRating(0);
        setHoveredRating(0);
        setEmail('');
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: t('errors.generic_error_title'),
        description: t('feedback.error_submit_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedbackText('');
      setRating(0);
      setHoveredRating(0);
      setEmail('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            aria-label={t('feedback.close')}
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
              {t('feedback.title')}
            </h2>
            
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('feedback.description')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('feedback.rating_label')} ({t('feedback.rating_optional')})
                </Label>
                <div 
                  className="flex items-center space-x-1 mt-2"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[0, 1, 2, 3, 4].map((starIndex) => (
                    <button
                      key={starIndex}
                      type="button"
                      onClick={() => handleStarClick(starIndex)}
                      onMouseEnter={() => setHoveredRating(starIndex + 1)}
                      disabled={isSubmitting}
                      className="p-1 disabled:opacity-50"
                    >
                      <Star
                        size={24}
                        className={`transition-colors ${
                          starIndex < (hoveredRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {rating} {rating === 1 ? t('feedback.star') : t('feedback.stars')}
                    </span>
                  )}
                </div>
              </div>

              {/* Email for anonymous users */}
              {!user && (
                <div>
                  <Label htmlFor="feedback-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.email')} *
                  </Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder')}
                    disabled={isSubmitting}
                    className="mt-1"
                    required
                  />
                </div>
              )}

              {/* Feedback Text */}
              <div>
                <Label htmlFor="feedback-text" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('feedback.feedback_label')} *
                </Label>
                <Textarea
                  id="feedback-text"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={t('feedback.feedback_placeholder')}
                  disabled={isSubmitting}
                  className="mt-1 min-h-[120px]"
                  maxLength={2000}
                  required
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {feedbackText.length}/2000 {t('feedback.characters')}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-[#0C8599] hover:bg-[#0A6D80] text-white"
                >
                  {isSubmitting ? t('feedback.submitting') : t('feedback.submit')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {t('auth.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 