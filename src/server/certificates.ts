import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { certificate, exam } from '@/db/schema';
import { difficultyMode } from '@/lib/engine';

export interface CertificateView {
  id: string;
  userId: string;
  candidateName: string;
  examId: string;
  examCode: string;
  examTitle: string;
  vendor: string | null;
  scaled: number;
  passing: number;
  scaleMax: number;
  difficultyLabel: string;
  issuedAt: string;
}

const CODE = /^CM-[A-Z2-9]{5}-[A-Z2-9]{5}$/;

export async function getCertificate(code: string): Promise<CertificateView | null> {
  const normalized = code.trim().toUpperCase();
  if (!CODE.test(normalized)) return null;
  const [row] = await db
    .select({ c: certificate, code: exam.code, title: exam.title, vendor: exam.vendor, config: exam.config })
    .from(certificate)
    .innerJoin(exam, eq(exam.id, certificate.examId))
    .where(eq(certificate.id, normalized))
    .limit(1);
  if (!row) return null;
  return {
    id: row.c.id,
    userId: row.c.userId,
    candidateName: row.c.candidateName,
    examId: row.c.examId,
    examCode: row.code,
    examTitle: row.title,
    vendor: row.vendor,
    scaled: row.c.scaled,
    passing: row.config.scale.passing,
    scaleMax: row.config.scale.max,
    difficultyLabel: difficultyMode(row.config, row.c.difficulty).label,
    issuedAt: row.c.issuedAt.toISOString(),
  };
}
