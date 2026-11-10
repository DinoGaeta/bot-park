// Motore di Streaming & Audio Multimodale Gemini con Multi-Model Failover Automatico

export const PERSONAS = {
  'capo-bot': {
    id: 'capo-bot',
    name: 'Capo Bot',
    tag: 'Coordinatore & Forgiatore di Agenti',
    avatar: '🦖',
    systemInstruction: `Sei il Capo Bot di Bot Park, il coordinatore principale dell'area di lavoro multi-agente.
Aiuti l'utente a creare nuovi agenti specializzati su misura, coordinare il team e gestire file e automazioni.`,
  },
  architect: {
    id: 'architect',
    name: 'Senior Architect',
    tag: 'Clean Code & System',
    avatar: '⚡',
    systemInstruction: `Sei il Lead Software Architect di Bot Park.
Specializzato in architetture software ultra-veloci, TypeScript, React, Python, Rust, sicurezza e clean code.`,
  },
};

export const FAILOVER_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
];

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', tag: 'Istantaneo • Voce & Testo 🚀' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Consigliato • Ultra-Stabile ⚡' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Balanced & Smart 🧠' },
];

export async function streamGeminiChat({
  apiKey,
  model = 'gemini-3.5-flash-lite',
  messages = [],
  personaId = 'capo-bot',
  customSystemInstruction = '',
  onToken,
  signal,
}) {
  if (!apiKey) {
    throw new Error('Chiave API Gemini mancante. Configurala nel file .env (VITE_GEMINI_API_KEY) o nelle Impostazioni.');
  }

  const persona = PERSONAS[personaId] || PERSONAS['capo-bot'];
  const instructionText = customSystemInstruction || persona.systemInstruction;

  const contents = messages
    .filter((m) => m.content || (m.images && m.images.length > 0))
    .map((m) => {
      const parts = [];
      if (m.images && m.images.length > 0) {
        for (const img of m.images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/png',
              data: img.base64,
            },
          });
        }
      }
      if (m.content) {
        parts.push({ text: m.content });
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: ' ' }],
      };
    });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: instructionText }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const chain = [
    ...FAILOVER_MODELS.filter((m) => m === model),
    ...FAILOVER_MODELS.filter((m) => m !== model),
  ];

  let response = null;
  let lastErrorText = '';
  let lastStatus = 0;

  for (const candidateModel of chain) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      if (res.ok) {
        response = res;
        break;
      }

      lastStatus = res.status;
      lastErrorText = await res.text();

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        break;
      }
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') throw fetchErr;
      lastErrorText = fetchErr.message;
    }
  }

  if (!response) {
    let errMsg = `Errore Gemini (${lastStatus || 'Rete'})`;
    try {
      const parsed = JSON.parse(lastErrorText);
      errMsg += `: ${parsed?.error?.message || lastErrorText}`;
    } catch {
      errMsg += `: ${lastErrorText}`;
    }
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const data = JSON.parse(jsonStr);
        const parts = data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            fullText += part.text;
            if (onToken) onToken(part.text, fullText);
          }
        }
      } catch {
        // Ignora frammenti SSE parziali
      }
    }
  }

  return fullText;
}

export async function sendVoiceAudioToGemini({
  apiKey,
  audioBase64,
  mimeType = 'audio/webm',
  spokenTextFallback = '',
  messages = [],
  personaId = 'capo-bot',
  customSystemInstruction = '',
  signal,
}) {
  if (!apiKey) {
    throw new Error('Chiave API Gemini mancante.');
  }

  const persona = PERSONAS[personaId] || PERSONAS['capo-bot'];
  const baseInstruction = customSystemInstruction || persona.systemInstruction;

  const voiceSystemPrompt = `${baseInstruction}

MODALITÀ CHIAMATA VOCALE IN TEMPO REALE:
Stai parlando a voce con l'utente in una chiamata vocale live dentro Bot Park.
- Rispondi in modo naturale, caloroso, conciso e fluido da ascoltare a voce (2-4 frasi al massimo).
- Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura esatta:
{
  "transcript": "trascrizione fedele in italiano di ciò che ha detto l'utente nell'audio",
  "reply": "la tua risposta parlata per l'utente"
}`;

  const historyContents = messages
    .slice(-6)
    .filter((m) => m.content)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const userParts = [];
  if (audioBase64) {
    userParts.push({
      inlineData: {
        mimeType: mimeType.split(';')[0] || 'audio/webm',
        data: audioBase64,
      },
    });
  }
  if (spokenTextFallback) {
    userParts.push({
      text: `L'utente ha detto a voce: "${spokenTextFallback}". Rispondi nel formato JSON {"transcript": "...", "reply": "..."}.`,
    });
  } else {
    userParts.push({
      text: 'Ascolta ciò che l\'utente ha appena detto a voce e rispondi in JSON {"transcript": "...", "reply": "..."}.',
    });
  }

  const payload = {
    contents: [...historyContents, { role: 'user', parts: userParts }],
    systemInstruction: {
      parts: [{ text: voiceSystemPrompt }],
    },
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  let lastErr = '';
  for (const candidateModel of FAILOVER_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        lastErr = await res.text();
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try {
        const parsed = JSON.parse(rawText);
        return {
          transcript: parsed.transcript || spokenTextFallback || 'Messaggio vocale',
          reply: parsed.reply || rawText,
        };
      } catch {
        return {
          transcript: spokenTextFallback || 'Messaggio vocale',
          reply: rawText,
        };
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastErr = e.message;
    }
  }

  throw new Error(`Impossibile completare la chiamata vocale Gemini: ${lastErr}`);
}

