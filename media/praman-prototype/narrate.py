import asyncio, json
from pathlib import Path
import edge_tts

ROOT=Path(__file__).resolve().parent
async def main():
    scenes=json.loads((ROOT/'storyboard.json').read_text())
    for i,s in enumerate(scenes):
        dest=ROOT/f'voice-{i:02}.mp3'
        if dest.exists() and dest.stat().st_size>1000: continue
        await asyncio.wait_for(edge_tts.Communicate(s['voice'], 'en-IN-NeerjaNeural', rate='+4%').save(str(dest)), timeout=45)
        print(f'Narration {i+1}/{len(scenes)} saved', flush=True)
if __name__=='__main__': asyncio.run(main())
