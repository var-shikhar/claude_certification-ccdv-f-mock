import 'server-only';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assignment, attempt, exam, organization, orgMember, user } from '@/db/schema';
import { AppError, notFound } from './errors';

type TeamRole = 'owner' | 'instructor' | 'member';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const inviteCode = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

async function membership(userId: string, teamId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) throw notFound('That team');
  const [m] = await db.select({ role: orgMember.role }).from(orgMember).where(and(eq(orgMember.orgId, teamId), eq(orgMember.userId, userId))).limit(1);
  if (!m) throw notFound('That team');
  return m.role as TeamRole;
}
const canManage = (role: TeamRole) => role === 'owner' || role === 'instructor';

export async function createTeam(userId: string, name: string) {
  const clean = name.trim().slice(0, 80);
  if (clean.length < 2) throw new AppError('Give your team a name.', 400);
  return db.transaction(async (tx) => {
    const [team] = await tx.insert(organization).values({ name: clean, inviteCode: inviteCode(), createdBy: userId }).returning({ id: organization.id });
    await tx.insert(orgMember).values({ orgId: team.id, userId, role: 'owner' });
    return team;
  });
}

export async function joinTeam(userId: string, code: string) {
  const [team] = await db.select({ id: organization.id, name: organization.name }).from(organization).where(eq(organization.inviteCode, code.trim().toUpperCase())).limit(1);
  if (!team) throw new AppError('No team uses that invite code.', 404, 'NOT_FOUND');
  await db.insert(orgMember).values({ orgId: team.id, userId, role: 'member' }).onConflictDoNothing();
  return team;
}

export async function findTeamByCode(code: string) {
  const [team] = await db.select({ id: organization.id, name: organization.name }).from(organization).where(eq(organization.inviteCode, code.trim().toUpperCase())).limit(1);
  if (!team) return null;
  const [members] = await db.select({ n: count() }).from(orgMember).where(eq(orgMember.orgId, team.id));
  return { ...team, members: members?.n ?? 0 };
}

export async function listMyTeams(userId: string) {
  const rows = await db
    .select({
      id: organization.id, name: organization.name, role: orgMember.role,
      members: sql<number>`(select count(*)::int from ${orgMember} m where m.org_id = ${organization.id})`,
      assignments: sql<number>`(select count(*)::int from ${assignment} a where a.org_id = ${organization.id})`,
    })
    .from(orgMember)
    .innerJoin(organization, eq(organization.id, orgMember.orgId))
    .where(eq(orgMember.userId, userId))
    .orderBy(asc(organization.name));
  return rows;
}

