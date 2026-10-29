'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from '@/components/GameCanvas';

const INITIAL = { screen: 'menu', speed: 0, lap: 1, totalLaps: 3, time: 0, turbo: 100, items: 0, score: 0, place: 3, countdown: 3, message: '', result: null, contextLost: false };
const formatTime = (value = 0) => {
  const minutes = Math.floor(value / 60), seconds = Math.floor(value % 60), centis = Math.floor((value % 1) * 100);
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(centis).padStart(2, '0');
};

export default function TurboChaos() {
  const gameRef = useRef(null), settingsReturn = useRef('menu');
  const [screen, setScreen] = useState('menu');
  const [snapshot, setSnapshot] = useState(INITIAL);
  const [quality, setQuality] = useState('high');
  const [effectsVolume, setEffectsVolume] = useState(.65);
  const [musicVolume, setMusicVolume] = useState(.18);
  const [muted, setMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const receiveSnapshot = useCallback((data) => {
    setSnapshot(data);
    if (['countdown', 'racing', 'paused', 'results'].includes(data.screen)) setScreen(data.screen);
  }, []);
  const attachGame = useCallback((game) => { gameRef.current = game; }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('turbo-chaos-settings') || '{}');
      if (saved.quality) setQuality(saved.quality);
      if (typeof saved.effectsVolume === 'number') setEffectsVolume(saved.effectsVolume);
      if (typeof saved.musicVolume === 'number') setMusicVolume(saved.musicVolume);
      if (typeof saved.muted === 'boolean') setMuted(saved.muted);
      if (typeof saved.musicEnabled === 'boolean') setMusicEnabled(saved.musicEnabled);
    } catch {}
  }, []);

  useEffect(() => {
    gameRef.current?.setQuality(quality);
    gameRef.current?.setAudio({ effectsVolume, musicVolume, muted, musicEnabled });
    localStorage.setItem('turbo-chaos-settings', JSON.stringify({ quality, effectsVolume, musicVolume, muted, musicEnabled }));
  }, [quality, effectsVolume, musicVolume, muted, musicEnabled]);

  function play() { gameRef.current?.startRace(); }
  function backToMenu() { gameRef.current?.returnToMenu(); setScreen('menu'); }
  function openSettings(from = screen) { settingsReturn.current = from; setScreen('settings'); }
  function closeSettings() { setScreen(settingsReturn.current); }
  function hold(control, down, event) {
    event.preventDefault();
    if (down) event.currentTarget.setPointerCapture?.(event.pointerId);
    gameRef.current?.setTouch(control, down);
  }

  const isRace = ['countdown', 'racing'].includes(screen);
  const isModal = ['how', 'garage', 'settings', 'paused', 'results'].includes(screen);

  return (
    <main className="turbo-game">
      <GameCanvas onSnapshot={receiveSnapshot} onReady={attachGame} />
      <div className="world-vignette" aria-hidden="true" />
      <header className="game-header">
        <button className="tc-brand" onClick={backToMenu} aria-label="Voltar ao menu">
          <span className="tc-mark">TC<span>↗</span></span>
          <span className="brand-name">TURBO <b>CHAOS</b><small>GRANDE PRÊMIO · TEMPORADA 01</small></span>
        </button>
        <div className="header-right"><span className="live-label"><i /> CIDADE TURBO · AO VIVO</span><button className="sound-toggle" onClick={() => setMuted(!muted)} aria-label={muted ? 'Ativar som' : 'Silenciar som'}>{muted ? 'SOM OFF' : 'SOM ON'}</button></div>
      </header>

      {screen === 'menu' && <section className="main-menu">
        <div className="menu-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> UMA CORRIDA FORA DE CONTROLE</div>
          <h1>ACELERE.<br /><em>IMPROVISE.</em><br />SOBREVIVA<br />AO <em>CAOS.</em></h1>
          <p className="menu-description">A pista enlouqueceu. Luna só precisa de uma chance, um carro remendado e você no volante.</p>
          <div className="menu-actions">
            <button className="btn-primary" onClick={play}><span className="play-triangle" /> JOGAR CIDADE TURBO <span className="btn-arrow">↗</span></button>
            <div className="secondary-actions"><button className="btn-ghost" onClick={() => setScreen('garage')}>GARAGEM <span>01</span></button><button className="btn-ghost" onClick={() => setScreen('how')}>COMO JOGAR <span>?</span></button><button className="btn-icon" onClick={() => openSettings('menu')} aria-label="Configurações">⚙</button></div>
          </div>
          <div className="menu-footnote"><span>01 / 04</span><i /> PRIMEIRO CIRCUITO · 3 VOLTAS</div>
        </div>
        <div className="pilot-card">
          <div className="pilot-card-top"><span className="micro-label">PILOTO EM DESTAQUE</span><span className="pilot-status"><i /> DISPONÍVEL</span></div>
          <div className="pilot-emblem">L<span>↗</span></div>
          <div className="pilot-name">LUNA <small>INVENTORA · PILOTO</small></div>
          <p>“Se a pista muda, eu mudo junto.”</p>
          <div className="pilot-car-name"><span className="tiny-car">◆</span> SUCATA ESTELAR <span>MK.01</span></div>
        </div>
        <div className="menu-stamp">TURBO<br />CHAOS<br /><small>TC / 26</small></div>
        <div className="menu-bottom-note"><span>WEBGL 3D</span><span>BUILT FOR THE UNPREDICTABLE</span></div>
      </section>}

      {screen === 'how' && <div className="modal-layer"><section className="info-panel" role="dialog" aria-modal="true" aria-labelledby="how-title">
        <button className="close-button" onClick={() => setScreen('menu')} aria-label="Fechar">×</button>
        <div className="eyebrow"><span className="eyebrow-line" /> MANUAL DO PILOTO</div><h2 id="how-title">CONTROLES<br /><em>DE PISTA.</em></h2>
        <p className="panel-lead">Três voltas. Dois rivais. Uma pista que nem o próprio sistema consegue controlar.</p>
        <div className="control-list">
          <div><kbd>W</kbd><kbd>↑</kbd><span>ACELERAR</span></div><div><kbd>S</kbd><kbd>↓</kbd><span>FREAR / RÉ</span></div>
          <div><kbd>A</kbd><kbd>D</kbd><span>DIREÇÃO</span><small>ou ← →</small></div><div><kbd>SPACE</kbd><span>DERRAPAR</span></div>
          <div><kbd>SHIFT</kbd><span>TURBO</span></div><div><kbd>ESC</kbd><span>PAUSAR</span></div>
        </div>
        <p className="panel-note">Colete baterias para recuperar turbo. Desvie dos cones e tambores: cada impacto custa velocidade.</p>
        <button className="btn-primary" onClick={play}><span className="play-triangle" /> ENTRAR NA CORRIDA <span className="btn-arrow">↗</span></button>
      </section></div>}

      {screen === 'garage' && <div className="modal-layer"><section className="garage-panel" role="dialog" aria-modal="true" aria-labelledby="garage-title">
        <button className="close-button" onClick={() => setScreen('menu')} aria-label="Fechar">×</button>
        <div className="eyebrow"><span className="eyebrow-line" /> OFICINA DO PROFESSOR PISTÃO</div><h2 id="garage-title">GARAGEM<span>.</span></h2>
        <p className="panel-lead">Uma máquina. Muitas ideias. O resto ainda está na bancada.</p>
        <div className="garage-car-card"><div className="garage-car-art"><span className="garage-orbit orbit-a" /><span className="garage-orbit orbit-b" /><span className="garage-car-icon">◆</span><span className="garage-glint">✦</span></div><div className="garage-car-info"><div className="pilot-status"><i /> SELECIONADO · JOGÁVEL</div><h3>SUCATA ESTELAR <small>MK.01</small></h3><p>Compacto, equilibrado e montado pela própria Luna com peças reaproveitadas.</p>
          <div className="stat-row"><span>VELOCIDADE MÁX.</span><b>141 <small>KM/H</small></b></div><div className="stat-bar"><i style={{ width: '72%' }} /></div>
          <div className="stat-row"><span>ACELERAÇÃO</span><b>23 <small>ARC / S²</small></b></div><div className="stat-bar"><i style={{ width: '64%' }} /></div>
          <div className="stat-row"><span>CONTROLE</span><b>ESTÁVEL</b></div><div className="stat-bar"><i style={{ width: '78%' }} /></div></div></div>
        <div className="locked-note"><span>+</span><div><b>MAIS PROJETOS NA BANCADA</b><small>Novos veículos serão desbloqueados ao avançar na campanha.</small></div><span className="lock-icon">▣</span></div>
        <button className="btn-primary" onClick={() => setScreen('menu')}>VOLTAR AO MENU <span className="btn-arrow">↗</span></button>
      </section></div>}

      {screen === 'settings' && <div className="modal-layer"><section className="info-panel settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="close-button" onClick={closeSettings} aria-label="Fechar">×</button><div className="eyebrow"><span className="eyebrow-line" /> AJUSTE SUA MÁQUINA</div><h2 id="settings-title">CONFIGURAÇÕES<span>.</span></h2>
        <label className="setting-row"><span><b>EFEITOS</b><small>Motor, turbo e colisões</small></span><input aria-label="Volume dos efeitos" type="range" min="0" max="1" step=".01" value={effectsVolume} onChange={e => setEffectsVolume(Number(e.target.value))} /></label>
        <label className="setting-row"><span><b>MÚSICA</b><small>Trilha sintetizada</small></span><input aria-label="Volume da música" type="range" min="0" max=".5" step=".01" value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} /></label>
        <label className="setting-row"><span><b>QUALIDADE GRÁFICA</b><small>Sombras e resolução</small></span><select value={quality} onChange={e => setQuality(e.target.value)}><option value="high">Alta</option><option value="low">Leve</option></select></label>
        <label className="setting-check"><input type="checkbox" checked={musicEnabled} onChange={e => setMusicEnabled(e.target.checked)} /><span>Trilha musical habilitada</span></label>
        <label className="setting-check"><input type="checkbox" checked={muted} onChange={e => setMuted(e.target.checked)} /><span>Silenciar todos os sons</span></label>
        <button className="btn-primary" onClick={closeSettings}>PRONTO <span className="btn-arrow">↗</span></button>
      </section></div>}

      {isRace && <RaceHUD snapshot={snapshot} onPause={() => gameRef.current?.pause()} onTouch={hold} />}
      {screen === 'paused' && <div className="modal-layer"><section className="pause-panel" role="dialog" aria-modal="true">
        <div className="eyebrow"><span className="eyebrow-line" /> SIMULAÇÃO PAUSADA</div><h2>RESPIRA.<br /><em>RECALCULA.</em></h2><p className="panel-lead">A corrida espera por você.</p>
        <button className="btn-primary" onClick={() => gameRef.current?.resume()}>CONTINUAR <span className="btn-arrow">↗</span></button>
        <button className="btn-secondary-wide" onClick={() => gameRef.current?.startRace()}>REINICIAR CORRIDA</button>
        <button className="btn-secondary-wide" onClick={() => openSettings('paused')}>CONFIGURAÇÕES</button>
        <button className="btn-secondary-wide" onClick={backToMenu}>VOLTAR AO MENU</button>
      </section></div>}
      {screen === 'results' && <div className="modal-layer"><section className="results-panel" role="dialog" aria-modal="true">
        <div className="result-kicker"><span className="eyebrow-line" /> CIDADE TURBO · BANDEIRADA</div><div className="result-rank">{snapshot.result?.position === 1 ? '01' : '0' + (snapshot.result?.position || 3)}<sup>ª</sup></div>
        <h2>{snapshot.result?.won ? 'PÓDIO, LUNA.' : 'FIM DE PROVA.'}</h2><p className="panel-lead">{snapshot.result?.won ? 'O caos não estava pronto para você.' : 'O campeonato está só começando.'}</p>
        <div className="result-stats"><div><small>TEMPO</small><b>{formatTime(snapshot.result?.time)}</b></div><div><small>PONTUAÇÃO</small><b>{String(snapshot.result?.score || 0).padStart(4, '0')}</b></div><div><small>BATERIAS</small><b>{snapshot.result?.items || 0}<i> / 21</i></b></div></div>
        <button className="btn-primary" onClick={play}><span className="play-triangle" /> JOGAR DE NOVO <span className="btn-arrow">↗</span></button><button className="btn-secondary-wide" onClick={backToMenu}>VOLTAR AO MENU</button>
      </section></div>}
      {snapshot.message && isRace && <div className="race-message" role="status">{snapshot.message}</div>}
      {snapshot.contextLost && <div className="context-warning" role="status">A cena 3D foi interrompida pelo navegador. Tente recarregar a página.</div>}
    </main>
  );
}

