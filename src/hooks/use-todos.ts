import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "../lib/api";

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  isPremiumFeature?: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function useTodos(
  params: { status?: string; priority?: string; search?: string; page?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["todos", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") searchParams.append(key, String(value));
      });
      return fetchApi(`/todos?${searchParams.toString()}`);
    },
    enabled,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Todo>) =>
      fetchApi("/todos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Todo> }) =>
      fetchApi(`/todos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/todos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
