import { ImageResponse } from 'next/og';

export const alt = 'certMonkey: mock exams, quizzes and interview practice';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The default social-share card, drawn in the brand palette. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72,
          background: 'linear-gradient(135deg, #fff8eb 0%, #fde7c2 55%, #f7c48a 100%)', color: '#3b2414', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: '#6b3a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🐒</div>
          <span>cert<span style={{ color: '#e86500' }}>Monkey</span></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Practise like it&apos;s exam day.</div>
          <div style={{ fontSize: 32, opacity: 0.8 }}>Blueprint-accurate mocks · explanations for every option · AI mock interviews</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {['Timed mocks', 'Readiness score', 'Spaced review', 'Certificates'].map((t) => (
            <div key={t} style={{ fontSize: 24, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(107,58,26,0.2)' }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
