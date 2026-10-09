# Plano de Teste — Telas do TirePredict

## 1. Introdução

Este plano descreve a abordagem, o escopo, o cronograma e os recursos para testar duas telas do TirePredict: **Frota Monitorada** e **Simulador de Telemetria**. O objetivo é verificar a apresentação dos dados da frota, a navegação para os painéis das máquinas e o envio de leituras simuladas para classificação de risco.

## 2. Objetivo do Teste

- Confirmar que a tela Frota Monitorada carrega e apresenta máquinas, pneus e indicadores de risco corretamente.
- Confirmar que a seleção de uma máquina abre o painel correspondente.
- Verificar que o Simulador permite selecionar máquina e pneu, ajustar parâmetros e enviar uma leitura.
- Verificar os resultados de sucesso e erro, incluindo a classificação de risco retornada pela API.
- Avaliar a usabilidade, a responsividade e o desempenho das duas telas.

## 3. Escopo

### Incluído

- **Frota Monitorada (`/frota`)**: carregamento da lista, indicadores agregados, cartões de máquinas, nível de risco, estado vazio, falha de conexão e navegação ao painel da máquina.
- **Simulador de Telemetria (`/simulador`)**: seleção de máquina e pneu, cenários predefinidos, controles de pressão/temperatura/horas de uso, envio manual, classificação de risco, histórico de envios e modo automático.
- Validação visual e funcional em diferentes larguras de tela e navegadores.
- Tempo de carregamento e resposta da API nos fluxos testados.

### Fora do escopo

- Testes de funcionalidades de outras telas, como relatório e histórico de alertas.
- Testes do hardware físico (ESP32/sensor TPMS) e da entrega real de mensagens MQTT.
- Testes de autenticação de usuários, permissões por perfil ou segundo fator: o sistema atual não apresenta tela de login nem fluxo de contas de usuário.
- Teste de carga em larga escala e auditoria de segurança completa.

## 4. Estratégia de Teste

Executar os casos com a API e o banco disponíveis, usando dados de teste conhecidos. Para os cenários de erro, simular indisponibilidade da API ou configurar respostas de teste sem afetar dados de produção. Registrar resultado esperado, resultado obtido, navegador, dispositivo e evidências (captura de tela/log).

### 4.1. Testes Funcionais

#### Tela 1 — Frota Monitorada

| ID | Cenário | Procedimento | Resultado esperado |
|---|---|---|---|
| FRO-01 | Carregar frota com dados | Abrir `/frota` com a API disponível e contendo máquinas e pneus | Os cartões aparecem após o carregamento; cada máquina mostra nome, modelo e risco dominante. |
| FRO-02 | Conferir indicadores | Comparar os totais da página com os dados de teste | Máquinas, pneus monitorados e contagens de risco alto, médio e baixo correspondem aos dados retornados pela API. |
| FRO-03 | Abrir painel de máquina | Selecionar um cartão de máquina | O sistema navega para `/maquinas/{id}/dashboard` da máquina selecionada. |
| FRO-04 | Frota sem máquinas | Retornar uma lista vazia pela API | A tela informa que não há máquinas cadastradas e não exibe totais ou cartões incorretos. |
| FRO-05 | API indisponível | Abrir a tela com a API inacessível | A mensagem de falha é apresentada e a tela continua tentando atualizar sem travar. |
| FRO-06 | Atualização periódica | Alterar os dados de teste da API com a tela aberta | A frota e seus indicadores são atualizados; os totais continuam consistentes. |

#### Tela 2 — Simulador de Telemetria

| ID | Cenário | Procedimento | Resultado esperado |
|---|---|---|---|
| SIM-01 | Carregar destinos | Abrir `/simulador` com frota disponível | As máquinas e os pneus são carregados; um destino inicial válido é selecionado quando disponível. |
| SIM-02 | Trocar máquina | Selecionar outra máquina | O pneu selecionado passa a pertencer à máquina escolhida. |
| SIM-03 | Aplicar cenário predefinido | Selecionar Normal, Alerta Médio, Crítico ou Deflação gradual | Pressão, temperatura e horas de uso assumem os valores definidos para o cenário. |
| SIM-04 | Ajustar parâmetros | Alterar os controles de pressão, temperatura e horas de uso até os limites mínimo e máximo | Os valores apresentados acompanham os controles e permanecem dentro dos intervalos configurados. |
| SIM-05 | Enviar leitura manual | Selecionar destino e acionar “Enviar leitura” | A leitura é enviada; o resultado mostra o nível de risco, a confiança e a ação recomendada, e o registro aparece no histórico. |
| SIM-06 | Valor fora do intervalo | Tentar enviar valores inválidos por meio de resposta controlada da API | A tela apresenta mensagem de valor fora do intervalo e não exibe um resultado de sucesso incorreto. |
| SIM-07 | Falha de API ou token | Simular API indisponível ou resposta HTTP 401 | A tela informa a falha de envio ou a necessidade de token sem encerrar a aplicação. |
| SIM-08 | Modo automático | Iniciar o modo automático, aguardar mais de um intervalo e parar | Leituras são enviadas no intervalo selecionado; controles de destino e parâmetros ficam desabilitados durante a execução e o modo pode ser interrompido. |
| SIM-09 | Deflação gradual automática | Selecionar o cenário de deflação e iniciar o modo automático | As leituras seguem a sequência decrescente de pressão configurada e aparecem no histórico. |
| SIM-10 | Sem pneus disponíveis | Usar uma frota sem pneus | O envio permanece desabilitado e a tela não tenta enviar leitura sem destino. |

