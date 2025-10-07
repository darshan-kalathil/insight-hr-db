import { useState } from 'react';
import { calculateReconciliation, ReconciliationResult } from '@/lib/reconciliationService';
import { useToast } from '@/hooks/use-toast';

export const useReconciliation = () => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const { toast } = useToast();

  const triggerReconciliation = async (startDate: Date, endDate: Date) => {
    setIsReconciling(true);
    try {
      const result: ReconciliationResult = await calculateReconciliation(startDate, endDate);
      setLastCalculated(result.updatedAt);
      
      toast({
        title: 'Reconciliation Complete',
        description: `Processed ${result.totalProcessed} absence records. Found ${result.unapprovedCount} unapproved absences among ${result.delhiEmployeesOnly} Delhi employees.`,
      });

      return result;
    } catch (error) {
      console.error('Reconciliation error:', error);
      toast({
        title: 'Reconciliation Failed',
        description: 'Failed to calculate attendance reconciliation. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsReconciling(false);
    }
  };

  return {
    isReconciling,
    lastCalculated,
    triggerReconciliation
  };
};
