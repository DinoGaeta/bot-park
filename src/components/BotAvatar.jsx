import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getShapeSvgPath, getShapeMeta } from '../data/botShapes';

export default function BotAvatar({
  bot,
  size = 'normal',
  status = 'idle', // 'idle' | 'thinking' | 'speaking' | 'sleeping'
  interactive = true,
  onClick,
}) {
  const color = bot?.color || '#00C972';
  const shape = bot?.avatarShape || bot?.shape || (bot?.id === 'ciccio' ? 'pebble' : 'tablet');
  const isDino = bot?.avatarShape === 'dino' || bot?.id === 'rex';
  const isGroup = bot?.isGroup || bot?.avatarShape === 'group';

  const [blink, setBlink] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // 1. Battito di ciglia organico (Blink naturale)
  useEffect(() => {
    let timeoutId;
    const triggerBlink = () => {
      setBlink(true);
      timeoutId = setTimeout(() => {
        setBlink(false);
        scheduleNextBlink();
      }, 140);
    };

    const scheduleNextBlink = () => {
      const delay = Math.random() * 3200 + 2400;
      timeoutId = setTimeout(triggerBlink, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // 2. Eye Tracking interattivo 60fps sul cursore del mouse
  useEffect(() => {
    if (!interactive) return;
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = (e.clientX - centerX) / centerX;
      const dy = (e.clientY - centerY) / centerY;
      setMouseOffset({
        x: Math.max(-4.5, Math.min(4.5, dx * 4.5)),
        y: Math.max(-3.5, Math.min(3.5, dy * 3.5)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  let sizeClasses = 'w-9 h-9';
  if (size === 'small') sizeClasses = 'w-8 h-8';
  if (size === 'large') sizeClasses = 'w-16 h-16';
  if (size === 'xlarge') sizeClasses = 'w-24 h-24';

  // Avatar Gruppo 2x2 (es. AInpratica · Coordinamento in media_1794338854538_dd93231c.png)
  if (isGroup) {
    return (
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} shrink-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 select-none cursor-pointer`}
      >
        {/* Top-Left: KL Badge */}
        <div className="rounded-full bg-[#e5e7eb] text-[#374151] text-[7px] font-bold flex items-center justify-center border border-white shadow-2xs">
          KL
        </div>
        {/* Top-Right: Giulia Magenta Teardrop */}
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <g transform="rotate(-18 50 50)">
            <path d={getShapeSvgPath('teardrop')} fill="#FF309B" />
            <rect x="44" y="42" width="10" height="22" rx="5" fill="#fff" />
            <rect x="60" y="42" width="10" height="22" rx="5" fill="#fff" />
          </g>
        </svg>
        {/* Bottom-Left: Spielberg Blue Cloud */}
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <g transform="rotate(-10 50 50)">
            <path d={getShapeSvgPath('cloud')} fill="#1084FE" />
            <rect x="44" y="40" width="10" height="22" rx="5" fill="#fff" />
            <rect x="60" y="40" width="10" height="22" rx="5" fill="#fff" />
          </g>
        </svg>
        {/* Bottom-Right: Laika Blue Wedge */}
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <g transform="rotate(-12 50 50)">
            <path d={getShapeSvgPath('wedge')} fill="#1084FE" />
            <rect x="44" y="44" width="10" height="22" rx="5" fill="#fff" />
            <rect x="60" y="44" width="10" height="22" rx="5" fill="#fff" />
          </g>
        </svg>
      </div>
    );
  }

  // Mascotte Dino Bot Park (Nuovo Stemma Ufficiale Ricamato)
  if (isDino) {
    return (
      <motion.div
        onClick={onClick}
        className={`relative ${sizeClasses} shrink-0 flex items-center justify-center select-none cursor-pointer`}
        animate={{
          scale: status === 'speaking' ? [1, 1.08, 0.95, 1.05, 1] : [1, 1.03, 1],
          rotate: status === 'thinking' ? [-4, 4, -4] : 0,
        }}
        transition={{
          repeat: Infinity,
          duration: status === 'speaking' ? 0.4 : 3.2,
          ease: 'easeInOut',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.94 }}
      >
        <img
          src="./bot_park_icon.png"
          alt="Bot Park Logo"
          className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
        />
      </motion.div>
    );
  }

  const meta = getShapeMeta(shape);
  const bodyPath = getShapeSvgPath(shape);
  const baseTilt = bot?.tilt !== undefined ? bot.tilt : meta.tilt;
  const eyeOffX = (bot?.eyeOffset?.x !== undefined ? bot.eyeOffset.x : meta.eyeOffset.x) || 4;
  const eyeOffY = (bot?.eyeOffset?.y !== undefined ? bot.eyeOffset.y : meta.eyeOffset.y) || -2;

  return (
    <motion.div
      onClick={onClick}
      className={`relative ${sizeClasses} shrink-0 flex items-center justify-center select-none cursor-pointer`}
      animate={{
        scaleX:
          status === 'speaking'
            ? [1, 1.07, 0.94, 1.05, 1]
            : status === 'thinking'
            ? [1, 1.03, 0.97, 1]
            : [1, 1.025, 0.985, 1],
        scaleY:
          status === 'speaking'
            ? [1, 0.93, 1.06, 0.95, 1]
            : status === 'thinking'
            ? [1, 0.97, 1.03, 1]
            : [1, 0.975, 1.015, 1],
        rotate:
          status === 'speaking'
            ? [0, -4, 4, -2, 0]
            : status === 'thinking'
            ? [-4, 4, -4]
            : [0, 1.2, -1.2, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: status === 'speaking' ? 0.42 : status === 'thinking' ? 1.3 : 3.4,
        ease: 'easeInOut',
      }}
      whileHover={{ scale: 1.1, rotate: -3 }}
      whileTap={{ scale: 0.92 }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
      >
        {/* Corpo sagomato ruotato con l'angolo caratteristico di Grok Bot */}
        <g transform={`rotate(${baseTilt} 50 50)`}>
          <path
            d={bodyPath}
            fill={color}
            className="transition-colors duration-300"
          />

          {/* Occhi a Capsula / Pillola Bianca Parallela (Fedeli a Grok Bot) */}
          <motion.g
            animate={{
              x: eyeOffX + mouseOffset.x + (status === 'thinking' ? 3 : 0),
              y:
                eyeOffY +
                mouseOffset.y +
                (status === 'speaking' ? [0, -3.5, 2, -2.5, 0] : status === 'thinking' ? -3 : 0),
              scaleY: blink ? 0.1 : status === 'speaking' ? [1, 1.15, 0.9, 1.1, 1] : 1,
            }}
            style={{ originX: '54px', originY: '48px' }}
            transition={{
              y: {
                repeat: status === 'speaking' ? Infinity : 0,
                duration: 0.35,
                ease: 'easeInOut',
              },
              scaleY: {
                duration: blink ? 0.08 : 0.35,
                repeat: !blink && status === 'speaking' ? Infinity : 0,
              },
            }}
          >
            {/* Occhio Sinistro (Capsula Arrotondata) */}
            <rect
              x="41"
              y="36"
              width="8.5"
              height="21"
              rx="4.25"
              fill="#FFFFFF"
            />
            {/* Occhio Destro (Capsula Arrotondata) */}
            <rect
              x="56.5"
              y="36"
              width="8.5"
              height="21"
              rx="4.25"
              fill="#FFFFFF"
            />
          </motion.g>
        </g>
      </svg>
    </motion.div>
  );
}