export async function getTeam(userId: string, teamId: string) {
  const role = await membership(userId, teamId);
  const [team] = await db.select().from(organization).where(eq(organization.id, teamId)).limit(1);
  const [members, assignments] = await Promise.all([
    db.select({ userId: orgMember.userId, role: orgMember.role, joinedAt: orgMember.joinedAt, name: user.name, email: user.email })
      .from(orgMember).innerJoin(user, eq(user.id, orgMember.userId)).where(eq(orgMember.orgId, teamId)).orderBy(asc(user.name)),
    db.select({ a: assignment, examCode: exam.code, examTitle: exam.title }).from(assignment).innerJoin(exam, eq(exam.id, assignment.examId))
      .where(eq(assignment.orgId, teamId)).orderBy(desc(assignment.createdAt)),
  ]);

  // Best finished attempt per member per assignment.
  const ids = assignments.map((x) => x.a.id);
  const attempts = ids.length
    ? await db.select({ assignmentId: attempt.assignmentId, userId: attempt.userId, id: attempt.id, status: attempt.status, scaled: attempt.scaled, passed: attempt.passed, integrity: attempt.integrity, finishedAt: attempt.finishedAt })
      .from(attempt).where(inArray(attempt.assignmentId, ids)).orderBy(desc(attempt.scaled))
    : [];
  const best = new Map<string, (typeof attempts)[number]>();
  for (const t of attempts) {
    const key = `${t.assignmentId}:${t.userId}`;
    const prev = best.get(key);
    if (!prev || (prev.status !== 'submitted' && t.status === 'submitted')) best.set(key, t);
  }
  const cell = (assignmentId: string, memberId: string) => {
    const t = best.get(`${assignmentId}:${memberId}`);
    return t ? { attemptId: t.id, status: t.status, scaled: t.scaled, passed: t.passed, blurs: t.integrity?.blurs ?? 0 } : null;
  };

  return {
    id: team.id,
    name: team.name,
    inviteCode: canManage(role) ? team.inviteCode : null,
    role,
    members: members.map((m) => ({ ...m, email: canManage(role) ? m.email : null, joinedAt: m.joinedAt.toISOString() })),
    assignments: assignments.map(({ a, examCode, examTitle }) => ({
      id: a.id, title: a.title, examId: a.examId, examCode, examTitle, kind: a.kind, difficulty: a.difficulty,
      dueAt: a.dueAt?.toISOString() ?? null, overdue: Boolean(a.dueAt && a.dueAt.getTime() < Date.now()), createdAt: a.createdAt.toISOString(),
      mine: cell(a.id, userId),
      results: canManage(role) ? Object.fromEntries(members.map((m) => [m.userId, cell(a.id, m.userId)])) : null,
    })),
  };
}

export async function createAssignment(userId: string, teamId: string, input: { examId: string; title: string; kind: 'full' | 'quick' | 'practice'; difficulty: string; dueAt?: string | null }) {
  const role = await membership(userId, teamId);
  if (!canManage(role)) throw new AppError('Only team owners and instructors can set assignments.', 403);
  const [ex] = await db.select({ id: exam.id, config: exam.config }).from(exam).where(eq(exam.id, input.examId)).limit(1);
  if (!ex) throw notFound('That exam');
  const difficulty = ex.config.difficultyModes[input.difficulty] ? input.difficulty : ex.config.defaultDifficultyMode;
  const [row] = await db.insert(assignment).values({
    orgId: teamId, examId: ex.id, title: input.title.trim().slice(0, 120) || 'Assignment', kind: input.kind, difficulty,
    dueAt: input.dueAt ? new Date(input.dueAt) : null, createdBy: userId,
  }).returning({ id: assignment.id });
  return row;
}

export async function removeMember(userId: string, teamId: string, memberId: string) {
  const role = await membership(userId, teamId);
  if (memberId !== userId && !canManage(role)) throw new AppError('Only owners and instructors can remove members.', 403);
  const [target] = await db.select({ role: orgMember.role }).from(orgMember).where(and(eq(orgMember.orgId, teamId), eq(orgMember.userId, memberId))).limit(1);
  if (!target) throw notFound('That member');
  if (target.role === 'owner') throw new AppError('The team owner cannot leave or be removed.', 400);
  await db.delete(orgMember).where(and(eq(orgMember.orgId, teamId), eq(orgMember.userId, memberId)));
  return { ok: true as const };
}

export async function setMemberRole(userId: string, teamId: string, memberId: string, next: 'instructor' | 'member') {
  const role = await membership(userId, teamId);
  if (role !== 'owner') throw new AppError('Only the team owner can change roles.', 403);
  await db.update(orgMember).set({ role: next }).where(and(eq(orgMember.orgId, teamId), eq(orgMember.userId, memberId), sql`${orgMember.role} <> 'owner'`));
  return { ok: true as const };
}

/** Used when a member starts an assignment: checks membership and returns what to build. */
export async function getAssignmentForStart(userId: string, assignmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw notFound('That assignment');
  const [row] = await db.select().from(assignment).where(eq(assignment.id, assignmentId)).limit(1);
  if (!row) throw notFound('That assignment');
  await membership(userId, row.orgId);
  return { id: row.id, examId: row.examId, kind: row.kind, difficulty: row.difficulty };
}