function RaceHUD({ snapshot, onPause, onTouch }) {
  const touchButton = (label, code, extra = '') => <button key={code} className={'touch-key ' + extra} onPointerDown={e => onTouch(code, true, e)} onPointerUp={e => onTouch(code, false, e)} onPointerCancel={e => onTouch(code, false, e)} onLostPointerCapture={e => onTouch(code, false, e)}>{label}</button>;
  return <div className="race-ui">
    <div className="race-top">
      <div className="race-chip"><small>POSIÇÃO</small><b>{String(snapshot.place).padStart(2, '0')}<i> / 03</i></b></div>
      <div className="race-chip lap-chip"><small>VOLTA</small><b>{String(snapshot.lap).padStart(2, '0')}<i> / {String(snapshot.totalLaps).padStart(2, '0')}</i></b><span className="lap-progress"><i style={{ width: (snapshot.lap / snapshot.totalLaps * 100) + '%' }} /></span></div>
      <div className="race-chip time-chip"><small>TEMPO</small><b>{formatTime(snapshot.time)}</b></div>
      <button className="pause-button" onClick={onPause} aria-label="Pausar corrida"><span>Ⅱ</span><small>PAUSAR</small></button>
    </div>
    {snapshot.screen === 'countdown' && <div className="countdown-overlay"><small>PREPARE-SE, LUNA</small><b>{snapshot.countdown || 'VAI!'}</b></div>}
    <div className="race-bottom">
      <div className="speed-gauge"><small>VELOCIDADE</small><div><b>{String(snapshot.speed).padStart(3, '0')}</b><i>KM/H</i></div><span className="speed-ticks"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
      <div className="pickup-counter"><span className="battery-icon">ϟ</span><b>{String(snapshot.items).padStart(2, '0')}</b><small>BATERIAS</small></div>
      <div className="turbo-gauge"><div className="turbo-heading"><span><i>ϟ</i> TURBO</span><b>{Math.round(snapshot.turbo)}%</b></div><div className="turbo-track"><i style={{ width: snapshot.turbo + '%' }} /></div><small>SEGURE SHIFT</small></div>
      <div className="touch-controls"><div className="touch-steer">{touchButton('‹', 'left')}{touchButton('›', 'right')}</div><div className="touch-pedals">{touchButton('DERRAPAR', 'drift', 'touch-drift')}{touchButton('FREIO', 'down')}{touchButton('ACELERAR', 'up', 'touch-gas')}{touchButton('ϟ', 'boost', 'touch-boost')}</div></div>
    </div>
    <div className="race-location"><i /> SETOR 01 <span>—</span> CIDADE TURBO</div>
  </div>;
}
