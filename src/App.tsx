import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine.ts';
import type { GameState, BiomeId, PlayerState, RunStats, CombatSnapshot } from './game/types.ts';
import type { WeatherState } from './game/weather.ts';
import { BIOMES } from './game/levels.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { StatusModal } from './components/StatusModal.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { sound } from './game/audio.ts';
import { ControlsOverlay } from './components/ControlsOverlay.tsx';
import { type KeyBindings, loadBindings } from './game/controls.ts';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [currentBiome, setCurrentBiome] = useState<BiomeId>('beach');
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [combat, setCombat] = useState<CombatSnapshot | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bindings, setBindings] = useState<KeyBindings>(() => loadBindings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resumeAfterSettings = useRef(false);

  const openSettings = () => {
    resumeAfterSettings.current = engineRef.current?.state === 'playing';
    if (resumeAfterSettings.current) engineRef.current?.pauseGame();
    engineRef.current?.setControlsLocked(true);
    setSettingsOpen(true);
  };
  const closeSettings = () => {
    engineRef.current?.setControlsLocked(false);
    if (resumeAfterSettings.current) engineRef.current?.resumeGame();
    resumeAfterSettings.current = false;
    setSettingsOpen(false);
    canvasRef.current?.focus();
  };
  const changeBindings = (next: KeyBindings) => {
    setBindings(next);
    engineRef.current?.setBindings(next);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Game Engine
    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (state) => setGameState(state),
      onPlayerUpdate: (player) => setPlayerState({ ...player }),
      onStatsReady: (stats) => setRunStats(stats),
      onTimeUpdate: (sec) => setTimeSpent(sec),
      onWeatherUpdate: (w) => setWeatherState({ ...w }),
      onCombatUpdate: (c) => setCombat({ ...c }),
      onMuteChange: (muted) => setIsMuted(muted),
    });

    engineRef.current = engine;
    setBindings(engine.getBindings());
    setPlayerState({ ...engine.player });
    setWeatherState({ ...engine.weather });
    engine.start();
    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
    }

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    engineRef.current?.startGame();
    canvasRef.current?.focus();
    window.focus();
  };

  const handleSelectBiome = (biome: BiomeId) => {
    setCurrentBiome(biome);
    engineRef.current?.setBiome(biome);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const handlePause = () => {
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    engineRef.current?.resumeGame();
  };

  const handleRestart = () => {
    engineRef.current?.restartLevel();
  };

  const handleNextStage = () => {
    const nextBio = currentBiome === 'beach' ? 'jungle' : currentBiome === 'jungle' ? 'sunset' : 'beach';
    setCurrentBiome(nextBio);
    engineRef.current?.nextStage();
  };

  const handleHome = () => {
    engineRef.current?.goToTitle();
  };

  const handleCycleWeather = () => {
    engineRef.current?.cycleWeather();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 60 FPS Canvas Game Viewport */}
      <canvas
        ref={canvasRef}
        data-testid="island-canvas"
        className="w-full h-full block touch-none"
      />

      {/* Available from the title, gameplay, and pause screens. */}
      <button onClick={openSettings} title="自定义按键" style={{position:'fixed',zIndex:42,top:gameState==='playing'?72:15,right:gameState==='playing'?16:16,background:'linear-gradient(120deg,#143449ee,#283e62ef)',border:'1px solid #67e8f977',borderRadius:18,padding:'8px 13px',color:'#e0faff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 6px 20px #0007'}}>⚙ 键位设置</button>
      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          currentBiome={currentBiome}
          bindings={bindings}
          onSelectBiome={handleSelectBiome}
          onStartGame={handleStartGame}
        />
      )}

      {/* In-Game Active HUD */}
      {gameState === 'playing' && playerState && (
        <HUD
          player={playerState}
          biome={BIOMES[currentBiome]}
          weather={weatherState || undefined}
          combat={combat || undefined}
          targetPearls={engineRef.current?.level.targetPearls || 15}
          timeSpent={timeSpent}
          isMuted={isMuted}
          bindings={bindings}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleRestart}
          onOpenStageSelect={handleHome}
          onCycleWeather={handleCycleWeather}
        />
      )}

      {/* Virtual Touch D-pad and Action Buttons for Mobile */}
      {gameState === 'playing' && (
        <MobileControls
          onLeftDown={() => engineRef.current?.setMobileLeft(true)}
          onLeftUp={() => engineRef.current?.setMobileLeft(false)}
          onRightDown={() => engineRef.current?.setMobileRight(true)}
          onRightUp={() => engineRef.current?.setMobileRight(false)}
          onJumpDown={() => engineRef.current?.setMobileJump(true)}
          onJumpUp={() => engineRef.current?.setMobileJump(false)}
          onDash={() => engineRef.current?.setMobileDash()}
          onAttack={() => engineRef.current?.setMobileAttack()}
          onHeavy={() => engineRef.current?.setMobileHeavy()}
          onSkill={() => engineRef.current?.setMobileSkill()}
          onUltimate={() => engineRef.current?.setMobileUltimate()}
          onGuard={() => engineRef.current?.setMobileGuard()}
        />
      )}

      {settingsOpen && <ControlsOverlay bindings={bindings} onChange={changeBindings} onClose={closeSettings} />}

      {/* Outcome & Pause Modals */}
      <StatusModal
        state={gameState}
        stats={runStats}
        currentBiome={currentBiome}
        onResume={handleResume}
        onRestart={handleRestart}
        onNextStage={handleNextStage}
        onHome={handleHome}
      />
    </div>
  );
}
