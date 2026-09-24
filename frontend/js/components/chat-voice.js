// Browser/device voices first, Gemini fallback. Recording is always explicitly initiated.
export class ChatVoice {
  constructor(base, onState, onError) {
    this.base=base; this.onState=onState; this.onError=onError; this.sequence=0;
  }
  stop() {
    this.sequence++;
    this.controller?.abort(); this.controller=null;
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recorder=null;
    this.stream?.getTracks().forEach(track=>track.stop()); this.stream=null;
    clearTimeout(this.timer);
    if (this.audio) { this.audio.pause(); this.audio=null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url=null; }
    window.speechSynthesis?.cancel();
    this.onState('idle');
  }
  finishRecording() { if (this.recorder?.state === 'recording') this.recorder.stop(); }
  async record(language, onTranscript) {
    this.stop();
    const id=this.sequence;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { this.onError('Recording is unavailable here. Open this page in a current browser over HTTPS or localhost, or type your question.'); return; }
    try {
      this.onState('permission');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if (id !== this.sequence) { stream.getTracks().forEach(track=>track.stop()); return; }
      this.stream=stream;
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mime ? {mimeType:mime} : undefined);
      this.recorder=recorder;
      const chunks=[];
      recorder.ondataavailable=event=>{ if(event.data.size) chunks.push(event.data); };
      recorder.onerror=()=>{ if(id===this.sequence) { this.stop(); this.onError('Recording failed. Please retry or type your question.'); } };
      recorder.onstop=async()=>{
        stream.getTracks().forEach(track=>track.stop());
        clearTimeout(this.timer);
        if(id !== this.sequence) return;
        this.stream=null; this.recorder=null;
        const blob=new Blob(chunks,{type:recorder.mimeType || mime || 'audio/webm'});
        if (!blob.size || blob.size>8*1024*1024) { this.stop(); this.onError('Please record a shorter message.'); return; }
        this.onState('transcribing');
        const form=new FormData(); form.append('audio',blob,'question'); form.append('language',language);
        this.controller=new AbortController();
        this.timer=setTimeout(()=>this.controller?.abort(),65000);
        try {
          const res=await fetch(`${this.base}/chat/transcribe`,{method:'POST',body:form,signal:this.controller.signal});
          if(!res.ok) throw new Error('transcribe');
          const data=await res.json();
          if(id !== this.sequence) return;
          if(typeof data.text !== 'string' || !data.text.trim()) throw new Error('silence');
          onTranscript(data.text);
          this.stop();
        } catch(error) {
          if(id===this.sequence) { this.stop(); this.onError(error.message==='silence' ? 'I did not catch that. Please speak again.' : 'Could not transcribe that recording. Please retry or type your question.'); }
        }
      };
      recorder.start(); this.onState('recording');
      this.timer=setTimeout(()=>this.finishRecording(),45000);
    } catch(error) {
      if(id===this.sequence) { this.stop(); this.onError(error.name==='NotAllowedError' ? 'Microphone access was not allowed. You can enable it in browser permissions or type instead.' : 'No microphone is available. Please connect one or type your question.'); }
    }
  }
  async speak(text, language, onDone=()=>{}) {
    this.stop();
    const id=this.sequence;
    const spoken=text.replace(/[*#`]/g,'').slice(0,2000);
    const synth=window.speechSynthesis;
    const matching=synth?.getVoices().find(v=>v.lang.toLowerCase().split('-')[0]===language);
    const done=()=>{if(id===this.sequence) {this.stop();onDone();}};
    const cloud=async()=>{
      try {
        this.onState('preparing'); this.controller=new AbortController();
        this.timer=setTimeout(()=>this.controller?.abort(),65000);
        const res=await fetch(`${this.base}/chat/speak`,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({text:spoken,language}),signal:this.controller.signal});
        if(!res.ok) throw new Error('speech');
        const blob=await res.blob();
        if(id!==this.sequence) return;
        clearTimeout(this.timer);
        this.url=URL.createObjectURL(blob); this.audio=new Audio(this.url);
        this.audio.onended=done;
        this.audio.onerror=()=>{done();this.onError('Audio could not play. Please try Listen again.');};
        this.onState('speaking'); await this.audio.play();
      } catch { if(id===this.sequence) {done();this.onError('Voice is unavailable right now. You can still read the reply.');} }
    };
    if(matching && window.SpeechSynthesisUtterance) {
      const utterance=new SpeechSynthesisUtterance(spoken);
      utterance.lang=matching.lang;utterance.voice=matching;utterance.rate=1;
      utterance.onend=done;utterance.onerror=()=>{if(id===this.sequence) cloud();};
      this.onState('speaking');synth.speak(utterance);
    } else await cloud();
  }
}

