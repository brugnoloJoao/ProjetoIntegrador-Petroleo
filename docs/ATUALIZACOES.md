# PetroSync: atualizações desta etapa

Branch local `feature/maquinas-refinaria`, a partir da `main` (commit `2fd8e44`).
O retrato anterior do código está em [MAPEAMENTO.md](MAPEAMENTO.md).

## O que mudou

### Máquinas 3D
- Sete modelos: unidade de bombeio (a original), bomba centrífuga, compressor, forno,
  trocador casco e tubo, coluna de destilação e tanque.
- Um arquivo por modelo em `frontend/src/operator/modelos/`, baixado só quando usado.
- O campo **Tipo** do ativo escolhe o modelo. Tipo desconhecido mostra a unidade de bombeio.
- Seletor de equipamento, velocidade e falha simulada **por máquina**, e atalho "OS pronta".
- Nova rota `/Maquina3D` para Operador, Engenheiro e Gestor. `/Operador/Maquina3D` redireciona.

### Manutenção e ordens de serviço
- Tela **Rotinas de manutenção** (Engenheiro e Gestor): rotina por tipo de máquina ou por
  equipamento, com etapas, peças, parâmetro que a aciona e intervalo em dias.
- Painel **Ordens sugeridas**: nasce dos alertas abertos e das rotinas vencidas. Nada é
  gravado antes de alguém confirmar.
- A OS ganhou tipo de manutenção (obrigatório ao abrir), origem, peças e checklist.
- O bloqueio de duplicata agora vale também ao salvar.
- Fluxo de aprovação, início e encerramento sem alteração.

### Registro de ocorrências
- A sugestão de OS criada por alerta **não some quando o valor volta ao normal**. Ela fica,
  uma por parâmetro e com a contagem de ocorrências, até alguém abrir uma OS. Uma OS cobre o
  parâmetro enquanto está aberta e, depois, o que normalizou até ela terminar (encerrada ou
  rejeitada). Não há botão para dispensar uma sugestão.
- Tela **Ocorrências** (Operador, Engenheiro e Gestor): linha do tempo por máquina com
  alertas (valor detectado, maior valor, quando normalizou, duração, reconhecimento e OS),
  anomalias (Engenheiro e Gestor) e ordens abertas, decididas e encerradas. O operador vê só
  as próprias ordens. Dados simulados aparecem identificados, mesmo com a simulação pausada.
- A OS aberta por um alerta grava na descrição o maior valor e o retorno ao normal.
- Maior valor e retorno ao normal são calculados a partir das leituras já gravadas, com o
  limite de atenção atual do parâmetro. O fluxo de alertas e o banco não mudaram.

### Gráficos
- Chart.js substituído por ECharts no dashboard e no Histórico (com zoom por intervalo).
- O gráfico do dashboard misturava horário UTC e local; agora usa o horário de Brasília.

### Banco
Migration `20261126040049_RotinasEChecklistOrdemServico`, só com acréscimos:
tabelas `RotinasManutencao` e `OrdensServicoItens`; colunas opcionais `TipoManutencao`,
`Origem` e `PecasMateriais` em `OrdensServico`. O snapshot foi atualizado pela ferramenta
do EF (só linhas adicionadas). Migrations antigas não foram editadas.

## Decisões em aberto do plano e o que foi adotado

| # | Pergunta | Decisão |
| --- | --- | --- |
| 1 | Campo ou refinaria | A máquina atual continua como campo de produção; as novas são de refinaria |
| 2 | Quais máquinas | As seis sugeridas |
| 3 | Engenheiro e gestor na tela 3D | Veem e controlam, como o operador |
| 4 | Ativos em produção | Seed continua desligado na nuvem; cadastrar pela tela de Ativos |
| 5 | OS automática | Opção A: o sistema sugere e uma pessoa confirma |
| 6 | Rotina por máquina ou tipo | As duas formas |
| 7 | Quem cadastra rotinas | Engenheiro e Gestor |
| 8 | Preventiva por data | Sim, como sugestão calculada na consulta, sem serviço em segundo plano |

## Compatibilidade
- O evento SignalR `EstadoMaquina3DAlterado` ganhou o campo `ativoId`. Os campos
  anteriores e os outros eventos não mudaram.
- Sem alteração em login, perfis, seed de usuários, hub, Dockerfile, workflows e `appsettings`.
- Limites de alerta e anomalia do simulador sem alteração; mudou apenas qual controle de
  velocidade e falha cada máquina usa.

## Antes de publicar
1. Enviar para a `main` dispara o deploy e aplica a migration no Cloud SQL. Faça backup antes.
2. Versione `wwwroot/dist` junto: o deploy não compila o frontend.
3. Em produção, cadastre os ativos (com um dos tipos sugeridos), os parâmetros e as rotinas.
   Para o simulador entrar na lógica de falha, o nome do parâmetro deve conter
   `temper`, `press`, `vibra` ou `vaz`.
4. Os limites e rotinas de demonstração são ilustrativos; use os valores dos manuais.
5. No relatório do PINT, atualizar a tabela de tecnologias (React, Vue, Three.js, ECharts)
   e descrever rotinas, sugestões e checklist.

