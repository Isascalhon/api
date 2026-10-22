const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API}${path}`, options);
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se ela está rodando em localhost:3333.');
  }
  const dados = response.status === 204 ? null : await response.json().catch(() => ({}));
  return { response, dados };
}

export async function getEventos() {
  const { response, dados } = await request('/eventos', { cache: 'no-store' });
  if (!response.ok) throw new Error(dados.erro || 'Erro ao buscar eventos.');
  return dados;
}

export async function getParticipantes() {
  const { response, dados } = await request('/participantes', { cache: 'no-store' });
  if (!response.ok) throw new Error(dados.erro || 'Erro ao buscar participantes.');
  return dados;
}

export async function cadastrarParticipante(participante) {
  return request('/participantes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(participante) });
}

export async function inscrever(evento_id, participante_id) {
  return request('/inscricoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento_id: Number(evento_id), participante_id: Number(participante_id) }) });
}

export async function getInscritos(eventoId) {
  const { response, dados } = await request(`/eventos/${eventoId}/inscritos`, { cache: 'no-store' });
  if (!response.ok) throw new Error(dados.erro || 'Erro ao buscar inscritos.');
  return dados;
}
