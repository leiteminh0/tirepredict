import { useEffect, useState } from 'react';
import { listarMaquinas, listarPneus, listarLeituras, listarAlertas } from '../api/api';
import MaquinaCard from '../components/MaquinaCard';
import PneuCard from '../components/PneuCard';
import GraficoPressao from '../components/GraficoPressao';
import AlertaItem from '../components/AlertaItem';

function Dashboard() {
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState(null);
  const [pneus, setPneus] = useState([]);
  const [pneuSelecionado, setPneuSelecionado] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarMaquinas()
      .then((res) => {
        setMaquinas(res.data);
        if (res.data.length > 0) setMaquinaSelecionada(res.data[0].id);
      })
      .catch((err) => console.error('Erro ao buscar máquinas:', err))
      .finally(() => setCarregando(false));

    listarAlertas()
      .then((res) => setAlertas(res.data))
      .catch((err) => console.error('Erro ao buscar alertas:', err));
  }, []);

  useEffect(() => {
    if (!maquinaSelecionada) return;
    listarPneus(maquinaSelecionada)
      .then((res) => {
        setPneus(res.data);
        if (res.data.length > 0) setPneuSelecionado(res.data[0].id);
      })
      .catch((err) => console.error('Erro ao buscar pneus:', err));
  }, [maquinaSelecionada]);

  useEffect(() => {
    if (!pneuSelecionado) return;
    listarLeituras(pneuSelecionado)
      .then((res) => setLeituras(res.data))
      .catch((err) => console.error('Erro ao buscar leituras:', err));
  }, [pneuSelecionado]);

  if (carregando) return <p style={{ padding: 24 }}>Carregando...</p>;

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ width: 260 }}>
        <h2>Máquinas</h2>
        {maquinas.map((m) => (
          <MaquinaCard
            key={m.id}
            maquina={m}
            selecionada={m.id === maquinaSelecionada}
            onSelecionar={setMaquinaSelecionada}
          />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <h2>Pneus</h2>
        {pneus.map((p) => (
          <div key={p.id} onClick={() => setPneuSelecionado(p.id)} style={{ cursor: 'pointer' }}>
            <PneuCard
              pneu={p}
              ultimaLeitura={p.id === pneuSelecionado ? leituras[0] : null}
              risco={p.id === pneuSelecionado && leituras[0]?.pressao < 30 ? 'ALTO' : 'BAIXO'}
            />
          </div>
        ))}

        {leituras.length > 0 && (
          <>
            <h3>Histórico do pneu selecionado</h3>
            <GraficoPressao leituras={leituras} />
          </>
        )}
      </div>

      <div style={{ width: 300 }}>
        <h2>Alertas</h2>
        {alertas.length === 0 && <p style={{ color: '#666' }}>Nenhum alerta no momento.</p>}
        {alertas.map((a) => (
          <AlertaItem key={a.id} alerta={a} />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;