namespace ProjetoIntegrador_Petroleo.Services;

public sealed class Maquina3DControleEstado
{
    private readonly object _sync = new();
    private double _cadencia = 10.5;
    private bool _falhaSimulada;

    public Maquina3DControleSnapshot Ler()
    {
        lock (_sync)
            return new Maquina3DControleSnapshot(_cadencia, _falhaSimulada);
    }

    public Maquina3DControleSnapshot Atualizar(double cadencia, bool falhaSimulada)
    {
        lock (_sync)
        {
            _cadencia = cadencia;
            _falhaSimulada = falhaSimulada;
            return new Maquina3DControleSnapshot(_cadencia, _falhaSimulada);
        }
    }
}

public sealed record Maquina3DControleSnapshot(double Cadencia, bool FalhaSimulada);
