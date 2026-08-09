import { useQuery } from '@tanstack/react-query';
import { AchievementService } from '../../utils/achievements';
import { ACHIEVEMENTS } from '../../domain/entities/Achievement';

const achievementService = AchievementService.getInstance();

export const achievementKeys = {
  all: ['achievements'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
  reputation: () => [...achievementKeys.all, 'reputation'] as const,
};

export const useAchievements = () => {
  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: async () => {
      const userAchievements = await achievementService.getAchievements();
      return ACHIEVEMENTS.map(def => {
        const ua = userAchievements.find(a => a.achievementId === def.id);
        return {
          ...def,
          progress: ua?.progress ?? 0,
          unlocked: ua?.unlocked ?? false,
          unlockedAt: ua?.unlockedAt,
        };
      });
    },
    staleTime: 30000,
  });
};

export const useReputation = () => {
  return useQuery({
    queryKey: achievementKeys.reputation(),
    queryFn: () => achievementService.getReputationInfo(),
    staleTime: 30000,
  });
};


