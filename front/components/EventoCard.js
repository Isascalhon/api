'use client';

import { useState } from 'react';
import { getInscritos } from '@/lib/api';

export default function EventoCard({ evento }) {
  const [aberto, setAberto] = useState(false);
  const [inscritos, setInscritos] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const lotado = Number(evento.vagas_restantes) <= 0;

  async function toggleInscritos() {
    if (aberto) { setAberto(false); return; }
    setAberto(true); setErro(''); setCarregando(true);
    try { setInscritos(await getInscritos(evento.id)); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  const data = new Date(evento.data_evento);
  const dataValida = !Number.isNaN(data.getTime());

  return (
    <article className="event-card">
      <div className="event-card-top"><span className="category">{evento.categoria}</span>{lotado && <span className="full-tag">Lotado</span>}</div>
      <h3>{evento.titulo}</h3>
      {evento.descricao && <p className="description">{evento.descricao}</p>}
      <div className="event-details">
        <p><span className="detail-icon">◷</span>{dataValida ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data a confirmar'}</p>
        <p><span className="detail-icon">⌖</span>{evento.local}</p>
      </div>
      <div className="event-card-bottom"><p className={lotado ? 'spots sold-out' : 'spots'}>{lotado ? 'Todas as vagas foram preenchidas' : <><strong>{evento.vagas_restantes}</strong> {Number(evento.vagas_restantes) === 1 ? 'vaga disponível' : 'vagas disponíveis'}</>}</p>
        <button className="text-button" type="button" onClick={toggleInscritos}>{aberto ? 'Ocultar inscritos' : 'Ver inscritos'} <span aria-hidden="true">{aberto ? '↑' : '→'}</span></button>
      </div>
      {aberto && <div className="attendees"><h4>Participantes inscritos</h4>{carregando ? <p className="muted">Carregando lista...</p> : erro ? <p className="inline-error">{erro}</p> : inscritos.length ? <ul>{inscritos.map(p => <li key={p.id}><span className="avatar-small">{p.nome?.charAt(0)?.toUpperCase()}</span><span>{p.nome}</span><span className="class-label">{p.turma}</span></li>)}</ul> : <p className="muted">Ainda não há inscritos.</p>}</div>}
    </article>
  );
}
