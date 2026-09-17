# Modelo de risco

O artefato `backend/modelo_pneu.pkl` recebe, nesta ordem, `pressao`, `temperatura` e `horas_uso`, e produz `BAIXO`, `MEDIO` ou `ALTO` com probabilidades.

O artefato é carregado no ciclo de vida da API. Se estiver ausente ou incompatível, a telemetria continua disponível, `/health` informa `ml.available: false` e `/prever` responde `503`.

O código e os dados de treinamento não foram disponibilizados no repositório original. Por isso não são inventadas métricas de acurácia, F1 ou origem dos dados. Para retreinar com segurança, versionar o conjunto de dados, o notebook/script de treinamento, versões das dependências e métricas por classe.
