
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

      if (packageType === 'Personal Training') {
        query = query.eq('package_type', 'Personal Training');
      }
      // For Camp Training or no package type, show all coaches
      
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
