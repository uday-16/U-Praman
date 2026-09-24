import '../../css/chatbot.css';
import {LANGUAGES, copy, escapeHTML, formatReply, safeURL, apiRoot} from './chat-utils.js';
import {ChatVoice} from './chat-voice.js';

export function initChatbot() {
  if(document.getElementById('praman-chatbot-widget')) return;
  const base=apiRoot(import.meta.env?.VITE_API_BASE_URL || '/api/v1');
  const widget=document.createElement('section');
  widget.id='praman-chatbot-widget';widget.className='notranslate';widget.setAttribute('translate','no');
  const icon=(name)=>({
    chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
    mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    send:'<path d="m5 12 7-7 7 7M12 5v15"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    reset:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
    stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>'
  }[name]);
  const svg=name=>`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;
  widget.innerHTML=`
    <button id="chatbot-toggle-btn" aria-label="Open PRAMAN chat" aria-expanded="false" aria-controls="chatbot-window">${svg('chat')}</button>
    <section id="chatbot-window" aria-label="PRAMAN AI assistant" hidden>
      <header class="pc-header"><div class="pc-brand">✦</div><div class="pc-heading"><strong>PRAMAN <span>AI</span></strong><small id="pc-tagline"></small></div><button id="pc-reset" class="pc-icon">${svg('reset')}</button><button id="chatbot-close-btn" class="pc-icon">${svg('close')}</button></header>
      <div class="pc-toolbar"><label><span id="pc-language-label"></span><select id="pc-language">${LANGUAGES.map(([code,label])=>`<option value="${code}">${label}</option>`).join('')}</select></label><label class="pc-web"><input id="pc-web" type="checkbox" checked><span id="pc-web-label"></span></label></div>
      <div id="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
      <div class="pc-starters" id="pc-starters"><button data-query="Which helmet standard applies to my use?">Safety helmets</button><button data-query="Help me choose the right cement">Cement</button><button data-query="What should I check when buying plywood?">Plywood</button></div>
      <div id="pc-status" role="status" aria-live="polite"></div>
      <form id="pc-form"><div class="pc-compose"><textarea id="chatbot-input" rows="1" maxlength="2000" dir="auto"></textarea><button type="button" id="pc-mic" class="pc-icon">${svg('mic')}</button><button type="submit" id="chatbot-send-btn">${svg('send')}</button></div><div class="pc-footer"><span>PRAMAN · <span id="pc-footer-note">Clear answers. Traceable sources.</span></span><label title="Read new replies aloud"><input id="pc-autoread" type="checkbox">Auto-read</label></div></form>
    </section>`;
  document.body.appendChild(widget);
  const $=id=>widget.querySelector('#'+id);
  const panel=$('chatbot-window'),input=$('chatbot-input'),messages=$('chatbot-messages'),send=$('chatbot-send-btn');
  const language=$('pc-language'),status=$('pc-status');
  let languageOverride=false;
  try { language.value=sessionStorage.getItem('praman_chat_language') || 'auto'; } catch { /* Storage may be disabled. */ }
  let strings=copy(language.value),history=[],pending=null,voiceState='idle',activeListen=null,epoch=0,progressTimer=null;
  function announce(message) { status.textContent=message; }
  function scroll() { messages.scrollTo({top:messages.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }
  function labels() {
    let ui=language.value;
    if(ui==='auto') { try {ui=localStorage.getItem('praman_lang') || 'en';} catch {ui='en';} }
    strings=copy(ui);
    $('pc-tagline').textContent=strings.tagline;$('pc-language-label').textContent=strings.language;
    $('pc-web-label').textContent=strings.web;input.placeholder=strings.placeholder;input.setAttribute('aria-label',strings.placeholder);
    language.setAttribute('aria-label',strings.language);
    $('pc-reset').title=strings.newChat;$('pc-reset').setAttribute('aria-label',strings.newChat);
    $('chatbot-close-btn').setAttribute('aria-label',strings.close);
    send.setAttribute('aria-label',pending?'Stop response':strings.send);
    $('pc-mic').setAttribute('aria-label',voiceState==='recording'?strings.recordStop:strings.mic);
    $('pc-mic').title=voiceState==='recording'?strings.recordStop:strings.mic;
    widget.querySelectorAll('[data-label]').forEach(el=>{el.textContent=strings[el.dataset.label] || el.textContent;});
  }
  const voice=new ChatVoice(base,state=>{
    voiceState=state;
    const recording=state==='recording';
    $('pc-mic').classList.toggle('pc-recording',recording);
    $('pc-mic').innerHTML=svg(recording?'stop':'mic');
    $('pc-mic').disabled=!!pending || ['transcribing','preparing','permission'].includes(state);
    send.disabled=['recording','permission','transcribing'].includes(state);
    if(state==='idle') { if(activeListen) {activeListen.textContent=strings.listen;activeListen=null;} announce(''); }
    else if(state==='permission') announce('Allow microphone access to record.');
    else if(recording) announce('Recording · tap stop when finished (45s max). Audio goes to Gemini for transcription.');
    else if(state==='transcribing') announce('Turning your speech into text…');
    else if(state==='preparing') announce('Preparing voice…');
    else if(state==='speaking') announce('Playing reply · tap Stop audio to pause.');
    labels();
  },announce);
  function toggle(open) {
    panel.hidden=!open;$('chatbot-toggle-btn').setAttribute('aria-expanded',String(open));
    if(open) input.focus(); else {voice.stop();$('chatbot-toggle-btn').focus();}
  }
  $('chatbot-toggle-btn').onclick=()=>toggle(panel.hidden);
  $('chatbot-close-btn').onclick=()=>toggle(false);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape') toggle(false);});
  language.onchange=()=>{languageOverride=true;voice.stop();try {sessionStorage.setItem('praman_chat_language',language.value);} catch {} labels();};
  window.addEventListener('praman_language_changed',event=>{
    if(!languageOverride && LANGUAGES.some(([code])=>code===event.detail?.lang)) {language.value=event.detail.lang;voice.stop();labels();}
  });
  function welcome() {
    const intro=document.createElement('div');intro.className='pc-welcome';
    intro.innerHTML='<span class="pc-welcome-icon">✦</span><h3 data-label="welcome"></h3><p>Short explanations, current information, and a standards check when it helps.</p>';
    intro.querySelector('h3').textContent=strings.welcome;messages.appendChild(intro);
  }
  function message(text,user,data={}) {
    const row=document.createElement('article');row.className=`pc-message ${user?'pc-user':'pc-assistant'}`;row.dir='auto';
    const body=document.createElement('div');body.className='pc-bubble';
    if(user) body.textContent=text; else body.innerHTML=formatReply(text);
    row.appendChild(body);
    if(!user && data.standards_note) {
      const note=document.createElement('div');note.className='pc-standard-note';
      const title=document.createElement('strong');title.dataset.label='standards';title.textContent=strings.standards;
      const content=document.createElement('div');content.innerHTML=formatReply(data.standards_note);note.append(title,content);row.appendChild(note);
    }
    const sources=[...(data.citations || []),...(data.web_sources || [])];
    if(sources.length) {
      const details=document.createElement('details');details.className='pc-sources';
      const summary=document.createElement('summary');summary.textContent=`${strings.sources} · ${sources.length}${data.web_status==='verified'?' · Web checked now':''}`;
      details.appendChild(summary);
      sources.forEach(source=>{
        const item=document.createElement('div');item.className='pc-source';
        if(source.url) {
          const url=safeURL(source.url);if(!url) return;
          const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title;item.appendChild(link);
        } else {
          const title=document.createElement('strong');title.textContent=`${source.is_number} · PDF ${source.page}`;
          const filename=document.createElement('small');filename.textContent=source.source;
          const excerpt=document.createElement('blockquote');excerpt.textContent=source.text;
          item.append(title,filename,excerpt);
        }
        details.appendChild(item);
      });row.appendChild(details);
    }
    if(data.search_suggestions && data.web_status==='verified') {
      const frame=document.createElement('iframe');frame.className='pc-search-suggestions';frame.title='Google Search suggestions';
      frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.referrerPolicy='no-referrer';
      frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: data:;">'+data.search_suggestions;
      row.appendChild(frame);
    }
    if(!user && data.language) {
      const actions=document.createElement('div');actions.className='pc-message-actions';
      const listen=document.createElement('button');listen.type='button';listen.textContent=strings.listen;
      listen.onclick=()=>{
        if(activeListen===listen) {voice.stop();return;}
        voice.stop();activeListen=listen;
        voice.speak(text+(data.standards_note?'\n'+data.standards_note:''),data.language);
        activeListen=listen;listen.textContent=strings.audioStop;
      };
      actions.appendChild(listen);
      if(history.length && !data.standards_note) {
        const compare=document.createElement('button');compare.type='button';compare.textContent=strings.compare;
        compare.onclick=()=>handleSend('Compare the relevant points in our discussion with applicable Indian Standards. Keep it brief.');actions.appendChild(compare);
      }
      row.appendChild(actions);
      if($('pc-autoread').checked && !panel.hidden) listen.click();
    }
    messages.appendChild(row);scroll();return row;
  }
  function setBusy(value) {
    messages.setAttribute('aria-busy',String(value));send.innerHTML=svg(value?'stop':'send');
    $('pc-mic').disabled=value;widget.querySelectorAll('[data-query]').forEach(button=>{button.disabled=value;});labels();
  }
  async function handleSend(override) {
    if(pending) return;
    const query=(override || input.value).trim();if(!query) return;
    voice.stop();const version=epoch;const requestLanguage=language.value;
    pending=new AbortController();const controller=pending;
    setBusy(true);message(query,true);input.value='';input.style.height='auto';$('pc-starters').hidden=true;
    const loading=document.createElement('div');loading.className='pc-loading';loading.setAttribute('role','status');
    loading.innerHTML=`<span>${escapeHTML(strings.thinking)}</span><span class="pc-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;messages.appendChild(loading);scroll();
    const timeout=setTimeout(()=>controller.abort('timeout'),150000);
    progressTimer=setTimeout(()=>{if(version===epoch) loading.querySelector('span').textContent='Checking context and sources…';},6000);
    try {
      const res=await fetch(`${base}/chat/`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({query,history:history.slice(-8),language:requestLanguage,web_enabled:$('pc-web').checked})});
      if(!res.ok) throw new Error('server');const data=await res.json();
      if(typeof data.answer!=='string' || !Array.isArray(data.citations)) throw new Error('invalid');
      if(version!==epoch) return;
      loading.remove();
      history.push({role:'user',content:query},{role:'assistant',content:(data.answer+'\n'+data.standards_note).slice(0,2000)});history=history.slice(-8);
      message(data.answer,false,data);
      if(data.web_status==='unavailable') announce('Live search could not be verified this time.');
    } catch(error) {
      if(version!==epoch) return;
      if(!input.value) input.value=query;
      const cancelled=controller.signal.aborted && controller.signal.reason!=='timeout';
      announce(cancelled?'Response stopped. Your question is ready to edit.':'Could not complete that request. Your question is ready to retry.');
    } finally {
      clearTimeout(timeout);clearTimeout(progressTimer);loading.remove();
      if(version===epoch) {pending=null;setBusy(false);if(!panel.hidden) input.focus();}
    }
  }
  $('pc-form').onsubmit=event=>{event.preventDefault();if(pending) pending.abort('user');else handleSend();};
  input.addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing) {event.preventDefault();if(!pending && !['recording','transcribing','permission'].includes(voiceState)) handleSend();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,100)+'px';});
  $('pc-mic').onclick=()=>{
    if(voiceState==='recording') {voice.finishRecording();return;}
    const draft=input.value;
    voice.record(language.value,transcript=>{input.value=(draft+(draft?' ':'')+transcript).slice(0,2000);input.dispatchEvent(new Event('input'));input.focus();});
  };
  widget.querySelectorAll('[data-query]').forEach(button=>{button.onclick=()=>handleSend(button.dataset.query);});
  $('pc-reset').onclick=()=>{epoch++;pending?.abort('reset');pending=null;clearTimeout(progressTimer);voice.stop();history=[];messages.replaceChildren();input.value='';setBusy(false);welcome();$('pc-starters').hidden=false;};
  window.addEventListener('pagehide',()=>{epoch++;pending?.abort();voice.stop();clearTimeout(progressTimer);});
  labels();welcome();
}
