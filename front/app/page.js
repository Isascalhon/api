'use client';

import { useCallback, useEffect, useState } from 'react';
import EventoCard from '@/components/EventoCard';
import FormInscricao from '@/components/FormInscricao';
import FormParticipante from '@/components/FormParticipante';
import { cadastrarParticipante, getEventos, getParticipantes, inscrever } from '@/lib/api';

export default function Home() {
  const [eventos, setEventos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaEventos, listaParticipantes] = await Promise.all([getEventos(), getParticipantes()]);
      setEventos(listaEventos); setParticipantes(listaParticipantes);
    } catch (e) { setMensagem({ tipo: 'erro', texto: e.message }); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregarDados(); }, [carregarDados]);

  async function handleCadastrar(form) {
    try {
      const { response, dados } = await cadastrarParticipante(form);
      if (!response.ok) { setMensagem({ tipo: 'erro', texto: dados.erro || 'Não foi possível cadastrar.' }); return; }
      setMensagem({ tipo: 'sucesso', texto: 'Participante cadastrado com sucesso!' });
      await carregarDados();
    } catch (e) { setMensagem({ tipo: 'erro', texto: e.message }); }
  }
  async function handleInscrever(eventoId, participanteId) {
    try {
      const { response, dados } = await inscrever(eventoId, participanteId);
      if (!response.ok) { setMensagem({ tipo: 'erro', texto: dados.erro || 'Não foi possível concluir a inscrição.' }); return; }
      setMensagem({ tipo: 'sucesso', texto: 'Inscrição realizada com sucesso!' });
      await carregarDados();
    } catch (e) { setMensagem({ tipo: 'erro', texto: e.message }); }
  }

  const categorias = ['Todas', ...new Set(eventos.map(e => e.categoria).filter(Boolean))];
  const eventosFiltrados = eventos.filter(e => (categoria === 'Todas' || e.categoria === categoria) && `${e.titulo} ${e.local} ${e.categoria}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));

  return <main>
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">E</span><span>Evento<span className="brand-light">SENAI</span></span></a><nav><a href="#eventos">Eventos</a><a href="#participantes">Participantes</a><a href="#inscricao" className="nav-cta">Fazer inscrição <span>↗</span></a></nav></header>
    <section className="hero" id="inicio"><div className="hero-content"><div className="eyebrow"><span className="live-dot"/> APRENDER TAMBÉM ACONTECE FORA DA SALA</div><h1>Ideias que viram<br/><span>experiências.</span></h1><p className="hero-copy">Palestras, oficinas e encontros para despertar novas ideias e aprender fazendo. Encontre seu próximo evento.</p><a className="button button-light" href="#eventos">Explorar eventos <span>↓</span></a><div className="hero-meta"><span><strong>{eventos.length.toString().padStart(2, '0')}</strong> eventos na agenda</span><i/><span>Feito para quem quer ir além</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>+</span></div><div className="float-card card-date"><span className="float-icon">✳</span><div><strong>Conhecimento</strong><small>em movimento</small></div></div><div className="float-card card-label"><span className="label-dot"/> APRENDER FAZENDO</div><div className="art-number">01<span> / 03</span></div></div><div className="hero-index">SENAI · EDUCAÇÃO EM MOVIMENTO</div></section>

    <section className="events-section section-wrap" id="eventos"><div className="section-heading"><div><span className="section-kicker">A AGENDA</span><h2>Encontre seu próximo <span>evento.</span></h2><p>Uma agenda feita para curiosos, criativos e quem nunca para de aprender.</p></div><span className="result-count">{eventosFiltrados.length} EVENTO{eventosFiltrados.length === 1 ? '' : 'S'}</span></div>
      <div className="filters"><label className="search-box"><span>⌕</span><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por evento ou local..." aria-label="Buscar eventos"/><kbd>⌘ K</kbd></label><div className="category-filters" aria-label="Filtrar por categoria">{categorias.map(c => <button key={c} onClick={() => setCategoria(c)} className={categoria === c ? 'filter-chip active' : 'filter-chip'}>{c}</button>)}</div></div>
      {carregando ? <div className="loading-state"><span className="spinner"/>Buscando eventos na agenda...</div> : eventosFiltrados.length ? <div className="events-grid">{eventosFiltrados.map(e => <EventoCard key={e.id} evento={e}/>)}</div> : <div className="empty-state"><span>✳</span><h3>Nenhum evento por aqui</h3><p>Tente mudar a busca ou confira novamente em breve.</p></div>}
    </section>

    <section className="join-section" id="participantes"><div className="join-intro"><span className="section-kicker light-kicker">SUA PRÓXIMA IDEIA COMEÇA AQUI</span><h2>Um cadastro<br/>rápido. Um mundo<br/><span>de possibilidades.</span></h2><p>Faça parte da comunidade EventoSENAI e garanta seu lugar nas próximas experiências.</p><div className="join-decoration">✳</div><span className="join-small">CONHECIMENTO EM MOVIMENTO · SENAI</span></div><div className="form-panel"><div className="panel-heading"><span className="step-number">01</span><div><h3>Entre para a lista.</h3><p>Cadastre seus dados para começar.</p></div></div><FormParticipante onCadastrar={handleCadastrar}/><div className="form-note"><span>◈</span> Seus dados são usados apenas para organizar os eventos.</div></div></section>

    <section className="registration-section section-wrap" id="inscricao"><div className="registration-copy"><span className="section-kicker">PRONTO PARA PARTICIPAR?</span><h2>Seu lugar na<br/><span>próxima experiência.</span></h2><p>Escolha o evento e confirme sua inscrição. Em poucos segundos, você está dentro.</p><div className="step-line"><span>01</span><i/><span>02</span><i/><span>03</span><small>ESCOLHA · CONFIRME · PARTICIPE</small></div></div><div className="registration-card"><div className="panel-heading"><span className="step-number orange">02</span><div><h3>Fazer inscrição</h3><p>Selecione o evento e o participante.</p></div></div><FormInscricao eventos={eventos} participantes={participantes} onInscrever={handleInscrever}/><div className="form-note"><span>↗</span> As vagas são atualizadas assim que a inscrição é confirmada.</div></div></section>

    {mensagem && <div className={`toast ${mensagem.tipo}`} role="status"><span>{mensagem.tipo === 'sucesso' ? '✓' : '!'}</span>{mensagem.texto}<button onClick={() => setMensagem(null)} aria-label="Fechar mensagem">×</button></div>}
    <footer><a className="brand footer-brand" href="#inicio"><span className="brand-mark">E</span><span>Evento<span className="brand-light">SENAI</span></span></a><span>Aprender também acontece fora da sala.</span><span className="footer-right">EDUCAÇÃO EM MOVIMENTO · 2026</span></footer>
  </main>;
}
