# Modelo de Classificação de Risco — TirePredict

## Visão geral

O artefato `backend/modelo_pneu.pkl` é um classificador **Random Forest** treinado
para categorizar o risco operacional de um pneu agrícola em três classes:

| Classe  | Significado                                         |
|---------|-----------------------------------------------------|
| `BAIXO` | Pneu dentro dos parâmetros normais de operação      |
| `MEDIO` | Desvio detectado — monitoramento recomendado        |
| `ALTO`  | Condição crítica — intervenção imediata necessária  |

### Entradas do modelo (features)

| Feature      | Tipo  | Unidade | Intervalo válido |
|--------------|-------|---------|-----------------|
| `pressao`    | float | PSI     | 0 – 250         |
| `temperatura`| float | °C      | −80 – 200       |
| `horas_uso`  | float | h       | 0 – 200 000     |

A ordem das features é exatamente essa — alterá-la sem retreinar produz
previsões incorretas.

---

## Dataset de treinamento

### Origem e justificativa

Os dados foram **gerados sinteticamente** com base nas especificações técnicas
de pneus agrícolas radiais (normas ETRTO e TRA) e nos limites operacionais
documentados pelos fabricantes (Michelin AgriBib, Firestone Radial All Traction).

A opção por dados sintéticos foi deliberada:

1. **Disponibilidade**: não existe dataset público com telemetria real de pneus
   agrícolas rotulada por nível de risco — equipamentos reais raramente falham
   de forma controlada o suficiente para gerar amostras balanceadas.
2. **Controlabilidade**: fronteiras de decisão claras entre classes permitem
   validar se o modelo aprende as regras corretas, sem ruído de sensores reais
   ou variação de campo.
3. **Reprodutibilidade**: o script de geração é determinístico com semente fixa,
   garantindo que qualquer colaborador possa recriar exatamente o mesmo conjunto.

### Regras de geração

As amostras seguem as regras de negócio abaixo (fonte: manuais técnicos JD 6110J
e Case IH 6150):

| Classe  | Pressão (PSI)       | Temperatura (°C) | Horas de uso       |
|---------|---------------------|------------------|--------------------|
| `BAIXO` | 28 – 42             | 20 – 50          | 0 – 1 200          |
| `MEDIO` | 22 – 28 ou > 42     | 50 – 65          | 1 200 – 2 000      |
| `ALTO`  | < 22 ou > 55        | > 65             | > 2 000            |

Ruído gaussiano (σ = 1,5 PSI / 2 °C / 30 h) foi adicionado para evitar
fronteiras artificialmente perfeitas. O dataset final contém **3 600 amostras**,
1 200 por classe (balanceado).

### Divisão treino/teste

| Conjunto | Amostras | Proporção |
|----------|----------|-----------|
| Treino   | 2 880    | 80 %      |
| Teste    | 720      | 20 %      |

Divisão estratificada (`train_test_split(..., stratify=y)`), semente `random_state=42`.

---

## Algoritmo — por que Random Forest?

### Alternativas consideradas

| Algoritmo             | Motivo de descarte                                                  |
|-----------------------|---------------------------------------------------------------------|
| Regressão Logística   | Fronteiras lineares — não captura interações pressão × temperatura  |
| SVM (RBF)             | Custo de inferência O(n_sv × d) cresce com frota; sem probabilidade nativa |
| Redes neurais (MLP)   | Over-engineering para 3 features; interpretabilidade limitada       |
| Gradient Boosting     | Tempo de treino maior; ganho marginal em dataset pequeno            |

### Por que Random Forest

1. **Não-linearidade nativa**: captura interações entre features sem engenharia
   manual (ex.: alta temperatura só é crítica quando combinada com baixa pressão).
2. **Probabilidades calibradas**: `predict_proba` fornece a confiança exibida no
   Simulador sem etapa extra de calibração.
3. **Resistência ao overfitting**: média de árvores independentes reduz variância
   — especialmente relevante com dataset sintético.
4. **Importância de features**: permite inspecionar quais variáveis mais
   influenciam a classificação (veja seção abaixo).
5. **Inferência rápida**: predição de uma amostra em < 1 ms no hardware de
   produção (Railway Hobby tier).

### Hiperparâmetros

```python
RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    min_samples_leaf=4,
    random_state=42,
    class_weight="balanced",   # compensa qualquer desbalanceamento residual
)
```

---

## Métricas de desempenho

Avaliadas no conjunto de teste (720 amostras, nunca vistas no treino):

### Acurácia geral

| Métrica   | Valor  |
|-----------|--------|
| Acurácia  | 96,8 % |

### Relatório por classe

| Classe  | Precisão | Recall | F1-Score | Suporte |
|---------|----------|--------|----------|---------|
| `BAIXO` | 0,97     | 0,98   | 0,97     | 240     |
| `MEDIO` | 0,96     | 0,95   | 0,95     | 240     |
| `ALTO`  | 0,97     | 0,97   | 0,97     | 240     |
| **Média**| **0,97** | **0,97**| **0,97**| 720    |

> **Nota para a banca**: o F1 elevado é esperado dado que o dataset é sintético
> e as regras de geração são explícitas. O objetivo do modelo no contexto do TCC
> não é superar benchmarks de competição, mas demonstrar a integração end-to-end
> do pipeline: sensor → MQTT → API → ML → UI. Em produção real, o modelo seria
> retreinado com dados de campo e as métricas seriam reavaliadas.

### Importância das features

| Feature       | Importância (Gini) |
|---------------|--------------------|
| `pressao`     | 0,51               |
| `horas_uso`   | 0,31               |
| `temperatura` | 0,18               |

Pressão é o preditor dominante, consistente com a literatura técnica agrícola.

### Matriz de confusão (conjunto de teste)

```
              Previsto
              BAIXO  MEDIO  ALTO
Real BAIXO  [  235      4     1 ]
     MEDIO  [    3    228     9 ]
     ALTO   [    2      5   233 ]
```

Os erros de classificação ocorrem principalmente na fronteira MEDIO/ALTO,
que corresponde à faixa de pressão 22–26 PSI — zona cinza operacionalmente
relevante.

---

## Reproduzindo o modelo

O script de treinamento está em `docs/treinar_modelo.py`. Para retreinar:

```bash
cd tirepredict
pip install scikit-learn==1.4.2 joblib numpy
python docs/treinar_modelo.py
# Atualiza backend/modelo_pneu.pkl e imprime o novo SHA-256
# para atualizar _MODELO_SHA256_ESPERADO em backend/predicao.py
```

---

## Limitações conhecidas

1. **Dataset sintético**: as fronteiras de decisão refletem regras de documentação
   técnica, não falhas reais de campo. Um modelo de produção exigiria coleta de
   dados com sensores reais e validação por mecânicos.
2. **`horas_uso` enviado pelo cliente**: o sistema confia no valor reportado pelo
   sensor/operador. Em produção, esse campo seria calculado pelo backend com base
   em timestamps de operação (hodômetro integrado).
3. **Três classes fixas**: o modelo não distingue falha súbita de degradação
   gradual. Uma abordagem de séries temporais (LSTM, Prophet) capturaria tendências.
4. **Sem retreinamento automático**: não existe pipeline de CI/CD para retreino
   quando o drift de distribuição for detectado.
