import test from 'node:test';
import assert from 'node:assert/strict';
import {apiRoot,formatReply,safeURL,copy,LANGUAGES} from '../js/components/chat-utils.js';
import {ChatVoice} from '../js/components/chat-voice.js';

test('legacy and versioned API URLs both reach the chat API',()=>{
  assert.equal(apiRoot('http://localhost:8000/api/'),'http://localhost:8000/api/v1');
  assert.equal(apiRoot('/api/v1/'),'/api/v1');
});
test('reply formatting escapes HTML and keeps lists compact',()=>{
  const html=formatReply('**Check this**\n\n- One\n- <img src=x onerror=alert(1)>');
  assert.ok(html.includes('<strong>Check this</strong>'));
  assert.ok(html.includes('<ul><li>One</li>'));
  assert.ok(!html.includes('<img'));
  assert.equal(safeURL('javascript:alert(1)'),null);
  assert.equal(safeURL('http://example.com'),null);
  assert.equal(safeURL('https://bis.gov.in/'),'https://bis.gov.in/');
});
test('language choices include portal languages and localized Telugu controls',()=>{
  for(const code of ['hi','te','ta','bn','mr','pa','gu','kn','ml','or','ur','as']) assert.ok(LANGUAGES.some(([value])=>value===code));
  assert.notEqual(copy('te').listen,copy('en').listen);
});
test('stopping while microphone permission is pending releases the eventual stream',async()=>{
  let grant,stopped=0;const states=[];
  globalThis.window={MediaRecorder:class{},speechSynthesis:{cancel(){}}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}}});
  const voice=new ChatVoice('/api/v1',state=>states.push(state),()=>assert.fail('unexpected error'));
  const recording=voice.record('te',()=>assert.fail('unexpected transcript'));
  voice.stop();grant({getTracks:()=>[{stop(){stopped++;}}]});await recording;
  assert.equal(stopped,1);assert.equal(states.at(-1),'idle');
});
test('denied microphone access provides a recoverable message',async()=>{
  let error;globalThis.window={MediaRecorder:class{},speechSynthesis:{cancel(){}}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});}}}});
  const voice=new ChatVoice('/api/v1',()=>{},message=>{error=message;});
  await voice.record('hi',()=>{});assert.match(error,/not allowed/);
});
test('stopping voice playback aborts a pending cloud request',async()=>{
  let signal;globalThis.window={speechSynthesis:{getVoices:()=>[],cancel(){}}};
  globalThis.fetch=async(url,options)=>{signal=options.signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));};
  const voice=new ChatVoice('/api/v1',()=>{},()=>assert.fail('cancel should not display an error'));
  const playing=voice.speak('నమస్తే','te');voice.stop();await playing;assert.ok(signal.aborted);
});
