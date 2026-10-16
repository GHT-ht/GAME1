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
    });

    engineRef.current = engine;
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

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          currentBiome={currentBiome}
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
        />
      )}

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
