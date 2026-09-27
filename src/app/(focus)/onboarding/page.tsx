import type { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { listExams } from '@/server/exams';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  const user = await requireUser('/onboarding');
  const exams = await listExams();
  return <OnboardingFlow exams={exams} name={user.isAnonymous ? '' : user.name.split(' ')[0]} />;
}
