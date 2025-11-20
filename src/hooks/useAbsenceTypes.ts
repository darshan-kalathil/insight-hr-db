import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AbsenceTypes {
  leaveTypes: string[];
  regularizationTypes: string[];
}

export const useAbsenceTypes = () => {
  return useQuery({
    queryKey: ['absence-types'],
    queryFn: async (): Promise<AbsenceTypes> => {
      // Fetch distinct leave types
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_records')
        .select('leave_type')
        .order('leave_type');

      if (leaveError) throw leaveError;

      // Fetch distinct regularization reasons (excluding cancelled)
      const { data: regularizationData, error: regularizationError } = await supabase
        .from('attendance_regularization')
        .select('reason')
        .not('approval_status', 'in', '("Cancelled")')
        .order('reason');

      if (regularizationError) throw regularizationError;

      // Get unique values
      const leaveTypes = [...new Set(leaveData.map(l => l.leave_type).filter(Boolean))];
      const regularizationTypes = [...new Set(regularizationData.map(r => r.reason).filter(Boolean))];

      return {
        leaveTypes,
        regularizationTypes,
      };
    },
  });
};
