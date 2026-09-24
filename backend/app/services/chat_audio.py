"""Short audio requests; no audio files are retained on the server."""
import base64
import io
import json
import re
import wave
import requests
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
    if not settings.gemini_api_key.strip():
        raise RuntimeError('Speech service unavailable')
    # Gemini TTS uses the Interactions endpoint. Its response is raw PCM, which is
    # wrapped below as a browser-playable WAV file.
    payload = {
        'model': settings.gemini_tts_model,
        'input': [{'type': 'user_input', 'content': [{
            'type': 'text', 'text': f'Read this exactly in {language}, with a clear and friendly voice: {text}',
            'annotations': [{'type': 'speech_metadata', 'style': 'clear, warm and professional'}]
        }]}],
        'response_format': {'type': 'audio', 'mime_type': 'audio/l16', 'sample_rate': 24000},
        'generation_config': {'speech_config': [{'voice': 'Kore'}]},
    }
    response = requests.post(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        headers={'x-goog-api-key': settings.gemini_api_key}, json=payload, timeout=(10, 60))
    if not response.ok:
        raise RuntimeError(f'TTS returned HTTP {response.status_code}')
    body = response.json()
    output = body.get('interaction', body).get('output_audio', {})
    encoded = output.get('data') if isinstance(output, dict) else None
    if not encoded:
        raise RuntimeError('No speech generated')
    raw = base64.b64decode(encoded, validate=True)
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError('Audio too large')
    return _pcm_to_wav(raw, 24000)


def _pcm_to_wav(raw, sample_rate):
    output = io.BytesIO()
    with wave.open(output, 'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(sample_rate)
        stream.writeframes(raw)
    return output.getvalue()
