// Servizio TTS ElevenLabs per Bot Park / Samantha
// Utilizza la chiave sicura caricata da %LOCALAPPDATA%\SamanthaSecure\secrets.json

export const ELEVEN_LABS_VOICES = [
  { id: 'CiwzbDpaN3pQXjTgx3ML', name: 'Samantha (Aida)', desc: 'Voce originale profonda, setosa e intima' },
  { id: 'SKEVNjRKCergbPKum64u', name: 'Samantha (Cornelia)', desc: 'Calma, rilassata e calorosa' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Matura, rassicurante e professionale' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Attrice vellutata e brillante' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Solare, energica e calorosa' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', desc: 'Professionale e cordiale' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian (Rex/Bastione)', desc: 'Timbro profondo e autorevole' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Italo Sceneggiatore)', desc: 'Narratore caldo e coinvolgente' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Steve/Spielberg)', desc: 'Creatore dinamico e moderno' },
  { id: 'Cosmo', name: 'Cosmo (Sintesi Locale)', desc: 'Voce sintetica rapida predefinita' },
];

let currentAudio = null;
let sharedAudio = typeof Audio !== 'undefined' ? new Audio() : null;
let currentAudioUrl = null;

export function unlockAudioForMobile() {
  if (!sharedAudio) return;
  try {
    sharedAudio.playsInline = true;
    sharedAudio.setAttribute?.('playsinline', 'true');
    sharedAudio.src =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    sharedAudio.volume = 0.01;
    const p = sharedAudio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        sharedAudio.pause();
        sharedAudio.currentTime = 0;
        sharedAudio.volume = 1.0;
      }).catch(() => {});
    }
  } catch {}
}

export async function stopCurrentSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (currentAudioUrl) {
    try {
      URL.revokeObjectURL(currentAudioUrl);
    } catch {}
    currentAudioUrl = null;
  }
}

function speakNativeFallback(rawText, speed, onStart, onEnd) {
  const cleanText = String(rawText || '')
    .replace(/```[\s\S]*?```/g, 'Blocco di codice omesso.')
    .replace(/[*#_`~>[\]()]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
  if (!cleanText) {
    onEnd && onEnd();
    return;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'it-IT';
      utterance.rate = typeof speed === 'number' ? speed : parseFloat(speed) || 1.05;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const itaVoice =
        voices.find(
          (v) =>
            v.lang?.startsWith('it') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Alice') ||
              v.name.includes('Elsa') ||
              v.name.includes('Cosimo') ||
              v.name.includes('Federica'))
        ) || voices.find((v) => v.lang?.startsWith('it'));
      if (itaVoice) utterance.voice = itaVoice;

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        onEnd && onEnd();
      };
      utterance.onstart = () => onStart && onStart();
      utterance.onend = done;
      utterance.onerror = done;
      onStart && onStart();
      window.speechSynthesis.speak(utterance);
      return;
    } catch {}
  }

  onStart && onStart();
  const estMs = Math.max(1500, Math.min(8000, cleanText.length * 55));
  setTimeout(() => {
    onEnd && onEnd();
  }, estMs);
}

export async function speakTextWithElevenLabs({
  text,
  voiceId = 'CiwzbDpaN3pQXjTgx3ML',
  apiKey,
  speed = 1.0,
  onStart,
  onEnd,
  onError,
}) {
  if (!text || !text.trim()) return;

  // Rimuovi caratteri di formattazione markdown per sintesi pulita
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Blocco di codice omesso.')
    .replace(/[*#_`~>[\]()]/g, '')
    .replace(/\n+/g, '. ')
    .trim();

  if (!cleanText) {
    onEnd && onEnd();
    return;
  }

  // Se è Cosmo o manca la chiave API, usa fallback SpeechSynthesis del browser
  if (voiceId === 'Cosmo' || !apiKey) {
    speakNativeFallback(cleanText, speed, onStart, onEnd);
    return;
  }

  try {
    await stopCurrentSpeech();

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`ElevenLabs error ${response.status}:`, errText);
      speakNativeFallback(cleanText, speed, onStart, onEnd);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudioUrl = audioUrl;

    const audio = sharedAudio || new Audio();
    audio.playsInline = true;
    audio.setAttribute?.('playsinline', 'true');
    audio.volume = 1.0;
    audio.src = audioUrl;
    currentAudio = audio;

    audio.onplay = () => {
      onStart && onStart();
    };

    audio.onended = () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      currentAudio = null;
      onEnd && onEnd();
    };

    audio.onerror = () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      currentAudio = null;
      speakNativeFallback(cleanText, speed, onStart, onEnd);
    };

    await audio.play();
  } catch (err) {
    console.warn('TTS ElevenLabs/Audio fallback a voce nativa:', err);
    if (currentAudioUrl) {
      try {
        URL.revokeObjectURL(currentAudioUrl);
      } catch {}
      currentAudioUrl = null;
    }
    currentAudio = null;
    speakNativeFallback(cleanText, speed, onStart, onEnd);
  }
}
