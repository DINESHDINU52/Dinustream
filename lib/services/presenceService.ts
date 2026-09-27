import { UserProfileId } from '@/types/cinema';

export const presenceService = {
  isUserOnline(id: UserProfileId): boolean {
    return true;
  },
  getLastSeen(id: UserProfileId): string {
    return 'Online now';
  },
  subscribePresence(callback: () => void): () => void {
    return () => {};
  },
};
