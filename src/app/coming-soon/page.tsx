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
          RacingPoint Admin
        </div>
        <h1 style={{ fontSize: '2.4rem', margin: '0 0 1rem', fontWeight: 600 }}>
          Cloud dashboard coming soon
        </h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#b4bccc', margin: '0 0 1.5rem' }}>
          Cloud admin is temporarily gated while the API proxy layer is built.
          All operational controls remain available on the venue admin console.
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '0.85rem 1.25rem',
            borderRadius: 8,
            background: '#141821',
            border: '1px solid #242a38',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.92rem',
            color: '#cfd6e4',
          }}
        >
          Venue admin → http://192.168.31.23:3201
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#7a8597' }}>
          Contact Uday if you need remote access.
        </p>
      </div>
    </div>
  );
}
