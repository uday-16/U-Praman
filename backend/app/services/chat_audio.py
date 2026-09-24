"""Short audio requests; no audio files are retained on the server."""
import base64
import io
import json
import re
import wave
from app.config import settings
from app.services.gemini_service import _init_gemini, candidate_text


def transcribe_audio(data, mime, language):
    model = _init_gemini()
    if model is None:
        raise RuntimeError('Speech service unavailable')
    result = model.request([
        {'text': f'Transcribe only the speech in this recording. Language hint: {language}. Preserve the spoken language and script; do not translate or answer it. Return JSON {{"text":"transcript"}}. If silent or unintelligible return an empty text. Never invent speech.'},
        {'inlineData': {'mimeType': mime, 'data': base64.b64encode(data).decode('ascii')}}
    ], json_mode=True)
    text = json.loads(candidate_text(result)).get('text', '')
    if not isinstance(text, str) or len(text) > 2000:
        raise ValueError('Invalid transcript')
    return text.strip()


def synthesize_speech(text, language):
    model = _init_gemini()
    if model is None:
        raise RuntimeError('Speech service unavailable')
    result = model.request([{'text': f'Read the following text aloud in {language}, naturally and clearly. Read it exactly; add nothing:\n{text}'}],
        model=settings.gemini_tts_model,
        config={'responseModalities': ['AUDIO'], 'speechConfig': {
            'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': 'Kore'}}}})
    for part in result.get('content', {}).get('parts', []):
        inline = part.get('inlineData', {})
        if not inline.get('data'):
            continue
        raw = base64.b64decode(inline['data'], validate=True)
        if len(raw) > 12 * 1024 * 1024:
            raise ValueError('Audio too large')
        mime = inline.get('mimeType', '')
        if mime in {'audio/wav', 'audio/x-wav'}:
            return raw
        if not mime.startswith(('audio/L16','audio/pcm')):
            raise ValueError('Unexpected audio format')
        match = re.search(r'rate=(\d+)', mime)
        output = io.BytesIO()
        with wave.open(output, 'wb') as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(int(match[1]) if match else 24000)
            stream.writeframes(raw)
        return output.getvalue()
    raise RuntimeError('No speech generated')
