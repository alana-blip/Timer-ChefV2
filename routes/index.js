const express = require('express');
const router = express.Router();
const Timer = require('../models/Timer');

router.get('/', (req, res) => {
    const { min, seg, nome } = req.query;
    res.render('index', {
        timerAtivo: {
            nome: nome || 'Cronômetro Principal',
            minutos: min !== undefined ? parseInt(min) : 0,
            segundos: seg !== undefined ? parseInt(seg) : 0
        },
        rotaAtual: 'inicio'
    });
});

router.post('/finalizar-timer', (req, res) => {
    const minutos = parseInt(req.body.minutos) || 0;
    const segundos = parseInt(req.body.segundos) || 0;

    // Salva na sessão para usar na confirmação (e caso precise logar antes)
    req.session.tempTimer = { minutos, segundos };

    res.render('salvar_pos_timer', {
        minutos,
        segundos,
        rotaAtual: 'inicio'
    });
});

router.get('/salvar-timer', (req, res) => {
    if (!req.session.tempTimer) return res.redirect('/');
    res.render('salvar_pos_timer', {
        minutos: req.session.tempTimer.minutos,
        segundos: req.session.tempTimer.segundos,
        rotaAtual: 'inicio'
    });
});

router.post('/salvar-timer-confirmar', async (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    const { nome, minutos, segundos } = req.body;
    const minFinal = req.session.tempTimer ? req.session.tempTimer.minutos : (parseInt(minutos) || 0);
    const segFinal = req.session.tempTimer ? req.session.tempTimer.segundos : (parseInt(segundos) || 0);

    await Timer.create({
        nome: nome || 'Meu Cronômetro',
        minutos: minFinal,
        segundos: segFinal,
        usuarioId: req.session.usuario.id
    });

    delete req.session.tempTimer;
    res.redirect('/salvos');
});

module.exports = router;