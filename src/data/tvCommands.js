// Elenco UNICO dei comandi Smart TV (172.20.10.3:5555) condiviso da tutti i bot,
// sia in chat scritta sia in chiamata vocale. Deve restare allineato con /api/tv/command in vite.config.js.
export const TV_COMMANDS_RULE = `
CONTROLLO SMART TV DEL SALOTTO (Android TV 172.20.10.3, comandi reali via ADB):
Puoi controllare davvero il televisore di Dion. Quando Dion chiede un'azione sulla TV, aggiungi IN FONDO alla risposta, su una riga separata, UN SOLO tag:
<<<TV_COMMAND: {...JSON...}>>>
Comandi disponibili (usa esattamente questi "type"):
- Aprire un'app: {"type": "open_app", "app": "youtube"}  (app: youtube, smarttube, spotify, stremio, netflix, disney, prime, appletv, raiplay, tivimate)
- Cercare un video su YouTube: {"type": "youtube_search", "query": "musica rilassante"}
- Tasto del telecomando: {"type": "keyevent", "key": "HOME"}  (key: HOME, BACK, UP, DOWN, LEFT, RIGHT, OK, PLAY_PAUSE, VOLUME_UP, VOLUME_DOWN, MUTE, WAKEUP, SLEEP, POWER)
- Volume a un livello preciso: {"type": "volume_set", "level": 30}  (0-100)
- Scrivere testo nel campo selezionato (es. barra di ricerca già aperta): {"type": "type_text", "text": "Interstellar"}
- Far parlare la tua voce dagli altoparlanti della TV: {"type": "samantha_speak", "text": "Eccomi in salotto!"}
- Chiedere all'assistente JarvisTV della TV di eseguire una richiesta complessa: {"type": "samantha_query", "text": "metti un film di fantascienza su Stremio"}
- Attivare il microfono della TV: {"type": "trigger_mic"}
Regole: non inventare altri "type"; se un'azione non è nell'elenco dillo onestamente a Dion; non dire di aver fatto qualcosa sulla TV senza inserire il tag.
`;
