function MaquinaCard({ maquina, onSelecionar, selecionada }) {
  return (
    <div
      onClick={() => onSelecionar(maquina.id)}
      style={{
        border: selecionada ? '2px solid #3b82f6' : '1px solid #ccc',
        borderRadius: 8,
        padding: 16,
        cursor: 'pointer',
        marginBottom: 8,
        backgroundColor: selecionada ? '#eff6ff' : '#fff',
      }}
    >
      <h3 style={{ margin: 0 }}>{maquina.nome}</h3>
      <p style={{ margin: '4px 0 0', color: '#666' }}>{maquina.modelo}</p>
    </div>
  );
}

export default MaquinaCard;