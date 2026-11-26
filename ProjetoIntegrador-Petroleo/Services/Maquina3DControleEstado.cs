using System.Collections.Concurrent;

namespace ProjetoIntegrador_Petroleo.Services;

// Velocidade e falha simulada de cada máquina 3D. Ficam em memória e valem por ativo.
public sealed class Maquina3DControleEstado
{
    public const double CadenciaNominal = 10.5;

    private static readonly Maquina3DControleSnapshot Padrao = new(CadenciaNominal, false);
    private readonly ConcurrentDictionary<int, Maquina3DControleSnapshot> _porAtivo = new();

    public Maquina3DControleSnapshot Ler(int ativoId) =>
        _porAtivo.GetValueOrDefault(ativoId, Padrao);

    public Maquina3DControleSnapshot Atualizar(int ativoId, double cadencia, bool falhaSimulada) =>
        _porAtivo[ativoId] = new Maquina3DControleSnapshot(cadencia, falhaSimulada);
}

public sealed record Maquina3DControleSnapshot(double Cadencia, bool FalhaSimulada);
