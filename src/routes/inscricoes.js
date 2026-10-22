const router = require('express').Router();
const db = require('../db');

// POST /inscricoes -> inscreve participante com validação de vaga
router.post('/', async (req, res) => {
  const { evento_id, participante_id } = req.body;
  if (!evento_id || !participante_id) {
    return res.status(400).json({ erro: 'Evento e participante são obrigatórios' });
  }
  try {
    const [eventos] = await db.query(`
      SELECT e.vagas - COUNT(i.id) AS vagas_restantes
      FROM eventos e
      LEFT JOIN inscricoes i ON i.evento_id = e.id
      WHERE e.id = ?
      GROUP BY e.id`, [evento_id]);

    if (eventos.length === 0) return res.status(404).json({ erro: 'Evento não encontrado' });
    if (eventos[0].vagas_restantes <= 0) return res.status(409).json({ erro: 'Evento lotado' });

    const [result] = await db.query(
      'INSERT INTO inscricoes (evento_id, participante_id) VALUES (?, ?)',
      [evento_id, participante_id]
    );
    res.status(201).json({ id: result.insertId, mensagem: 'Inscrição realizada com sucesso' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Participante já inscrito neste evento' });
    }
    res.status(500).json({ erro: 'Erro ao realizar inscrição' });
  }
});

// DELETE /inscricoes/:id -> cancela inscrição
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM inscricoes WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Inscrição não encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao cancelar inscrição' });
  }
});

module.exports = router;