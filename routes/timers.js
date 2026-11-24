const express = require('express');
const router = express.Router();
const Timer = require('../models/Timer');

const precisaEstarLogado = (req, res, next) => {
    if (!req.session.usuario) return res.redirect('/cadastro');
    next();
};

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

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ sucesso: true, timer: novoTimer });
        }

        res.redirect('/salvos');
    } catch (erro) {
        console.error('Erro ao salvar timer:', erro);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ sucesso: false, erro: 'Erro ao salvar' });
        }
        res.redirect('/');
    }
});

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

router.post('/deletar/:id', precisaEstarLogado, async (req, res) => {
    await Timer.findOneAndDelete({
        _id: req.params.id,
        usuarioId: req.session.usuario.id
    });
    res.redirect('/salvos');
});

module.exports = router;