'use client';

import { useState } from 'react';

export default function FormParticipante({ onCadastrar }) {
  const [form, setForm] = useState({ nome: '', email: '', turma: '' });
  const [enviando, setEnviando] = useState(false);
  async function submit(e) {
    e.preventDefault(); setEnviando(true);
    try { await onCadastrar(form); setForm({ nome: '', email: '', turma: '' }); }
    finally { setEnviando(false); }
  }
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  return <form onSubmit={submit} className="form-stack">
    <label>Nome completo<input name="nome" value={form.nome} onChange={change} placeholder="Ex.: Ana Souza" required maxLength={120} /></label>
    <label>E-mail<input name="email" type="email" value={form.email} onChange={change} placeholder="ana@escola.com" required maxLength={150} /></label>
    <label>Turma<input name="turma" value={form.turma} onChange={change} placeholder="Ex.: 2º ano B" required maxLength={30} /></label>
    <button className="button button-primary" disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar participante'} <span aria-hidden="true">→</span></button>
  </form>;
}
