# PetroSync: mapeamento do repositório

Retrato do código antes das atualizações (branch `main`, commit `2fd8e44`).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Web | ASP.NET Core MVC (.NET 10), Razor, Identity |
| Tempo real | SignalR (`/hubs/dashboard`) |
| Dados | EF Core 10 + SQL Server (LocalDB no desenvolvimento, Cloud SQL em produção) |
| Frontend | Vite 7: React 19 (dashboard, máquina 3D, login), Vue 3 (filtros), Three.js, Chart.js |
| Entrega | GitHub Actions (CI e CD), Docker, Google Cloud Run |

## Estrutura

```text
.github/workflows/          ci.yml (build) e deploy.yml (Cloud Run a cada push na main)
ProjetoIntegrador-Petroleo/
  Program.cs                serviços, rotas, migrations e seeds na inicialização
  Controllers/
    HomeController          dashboard, indicadores, histórico do gráfico, exportação CSV
    AtivosController        CRUD de ativos (Engenheiro, Gestor)
    ParametrosController    CRUD de parâmetros (Engenheiro, Gestor)
    AlertasController       lista e reconhecimento de alertas
    HistoricoController     consulta de leituras por período
    AnomaliasController     anomalias (Engenheiro, Gestor)
    RiscoController         ranking de risco de falha (Engenheiro, Gestor)
    OrdemServicoController  OS: abrir, atribuir, aprovar, iniciar, encerrar
    OperadorController      tela Máquina 3D (Operador)
    SimuladorController     liga e pausa o simulador (Engenheiro, Gestor)
    UsuariosController      usuários (Gestor)
  Models/                   Ativo, Parametro, Leitura, Alerta, Anomalia, OrdemServico, Enums
  Data/                     AppDbContext, IdentitySeed, DemoDataSeed
  Services/                 SimuladorLeituras (a cada 5 s), estado do simulador e dos controles 3D
  Hubs/DashboardHub         hub SignalR autenticado
  Migrations/               6 migrations
  Views/ e Areas/Identity/  telas Razor e login
  frontend/src/             fontes React, Vue e Three.js
  wwwroot/dist/             saída do Vite, versionada no Git
```

## Modelo de dados

```text
Ativo 1─N Parametro 1─N Leitura
                    1─N Alerta
                    1─N Anomalia
Ativo 1─N OrdemServico N─0..1 Alerta
                       N─0..1 IdentityUser (operador)
```

## Fluxos

1. **Simulador**: para cada parâmetro de ativo "Operando", gera um valor, verifica anomalia
   (z-score acima de 3, mínimo de 20 leituras, uma a cada 5 minutos), grava a leitura, abre,
   escala ou normaliza o alerta e envia `NovasLeituras` pelo SignalR.
2. **OS**: `Aberta` → `Aprovada` ou `Rejeitada` (Gestor) → `Em andamento` (Engenheiro,
   ativo vai para manutenção) → `Encerrada` (Engenheiro, ativo volta a operar).
3. **Máquina 3D**: o servidor entrega o estado inicial em `data-machine`; o React assina o
   SignalR e envia velocidade e falha por POST com token antifalsificação.

## Pontos de atenção encontrados no código

- A máquina 3D é um único modelo (`Maquina3D.jsx`) com pinos de tags fixas que não existem no banco.
- Velocidade e falha são globais e valem só para o primeiro ativo em operação.
- O bloqueio de OS duplicada por alerta existe apenas ao abrir o formulário, não ao salvar.
- O deploy não roda `npm run build`: toda mudança no frontend exige compilar e versionar `wwwroot/dist`.
- Migrations rodam sozinhas ao iniciar, inclusive em produção.
- A branch `origin/front` é uma reescrita separada do frontend; não foi usada nem alterada.

## Como rodar localmente

```powershell
cd ProjetoIntegrador-Petroleo\frontend; npm ci; npm run build
```

```powershell
cd ProjetoIntegrador-Petroleo; dotnet run
```

Abre em `http://localhost:5153`. No ambiente `Development` o sistema cria o banco no
LocalDB, os usuários de teste (ver `Data/IdentitySeed.cs`) e os ativos de demonstração.