## Verificação feita
- Compilação .NET (Debug e Release) sem avisos e build do frontend.
- Teste de ponta a ponta local com os três perfis, em banco LocalDB temporário criado no
  estado anterior e atualizado pela nova migration: acessos, controles por máquina, OS por
  alerta e por rotina, permissões, checklist, cadastro de rotinas e exclusão de ativo.
- Conferência visual no navegador das máquinas, das telas de OS e rotinas e dos gráficos.
- Registro de ocorrências: teste próprio (alerta que normaliza, cobertura por OS, rejeição,
  acesso por perfil, simulação pausada) e repetição do teste anterior, sem falhas.
- Não verificado: Docker, CI, Cloud Run e dados vindos de IoT. A verificação de limites
  continua dentro do simulador; leituras de sensor ainda precisam ser ligadas a ela.

## Problemas antigos observados e não alterados
- `_Layout.cshtml` aponta para `ProjetoIntegrador_Petroleo.styles.css`, que retorna 404.
- Lista e detalhes de OS mostram datas em UTC.
- Na tela de Alertas, o botão "Abrir OS" aparece só para o Engenheiro.

## Efeitos visuais do login
- **Bola que inverte as cores** (`frontend/src/effects/bola-inversora.js`): segue o mouse,
  cresce sobre o título e fica pequena sobre o formulário. Não bloqueia cliques e não
  aparece em celular ou tablet. Com animações reduzidas no sistema, acompanha sem deslizar.
- **Transição de entrada** (`frontend/src/entrada.js`): após o login, um círculo se abre a
  partir do botão e revela o sistema. Não roda com senha errada, em navegação comum nem com
  animações reduzidas. Se o script falhar, a cortina some sozinha em 4 segundos.
- Biblioteca nova: **GSAP** (licença gratuita própria, <https://gsap.com/standard-license>).
- Com autorização do usuário, a aparência do login mudou. As páginas `.cshtml` do login e a
  autenticação não foram editadas; o `_Layout.cshtml` recebeu o script da transição.

## Animações e alarme dentro do sistema
- **Transição entre telas:** View Transitions do navegador (regras em `site.css`). O menu
  fica parado e o conteúdo troca suavemente. Navegador sem suporte troca como antes.
- **Gráficos** (`charts/linha.js`): a linha se desenha da esquerda para a direita quando o
  gráfico aparece e quando muda o sensor; leitura nova só avança o final.
- **Números** (`effects/contagem.js`): indicadores sobem de zero em cerca de 1 segundo
  (atributo `data-contar` nas telas Razor, `NumeroAnimado` no React). Mudanças ao vivo vão
  do valor anterior ao novo; leituras da tela 3D nunca partem de zero. Medições listadas em
  tabelas não são animadas.
- **Alarme crítico** (`effects/alarme.js`): aviso em qualquer tela, com borda pulsante e som,
  até alguém clicar em "Ver ocorrências" ou "Entendi", com opção de silenciar. Inclui
  críticos sem reconhecimento, em aberto ou normalizados há menos de 10 minutos. Fechar o
  aviso não reconhece o alerta no sistema. O som depende de um clique na página (regra do
  navegador). Um novo login mostra o aviso de novo.
- **Contador no menu:** alertas ativos ao lado de "Alertas", pulsando quando aumenta.
- Nova consulta `GET /Alertas/Resumo` (usuário autenticado, somente leitura), feita a cada
  5 segundos. SignalR, banco e lógica de alertas sem alteração.
- Com animações reduzidas no sistema operacional, nada se move.

Verificação: teste do resumo e das telas, conferência no navegador e, num navegador headless
isolado, transição concluída em 12 telas e som, silenciar e "Entendi" funcionando.

## Alertas novos e detalhes do alerta
- Na lista, alerta ativo que a pessoa ainda não abriu tem faixa laranja suave e selo "Novo".
- Clicar na linha (ou no item do alarme) abre `/Alertas/Detalhes/{id}`: valor, limite,
  horário, evolução, gráfico em torno do alerta, rotinas indicadas, 3D, ocorrências,
  reconhecer (Operador e Engenheiro) e abrir OS.
- **Visto** (só para quem abriu, guardado no navegador por usuário): sai do destaque, do
  alarme e do contador do menu, que passa a contar os **alertas ativos ainda não abertos**.
  O cartão "Alertas ativos" do painel não muda só por olhar.
- **Atendido** (para todos): abrir uma OS a partir do alerta marca como "Reconhecido" o
  alerta de origem e o ativo do mesmo sensor, com a observação "Ordem de serviço #n aberta.".
  Vale para quem abrir a OS, inclusive o Gestor, que continua sem o botão "Reconhecer".
  O alerta segue até as leituras normalizarem; rejeitar a OS não desfaz o reconhecimento.
  Enquanto está reconhecido, ele não conta como ativo (inclusive no status da tela 3D).

## Fora desta etapa
Câmera da máquina 3D apontando a peça com falha e confirmação de presença do operador.
