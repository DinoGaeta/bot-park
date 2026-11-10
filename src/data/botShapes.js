// Sagome Matematiche Ufficiali Grok Bot (Reverse-Engineered da index.eager-common) + Dino Bot Park

export const GROK_BOT_SHAPES = [
  { id: 'tablet', label: 'Tablet (Pillola Steve)', tilt: -14, eyeOffset: { x: 4, y: -2 } },
  { id: 'teardrop', label: 'Teardrop (Goccia Giulia)', tilt: -18, eyeOffset: { x: 4, y: 4 } },
  { id: 'wedge', label: 'Wedge (Triangolo Laika)', tilt: -12, eyeOffset: { x: 3, y: 5 } },
  { id: 'cloud', label: 'Cloud (Nuvola Spielberg)', tilt: -10, eyeOffset: { x: 4, y: 0 } },
  { id: 'squircle', label: 'Squircle (Cubo Bastione/Sam)', tilt: -18, eyeOffset: { x: 4, y: -1 } },
  { id: 'pebble', label: 'Pebble (Ciottolo Italo/Piton)', tilt: -15, eyeOffset: { x: 6, y: -3 } },
  { id: 'bean', label: 'Bean (Fagiolo)', tilt: -14, eyeOffset: { x: 4, y: -2 } },
  { id: 'heart', label: 'Heart (Cuore Capo Bot)', tilt: -12, eyeOffset: { x: 3, y: -2 } },
  { id: 'star', label: 'Star (Stella)', tilt: -10, eyeOffset: { x: 3, y: 0 } },
  { id: 'sparkle', label: 'Sparkle (Luccichio)', tilt: -8, eyeOffset: { x: 2, y: 0 } },
  { id: 'clover', label: 'Clover (Quadrifoglio)', tilt: -15, eyeOffset: { x: 3, y: -1 } },
  { id: 'flower', label: 'Flower (Fiore)', tilt: -12, eyeOffset: { x: 3, y: 0 } },
  { id: 'hex', label: 'Hex (Esagono)', tilt: -14, eyeOffset: { x: 4, y: -1 } },
  { id: 'cylinder', label: 'Cylinder (Cilindro)', tilt: -12, eyeOffset: { x: 4, y: -2 } },
  { id: 'capsule', label: 'Capsule (Capsula Verticale)', tilt: -14, eyeOffset: { x: 4, y: -2 } },
  { id: 'square', label: 'Square (Quadrato Morbido)', tilt: -16, eyeOffset: { x: 4, y: -1 } },
  { id: 'egg', label: 'Egg (Uovo)', tilt: -14, eyeOffset: { x: 4, y: 2 } },
  { id: 'leaf', label: 'Leaf (Foglia)', tilt: -18, eyeOffset: { x: 3, y: 0 } },
  { id: 'shield', label: 'Shield (Scudo)', tilt: -10, eyeOffset: { x: 3, y: -2 } },
  { id: 'dome', label: 'Dome (Cupola)', tilt: -12, eyeOffset: { x: 3, y: 3 } },
  { id: 'house', label: 'House (Casetta)', tilt: -10, eyeOffset: { x: 3, y: 4 } },
  { id: 'dino', label: 'Dino Bot Park (T-Rex)', tilt: 0, eyeOffset: { x: 0, y: 0 } },
];

export const GROK_BOT_COLORS = [
  { id: 'green', label: 'Green (Steve)', value: '#00C972' },
  { id: 'blue', label: 'Blue (Italo / Laika / Spielberg)', value: '#1084FE' },
  { id: 'magenta', label: 'Magenta (Giulia / Capo Bot)', value: '#FF309B' },
  { id: 'red', label: 'Red (Bastione / Concierge)', value: '#FF263C' },
  { id: 'orange', label: 'Orange (Sam)', value: '#FF6700' },
  { id: 'cyan', label: 'Cyan (Teal)', value: '#00BCA6' },
  { id: 'violet', label: 'Violet', value: '#9159FE' },
  { id: 'yellow', label: 'Yellow', value: '#FF9800' },
  { id: 'gray', label: 'Gray (Piton)', value: '#8E8E93' },
  { id: 'brown', label: 'Brown', value: '#936439' },
  { id: 'black', label: 'Black (Ciccio Primary)', value: '#000000' },
];

