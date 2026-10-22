const router = require('express').Router();
const db = require('../db');

// GET /eventos -> lista eventos com categoria e vagas restantes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.titulo, e.descricao, e.data_evento, e.local, e.vagas,
             c.nome AS categoria,
             e.vagas - COUNT(i.id) AS vagas_restantes
      FROM eventos e
      JOIN categorias c ON c.id = e.categoria_id
      LEFT JOIN inscricoes i ON i.evento_id = e.id
      GROUP BY e.id, c.nome
      ORDER BY e.data_evento`);
    res.json(rows);
  } catch (err) {
    console.log(err); // <--- ADICIONA ESTA LINHA AQUI
    res.status(500).json({ erro: 'Erro ao buscar eventos' });
  }
});

// GET /eventos/:id -> detalha um evento
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.titulo, e.descricao, e.data_evento, e.local, e.vagas,
             c.nome AS categoria,
             e.vagas - COUNT(i.id) AS vagas_restantes
      FROM eventos e
      JOIN categorias c ON c.id = e.categoria_id
      LEFT JOIN inscricoes i ON i.evento_id = e.id
      WHERE e.id = ?
      GROUP BY e.id, c.nome`, [id]);

    if (rows.length === 0) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar evento' });
  }
});

// GET /eventos/:id/inscritos -> lista inscritos no evento
router.get('/:id/inscritos', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.nome, p.email, p.turma, i.data_inscricao
      FROM inscricoes i
      JOIN participantes p ON p.id = i.participante_id
      WHERE i.evento_id = ?`, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar inscritos' });
  }
});

// POST /eventos -> cria evento
router.post('/', async (req, res) => {
  const { titulo, descricao, data_evento, local, vagas, categoria_id } = req.body;
  if (!titulo || !data_evento || !local || !vagas || !categoria_id) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO eventos (titulo, descricao, data_evento, local, vagas, categoria_id) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo, descricao || null, data_evento, local, vagas, categoria_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar evento' });
  }
});

// PUT /eventos/:id -> atualiza evento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, data_evento, local, vagas, categoria_id } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE eventos SET titulo = ?, descricao = ?, data_evento = ?, local = ?, vagas = ?, categoria_id = ? WHERE id = ?',
      [titulo, descricao || null, data_evento, local, vagas, categoria_id, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.json({ mensagem: 'Evento atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar evento' });
  }
});

// DELETE /eventos/:id -> remove evento
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM eventos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover evento' });
  }
});

module.exports = router;