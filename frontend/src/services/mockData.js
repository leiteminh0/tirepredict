export const maquinas = [
  {
    id: 1,
    nome: "Trator John Deere 6110J",
    modelo: "John Deere 6110J",
    ultimaLeitura: "agora",
    pneus: [
      {
        id: 1,
        posicao: "Dianteiro esquerdo",
        pressao: 22,
        temperatura: 38,
        nivel: "ALTO",
        historico: [
          { hora: "07h", pressao: 42 },
          { hora: "08h", pressao: 38 },
          { hora: "09h", pressao: 33 },
          { hora: "10h", pressao: 27 },
          { hora: "11h", pressao: 22 },
        ],
      },
      {
        id: 2,
        posicao: "Dianteiro direito",
        pressao: 38,
        temperatura: 29,
        nivel: "MEDIO",
        historico: [
          { hora: "07h", pressao: 46 },
          { hora: "08h", pressao: 44 },
          { hora: "09h", pressao: 41 },
          { hora: "10h", pressao: 39 },
          { hora: "11h", pressao: 38 },
        ],
      },
      {
        id: 3,
        posicao: "Traseiro esquerdo",
        pressao: 58,
        temperatura: 26,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 57 },
          { hora: "08h", pressao: 58 },
          { hora: "09h", pressao: 57 },
          { hora: "10h", pressao: 58 },
          { hora: "11h", pressao: 58 },
        ],
      },
      {
        id: 4,
        posicao: "Traseiro direito",
        pressao: 61,
        temperatura: 25,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 60 },
          { hora: "08h", pressao: 61 },
          { hora: "09h", pressao: 60 },
          { hora: "10h", pressao: 61 },
          { hora: "11h", pressao: 61 },
        ],
      },
    ],
  },
  {
    id: 2,
    nome: "Colheitadeira New Holland TC5090",
    modelo: "New Holland TC5090",
    ultimaLeitura: "há 2 min",
    pneus: [
      {
        id: 5,
        posicao: "Frontal esquerdo",
        pressao: 31,
        temperatura: 36,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 32 },
          { hora: "08h", pressao: 33 },
          { hora: "09h", pressao: 32 },
          { hora: "10h", pressao: 31 },
          { hora: "11h", pressao: 31 },
        ],
      },
      {
        id: 6,
        posicao: "Frontal direito",
        pressao: 29,
        temperatura: 43,
        nivel: "MEDIO",
        historico: [
          { hora: "07h", pressao: 34 },
          { hora: "08h", pressao: 33 },
          { hora: "09h", pressao: 31 },
          { hora: "10h", pressao: 30 },
          { hora: "11h", pressao: 29 },
        ],
      },
      {
        id: 7,
        posicao: "Traseiro esquerdo",
        pressao: 44,
        temperatura: 31,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 44 },
          { hora: "08h", pressao: 43 },
          { hora: "09h", pressao: 44 },
          { hora: "10h", pressao: 45 },
          { hora: "11h", pressao: 44 },
        ],
      },
      {
        id: 8,
        posicao: "Traseiro direito",
        pressao: 46,
        temperatura: 28,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 46 },
          { hora: "08h", pressao: 47 },
          { hora: "09h", pressao: 46 },
          { hora: "10h", pressao: 46 },
          { hora: "11h", pressao: 46 },
        ],
      },
    ],
  },
  {
    id: 3,
    nome: "Trator Case IH Puma 165",
    modelo: "Case IH Puma 165",
    ultimaLeitura: "há 5 min",
    pneus: [
      {
        id: 9,
        posicao: "Dianteiro esquerdo",
        pressao: 27,
        temperatura: 38,
        nivel: "ALTO",
        historico: [
          { hora: "07h", pressao: 35 },
          { hora: "08h", pressao: 33 },
          { hora: "09h", pressao: 31 },
          { hora: "10h", pressao: 29 },
          { hora: "11h", pressao: 27 },
        ],
      },
      {
        id: 10,
        posicao: "Dianteiro direito",
        pressao: 39,
        temperatura: 30,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 39 },
          { hora: "08h", pressao: 40 },
          { hora: "09h", pressao: 39 },
          { hora: "10h", pressao: 40 },
          { hora: "11h", pressao: 39 },
        ],
      },
      {
        id: 11,
        posicao: "Traseiro esquerdo",
        pressao: 41,
        temperatura: 34,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 42 },
          { hora: "08h", pressao: 41 },
          { hora: "09h", pressao: 40 },
          { hora: "10h", pressao: 41 },
          { hora: "11h", pressao: 41 },
        ],
      },
      {
        id: 12,
        posicao: "Traseiro direito",
        pressao: 44,
        temperatura: 32,
        nivel: "BAIXO",
        historico: [
          { hora: "07h", pressao: 43 },
          { hora: "08h", pressao: 44 },
          { hora: "09h", pressao: 43 },
          { hora: "10h", pressao: 44 },
          { hora: "11h", pressao: 44 },
        ],
      },
    ],
  },
];

export function getMaquinaById(maquinaId) {
  return maquinas.find((maquina) => maquina.id === Number(maquinaId)) ?? maquinas[0];
}

export function getResumoMaquina(pneus = []) {
  const criticos = pneus.filter((pneu) => pneu.nivel === "ALTO").length;
  const medios = pneus.filter((pneu) => pneu.nivel === "MEDIO").length;
  const normais = pneus.filter((pneu) => pneu.nivel === "BAIXO").length;

  return {
    criticos,
    medios,
    normais,
    total: pneus.length,
    texto: `${criticos} crítico${criticos === 1 ? "" : "s"}, ${medios} médio${medios === 1 ? "" : "s"}, ${normais} normal${normais === 1 ? "" : "is"}`,
  };
}
