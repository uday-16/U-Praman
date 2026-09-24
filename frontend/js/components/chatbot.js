import '../../css/chatbot.css';
import {LANGUAGES, copy, escapeHTML, formatReply, safeURL, apiRoot} from './chat-utils.js';
import {ChatVoice} from './chat-voice.js';

export function initChatbot() {
  if (document.getElementById('praman-chatbot-widget')) return;
  const base = apiRoot(import.meta.env?.VITE_API_BASE_URL || '/api/v1');
  const widget = document.createElement('section');
  widget.id = 'praman-chatbot-widget';
  widget.className = 'notranslate';
  widget.setAttribute('translate', 'no');

  const icon = (name) => ({
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    send: '<path d="m5 12 7-7 7 7M12 5v15"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    copy: '<rect width="13" height="13" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
  }[name]);

  const svg = (name, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;

  const PRAMAN_LOGO_SVG = (size = 20) => `
    <svg class="praman-ai-crest" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="crestGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="sparkGrad" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#fef08a"/>
        </linearGradient>
      </defs>
      <path d="M16 2.5L28 7.5V17C28 23.5 22.8 28.5 16 30.5C9.2 28.5 4 23.5 4 17V7.5L16 2.5Z" 
            fill="url(#crestGrad)" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M16 6L24.5 10.5V16.8C24.5 21.5 20.8 25.4 16 27.2C11.2 25.4 7.5 21.5 7.5 16.8V10.5L16 6Z" 
            fill="rgba(10,25,47,0.45)"/>
      <path d="M16 8C16 12.2 12.2 16 8 16C12.2 16 16 19.8 16 24C16 19.8 19.8 16 24 16C19.8 16 16 12.2 16 8Z" 
            fill="url(#sparkGrad)"/>
      <circle cx="16" cy="16" r="2.2" fill="#ffffff"/>
    </svg>
  `;

  widget.innerHTML = `
    <button id="chatbot-toggle-btn" aria-label="Open PRAMAN Assistant" aria-expanded="false" aria-controls="chatbot-window">
      <span class="pc-toggle-spark">${PRAMAN_LOGO_SVG(16)}</span>
      <span class="pc-toggle-text">PRAMAN Assistant</span>
    </button>
    <section id="chatbot-window" aria-label="PRAMAN AI assistant" hidden>
      <header class="pc-header">
        <div class="pc-brand-group">
          <div class="pc-brand">${PRAMAN_LOGO_SVG(26)}</div>
          <div class="pc-heading">
            <div class="pc-title-row">
              <strong>PRAMAN <span>AI</span></strong>
              <span class="pc-live-dot" title="Powered by Gemini AI"></span>
            </div>
            <small id="pc-tagline">Government Procurement & BIS Standards Copilot</small>
          </div>
        </div>
        <div class="pc-header-actions">
          <button id="pc-reset" class="pc-icon" title="New conversation" aria-label="New conversation">${svg('reset', 17)}</button>
          <button id="chatbot-close-btn" class="pc-icon" title="Close chat" aria-label="Close chat">${svg('close', 17)}</button>
        </div>
      </header>
      <div class="pc-toolbar">
        <label>
          <span id="pc-language-label">Language:</span>
          <select id="pc-language">
            ${LANGUAGES.map(([code, label]) => `<option value="${code}">${label}</option>`).join('')}
          </select>
        </label>
        <label class="pc-web">
          <input id="pc-web" type="checkbox" checked>
          <span id="pc-web-label">Live Web Grounding</span>
        </label>
      </div>
      <div id="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
      <div class="pc-starters" id="pc-starters">
        <button data-query="What are the recent changes, revisions, and amendments in Indian Standards (BIS)?">
          <span class="pc-starter-icon">⚡</span>
          <div class="pc-starter-text">
            <strong>Standards Changes</strong>
            <span>Revisions & QCO updates</span>
          </div>
        </button>
        <button data-query="How does PRAMAN analyze procurement specifications and verify BIS compliance?">
          <span class="pc-starter-icon">📋</span>
          <div class="pc-starter-text">
            <strong>How PRAMAN Works</strong>
            <span>AI parsing & verification</span>
          </div>
        </button>
        <button data-query="What are the BIS standards and mandatory QCO rules for plywood (IS 303 & IS 710)?">
          <span class="pc-starter-icon">🪵</span>
          <div class="pc-starter-text">
            <strong>Plywood & Timber</strong>
            <span>IS 303, IS 710 & QCO</span>
          </div>
        </button>
        <button data-query="How does PRAMAN generate verifiable SHA-256 compliance certificates for GeM tenders?">
          <span class="pc-starter-icon">🛡️</span>
          <div class="pc-starter-text">
            <strong>SHA-256 Certificates</strong>
            <span>Tamper-proof audit trails</span>
          </div>
        </button>
        <button data-query="Which product categories currently require mandatory Quality Control Orders (QCO) for government procurement?">
          <span class="pc-starter-icon">⚖️</span>
          <div class="pc-starter-text">
            <strong>Mandatory QCOs</strong>
            <span>Compulsory ISI/CRS check</span>
          </div>
        </button>
        <button data-query="What are the key requirements for PVC insulated cables under IS 694?">
          <span class="pc-starter-icon">🔌</span>
          <div class="pc-starter-text">
            <strong>Electrical Cables</strong>
            <span>IS 694 test specs & limits</span>
          </div>
        </button>
      </div>
      <div id="pc-status" role="status" aria-live="polite"></div>
      <form id="pc-form">
        <div class="pc-compose">
          <textarea id="chatbot-input" rows="1" maxlength="2000" dir="auto" placeholder="Ask PRAMAN AI about any standard, product, or tender..."></textarea>
          <button type="button" id="pc-mic" class="pc-icon" title="Voice input">${svg('mic', 17)}</button>
          <button type="submit" id="chatbot-send-btn" title="Send message" aria-label="Send message">${svg('send', 17)}</button>
        </div>
        <div class="pc-footer">
          <span>PRAMAN AI · <span id="pc-footer-note">Decision intelligence for Indian Standards</span></span>
          <label title="Read new replies aloud">
            <input id="pc-autoread" type="checkbox"> Auto-read
          </label>
        </div>
      </form>
    </section>`;

  document.body.appendChild(widget);

  const $ = (id) => widget.querySelector('#' + id);
  const panel = $('chatbot-window');
  const input = $('chatbot-input');
  const messages = $('chatbot-messages');
  const send = $('chatbot-send-btn');
  const language = $('pc-language');
  const status = $('pc-status');

  let languageOverride = false;
  try {
    language.value = sessionStorage.getItem('praman_chat_language') || 'auto';
  } catch {
    /* Storage may be disabled. */
  }

  let strings = copy(language.value);
  let history = [];
  let pending = null;
  let voiceState = 'idle';
  let activeListen = null;
  let epoch = 0;
  let progressTimer = null;

  function announce(message) {
    status.textContent = message;
  }

  function scroll() {
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  function labels() {
    let ui = language.value;
    if (ui === 'auto') {
      try {
        ui = localStorage.getItem('praman_lang') || 'en';
      } catch {
        ui = 'en';
      }
    }
    strings = copy(ui);
    $('pc-tagline').textContent = strings.tagline || 'Government Procurement & BIS Standards Copilot';
    $('pc-language-label').textContent = strings.language || 'Language:';
    $('pc-web-label').textContent = strings.web || 'Live Web Grounding';
    input.placeholder = strings.placeholder || 'Ask PRAMAN AI about any standard, product, or tender...';
    input.setAttribute('aria-label', input.placeholder);
    language.setAttribute('aria-label', strings.language || 'Language');
    $('pc-reset').title = strings.newChat || 'New conversation';
    $('pc-reset').setAttribute('aria-label', strings.newChat || 'New conversation');
    $('chatbot-close-btn').setAttribute('aria-label', strings.close || 'Close chat');
    send.setAttribute('aria-label', pending ? 'Stop response' : (strings.send || 'Send message'));
    $('pc-mic').setAttribute('aria-label', voiceState === 'recording' ? strings.recordStop : strings.mic);
    $('pc-mic').title = voiceState === 'recording' ? strings.recordStop : strings.mic;
    widget.querySelectorAll('[data-label]').forEach(el => {
      el.textContent = strings[el.dataset.label] || el.textContent;
    });
  }

  const voice = new ChatVoice(base, (state) => {
    voiceState = state;
    const recording = state === 'recording';
    $('pc-mic').classList.toggle('pc-recording', recording);
    $('pc-mic').innerHTML = svg(recording ? 'stop' : 'mic', 17);
    $('pc-mic').disabled = !!pending || ['transcribing', 'preparing', 'permission'].includes(state);
    send.disabled = ['recording', 'permission', 'transcribing'].includes(state);
    if (state === 'idle') {
      if (activeListen) {
        activeListen.innerHTML = `${svg('volume', 13)} <span>${strings.listen || 'Listen'}</span>`;
        activeListen = null;
      }
      announce('');
    } else if (state === 'permission') {
      announce('Allow microphone access to record voice question.');
    } else if (recording) {
      announce('Listening... Tap stop when finished. Audio is transcribed via Gemini AI.');
    } else if (state === 'transcribing') {
      announce('Transcribing your speech with Gemini AI…');
    } else if (state === 'preparing') {
      announce('Synthesizing speech…');
    } else if (state === 'speaking') {
      announce('Playing response aloud · tap Stop to pause.');
    }
    labels();
  }, announce);

  function toggle(open) {
    panel.hidden = !open;
    $('chatbot-toggle-btn').setAttribute('aria-expanded', String(open));
    if (open) {
      input.focus();
    } else {
      voice.stop();
      $('chatbot-toggle-btn').focus();
    }
  }

  $('chatbot-toggle-btn').onclick = () => toggle(panel.hidden);
  $('chatbot-close-btn').onclick = () => toggle(false);

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggle(false);
  });

  language.onchange = () => {
    languageOverride = true;
    voice.stop();
    try {
      sessionStorage.setItem('praman_chat_language', language.value);
    } catch {}
    labels();
  };

  window.addEventListener('praman_language_changed', (event) => {
    if (!languageOverride && LANGUAGES.some(([code]) => code === event.detail?.lang)) {
      language.value = event.detail.lang;
      voice.stop();
      labels();
    }
  });

  function welcome() {
    const intro = document.createElement('div');
    intro.className = 'pc-welcome';
    intro.innerHTML = `
      <div class="pc-welcome-badge">${PRAMAN_LOGO_SVG(16)} <span>Official BIS & GeM Copilot</span></div>
      <h3 data-label="welcome">${escapeHTML(strings.welcome || 'Namaste! How can I assist with Indian Standards today?')}</h3>
      <p>Ask anything about Bureau of Indian Standards (BIS) specifications, mandatory QCOs, standards changes, tender compliance analysis, or PRAMAN platform features.</p>
    `;
    messages.appendChild(intro);
  }

  function message(text, user, data = {}) {
    const row = document.createElement('article');
    row.className = `pc-message ${user ? 'pc-user' : 'pc-assistant'}`;
    row.dir = 'auto';

    if (user) {
      const body = document.createElement('div');
      body.className = 'pc-bubble';
      body.textContent = text;
      row.appendChild(body);
    } else {
      const assistantRow = document.createElement('div');
      assistantRow.className = 'pc-assistant-row';

      const avatar = document.createElement('div');
      avatar.className = 'pc-avatar';
      avatar.innerHTML = PRAMAN_LOGO_SVG(18);

      const bubbleWrapper = document.createElement('div');
      bubbleWrapper.className = 'pc-bubble-wrapper';

      const body = document.createElement('div');
      body.className = 'pc-bubble';
      body.innerHTML = formatReply(text);
      bubbleWrapper.appendChild(body);

      if (data.standards_note) {
        const note = document.createElement('div');
        note.className = 'pc-standard-note';
        const title = document.createElement('strong');
        title.innerHTML = '⚖️ ' + escapeHTML(strings.standards || 'Standards Benchmark');
        const content = document.createElement('div');
        content.innerHTML = formatReply(data.standards_note);
        note.append(title, content);
        bubbleWrapper.appendChild(note);
      }

      const sources = [...(data.citations || []), ...(data.web_sources || [])];
      if (sources.length) {
        const details = document.createElement('details');
        details.className = 'pc-sources';
        const summary = document.createElement('summary');
        summary.textContent = `📚 ${strings.sources || 'Sources'} · ${sources.length}${data.web_status === 'verified' ? ' · Web verified' : ''}`;
        details.appendChild(summary);
        sources.forEach(source => {
          const item = document.createElement('div');
          item.className = 'pc-source';
          if (source.url) {
            const url = safeURL(source.url);
            if (!url) return;
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = source.title;
            item.appendChild(link);
          } else {
            const title = document.createElement('strong');
            title.textContent = `${source.is_number} · PDF Page ${source.page}`;
            const filename = document.createElement('small');
            filename.textContent = source.source;
            const excerpt = document.createElement('blockquote');
            excerpt.textContent = source.text;
            item.append(title, filename, excerpt);
          }
          details.appendChild(item);
        });
        bubbleWrapper.appendChild(details);
      }

      // Actions row (Copy, Audio Read, Compare)
      const actions = document.createElement('div');
      actions.className = 'pc-message-actions';

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'pc-action-btn';
      copyBtn.innerHTML = `${svg('copy', 13)} <span>Copy</span>`;
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.classList.add('pc-copied');
          copyBtn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('pc-copied');
            copyBtn.querySelector('span').textContent = 'Copy';
          }, 2000);
        } catch {
          // fallback
        }
      };
      actions.appendChild(copyBtn);

      // Listen TTS button
      if (data.language) {
        const listen = document.createElement('button');
        listen.type = 'button';
        listen.className = 'pc-action-btn';
        listen.innerHTML = `${svg('volume', 13)} <span>${strings.listen || 'Listen'}</span>`;
        listen.onclick = () => {
          if (activeListen === listen) {
            voice.stop();
            return;
          }
          voice.stop();
          activeListen = listen;
          voice.speak(text + (data.standards_note ? '\n' + data.standards_note : ''), data.language);
          listen.querySelector('span').textContent = strings.audioStop || 'Stop audio';
        };
        actions.appendChild(listen);
      }

      if (history.length && !data.standards_note) {
        const compare = document.createElement('button');
        compare.type = 'button';
        compare.className = 'pc-action-btn';
        compare.innerHTML = `<span>${strings.compare || 'Compare standards'}</span>`;
        compare.onclick = () => handleSend('Compare the relevant points in our discussion with applicable Indian Standards. Keep it brief.');
        actions.appendChild(compare);
      }

      bubbleWrapper.appendChild(actions);
      assistantRow.append(avatar, bubbleWrapper);
      row.appendChild(assistantRow);
    }

    messages.appendChild(row);
    scroll();
    return row;
  }

  function setBusy(value) {
    messages.setAttribute('aria-busy', String(value));
    send.innerHTML = svg(value ? 'stop' : 'send', 17);
    $('pc-mic').disabled = value;
    widget.querySelectorAll('[data-query]').forEach(button => {
      button.disabled = value;
    });
    labels();
  }

  async function handleSend(override, isVoice = false) {
    if (pending) return;
    const query = (override || input.value).trim();
    if (!query) return;
    voice.stop();
    const version = epoch;
    const requestLanguage = language.value;
    pending = new AbortController();
    const controller = pending;
    setBusy(true);
    message(query, true);
    input.value = '';
    input.style.height = 'auto';
    $('pc-starters').hidden = true;

    const loading = document.createElement('div');
    loading.className = 'pc-loading';
    loading.setAttribute('role', 'status');
    loading.innerHTML = `<span>${escapeHTML(strings.thinking || 'Thinking it through')}</span><span class="pc-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
    messages.appendChild(loading);
    scroll();

    const timeout = setTimeout(() => controller.abort('timeout'), 150000);
    progressTimer = setTimeout(() => {
      if (version === epoch) loading.querySelector('span').textContent = 'Analyzing BIS records & standards context…';
    }, 5000);

    try {
      const res = await fetch(`${base}/chat/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        signal: controller.signal,
        body: JSON.stringify({
          query,
          history: history.slice(-8),
          language: requestLanguage,
          web_enabled: $('pc-web').checked
        })
      });

      if (!res.ok) throw new Error('server');
      const data = await res.json();
      if (typeof data.answer !== 'string' || !Array.isArray(data.citations)) throw new Error('invalid');
      if (version !== epoch) return;
      loading.remove();
      history.push(
        {role: 'user', content: query},
        {role: 'assistant', content: (data.answer + '\n' + data.standards_note).slice(0, 3000)}
      );
      history = history.slice(-8);
      message(data.answer, false, data);
      if (data.web_status === 'unavailable') {
        announce('Live search was skipped; answered using comprehensive BIS domain knowledge.');
      }
      if (isVoice || $('pc-autoread').checked) {
        const spokenText = (data.answer || '')
          .replace(/###?\s+/g, '')
          .replace(/[*#`_]/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[-•]\s+/g, '')
          .slice(0, 2000);
        if (spokenText) {
          setTimeout(() => {
            voice.speak(spokenText, data.language || 'en');
          }, 350);
        }
      }
    } catch (error) {
      if (version !== epoch) return;
      if (!input.value) input.value = query;
      const cancelled = controller.signal.aborted && controller.signal.reason !== 'timeout';
      announce(cancelled ? 'Response stopped. Your question is ready to edit.' : 'Could not complete that request. Your question is ready to retry.');
    } finally {
      clearTimeout(timeout);
      clearTimeout(progressTimer);
      loading.remove();
      if (version === epoch) {
        pending = null;
        setBusy(false);
        if (!panel.hidden) input.focus();
      }
    }
  }

  $('pc-form').onsubmit = (event) => {
    event.preventDefault();
    if (pending) pending.abort('user');
    else handleSend();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!pending && !['recording', 'transcribing', 'permission'].includes(voiceState)) {
        handleSend();
      }
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
  });

  $('pc-mic').onclick = () => {
    if (voiceState === 'recording') {
      voice.finishRecording();
      return;
    }
    const draft = input.value;
    voice.record(language.value, (transcript) => {
      const fullQuery = (draft + (draft ? ' ' : '') + transcript).slice(0, 2000).trim();
      if (fullQuery) {
        input.value = fullQuery;
        input.dispatchEvent(new Event('input'));
        handleSend(fullQuery, true /* isVoice */);
      } else {
        input.focus();
      }
    });
  };

  widget.querySelectorAll('[data-query]').forEach(button => {
    button.onclick = () => handleSend(button.dataset.query);
  });

  $('pc-reset').onclick = () => {
    epoch++;
    pending?.abort('reset');
    pending = null;
    clearTimeout(progressTimer);
    voice.stop();
    history = [];
    messages.replaceChildren();
    input.value = '';
    setBusy(false);
    welcome();
    $('pc-starters').hidden = false;
  };

  window.addEventListener('pagehide', () => {
    epoch++;
    pending?.abort();
    voice.stop();
    clearTimeout(progressTimer);
  });

  labels();
  welcome();
}
