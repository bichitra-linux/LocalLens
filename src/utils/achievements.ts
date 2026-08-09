import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS, UserAchievement, getReputationLevel } from '../domain/entities/Achievement';

const ACHIEVEMENTS_KEY = 'locallens_user_achievements';

export class AchievementService {
  private static instance: AchievementService;

  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  async getAchievements(): Promise<UserAchievement[]> {
    try {
      const json = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (json) return JSON.parse(json);
    } catch (error) {
      console.error('[Achievements] Failed to load achievements:', error);
    }

    return ACHIEVEMENTS.map(a => ({
      achievementId: a.id,
      progress: 0,
      unlocked: false,
    }));
  }

  async updateProgress(achievementId: string, increment: number = 1): Promise<boolean> {
    const achievements = await this.getAchievements();
    const achievement = achievements.find(a => a.achievementId === achievementId);
    if (!achievement || achievement.unlocked) return false;

    const def = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!def) return false;

    achievement.progress += increment;
    if (achievement.progress >= def.requirement) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date().toISOString();
      await this.saveAchievements(achievements);
      return true;
    }

    await this.saveAchievements(achievements);
    return false;
  }

  async setProgress(achievementId: string, value: number): Promise<boolean> {
    const achievements = await this.getAchievements();
    const achievement = achievements.find(a => a.achievementId === achievementId);
    if (!achievement || achievement.unlocked) return false;

    const def = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!def) return false;

    achievement.progress = value;
    if (achievement.progress >= def.requirement) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date().toISOString();
      await this.saveAchievements(achievements);
      return true;
    }

    await this.saveAchievements(achievements);
    return false;
  }

  async getUnlockedCount(): Promise<number> {
    const achievements = await this.getAchievements();
    return achievements.filter(a => a.unlocked).length;
  }

  async getTotalPoints(): Promise<number> {
    const achievements = await this.getAchievements();
    let points = 0;
    for (const ua of achievements) {
      if (ua.unlocked) points += 5;
      points += ua.progress;
    }
    return points;
  }

  async getReputationInfo() {
    const points = await this.getTotalPoints();
    return getReputationLevel(points);
  }

  private async saveAchievements(achievements: UserAchievement[]): Promise<void> {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  }
}
