import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function DinoMascot({ status = 'idle', size = 'normal', onClick }) {
  // status: 'idle' | 'typing' | 'thinking' | 'speaking'
  const [blink, setBlink] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Ciclo di battito di ciglia casuale
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, Math.random() * 3000 + 3500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Tracciamento del mouse per effetto parallasse
  useEffect(() => {
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = (e.clientX - centerX) / centerX;
      const dy = (e.clientY - centerY) / centerY;
      setMouseOffset({
        x: Math.max(-10, Math.min(10, dx * 10)),
        y: Math.max(-8, Math.min(8, dy * 8)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const dimensions = size === 'small' ? 'w-20 h-20' : size === 'large' ? 'w-48 h-48' : 'w-32 h-32';

  return (
    <motion.div
      className={`relative ${dimensions} cursor-pointer select-none group flex items-center justify-center`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      title="Rex — Mascotte di Bot Park"
    >
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full overflow-visible drop-shadow-2xl"
      >
        <defs>
          {/* Sfumatura Rosso/Giallo stile Jurassic Park */}
          <radialGradient id="jurassicBadge" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="45%" stopColor="#ea580c" />
            <stop offset="85%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Sfumatura bordo scuro esterno */}
          <linearGradient id="metalRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Sfumatura Dino Green */}
          <linearGradient id="dinoSkin" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Sfumatura Sottogola */}
          <linearGradient id="dinoBelly" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          {/* LED Eye Glow */}
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. DISCO BASE ESTERNO (JURASSIC PARK CIRCLE) */}
        <circle
          cx="120"
          cy="110"
          r="86"
          fill="url(#metalRim)"
          stroke="#000000"
          strokeWidth="6"
        />
        
        {/* Cerchio interno Rosso/Oro sfumato */}
        <circle
          cx="120"
          cy="110"
          r="78"
          fill="url(#jurassicBadge)"
          stroke="#fde047"
          strokeWidth="3.5"
        />

        {/* Linee decorative stile vegetazione/circuiti jurassic */}
        <path
          d="M 60 140 Q 90 90 120 130 T 180 120"
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 75 160 Q 120 125 165 155"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        {/* 2. TESTA DEL DINOSAURO DEFORMED (Che sbuca dal cerchio) */}
        <motion.g
          animate={{
            x: mouseOffset.x + (status === 'thinking' ? -4 : 0),
            y: mouseOffset.y + (status === 'idle' ? [0, -3, 0] : status === 'thinking' ? [-2, 2, -2] : 0),
            rotate: status === 'thinking' ? [-4, 4, -4] : 0,
          }}
          transition={{
            y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
            rotate: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
          }}
        >
          {/* Collo e corpo parziale */}
          <path
            d="M 92 125 C 80 150, 75 175, 85 185 C 105 190, 140 190, 155 185 C 165 175, 160 150, 148 125 Z"
            fill="url(#dinoSkin)"
            stroke="#064e3b"
            strokeWidth="3.5"
          />
          {/* Pettina gialla */}
          <path
            d="M 104 140 C 100 160, 102 175, 108 184 C 114 185, 126 185, 132 184 C 138 175, 140 160, 136 140 Z"
            fill="url(#dinoBelly)"
          />

          {/* Testa deformed grande (Cute T-Rex) */}
          <path
            d="M 75 90 
               C 70 50, 110 32, 145 36 
               C 175 40, 186 65, 182 92 
               C 180 108, 165 118, 148 120 
               C 132 122, 90 124, 75 90 Z"
            fill="url(#dinoSkin)"
            stroke="#064e3b"
            strokeWidth="4"
          />

          {/* Musetto deformed sporgente */}
          <path
            d="M 140 60 C 185 62, 190 98, 155 112 C 145 115, 138 108, 140 60 Z"
            fill="url(#dinoSkin)"
            stroke="#064e3b"
            strokeWidth="3"
          />

          {/* Narici carine */}
          <ellipse cx="168" cy="74" rx="2.5" ry="4" fill="#064e3b" />
          <ellipse cx="178" cy="76" rx="2" ry="3.5" fill="#064e3b" />

          {/* Mascella inferiore animata (si muove quando parla!) */}
          <motion.g
            animate={{
              y: status === 'speaking' ? [0, 5, 1, 6, 0] : 0,
            }}
            transition={{
              repeat: status === 'speaking' ? Infinity : 0,
              duration: 0.35,
              ease: 'easeInOut',
            }}
          >
            <path
              d="M 115 114 C 130 114, 168 116, 172 104 C 172 118, 150 128, 120 126 Z"
              fill="#065f46"
              stroke="#064e3b"
              strokeWidth="2.5"
            />
            {/* Dentini cartoon bianchi aguzzi ma simpatici */}
            <polygon points="132,114 136,110 140,114" fill="#ffffff" />
            <polygon points="144,114 148,109 152,114" fill="#ffffff" />
            <polygon points="156,114 160,110 164,114" fill="#ffffff" />
          </motion.g>

          {/* OCCHI CYBER-CARTOON GRANDI & ESPRESSIVI */}
          {/* Occhio sinistro */}
          <g transform="translate(102, 60)">
            <ellipse cx="0" cy="0" rx="14" ry="17" fill="#ffffff" stroke="#064e3b" strokeWidth="2.5" />
            {/* Pupilla / LED lente */}
            <motion.ellipse
              cx={mouseOffset.x * 0.4}
              cy={mouseOffset.y * 0.4}
              rx={status === 'thinking' ? 6 : 8}
              ry={status === 'thinking' ? 6 : 9}
              fill="#06b6d4"
              filter="url(#cyanGlow)"
            />
            <ellipse
              cx={mouseOffset.x * 0.4 + 2}
              cy={mouseOffset.y * 0.4 - 2}
              rx="3"
              ry="3"
              fill="#ffffff"
            />
            {/* Palpebra per il battito di ciglia */}
            <motion.rect
              x="-16"
              y="-19"
              width="32"
              height="38"
              fill="#10b981"
              animate={{
                scaleY: blink ? 1 : 0,
              }}
              style={{ originY: 0 }}
              transition={{ duration: 0.1 }}
            />
          </g>

          {/* Occhio destro (frontale) */}
          <g transform="translate(132, 64)">
            <ellipse cx="0" cy="0" rx="13" ry="16" fill="#ffffff" stroke="#064e3b" strokeWidth="2.5" />
            {/* Pupilla / LED lente */}
            <motion.ellipse
              cx={mouseOffset.x * 0.4}
              cy={mouseOffset.y * 0.4}
              rx={status === 'thinking' ? 5.5 : 7.5}
              ry={status === 'thinking' ? 5.5 : 8.5}
              fill="#06b6d4"
              filter="url(#cyanGlow)"
            />
            <ellipse
              cx={mouseOffset.x * 0.4 + 2}
              cy={mouseOffset.y * 0.4 - 2}
              rx="2.5"
              ry="2.5"
              fill="#ffffff"
            />
            {/* Palpebra per il battito di ciglia */}
            <motion.rect
              x="-15"
              y="-18"
              width="30"
              height="36"
              fill="#10b981"
              animate={{
                scaleY: blink ? 1 : 0,
              }}
              style={{ originY: 0 }}
              transition={{ duration: 0.1 }}
            />
          </g>

          {/* Crestina/Cornetti cartoon tech sulla testa */}
          <polygon points="88,48 94,36 102,46" fill="#047857" />
          <polygon points="106,42 114,30 122,42" fill="#047857" />
          <polygon points="126,40 134,28 142,41" fill="#047857" />
        </motion.g>

        {/* 3. IL BANNER UFFICIALE: "BOT PARK" (Stile Jurassic Park) */}
        <g transform="translate(120, 192)">
          {/* Targa Rettangolare con angoli tagliati */}
          <path
            d="M -75 -16 L 75 -16 L 82 8 L -82 8 Z"
            fill="#090a0f"
            stroke="#dc2626"
            strokeWidth="3.5"
          />
          {/* Bordo interno oro sottile */}
          <path
            d="M -72 -13 L 72 -13 L 78 5 L -78 5 Z"
            fill="none"
            stroke="#facc15"
            strokeWidth="1.2"
          />
          
          {/* Scritta iconica 'BOT PARK' in stile Jurassic Park */}
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill="#facc15"
            stroke="#7f1d1d"
            strokeWidth="1"
            fontFamily="'Impact', 'Arial Black', sans-serif"
            fontSize="18"
            letterSpacing="3"
            fontWeight="900"
            className="select-none"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))',
            }}
          >
            BOT PARK
          </text>
        </g>
      </svg>
    </motion.div>
  );
}

