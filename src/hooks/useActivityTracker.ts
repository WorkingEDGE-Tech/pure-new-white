
import { activitiesService } from '@/services/database';

export const useActivityTracker = () => {
  const trackActivity = async (action: string, details?: string, module: string = 'General') => {
    try {
      await activitiesService.create({
        action,
        details,
        module
      });
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  return { trackActivity };
};
