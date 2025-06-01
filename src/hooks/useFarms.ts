
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Farm = Database['public']['Tables']['farms']['Row'];
type FarmInsert = Database['public']['Tables']['farms']['Insert'];
type FarmUpdate = Database['public']['Tables']['farms']['Update'];

export const useFarms = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['farms', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user found for farms query');
        throw new Error('User not authenticated');
      }
      
      console.log('Fetching farms for user:', user.id);
      
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching farms:', error);
        throw error;
      }
      
      console.log('Fetched farms:', data);
      return data as Farm[];
    },
    enabled: !!user,
  });
};

export const useCreateFarm = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (farmData: Omit<FarmInsert, 'user_id'>) => {
      if (!user) {
        console.error('No user found for farm creation');
        throw new Error('User not authenticated');
      }

      console.log('Creating farm for user:', user.id);
      console.log('Farm data being inserted:', farmData);

      const insertData = {
        ...farmData,
        user_id: user.id,
      };

      console.log('Final insert data:', insertData);

      const { data, error } = await supabase
        .from('farms')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating farm:', error);
        throw error;
      }
      
      console.log('Farm created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Farm creation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      toast({
        title: 'Success',
        description: 'Farm created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Farm creation failed:', error);
      toast({
        title: 'Error',
        description: `Failed to create farm: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateFarm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FarmUpdate & { id: string }) => {
      console.log('Updating farm:', id, updates);
      
      const { data, error } = await supabase
        .from('farms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating farm:', error);
        throw error;
      }
      
      console.log('Farm updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      toast({
        title: 'Success',
        description: 'Farm updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Farm update failed:', error);
      toast({
        title: 'Error',
        description: `Failed to update farm: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useFarm = (farmId: string) => {
  return useQuery({
    queryKey: ['farm', farmId],
    queryFn: async () => {
      console.log('Fetching single farm:', farmId);
      
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (error) {
        console.error('Error fetching farm:', error);
        throw error;
      }
      
      console.log('Fetched farm:', data);
      return data as Farm;
    },
    enabled: !!farmId,
  });
};
