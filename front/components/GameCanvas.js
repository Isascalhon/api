'use client';

import { useEffect, useRef } from 'react';
import GameManager from '@/game/GameManager';

export default function GameCanvas({ onSnapshot, onReady }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const game = new GameManager(canvasRef.current, { onSnapshot });
    onReady(game);
    return () => game.dispose();
  }, [onReady, onSnapshot]);
  return <canvas className="game-canvas" ref={canvasRef} aria-label="Cena 3D da Cidade Turbo" />;
}
