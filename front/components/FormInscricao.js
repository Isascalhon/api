'use client';

import { useState } from 'react';

export default function FormInscricao({ eventos, participantes, onInscrever }) {
  const [eventoId, setEventoId] = useState('');
  const [participanteId, setParticipanteId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const eventosAbertos = eventos.filter(e => Number(e.vagas_restantes) > 0);
  async function submit(e) {
    e.preventDefault(); setEnviando(true);
    try { await onInscrever(eventoId, participanteId); }
    finally { setEnviando(false); }
  }
  return <form onSubmit={submit} className="form-stack">
    <label>Evento<select value={eventoId} onChange={e => setEventoId(e.target.value)} required><option value="">Selecione um evento</option>{eventosAbertos.map(e => <option key={e.id} value={e.id}>{e.titulo} · {e.vagas_restantes} vaga(s)</option>)}</select></label>
    <label>Participante<select value={participanteId} onChange={e => setParticipanteId(e.target.value)} required><option value="">Selecione um participante</option>{participantes.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.turma}</option>)}</select></label>
    {eventosAbertos.length === 0 && <p className="muted">Não há eventos com vagas disponíveis no momento.</p>}
    {participantes.length === 0 && <p className="muted">Cadastre um participante para fazer a inscrição.</p>}
    <button className="button button-primary" disabled={enviando || !eventosAbertos.length || !participantes.length}>{enviando ? 'Confirmando...' : 'Confirmar inscrição'} <span aria-hidden="true">→</span></button>
  </form>;
}
