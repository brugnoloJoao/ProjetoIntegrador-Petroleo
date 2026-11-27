import React, { useEffect, useRef } from 'react';

// Aviso mostrado antes de forçar uma falha quando ainda não dá para forçar.
export default function AvisoFalha({ tipo, podeAtivar, ocupado, urlParametros, onConfirmar, onFechar }) {
  const principal = useRef(null);
  useEffect(() => {
    principal.current?.focus();
    const aoApertar = (evento) => { if (evento.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', aoApertar);
    return () => window.removeEventListener('keydown', aoApertar);
  }, []);

  const pausada = tipo === 'pausada';
  return (
    <div className="ps-dialogo-fundo" onClick={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
      <div className="ps-dialogo" role="dialog" aria-modal="true" aria-labelledby="aviso-falha-titulo">
        <h2 id="aviso-falha-titulo">{pausada ? 'A simulação está pausada' : 'Equipamento sem parâmetros'}</h2>
        <p>
          {pausada
            ? podeAtivar
              ? 'Para forçar uma falha é preciso entrar no modo simulação. Deseja ativar agora?'
              : 'Para forçar uma falha é preciso entrar no modo simulação. Peça a um engenheiro ou gestor para ativá-lo.'
            : 'Sem parâmetros não há leituras para a falha. Cadastre pelo menos um neste equipamento.'}
        </p>
        <div className="ps-dialogo-acoes">
          <button type="button" className="btn btn-outline-secondary" onClick={onFechar} ref={pausada && podeAtivar ? null : principal}>
            {pausada && podeAtivar ? 'Cancelar' : 'Entendi'}
          </button>
          {pausada && podeAtivar && (
            <button type="button" className="btn btn-primary" onClick={onConfirmar} disabled={ocupado} ref={principal}>
              {ocupado ? 'Ativando…' : 'Ativar simulação e forçar falha'}
            </button>
          )}
          {!pausada && urlParametros && podeAtivar && <a className="btn btn-primary" href={urlParametros}>Ver o equipamento</a>}
        </div>
      </div>
    </div>
  );
}
