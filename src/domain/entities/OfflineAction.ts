export type OfflineActionType =
  | 'create_note'
  | 'vote'
  | 'remove_vote'
  | 'add_reaction'
  | 'remove_reaction'
  | 'add_comment'
  | 'delete_comment'
  | 'delete_note'
  | 'update_profile';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, any>;
  createdAt: string;       // ISO date
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed';
}

export interface OfflineQueueStats {
  totalActions: number;
  pendingActions: number;
  failedActions: number;
  oldestAction?: string;   // ISO date
}
