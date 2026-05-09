export const dynamic = 'force-static';

export default function ComingSoonPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0d12',
        color: '#e6e9ef',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.78rem',
            letterSpacing: '0.2em',
            color: '#7a8597',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          RacingPoint
        </div>
        <h1 style={{ fontSize: '2.4rem', margin: '0 0 1rem', fontWeight: 600 }}>
          Cloud admin is launching soon
        </h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#b4bccc', margin: '0 0 1.5rem' }}>
          We&rsquo;re putting the finishing touches on the cloud admin experience.
          In the meantime, our team is fully reachable.
        </p>
        <a
          href="mailto:support@racingpoint.in"
          style={{
            display: 'inline-block',
            padding: '0.85rem 1.5rem',
            borderRadius: 8,
            background: '#141821',
            border: '1px solid #242a38',
            color: '#cfd6e4',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
          }}
        >
          support@racingpoint.in
        </a>
        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#7a8597' }}>
          Visit{' '}
          <a
            href="https://racingpoint.in"
            style={{ color: '#9aa5b8', textDecoration: 'underline' }}
          >
            racingpoint.in
          </a>{' '}
          for our main site.
        </p>
      </div>
    </div>
  );
}
