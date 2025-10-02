import { supabase } from '@/integrations/supabase/client';

type ActionType = 'create' | 'update' | 'delete';
type EntityType = 'employee' | 'user';

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  actionType,
  entityType,
  entityId,
  description,
  metadata = {}
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found for activity logging');
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        description,
        metadata
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
