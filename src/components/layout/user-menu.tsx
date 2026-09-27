'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, Bookmark, LogOut, Settings, Shield, Sparkles, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';

export interface MenuUser {
  name: string;
  email: string;
  image?: string | null;
  role: string;
  isAnonymous?: boolean | null;
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

export function UserMenu({ user }: { user: MenuUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const staff = user.role === 'admin' || user.role === 'author';

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
        <Avatar className="size-8 ring-2 ring-border transition hover:ring-primary/40">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-white">{user.isAnonymous ? 'G' : initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{user.isAnonymous ? 'Guest' : user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user.isAnonymous ? 'Progress is saved on this device' : user.email}</div>
        </DropdownMenuLabel>
        {user.isAnonymous && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/sign-up" className="text-primary">
                <Sparkles /> Create a free account
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild><Link href="/saved"><Bookmark /> Saved questions</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/progress?tab=certificates"><Award /> Certificates</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/teams"><Users /> Teams</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/settings"><Settings /> Settings</Link></DropdownMenuItem>
          {staff && <DropdownMenuItem asChild><Link href="/admin"><Shield /> Admin</Link></DropdownMenuItem>}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut /> {user.isAnonymous ? 'Leave guest session' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