### 4.2. Testes de Segurança

- Confirmar que os testes de envio usam somente ambiente e dados de desenvolvimento.
- Verificar que a API exige o token de escrita quando essa configuração estiver habilitada e retorna erro sem o token válido.
- Verificar que erros da API não expõem credenciais ou valores secretos na interface.
- Autenticação de usuário, armazenamento de senha, bloqueio de tentativas e segundo fator não se aplicam às telas atuais, pois o projeto não implementa login.

### 4.3. Testes de Usabilidade

- Verificar se rótulos, unidades (PSI, °C e horas) e níveis de risco são compreensíveis.
- Verificar se as mensagens de carregamento, lista vazia e erro indicam claramente o estado do sistema.
- Confirmar que cartões e botões possuem área de interação e foco visível por teclado.
- Avaliar o uso do Simulador sem instruções adicionais, incluindo identificação do modo manual/automático e do resultado da previsão.
- Testar layout em desktop, tablet e celular, garantindo que controles e cartões não se sobreponham e permaneçam utilizáveis.

### 4.4. Testes de Desempenho

- Medir o carregamento inicial de cada tela em conexão estável; meta: conteúdo principal visível em até 3 segundos.
- Medir envio manual do simulador até a apresentação do resultado; meta: resposta em até 3 segundos em ambiente de teste estável.
- Observar se a atualização periódica da Frota mantém a interação responsiva.
- Repetir medições em rede mais lenta e registrar os tempos, sem tratar o limite de 3 segundos como garantido em condição de rede degradada.

### 4.5. Testes de Compatibilidade

- Navegadores: versões atuais de Chrome, Firefox e Safari.
- Dispositivos e larguras: desktop (≥ 1280 px), tablet (768–1024 px) e celular (360–430 px).
- Confirmar navegação, seleção de controles, leitura dos estados e ausência de rolagem horizontal indevida.

## 5. Critérios de Aceitação

- A Frota apresenta dados e indicadores consistentes com a resposta da API e abre o painel da máquina selecionada.
- Estados de carregamento, lista vazia e erro são exibidos de forma compreensível.
- O Simulador seleciona destinos válidos, aplica cenários e envia leituras dentro dos intervalos aceitos pela API.
- O resultado do modelo e o histórico correspondem às leituras enviadas; falhas são comunicadas sem travar a tela.
- O modo automático inicia e pode ser interrompido; os controles são bloqueados enquanto estiver ativo.
- O conteúdo principal carrega em até 3 segundos e o envio manual retorna em até 3 segundos no ambiente de teste estável.
- As duas telas permanecem utilizáveis nos navegadores e dimensões definidos na seção 4.5.
- Não são critérios para este sistema login, criptografia de senha ou bloqueio de tentativas, pois não há autenticação de usuário implementada.

## 6. Critérios de Entrada e Saída

**Entrada:** aplicação disponível; ambiente de desenvolvimento configurado; banco com máquinas, pneus e leituras de teste; token de escrita de teste configurado quando necessário; navegadores e dispositivos definidos disponíveis.

**Saída:** todos os casos executados e registrados; nenhum defeito crítico ou alto em aberto nos fluxos principais; falhas restantes documentadas com evidências e encaminhamento para correção.

## 7. Cronograma de Testes

| Fase | Data de início | Data de conclusão |
|---|---:|---:|
| Preparação do ambiente e dos dados | 02/10/2026 | 05/10/2026 |
| Execução dos testes funcionais e de usabilidade | 06/10/2026 | 09/10/2026 |
| Compatibilidade, desempenho e registro de defeitos | 13/10/2026 | 14/10/2026 |
| Revisão e reteste de correções | 15/10/2026 | 16/10/2026 |

## 8. Recursos

- Computador com acesso ao TirePredict, à API e ao banco de desenvolvimento.
- Navegadores Chrome, Firefox e Safari; celular e tablet ou emuladores de viewport.
- Dados de teste de máquinas, pneus e leituras para cobrir níveis de risco diferentes.
- Ferramentas de desenvolvedor do navegador e cliente HTTP para inspecionar chamadas e tempos da API.
- Token de escrita de desenvolvimento, se exigido pela configuração da API.

## 9. Riscos e Mitigação

- **API, banco ou modelo indisponível:** verificar `/health` antes da execução e registrar se a falha pertence ao ambiente ou à aplicação.
- **Dados de teste incompletos ou inconsistentes:** preparar previamente máquinas, pneus e leituras com resultados esperados conhecidos.
- **Envio de telemetria alterar dados compartilhados:** executar os casos somente em ambiente de desenvolvimento com dados descartáveis ou identificados para teste.
- **Token ausente ou inválido:** confirmar a configuração de teste antes dos casos de sucesso e manter casos separados para validar a resposta 401.
- **MQTT sem conexão:** os testes destas duas telas usam a API; registrar o estado do MQTT, mas não bloquear os testes que não dependem dele.
- **Diferenças entre navegadores ou tamanhos de tela:** registrar versão, dispositivo, largura e evidência visual para facilitar a reprodução.
