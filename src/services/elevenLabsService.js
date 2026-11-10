// Servizio TTS ElevenLabs + Fallback Web Speech API per Bot Park

export const ELEVEN_LABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)', desc: 'Voce naturale, chiara e bilanciata' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Matura, rassicurante e professionale' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Brillante ed espressiva' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Solare, energica e calorosa' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', desc: 'Timbro profondo e autorevole' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Narratore caldo e coinvolgente' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Creatore dinamico e moderno' },
  { id: 'Cosmo', name: 'Cosmo (Sintesi Locale)', desc: 'Voce sintetica rapida del sistema' },
];

let currentAudio = null;

export async function stopCurrentSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export async function speakTextWithElevenLabs({
  text,
  voiceId = '21m00Tcm4TlvDq8ikWAM',
  apiKey,
  speed = 1.0,
  onStart,
  onEnd,
  onError,
}) {
  if (!text || !text.trim()) return;

  if (voiceId === 'Cosmo' || !apiKey) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`~>]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'it-IT';
      utterance.rate = typeof speed === 'number' ? speed : parseFloat(speed) || 1.1;
      utterance.onstart = () => onStart && onStart();
      utterance.onend = () => onEnd && onEnd();
      utterance.onerror = () => onEnd && onEnd();
      window.speechSynthesis.speak(utterance);
      return;
    }
  }

  try {
    await stopCurrentSpeech();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Blocco di codice omesso.')
      .replace(/[*#_`~>[\]()]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
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
      if ('speechSynthesis' in window) {
        const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
        fallbackUtterance.lang = 'it-IT';
        fallbackUtterance.onstart = onStart;
        fallbackUtterance.onend = onEnd;
        window.speechSynthesis.speak(fallbackUtterance);
        return;
      }
      throw new Error(`ElevenLabs HTTP ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onplay = () => onStart && onStart();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd && onEnd();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onError && onError(e);
      onEnd && onEnd();
    };

    await audio.play();
  } catch (err) {
    onError && onError(err);
    onEnd && onEnd();
  }
}

