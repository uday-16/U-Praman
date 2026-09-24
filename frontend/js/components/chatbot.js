import { api, escapeHtml, sourceUrl } from '../utils/api.js';
/**
 * PRAMAN Standards AI Chatbot Component
 * Powered by Gemini AI & Grounded Indian Standards RAG
 */

function formatMarkdown(text) {
  if (!text) return '';

  // 1. Sanitize HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Headings (###, ##, #)
  html = html.replace(/^### (.*$)/gim, '<div style="font-weight: 700; font-size: 0.95rem; color: var(--navy, #0B3558); margin: 8px 0 4px;">$1</div>');
  html = html.replace(/^## (.*$)/gim, '<div style="font-weight: 700; font-size: 1.02rem; color: var(--navy, #0B3558); margin: 10px 0 4px; border-bottom: 1px solid var(--line, #E2E8F0); padding-bottom: 2px;">$1</div>');
  html = html.replace(/^# (.*$)/gim, '<div style="font-weight: 700; font-size: 1.1rem; color: var(--navy, #0B3558); margin: 12px 0 6px;">$1</div>');

  // 3. Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--navy-deep, #082A46); font-weight: 600;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 4. Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(11, 53, 88, 0.08); color: var(--navy, #0B3558); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.82em;">$1</code>');

  // 5. Blockquotes (> ...)
  html = html.replace(/^&gt; (.*$)/gim, '<blockquote style="border-left: 3px solid var(--gold, #C08A28); margin: 6px 0; padding: 4px 10px; background: rgba(192, 138, 40, 0.06); border-radius: 0 4px 4px 0; color: var(--ink-soft, #64748B); font-style: italic;">$1</blockquote>');

  // 6. Bullet lists (- or *)
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li style="margin-bottom: 4px; line-height: 1.45;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul style="margin: 6px 0; padding-left: 18px;">$1</ul>');

  // 7. Horizontal rules (---)
  html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--line, #E2E8F0); margin: 8px 0;">');

  // 8. Line breaks to clean paragraphs
  html = html.replace(/\n\n/g, '<div style="height: 6px;"></div>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

export function initChatbot() {
  if (document.getElementById('praman-chatbot-widget')) {
    return; // Already initialized
  }

  const chatbotHTML = `
    <div id="praman-chatbot-widget" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- Floating Trigger Button -->
      <button id="chatbot-toggle-btn" aria-label="Open Standards AI Chat" style="width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #0B3558 0%, #1769AA 100%); color: white; border: none; box-shadow: 0 6px 18px rgba(11, 53, 88, 0.35); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <!-- Chat Window -->
      <div id="chatbot-window" style="display: none; position: absolute; bottom: 72px; right: 0; width: 380px; max-width: calc(100vw - 32px); height: 540px; max-height: calc(100vh - 100px); background: #ffffff; border-radius: 14px; box-shadow: 0 12px 36px rgba(11, 53, 88, 0.22); border: 1px solid var(--line, #E2E8F0); flex-direction: column; overflow: hidden; animation: popIn 0.2s ease-out;">
        
        <!-- Header -->
        <div style="padding: 14px 16px; background: linear-gradient(135deg, #0B3558 0%, #082A46 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: rgba(255, 255, 255, 0.15); padding: 7px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h2z"></path>
                <path d="M16 12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4z"></path>
              </svg>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; display: flex; align-items: center; gap: 6px;">
                PRAMAN AI
                <span style="font-size: 0.65rem; background: #C08A28; color: white; padding: 1px 6px; border-radius: 10px; text-transform: uppercase; font-weight: 700;">Source-based</span>
              </div>
              <div style="font-size: 0.72rem; color: #CBD5E1;">Bureau of Indian Standards Assistant</div>
            </div>
          </div>
          <button id="chatbot-close-btn" aria-label="Close Chat" style="background: rgba(255,255,255,0.1); border: none; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; line-height: 1; transition: background 0.15s;">&times;</button>
        </div>

        <!-- Suggestion Chips -->
        <div id="chatbot-chips" style="padding: 8px 12px; background: #F8FAFC; border-bottom: 1px solid var(--line, #E2E8F0); display: flex; gap: 6px; overflow-x: auto; white-space: nowrap; scrollbar-width: none;">
          <button class="praman-chip" data-query="What are the permissible limits in IS 10500 for drinking water?" style="background: white; border: 1px solid #CBD5E1; color: var(--navy, #0B3558); font-size: 0.72rem; padding: 4px 9px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-weight: 500;">💧 IS 10500 Limits</button>
          <button class="praman-chip" data-query="What are the testing requirements for industrial safety helmets under IS 2925?" style="background: white; border: 1px solid #CBD5E1; color: var(--navy, #0B3558); font-size: 0.72rem; padding: 4px 9px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-weight: 500;">⛑️ IS 2925 Helmets</button>
          <button class="praman-chip" data-query="What are the specifications for PVC insulated cables under IS 694?" style="background: white; border: 1px solid #CBD5E1; color: var(--navy, #0B3558); font-size: 0.72rem; padding: 4px 9px; border-radius: 12px; cursor: pointer; transition: all 0.15s; font-weight: 500;">⚡ IS 694 Cables</button>
        </div>

        <!-- Messages Area -->
        <div id="chatbot-messages" style="flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #ffffff;">
          <div style="align-self: flex-start; max-width: 90%; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 2px; font-size: 0.84rem; line-height: 1.45; color: #1E293B;">
            Namaste! I am <strong>PRAMAN AI</strong>. Ask about the local Indian Standards documents and procurement requirements. Answers include source pages when evidence is available.
          </div>
        </div>

        <!-- Input Area -->
        <div style="padding: 10px 12px; border-top: 1px solid var(--line, #E2E8F0); background: #F8FAFC; display: flex; gap: 8px; align-items: center;">
          <input type="text" id="chatbot-input" placeholder="Ask about an Indian Standard or specification..." style="flex: 1; padding: 9px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 0.84rem; outline: none; background: white; color: #1E293B; font-family: inherit;">
          <button id="chatbot-send-btn" aria-label="Send Message" style="background: var(--navy, #0B3558); color: white; border: none; border-radius: 8px; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', chatbotHTML);

  const toggleBtn = document.getElementById('chatbot-toggle-btn');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const windowEl = document.getElementById('chatbot-window');
  const inputEl = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send-btn');
  const messagesEl = document.getElementById('chatbot-messages');
  const chips = document.querySelectorAll('.praman-chip');

  let isOpen = false;
  let sending = false;
  const history = [];

  const toggleChat = () => {
    isOpen = !isOpen;
    if (isOpen) {
      windowEl.style.display = 'flex';
      toggleBtn.style.transform = 'scale(0.85) rotate(90deg)';
      inputEl.focus();
    } else {
      windowEl.style.display = 'none';
      toggleBtn.style.transform = 'scale(1) rotate(0deg)';
    }
  };

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (q) {
        inputEl.value = q;
        handleSend();
      }
    });
  });

  const addMessage = (text, isUser, citations = []) => {
    const msgDiv = document.createElement('div');
    msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgDiv.style.maxWidth = isUser ? '82%' : '90%';
    
    let formattedText = isUser ? escapeHtml(text) : formatMarkdown(text);

    let contentHtml = `
      <div style="background: ${isUser ? 'linear-gradient(135deg, #0B3558, #1769AA)' : '#F8FAFC'}; 
                  color: ${isUser ? '#ffffff' : '#1E293B'}; 
                  border: ${isUser ? 'none' : '1px solid #E2E8F0'}; 
                  padding: 10px 14px; 
                  border-radius: 12px; 
                  border-bottom-${isUser ? 'right' : 'left'}-radius: 2px; 
                  font-size: 0.85rem; 
                  line-height: 1.5;
                  box-shadow: ${isUser ? '0 2px 6px rgba(11, 53, 88, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)'};">
        ${formattedText}
      </div>
    `;

    if (citations && citations.length > 0) {
      contentHtml += '<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; width: 100%;">';
      citations.forEach(cit => {
        const snippet = cit.text ? cit.text.substring(0, 120).replace(/\n/g, ' ') : '';
        contentHtml += `
          <div style="background: #EBF3FC; border: 1px solid rgba(11, 53, 88, 0.18); padding: 8px 10px; border-radius: 6px; font-size: 0.74rem;">
            <div style="color: #0B3558; font-weight: 700; margin-bottom: 2px;">📘 ${escapeHtml(cit.is_number)} <span style="font-weight: 400; color: #64748B;">(${escapeHtml(cit.source)}, page ${Number(cit.page)})</span></div>
            <a href="${escapeHtml(sourceUrl(cit))}" target="_blank" rel="noopener">Open source page ↗</a><div style="color: #475569; font-style: italic;">"${escapeHtml(snippet)}..."</div>
          </div>
        `;
      });
      contentHtml += '</div>';
    }

    msgDiv.innerHTML = contentHtml;
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const handleSend = async () => {
    const query = inputEl.value.trim();
    if (!query || sending) return;
    sending = true; sendBtn.disabled = true;

    addMessage(query, true);
    inputEl.value = '';
    
    // Add dynamic typing animation indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'chatbot-loading';
    loadingDiv.style.alignSelf = 'flex-start';
    loadingDiv.innerHTML = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 2px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 0.78rem; color: #64748B; font-weight: 500;">PRAMAN AI is researching...</span>
      </div>
    `;
    messagesEl.appendChild(loadingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const data = await api('/chat/', { method: 'POST', body: { query, history: history.slice(-6) } });
      history.push({ role: 'user', content: query }, { role: 'assistant', content: data.answer.slice(0, 12000) });
      loadingDiv.remove();
      addMessage(data.answer, false, data.citations);
      if (data.generation_mode === 'extractive') addMessage('AI generation is unavailable. The answer above contains retrieved source text.', false);
    } catch (err) {
      loadingDiv.remove();
      addMessage(err.message || 'Could not reach the standards service. Please try again.', false);
    } finally { sending = false; sendBtn.disabled = false; }
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}
