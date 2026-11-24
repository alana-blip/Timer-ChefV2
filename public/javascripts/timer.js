document.addEventListener('DOMContentLoaded', () => {
    const timersContainer = document.getElementById('timers-container');
    const template = document.getElementById('timer-template');
    const btnNovoTimer = document.getElementById('btn-novo-timer');

    const modal = document.getElementById('modal-finalizado');
    const modalTextoTempo = document.getElementById('modal-texto-tempo');
    const modalNomeInput = document.getElementById('modal-nome-timer');
    const btnModalSalvar = document.getElementById('btn-modal-salvar');
    const btnModalFechar = document.getElementById('btn-modal-fechar');

    if (!timersContainer || !template) return;

    const STORAGE_KEY = 'timerchef_ativos';
    let timerFinalizadoAtual = null;
    const listaTimers = []; 

    function salvarEstadoLocal() {
        const dados = listaTimers.map(t => t.getEstado());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    }

    function tocarAlarme() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const notas = [523.25, 659.25, 783.99, 1046.50];
            notas.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.18);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.18 + 0.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(audioCtx.currentTime + idx * 0.18);
                osc.stop(audioCtx.currentTime + idx * 0.18 + 0.4);
            });
        } catch (e) {
            console.warn('Áudio bloqueado pelo navegador:', e);
        }
    }

    function abrirModalFinalizado(dadosTimer) {
        timerFinalizadoAtual = dadosTimer;
        const minStr = String(dadosTimer.minutos).padStart(2, '0');
        const segStr = String(dadosTimer.segundos).padStart(2, '0');
        modalTextoTempo.textContent = `O cronômetro de ${minStr}:${segStr} finalizou!`;
        modal.style.display = 'flex';

        if (modalNomeInput) {
            modalNomeInput.value = dadosTimer.nome || '';
            modalNomeInput.focus();
        }
    }

    if (btnModalSalvar) {
        btnModalSalvar.addEventListener('click', async () => {
            if (!timerFinalizadoAtual) return;

            const nomeFinal = modalNomeInput ? (modalNomeInput.value.trim() || 'Cronômetro sem nome') : 'Cronômetro sem nome';
            btnModalSalvar.disabled = true;
            btnModalSalvar.textContent = 'Salvando...';

            try {
                const resposta = await fetch('/salvos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        nome: nomeFinal,
                        minutos: timerFinalizadoAtual.minutos,
                        segundos: timerFinalizadoAtual.segundos
                    })
                });

                if (resposta.ok) {
                    modal.style.display = 'none';
                    timerFinalizadoAtual = null;
                } else if (resposta.redirected) {
                    window.location.href = resposta.url;
                } else {
                    alert('Não foi possível salvar. Verifique se você está logado.');
                }
            } catch (erro) {
                console.error('Erro ao salvar:', erro);
                alert('Erro de conexão ao tentar salvar o cronômetro.');
            } finally {
                btnModalSalvar.disabled = false;
                btnModalSalvar.textContent = 'Salvar';
            }
        });
    }

    if (btnModalFechar) {
        btnModalFechar.addEventListener('click', () => {
            modal.style.display = 'none';
            timerFinalizadoAtual = null;
        });
    }

    function criarCronometro(config = {}) {
        const minInicial = parseInt(config.minInicial) || 0;
        const segInicial = parseInt(config.segInicial) || 0;
        const nomeInicial = config.nome || '';

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.timer-card-item');
        const btnFechar = clone.querySelector('.btn-fechar-timer');
        const inputTitulo = clone.querySelector('.timer-titulo-input');
        const display = clone.querySelector('.timer-display');
        const inputMin = clone.querySelector('.input-min');
        const inputSeg = clone.querySelector('.input-seg');
        const btnToggle = clone.querySelector('.btn-toggle');
        const btnAdd60 = clone.querySelector('.btn-add-60');
        const btnReset = clone.querySelector('.btn-reset');

        inputTitulo.value = nomeInicial;
        inputMin.value = minInicial;
        inputSeg.value = segInicial;

        let remainingSeconds = config.remainingSeconds !== undefined
            ? config.remainingSeconds
            : (minInicial * 60) + segInicial;

        let totalDurationSeconds = config.totalDurationSeconds !== undefined
            ? config.totalDurationSeconds
            : remainingSeconds;

        let timerInterval = null;
        let estado = config.estado || 'idle'; 
        let endTime = config.endTime || null;

        if (estado === 'running' && endTime) {
            const diff = Math.ceil((endTime - Date.now()) / 1000);
            if (diff > 0) {
                remainingSeconds = diff;
            } else {
                remainingSeconds = 0;
                estado = 'idle';
                endTime = null;
                card.classList.add('timer-acabou');
            }
        }

        const instancia = {
            getEstado: () => ({
                nome: inputTitulo.value,
                minInicial: parseInt(inputMin.value) || 0,
                segInicial: parseInt(inputSeg.value) || 0,
                remainingSeconds,
                totalDurationSeconds,
                estado,
                endTime
            })
        };
        listaTimers.push(instancia);

        function renderDisplay() {
            const mins = Math.floor(remainingSeconds / 60);
            const secs = remainingSeconds % 60;
            display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        function updateDisplayFromInputs() {
            const min = parseInt(inputMin.value) || 0;
            const seg = parseInt(inputSeg.value) || 0;
            remainingSeconds = (min * 60) + seg;
            totalDurationSeconds = remainingSeconds;
            card.classList.remove('timer-acabou');
            renderDisplay();
            salvarEstadoLocal();
        }

        inputTitulo.addEventListener('input', salvarEstadoLocal);
        inputMin.addEventListener('input', updateDisplayFromInputs);
        inputSeg.addEventListener('input', updateDisplayFromInputs);
        renderDisplay();

        function iniciarContagem() {
            estado = 'running';
            if (!endTime) {
                endTime = Date.now() + remainingSeconds * 1000;
            }
            card.classList.remove('timer-acabou');
            btnToggle.textContent = 'Pausar';
            btnToggle.classList.remove('btn-start');
            btnToggle.classList.add('btn-pause');
            inputMin.disabled = true;
            inputSeg.disabled = true;
            salvarEstadoLocal();

            timerInterval = setInterval(() => {
                const diff = Math.ceil((endTime - Date.now()) / 1000);
                if (diff > 0) {
                    remainingSeconds = diff;
                    renderDisplay();
                } else {
                    clearInterval(timerInterval);
                    remainingSeconds = 0;
                    renderDisplay();
                    estado = 'idle';
                    endTime = null;
                    btnToggle.textContent = 'Iniciar';
                    btnToggle.classList.remove('btn-pause');
                    btnToggle.classList.add('btn-start');
                    inputMin.disabled = false;
                    inputSeg.disabled = false;
                    card.classList.add('timer-acabou');
                    salvarEstadoLocal();

                    tocarAlarme();

                    const finalMin = Math.floor(totalDurationSeconds / 60);
                    const finalSeg = totalDurationSeconds % 60;
                    abrirModalFinalizado({
                        nome: inputTitulo.value.trim(),
                        minutos: finalMin,
                        segundos: finalSeg
                    });
                }
            }, 250);
        }

        if (estado === 'paused') {
            btnToggle.textContent = 'Retomar';
            inputMin.disabled = true;
            inputSeg.disabled = true;
        } else if (estado === 'running') {
            iniciarContagem();
        }

        btnAdd60.addEventListener('click', () => {
            remainingSeconds += 60;
            totalDurationSeconds += 60;
            if (estado === 'running' && endTime) {
                endTime += 60000;
            }
            card.classList.remove('timer-acabou');

            if (estado === 'idle') {
                const currentMin = parseInt(inputMin.value) || 0;
                inputMin.value = currentMin + 1;
            }
            renderDisplay();
            salvarEstadoLocal();
        });

        btnToggle.addEventListener('click', () => {
            if (estado === 'idle' || estado === 'paused') {
                if (remainingSeconds <= 0) {
                    return alert('Insira um tempo maior que 0 para iniciar este cronômetro.');
                }

                if (estado === 'idle') {
                    totalDurationSeconds = remainingSeconds;
                }

                endTime = Date.now() + remainingSeconds * 1000;
                iniciarContagem();

            } else if (estado === 'running') {
                clearInterval(timerInterval);
                estado = 'paused';
                endTime = null;
                btnToggle.textContent = 'Retomar';
                btnToggle.classList.remove('btn-pause');
                btnToggle.classList.add('btn-start');
                salvarEstadoLocal();
            }
        });

        btnReset.addEventListener('click', () => {
            clearInterval(timerInterval);
            estado = 'idle';
            endTime = null;
            btnToggle.textContent = 'Iniciar';
            btnToggle.classList.remove('btn-pause');
            btnToggle.classList.add('btn-start');
            inputMin.disabled = false;
            inputSeg.disabled = false;
            updateDisplayFromInputs();
        });

        btnFechar.addEventListener('click', () => {
            if (timersContainer.children.length <= 1) {
                btnReset.click();
                inputTitulo.value = '';
                inputMin.value = 0;
                inputSeg.value = 0;
                updateDisplayFromInputs();
                return;
            }
            clearInterval(timerInterval);
            const idx = listaTimers.indexOf(instancia);
            if (idx > -1) listaTimers.splice(idx, 1);
            card.remove();
            salvarEstadoLocal();
        });

        timersContainer.appendChild(card);
        salvarEstadoLocal();
    }

    if (btnNovoTimer) {
        btnNovoTimer.addEventListener('click', () => {
            criarCronometro({ minInicial: 0, segInicial: 0, nome: '' });
        });
    }

    let salvosNaSessao = [];
    try {
        salvosNaSessao = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        salvosNaSessao = [];
    }

    salvosNaSessao.forEach(item => criarCronometro(item));

    const urlParams = new URLSearchParams(window.location.search);
    const temParametroNaUrl = urlParams.has('min') || urlParams.has('seg') || urlParams.has('nome');

    if (temParametroNaUrl) {
        const minUrl = parseInt(urlParams.get('min')) || 0;
        const segUrl = parseInt(urlParams.get('seg')) || 0;
        const nomeUrl = urlParams.get('nome') || '';

        if (
            listaTimers.length === 1 &&
            listaTimers[0].getEstado().remainingSeconds === 0 &&
            listaTimers[0].getEstado().nome.trim() === ''
        ) {
            timersContainer.innerHTML = '';
            listaTimers.length = 0;
        }

        criarCronometro({ minInicial: minUrl, segInicial: segUrl, nome: nomeUrl });

        window.history.replaceState({}, document.title, '/');
    }

    if (listaTimers.length === 0) {
        criarCronometro({ minInicial: 0, segInicial: 0, nome: '' });
    }
});