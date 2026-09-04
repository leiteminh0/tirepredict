import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function GraficoPressao({ leituras }) {
  const dados = [...leituras].reverse().map((l) => ({
    timestamp: new Date(l.timestamp).toLocaleTimeString(),
    pressao: l.pressao,
    temperatura: l.temperatura,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="pressao" stroke="#3b82f6" name="Pressão (PSI)" />
        <Line type="monotone" dataKey="temperatura" stroke="#ef4444" name="Temperatura (°C)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default GraficoPressao;