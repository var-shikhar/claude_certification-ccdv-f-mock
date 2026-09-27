import { ChartNoAxesColumnIncreasing, Compass, House, MessagesSquare, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** other path prefixes that should light this item up */
  match?: string[];
  badge?: string;
}

/**
 * The whole app hangs off four destinations. Everything else (saved
 * questions, certificates, settings, admin) lives one level down, so the
 * top level never grows past what fits on a phone's tab bar.
 */
export const APP_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/explore', label: 'Explore', icon: Compass, match: ['/exams'] },
  { href: '/interviews', label: 'Interviews', icon: MessagesSquare, badge: 'AI' },
  { href: '/progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing, match: ['/attempt'] },
];

export const MARKETING_NAV = [
  { href: '/explore', label: 'Explore exams' },
  { href: '/interviews', label: 'Mock interviews' },
  { href: '/pricing', label: 'Pricing' },
];

export function isActive(item: Pick<NavItem, 'href' | 'match'>, pathname: string) {
  return [item.href, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