export function getShapeMeta(shapeId) {
  return (
    GROK_BOT_SHAPES.find((s) => s.id === shapeId) || {
      id: 'pebble',
      label: 'Pebble',
      tilt: -15,
      eyeOffset: { x: 5, y: -2 },
    }
  );
}

// Restituisce il tracciato SVG vettoriale ad alta precisione (viewBox 0 0 100 100)
export function getShapeSvgPath(shapeId) {
  switch (shapeId) {
    case 'tablet':
      // Pillola orizzontale paffuta (Steve, Concierge)
      return 'M 28 20 L 72 20 C 87 20, 96 32, 96 50 C 96 68, 87 80, 72 80 L 28 80 C 13 80, 4 68, 4 50 C 4 32, 13 20, 28 20 Z';

    case 'teardrop':
      // Goccia paffuta con punta morbida in alto (Giulia)
      return 'M 46 8 C 49 4, 53 4, 56 8 C 66 22, 90 50, 90 67 C 90 84, 73 95, 50 95 C 27 95, 10 84, 10 67 C 10 50, 34 22, 46 8 Z';

    case 'wedge':
      // Triangolo arrotondato paffuto / Onigiri (Laika, santilighieri)
      return 'M 42 12 C 46 6, 54 6, 58 12 L 90 66 C 95 75, 89 88, 78 88 L 22 88 C 11 88, 5 75, 10 66 Z';

    case 'cloud':
      // Nuvola soffice a 5 lobi (Spielberg)
      return 'M 32 26 C 38 14, 56 12, 65 22 C 76 16, 90 25, 89 39 C 97 45, 97 60, 89 67 C 90 79, 78 88, 66 86 C 58 92, 42 92, 34 86 C 20 88, 9 78, 11 65 C 3 57, 4 42, 14 36 C 14 25, 23 19, 32 26 Z';

    case 'squircle':
      // Quadrato super-arrotondato (Bastione, Sam)
      return 'M 32 10 L 68 10 C 84 10, 90 16, 90 32 L 90 68 C 90 84, 84 90, 68 90 L 32 90 C 16 90, 10 84, 10 68 L 10 32 C 10 16, 16 10, 32 10 Z';

    case 'pebble':
      // Sfera / Ciottolo organico (Ciccio, Italo, Piton)
      return 'M 50 7 C 75 7, 93 24, 93 49 C 93 75, 74 93, 49 93 C 24 93, 7 75, 7 50 C 7 25, 25 7, 50 7 Z';

    case 'bean':
      // Fagiolo asimmetrico morbido
      return 'M 34 12 C 58 8, 88 22, 90 50 C 92 76, 74 92, 48 92 C 22 92, 8 74, 11 48 C 13 30, 18 15, 34 12 Z';

    case 'heart':
      // Cuore paffuto Grok Bot (Capo Bot)
      return 'M 50 88 C 46 86, 10 62, 8 37 C 6 19, 20 9, 35 12 C 43 14, 48 20, 50 25 C 52 20, 57 14, 65 12 C 80 9, 94 19, 92 37 C 90 62, 54 86, 50 88 Z';

    case 'star':
      // Stella morbida a 5 punte arrotondate
      return 'M 50 7 C 54 7, 58 21, 64 26 C 70 31, 86 31, 89 36 C 92 41, 81 52, 78 59 C 75 66, 80 81, 75 85 C 70 89, 57 81, 50 81 C 43 81, 30 89, 25 85 C 20 81, 25 66, 22 59 C 19 52, 8 41, 11 36 C 14 31, 30 31, 36 26 C 42 21, 46 7, 50 7 Z';

    case 'sparkle':
      // Astro a 4 punte arrotondate
      return 'M 50 6 C 55 6, 60 32, 68 40 C 76 48, 94 45, 94 50 C 94 55, 76 52, 68 60 C 60 68, 55 94, 50 94 C 45 94, 40 68, 32 60 C 24 52, 6 55, 6 50 C 6 45, 24 48, 32 40 C 40 32, 45 6, 50 6 Z';

    case 'clover':
      // Quadrifoglio paffuto
      return 'M 34 14 C 44 10, 50 18, 50 24 C 50 18, 56 10, 66 14 C 78 18, 82 32, 76 42 C 82 46, 90 54, 86 66 C 82 78, 68 82, 58 76 C 54 82, 46 90, 34 86 C 22 82, 18 68, 24 58 C 18 54, 10 46, 14 34 C 18 22, 26 17, 34 14 Z';

    case 'flower':
      // Fiore a 6 petali morbidi
      return 'M 50 8 C 60 8, 64 16, 64 22 C 72 18, 82 22, 85 30 C 88 38, 82 46, 78 50 C 82 54, 88 62, 85 70 C 82 78, 72 82, 64 78 C 64 84, 60 92, 50 92 C 40 92, 36 84, 36 78 C 28 82, 18 78, 15 70 C 12 62, 18 54, 22 50 C 18 46, 12 38, 15 30 C 18 22, 28 18, 36 22 C 36 16, 40 8, 50 8 Z';

    case 'hex':
      // Esagono morbido
      return 'M 44 9 C 48 7, 52 7, 56 9 L 84 25 C 88 28, 90 32, 90 37 L 90 63 C 90 68, 88 72, 84 75 L 56 91 C 52 93, 48 93, 44 91 L 16 75 C 12 72, 10 68, 10 63 L 10 37 C 10 32, 12 28, 16 25 Z';

    case 'cylinder':
    case 'capsule':
      // Capsula verticale morbida
      return 'M 50 7 C 72 7, 84 20, 84 38 L 84 62 C 84 80, 72 93, 50 93 C 28 93, 16 80, 16 62 L 16 38 C 16 20, 28 7, 50 7 Z';

    case 'egg':
      // Uovo morbido
      return 'M 50 8 C 72 8, 88 40, 88 65 C 88 83, 72 93, 50 93 C 28 93, 12 83, 12 65 C 12 40, 28 8, 50 8 Z';

    case 'leaf':
      // Foglia organica
      return 'M 50 8 C 84 22, 92 64, 50 92 C 8 64, 16 22, 50 8 Z';

    case 'shield':
      // Scudo arrotondato
      return 'M 20 16 L 80 16 C 86 16, 90 20, 90 26 L 90 52 C 90 74, 66 88, 50 94 C 34 88, 10 74, 10 52 L 10 26 C 10 20, 14 16, 20 16 Z';

    case 'dome':
      // Cupola morbida
      return 'M 16 86 L 84 86 C 89 86, 92 82, 92 77 L 92 54 C 92 24, 74 10, 50 10 C 26 10, 8 24, 8 54 L 8 77 C 8 82, 11 86, 16 86 Z';

    case 'house':
      // Casetta morbida
      return 'M 44 12 C 48 9, 52 9, 56 12 L 88 40 C 92 44, 90 50, 85 50 L 84 50 L 84 82 C 84 88, 79 92, 73 92 L 27 92 C 21 92, 16 88, 16 82 L 16 50 L 15 50 C 10 50, 8 44, 12 40 Z';

    case 'square':
    default:
      return 'M 28 10 L 72 10 C 86 10, 92 16, 92 30 L 92 70 C 92 84, 86 90, 72 90 L 28 90 C 14 90, 8 84, 8 70 L 8 30 C 8 16, 14 10, 28 10 Z';
  }
}

