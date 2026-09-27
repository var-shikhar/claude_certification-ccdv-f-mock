import { UsersTable } from '@/components/admin/users-table';
import { requireRole } from '@/server/session';

export const metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const user = await requireRole('admin');
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Registered accounts (guests are not listed).</p>
      </div>
      <UsersTable selfId={user.id} />
    </div>
  );
}
