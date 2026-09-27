'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface Row { id: string; name: string; email: string; role: 'learner' | 'author' | 'admin'; createdAt: string }

export function UsersTable({ selfId }: { selfId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const key = ['admin', 'users', q] as const;
  const { data, isPending } = useQuery({ queryKey: key, queryFn: () => api.get<Row[]>(`/api/admin/users?q=${encodeURIComponent(q)}`), placeholderData: keepPreviousData });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Row['role'] }) => api.patch(`/api/admin/users/${id}`, { role }),
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Row[]>(key);
      queryClient.setQueryData<Row[]>(key, (rows) => rows?.map((r) => (r.id === id ? { ...r, role } : r)));
      return { previous };
    },
    onError: (err, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(key, ctx.previous); toast.error(err instanceof Error ? err.message : 'Could not change the role.'); },
    onSuccess: (_d, { role }) => toast.success(`Role changed to ${role}`),
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="h-9 pl-9" aria-label="Search users" />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b bg-secondary/40 text-xs text-muted-foreground">
            <tr><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Email</th><th className="px-4 py-2.5 font-medium">Joined</th><th className="px-4 py-2.5 font-medium">Role</th></tr>
          </thead>
          <tbody className="divide-y">
            {isPending && !data
              ? Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>)
              : data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">{u.name}{u.id === selfId && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td className="px-4 py-2.5">
                    <Select value={u.role} disabled={u.id === selfId} onValueChange={(role) => setRole.mutate({ id: u.id, role: role as Row['role'] })}>
                      <SelectTrigger className="h-8 w-32" aria-label={`Role for ${u.name}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="learner">Learner</SelectItem>
                        <SelectItem value="author">Author</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Authors can write, import and moderate questions. Admins can also manage roles.</p>
    </div>
  );
}
