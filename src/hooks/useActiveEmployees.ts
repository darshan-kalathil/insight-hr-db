import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  name: string;
  empl_no: string;
}

export const useActiveEmployees = () => {
  return useQuery({
    queryKey: ['active-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, empl_no')
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
  });
};
