import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings/settings-form';
import { getOrCreateProfile } from '@/server/profile';
import { billingEnabled } from '@/server/billing';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const profile = await getOrCreateProfile(user.id);
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
      <SettingsForm
        initial={{
          name: user.name,
          email: user.email,
          isAnonymous: Boolean(user.isAnonymous),
          dailyGoal: profile.dailyGoal,
          timezone: profile.timezone,
          leaderboardOptIn: profile.leaderboardOptIn,
          plan: profile.plan,
          billing: billingEnabled(),
        }}
      />
    </div>
  );
}
