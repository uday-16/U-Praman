import sys, time, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.services.chat_assistant import chat_reply, research
from app.services.gemini_service import _init_gemini
from app.services.chat_audio import synthesize_speech, transcribe_audio
for query, language in [('Helmet standard','en'),('plywood','en'),('సిమెంట్ గురించి సులభంగా చెప్పండి','te')]:
    start=time.time()
    result=chat_reply(query,language=language)
    print(json.dumps({'query':query,'seconds':round(time.time()-start,1),**result},ensure_ascii=True)[:4500],flush=True)
try:
    audio=synthesize_speech('నమస్తే. మీకు ఎలా సహాయపడగలను?', 'te')
    print('Speech WAV bytes:',len(audio),'header:',audio[:4],flush=True)
    print('Transcript:',ascii(transcribe_audio(audio,'audio/wav','te')),flush=True)
except Exception as error:
    print('Audio error:',type(error).__name__,str(error),flush=True)
