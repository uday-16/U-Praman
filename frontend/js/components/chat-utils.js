export const LANGUAGES = [
  ['auto','Auto-detect'], ['en','English'], ['hi','हिन्दी'], ['te','తెలుగు'], ['ta','தமிழ்'],
  ['bn','বাংলা'], ['mr','मराठी'], ['pa','ਪੰਜਾਬੀ'], ['gu','ગુજરાતી'], ['kn','ಕನ್ನಡ'],
  ['ml','മലയാളം'], ['or','ଓଡ଼ିଆ'], ['ur','اردو'], ['as','অসমীয়া'],
  ['es','Español'], ['fr','Français'], ['de','Deutsch'], ['ar','العربية']
];
const labels = {
  en:['Ask anything. Check the standards.','Reply language','Live web','Ask a question…','Send message','Speak your question','Stop recording','Listen','Stop audio','Sources','Standards check','Compare with standards','Hi! What would you like to explore?','Thinking it through','New chat','Close chat'],
  hi:['सवाल पूछें। मानकों से जाँचें।','उत्तर की भाषा','लाइव वेब','अपना सवाल लिखें…','संदेश भेजें','अपना सवाल बोलें','रिकॉर्डिंग रोकें','सुनें','आवाज़ रोकें','स्रोत','मानकों से तुलना','मानकों से तुलना करें','नमस्ते! आप क्या जानना चाहेंगे?','विचार कर रहा हूँ','नई बातचीत','बंद करें'],
  te:['అడగండి. ప్రమాణాలతో తనిఖీ చేయండి.','సమాధానం భాష','లైవ్ వెబ్','మీ ప్రశ్న రాయండి…','సందేశం పంపండి','మీ ప్రశ్న చెప్పండి','రికార్డింగ్ ఆపండి','వినండి','ఆడియో ఆపండి','మూలాలు','ప్రమాణాలతో పోలిక','ప్రమాణాలతో పోల్చండి','నమస్తే! మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?','ఆలోచిస్తున్నాను','కొత్త సంభాషణ','మూసివేయండి'],
  ta:['கேளுங்கள். தரநிலைகளுடன் சரிபாருங்கள்.','பதில் மொழி','நேரடி இணையம்','கேள்வியை எழுதுங்கள்…','அனுப்பு','கேள்வியைப் பேசுங்கள்','பதிவை நிறுத்து','கேளுங்கள்','ஒலியை நிறுத்து','ஆதாரங்கள்','தரநிலை ஒப்பீடு','தரநிலைகளுடன் ஒப்பிடு','வணக்கம்! என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?','யோசிக்கிறேன்','புதிய உரையாடல்','மூடு'],
  bn:['প্রশ্ন করুন। মান যাচাই করুন।','উত্তরের ভাষা','লাইভ ওয়েব','প্রশ্ন লিখুন…','পাঠান','প্রশ্ন বলুন','রেকর্ডিং থামান','শুনুন','অডিও থামান','सूत्र','মানের তুলনা','মানের সঙ্গে তুলনা','নমস্কার! কী জানতে চান?','ভাবছি','নতুন চ্যাট','বন্ধ করুন'],
  mr:['प्रश्न विचारा. मानके तपासा.','उत्तराची भाषा','लाइव्ह वेब','प्रश्न लिहा…','पाठवा','प्रश्न बोला','रेकॉर्डिंग थांबवा','ऐका','आवाज थांबवा','स्रोत','मानकांची तुलना','मानकांशी तुलना करा','नमस्कार! काय जाणून घ्यायचे आहे?','विचार करत आहे','नवीन चॅट','बंद करा'],
  pa:['ਪੁੱਛੋ। ਮਿਆਰਾਂ ਨਾਲ ਜਾਂਚੋ।','ਜਵਾਬ ਦੀ ਭਾਸ਼ਾ','ਲਾਈਵ ਵੈੱਬ','ਸਵਾਲ ਲਿਖੋ…','ਭੇਜੋ','ਸਵਾਲ ਬੋਲੋ','ਰਿਕਾਰਡਿੰਗ ਰੋਕੋ','ਸੁਣੋ','ਆਵਾਜ਼ ਰੋਕੋ','ਸਰੋਤ','ਮਿਆਰਾਂ ਦੀ ਤੁਲਨਾ','ਮਿਆਰਾਂ ਨਾਲ ਤੁਲਨਾ','ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?','ਸੋਚ ਰਿਹਾ ਹਾਂ','ਨਵੀਂ ਗੱਲਬਾਤ','ਬੰਦ ਕਰੋ'],
  gu:['પૂછો. ધોરણો સાથે તપાસો.','જવાબની ભાષા','લાઇવ વેਬ','પ્રશ્ન લખો…','મોકલો','પ્રશ્ન બોલો','રેકોર્ડિંગ રોકો','સાંભળો','અવાજ રોકો','સ્રોતો','ધોરણોની સરખામણી','ધોરણો સાથે સરખાવો','નમસ્તે! શું જાણવા માંગો છો?','વિચારી રહ્યો છું','નવી વાતચીત','બંધ કરો'],
  kn:['ಕೇಳಿ. ಮಾನದಂಡಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.','ಉತ್ತರದ ಭಾಷೆ','ಲೈವ್ ವೆಬ್','ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ…','ಕಳುಹಿಸಿ','ಪ್ರಶ್ನೆ ಹೇಳಿ','ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ','ಆಲಿಸಿ','ಧ್ವನಿ ನಿಲ್ಲಿಸಿ','ಮೂಲಗಳು','ಮಾನದಂಡಗಳ ಹೋಲಿಕೆ','ಮಾನದಂಡಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ','ನಮಸ್ಕಾರ! ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?','ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ','ಹೊಸ ಸಂಭಾಷಣೆ','ಮುಚ್ಚಿ'],
  ml:['ചോദിക്കൂ. മാനദണ്ഡങ്ങൾ പരിശോധിക്കൂ.','മറുപടി ഭാഷ','ലൈവ് വെബ്','ചോദ്യം എഴുതൂ…','അയയ്ക്കുക','ചോദ്യം പറയൂ','റെക്കോർഡിംഗ് നിർത്തുക','കേൾക്കുക','ശബ്ദം നിർത്തുക','ഉറവിടങ്ങൾ','മാനദണ്ഡ താരതമ്യം','മാനദണ്ഡങ്ങളുമായി താരതമ്യം','നമസ്കാരം! എന്താണ് അറിയേണ്ടത്?','ആലോചിക്കുന്നു','പുതിയ സംഭാഷണം','അടയ്ക്കുക'],
  or:['ପଚାରନ୍ତୁ। ମାନକ ଯାଞ୍ଚ କରନ୍ତୁ।','ଉତ୍ତର ଭାଷା','ଲାଇଭ୍ ୱେବ୍','ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ…','ପଠାନ୍ତୁ','ପ୍ରଶ୍ନ କୁହନ୍ତୁ','ରେକର୍ଡିଂ ବନ୍ଦ','ଶୁଣନ୍ତୁ','ଶବ୍ଦ ବନ୍ଦ','ଉତ୍ସ','ମାନକ ତୁଳନା','ମାନକ ସହ ତୁଳନା','ନମସ୍କାର! କଣ ଜାଣିବାକୁ ଚାହାନ୍ତି?','ଭାବୁଛି','ନୂଆ ଚାଟ୍','ବନ୍ଦ କରନ୍ତୁ'],
  ur:['پوچھیں۔ معیار سے جانچیں۔','جواب کی زبان','لائیو ویب','سوال لکھیں…','بھیجیں','سوال بولیں','ریکارڈنگ روکیں','سنیں','آواز روکیں','ذرائع','معیار کا موازنہ','معیار سے موازنہ','السلام علیکم! کیا جاننا چاہتے ہیں؟','سوچ رہا ہوں','نئی گفتگو','بند کریں'],
  as:['সোধক। মানদণ্ড পৰীক্ষা কৰক।','উত্তৰৰ ভাষা','লাইভ ৱেব','প্ৰশ্ন লিখক…','পঠাওক','প্ৰশ্ন কওক','ৰেকৰ্ডিং বন্ধ','শুনক','শব্দ বন্ধ','উৎস','মানদণ্ডৰ তুলনা','মানদণ্ডৰ সৈতে তুলনা','নমস্কাৰ! কি জানিব বিচাৰে?','ভাবি আছোঁ','নতুন কথা','বন্ধ কৰক']
};
const keys = ['tagline','language','web','placeholder','send','mic','recordStop','listen','audioStop','sources','standards','compare','welcome','thinking','newChat','close'];
export function copy(language) { return Object.fromEntries(keys.map((key,i)=>[key,(labels[language] || labels.en)[i]])); }
export function escapeHTML(text) { return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function formatReply(text) {
  if (!text) return '';
  const inline = val => escapeHTML(val)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`\n]+)`/g, '<code class="pc-inline-code">$1</code>');

  return String(text).split(/\n{2,}/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    
    // Headings
    if (/^###\s+/.test(trimmed)) {
      return `<h4 class="pc-msg-h4">${inline(trimmed.replace(/^###\s+/, ''))}</h4>`;
    }
    if (/^##\s+/.test(trimmed)) {
      return `<h3 class="pc-msg-h3">${inline(trimmed.replace(/^##\s+/, ''))}</h3>`;
    }
    if (/^#\s+/.test(trimmed)) {
      return `<h2 class="pc-msg-h2">${inline(trimmed.replace(/^#\s+/, ''))}</h2>`;
    }

    // Code block
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      const content = trimmed.slice(3, -3).replace(/^[a-z]*\n/, '');
      return `<pre class="pc-code-block"><code>${escapeHTML(content)}</code></pre>`;
    }

    // Blockquote
    if (/^>\s+/.test(trimmed)) {
      const quoteLines = trimmed.split('\n').map(l => inline(l.replace(/^>\s*/, ''))).join('<br>');
      return `<blockquote class="pc-quote">${quoteLines}</blockquote>`;
    }

    const lines = trimmed.split('\n');

    // Bullet lists
    if (lines.every(line => /^[-*•]\s+/.test(line))) {
      return '<ul>' + lines.map(line => '<li>' + inline(line.replace(/^[-*•]\s+/, '')) + '</li>').join('') + '</ul>';
    }

    // Numbered lists
    if (lines.every(line => /^\d+\.\s+/.test(line))) {
      return '<ol>' + lines.map(line => '<li>' + inline(line.replace(/^\d+\.\s+/, '')) + '</li>').join('') + '</ol>';
    }

    // Mixed lines or standard paragraph
    return '<p>' + lines.map(line => {
      if (/^[-*•]\s+/.test(line)) {
        return '<span class="pc-bullet-line">• ' + inline(line.replace(/^[-*•]\s+/, '')) + '</span>';
      }
      if (/^\d+\.\s+/.test(line)) {
        return '<span class="pc-num-line">' + inline(line) + '</span>';
      }
      return inline(line);
    }).join('<br>') + '</p>';
  }).filter(Boolean).join('');
}
export function safeURL(value) { try { const u=new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; } }
export function apiRoot(value='/api/v1') { const root=value.replace(/\/+$/,''); return root.endsWith('/api') ? root+'/v1' : root; }
