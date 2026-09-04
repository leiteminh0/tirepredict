function corPorRisco(risco) {
  if (risco === 'ALTO') return '#ef4444';
  if (risco === 'MEDIO') return '#f59e0b';
  return '#22c55e';
}

function PneuCard({ pneu, ultimaLeitura, risco }) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: corPorRisco(risco),
          flexShrink: 0,
        }}
      />
      <div>
        <strong>{pneu.posicao.replace('_', ' ')}</strong>
        {ultimaLeitura ? (
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Pressão: {ultimaLeitura.pressao} PSI · Temp: {ultimaLeitura.temperatura}°C
          </p>
        ) : (
          <p style={{ margin: '4px 0 0', color: '#999' }}>Sem leituras ainda</p>
        )}
      </div>
    </div>
  );
}

export default PneuCard;