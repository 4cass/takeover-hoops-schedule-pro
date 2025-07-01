
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFilteredCoaches = (packageType?: string | null) => {
  return useQuery({
    queryKey: ['coaches', 'filtered', packageType],
    queryFn: async () => {
      let query = supabase
        .from('coaches')
        .select('*')
        .order('name');

      // Only filter if a specific package type is provided
      if (packageType === 'Personal Training') {
        query = query.eq('package_type', 'Personal Training');
      } else if (packageType === 'Camp Training') {
        // For Camp Training, show both Camp Training coaches and Personal Training coaches
        // since Camp Training coaches can do both types
        query = query.in('package_type', ['Camp Training', 'Personal Training']);
      }
      // For no package type or other values, show all coaches
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching filtered coaches:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: true,
  });
};
