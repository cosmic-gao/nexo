const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(circle at 20% 20%, #dbeafe 0 20%, transparent 30%), radial-gradient(circle at 80% 30%, #fef9c3 0 18%, transparent 28%), #0f172a',
  color: '#e2e8f0',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  margin: 0
};

const cardStyle: React.CSSProperties = {
  padding: '32px 40px',
  borderRadius: '16px',
  background: '#111827',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  textAlign: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  margin: '0 0 12px'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  margin: 0,
  color: '#cbd5e1'
};

function App() {
  return (
    <main style={containerStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Hello, React 19 + Vite</h1>
        <p style={subtitleStyle}>
          现代 React 模板，开箱即用。开始编辑 App.tsx 吧！
        </p>
      </section>
    </main>
  );
}

export default App;

