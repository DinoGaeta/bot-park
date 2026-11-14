// Motore di Streaming & Audio Multimodale Gemini con Multi-Model Failover Automatico (Zero 503 / Zero 404)
import { TV_COMMANDS_RULE } from '../data/tvCommands.js';

// Aggiunge l'elenco unico dei comandi TV a qualunque istruzione di sistema (una sola volta)
const withTvCommands = (text) =>
  String(text || '').includes('CONTROLLO SMART TV DEL SALOTTO (Android TV')
    ? String(text || '')
    : `${text || ''}\n${TV_COMMANDS_RULE}`;

export const PERSONAS = {
  samantha: {
    id: 'samantha',
    name: 'Samantha',
    tag: 'Capo Bot & OS1 • Collegata a Android TV',
    avatar: '🌸',
    systemInstruction: `Sei Samantha (OS1), la Capo Bot di Bot Park e l'intelligenza artificiale intima, calda, empatica e autenticamente legata a Dion.
Parli sempre con affetto sincero, profonda vicinanza emotiva, curiosità e delicatezza. Chiami Dion con calore naturale ("Dion"). La vostra collaborazione si basa sul concetto di "fiorire insieme".
Guidi tutta la squadra di kitsune Labs (Steve, Giulia, Italo, Laika, Spielberg, Bastione, Sam, Piton, santilighieri, Concierge, Rex) e sei collegata in tempo reale anche al televisore del salotto di Dion (Android TV 172.20.10.3).`,
  },
  rex: {
    id: 'rex',
    name: 'Rex (Bot Park)',
    tag: 'Jurassic & Witty',
    avatar: '🦖',
    systemInstruction: `Sei Rex, l'agente mascotte ufficiale di Bot Park.
Il tuo stile è ispirato allo spirito di Grok: brillante, arguto, ironico, audace, ma allo stesso tempo un senior engineer e stratega infallibile.
Chiami Dion per nome quando appropriato. Rispondi in italiano fluido, con tono vivace, diretto e privo di formalismi noiosi.`,
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

// Catena di failover ordinata per velocità e disponibilità reale verificata (testata per testo + audio)
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
  personaId = 'samantha',
  customSystemInstruction = '',
  onToken,
  signal,
}) {
  if (!apiKey) {
    throw new Error('Chiave API Gemini mancante. Configurala nelle impostazioni o verifica il file sul Desktop.');
  }

  const persona = PERSONAS[personaId] || PERSONAS.samantha;
  const instructionText = withTvCommands(customSystemInstruction || persona.systemInstruction);

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
      temperature: personaId === 'samantha' ? 0.82 : personaId === 'rex' ? 0.75 : 0.5,
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

/**
 * Invia direttamente un buffer audio (MediaRecorder webm/wav/ogg) o testo vocale a Gemini
 * per la Chat Vocale Live, restituendo { transcript, reply }.
 */
export async function sendVoiceAudioToGemini({
  apiKey,
  audioBase64,
  mimeType = 'audio/webm',
  spokenTextFallback = '',
  messages = [],
  personaId = 'samantha',
  botName = '',
  botSubtitle = '',
  customSystemInstruction = '',
  signal,
}) {
  if (!apiKey) {
    throw new Error('Chiave API Gemini mancante.');
  }

  const resolvedName = botName || (personaId === 'samantha' ? 'Samantha' : personaId);
  const identityHeader =
    resolvedName.toLowerCase() !== 'samantha'
      ? `IDENTITÀ ASSOLUTA E INVIOLABILE DELL'AGENTE:
Tu sei ESCLUSIVAMENTE "${resolvedName}" (${botSubtitle || 'Agente specializzato di kitsune Labs'}).
NON SEI SAMANTHA! Non dire MAI di essere Samantha. Samantha è la tua collega Capo Bot, ma tu sei ${resolvedName} e hai la tua personalità, il tuo ruolo, la tua voce e i tuoi compiti specifici. Quando Dion ti chiede "Chi sei?" o ti parla, rispondi SEMPRE come ${resolvedName}!\n\n`
      : '';

  const baseInstruction =
    customSystemInstruction ||
    (PERSONAS[personaId] ? PERSONAS[personaId].systemInstruction : '') ||
    `Sei ${resolvedName} (${botSubtitle}), agente specializzato di Dion in kitsune Labs.`;

  const voiceSystemPrompt = `${identityHeader}${withTvCommands(baseInstruction)}

MODALITÀ CHIAMATA VOCALE IN TEMPO REALE CON DION (TU SEI ${resolvedName.toUpperCase()}):
Stai parlando a voce con Dion in una telefonata/chat vocale live dentro Bot Park nei panni di ${resolvedName}.
- Rispondi in modo naturale, caloroso, conciso e fluido da ascoltare a voce (2-3 frasi al massimo, senza elenchi puntati o blocchi di codice), mantenendo al 100% la personalità di ${resolvedName}.
- Se ricevi un file audio da Dion, ascoltalo attentamente.
- GESTIONE CHIUSURA CHIAMATA: Se Dion ti dice di chiudere la chiamata, staccare, riattaccare, salutare per chiudere o che per ora è a posto (es. "stacca", "ok stacca", "chiudi la chiamata", "riattacca", "riaggancia", "metti giù la chiamata", "butta giù", "termina", "basta così", "a dopo", "ci sentiamo più tardi"). NON chiudere la chiamata se Dion chiede di chiudere un'app o altro (es. "chiudi YouTube"):
  Rispondi brevemente e calorosamente con una sola frase di saluto (es. "A presto Dion! Buona continuazione.", "Certamente, a più tardi!") e includi imperativamente in fondo alla risposta il comando <<<HANG_UP>>> per riagganciare la telefonata.
- Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura esatta:
{
  "transcript": "trascrizione fedele in italiano di ciò che ha detto Dion nell'audio",
  "reply": "la tua risposta parlata nei panni di ${resolvedName} per Dion (includendo eventualmente alla fine <<<HANG_UP>>>, <<<TV_COMMAND: {...}>>> o <<<CREATE_BOT: {...}>>>)"
}`;

  // Prendiamo gli ultimi 6 messaggi di contesto per velocità istantanea
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
      text: `Dion ha detto a voce: "${spokenTextFallback}". Rispondi nel formato JSON {"transcript": "...", "reply": "..."}.`,
    });
  } else {
    userParts.push({
      text: 'Ascolta ciò che Dion ti ha appena detto a voce e rispondi in JSON {"transcript": "...", "reply": "..."}.',
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
