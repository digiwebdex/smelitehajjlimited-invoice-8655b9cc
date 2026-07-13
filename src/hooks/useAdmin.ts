import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string | null;
  is_approved: boolean;
  created_at: string;
  email?: string;
}

interface AccessState {
  is_admin: boolean;
  is_approved: boolean;
}

interface ProfileWithAccess extends Partial<AccessState> {
  id: string;
  email: string;
  full_name?: string | null;
}

export function useAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accessState, isLoading: isCheckingAccess } = useQuery({
    queryKey: ["accessState", user?.id],
    queryFn: async (): Promise<AccessState> => {
      if (!user?.id) {
        return { is_admin: false, is_approved: false };
      }

      const profileResult = await api.get<ProfileWithAccess>("/auth/profile");
      const profileData = profileResult.data;
      const hasProfileFlags =
        typeof profileData?.is_admin === "boolean" ||
        typeof profileData?.is_approved === "boolean";

      if (!profileResult.error && hasProfileFlags) {
        return {
          is_admin: Boolean(profileData?.is_admin),
          is_approved: Boolean(profileData?.is_approved),
        };
      }

      const [adminResult, approvalResult] = await Promise.all([
        api.get<{ is_admin: boolean }>("/admin/check"),
        api.get<{ is_approved: boolean }>("/admin/check-approval"),
      ]);

      return {
        is_admin: adminResult.data?.is_admin ?? false,
        is_approved: approvalResult.data?.is_approved ?? false,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const isAdmin = accessState?.is_admin ?? false;
  const isApproved = accessState?.is_approved ?? false;

  const { data: pendingUsers, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pendingUsers"],
    queryFn: async () => {
      const { data, error } = await api.get<PendingUser[]>("/admin/pending-users");
      if (error) throw new Error(error);
      return data as PendingUser[];
    },
    enabled: isAdmin === true,
  });

  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data, error } = await api.get<PendingUser[]>("/admin/users");
      if (error) throw new Error(error);
      return data as PendingUser[];
    },
    enabled: isAdmin === true,
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await api.post(`/admin/approve-user`, { user_id: userId });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["accessState"] });
      toast({
        title: "User approved",
        description: "The user can now access the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await api.post(`/admin/revoke-user`, { user_id: userId });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["accessState"] });
      toast({
        title: "Access revoked",
        description: "The user can no longer access the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await api.delete(`/admin/users/${userId}`);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast({
        title: "User deleted",
        description: "The user has been permanently removed from the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    isAdmin,
    isApproved,
    isCheckingAdmin: isCheckingAccess,
    isCheckingApproval: isCheckingAccess,
    pendingUsers: pendingUsers ?? [],
    allUsers: allUsers ?? [],
    isLoadingPending,
    isLoadingAllUsers,
    approveUser: approveUserMutation.mutate,
    revokeUser: revokeUserMutation.mutate,
    isApproving: approveUserMutation.isPending,
    isRevoking: revokeUserMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,
    hasAccess: isAdmin || isApproved,
  };
}
