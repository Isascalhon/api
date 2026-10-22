const router = require('express').Router();
const db = require('../db');

// GET /participantes -> lista participantes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM participantes ORDER BY nome');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar participantes' });
  }
});

// POST /participantes -> cadastra participante
router.post('/', async (req, res) => {
  const { nome, email, turma } = req.body;
  if (!nome || !email || !turma) {
    return res.status(400).json({ erro: 'Nome, e-mail e turma são obrigatórios' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO participantes (nome, email, turma) VALUES (?, ?, ?)',
      [nome, email, turma]
    );
    res.status(201).json({ id: result.insertId, nome, email, turma });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }
    res.status(500).json({ erro: 'Erro ao cadastrar participante' });
  }
});

module.exports = router;