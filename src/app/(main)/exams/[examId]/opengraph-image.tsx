import { ImageResponse } from 'next/og';
import { getExam } from '@/server/exams';

export const alt = 'quizzMonkey practice exam';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The exam's own share card: code, title and format, in the brand palette. */
export default async function ExamOpengraphImage({ params }: { params: Promise<{ examId: string }> }) {
  const ex = await getExam((await params).examId);
  const cfg = ex?.config;
  const chips = cfg ? [`${cfg.itemCount} questions`, `${cfg.timeLimitMinutes} minutes`, `Pass mark ${cfg.scale.passing}`, 'Every option explained'] : [];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72,
          background: 'linear-gradient(135deg, #fff8eb 0%, #fde7c2 55%, #f7c48a 100%)', color: '#3b2414', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#6b3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🐒</div>
          <span>quizz<span style={{ color: '#e86500' }}>Monkey</span></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex' }}>
            <div style={{ fontSize: 30, fontWeight: 700, padding: '8px 22px', borderRadius: 999, background: '#6b3a1a', color: '#fff8eb' }}>{ex?.code ?? 'Practice exams'}</div>
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 }}>{ex?.title ?? 'Mock exams, quizzes and interview practice'}</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {chips.map((t) => (
            <div key={t} style={{ fontSize: 24, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(107,58,26,0.2)' }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
