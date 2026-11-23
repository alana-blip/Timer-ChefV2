const express = require('express');
const router = express.Router();
const Timer = require('../models/Timer');

const precisaEstarLogado = (req, res, next) => {
    if (!req.session.usuario) return res.redirect('/cadastro');
    next();
};

// LISTAR CRONÔMETROS SALVOS
router.get('/', precisaEstarLogado, async (req, res) => {
    const timers = await Timer.find({
        usuarioId: req.session.usuario.id
    }).sort({ criadoEm: -1 });
    res.render('salvos', { timers, rotaAtual: 'salvos' });
});

router.post('/', precisaEstarLogado, async (req, res) => {
    try {
        const { nome, minutos, segundos } = req.body;

        const novoTimer = await Timer.create({
            nome: nome || 'Cronômetro sem nome',
            minutos: parseInt(minutos) || 0,
            segundos: parseInt(segundos) || 0,
            usuarioId: req.session.usuario.id
        });

        // Se a requisição veio pelo JavaScript (modal), responde em JSON sem recarregar
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ sucesso: true, timer: novoTimer });
        }

        // Caso contrário, mantém o redirecionamento normal
        res.redirect('/salvos');
    } catch (erro) {
        console.error('Erro ao salvar timer:', erro);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar' });
        }
        res.redirect('/');
    }
});

// EDITAR CRONÔMETRO
router.post('/editar/:id', precisaEstarLogado, async (req, res) => {
    const { nome, minutos, segundos } = req.body;

    await Timer.findOneAndUpdate(
        { _id: req.params.id, usuarioId: req.session.usuario.id },
        {
            nome,
            minutos: parseInt(minutos) || 0,
            segundos: parseInt(segundos) || 0
        }
    );
    res.redirect('/salvos');
});

// DELETAR CRONÔMETRO (Corrigido req.session.usuario.id)
router.post('/deletar/:id', precisaEstarLogado, async (req, res) => {
    await Timer.findOneAndDelete({
        _id: req.params.id,
        usuarioId: req.session.usuario.id
    });
    res.redirect('/salvos');
});

module.exports = router;