function AlertaItem({ alerta }) {
  return (
    <div
      style={{
        borderLeft: '4px solid #ef4444',
        backgroundColor: '#fef2f2',
        padding: '10px 14px',
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      <strong>Pneu #{alerta.pneu_id}</strong> — Pressão: {alerta.pressao} PSI
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#991b1b' }}>
        {new Date(alerta.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

export default AlertaItem;