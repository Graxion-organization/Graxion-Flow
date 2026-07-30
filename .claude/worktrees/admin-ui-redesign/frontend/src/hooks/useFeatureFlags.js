import { useFeatureFlagStore, useAuthStore } from '../store';

/**
 * Reusable hook to check if feature flags are enabled.
 * 
 * Usage:
 * const { isEnabled, isLoading } = useFeatureFlags();
 * 
 * if (isEnabled('ai-assistant')) {
 *   return <AIAssistant />;
 * }
 */
export const useFeatureFlags = () => {
  const { flags, isLoading, error, evaluateFlags } = useFeatureFlagStore();
  const { user } = useAuthStore();

  const isEnabled = (key) => {
    if (!key) return false;
    // Admins always have access to all features (including latest integrations)
    if (user?.role === 'admin') return true;
    return !!flags[key.toLowerCase().trim()];
  };

  return {
    flags,
    isLoading,
    error,
    isEnabled,
    refreshFlags: evaluateFlags
  };
};

export default useFeatureFlags;
