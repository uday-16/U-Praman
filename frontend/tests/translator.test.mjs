import test from 'node:test';
import assert from 'node:assert/strict';
let sequence=0;
async function setup(saved={}) {
 const values=new Map(Object.entries(saved)), selectors=[], cookies=[], events=[], observers=[], scripts=[];
 let combo=null, constructions=0;
 const element=()=>({id:'',style:{},dataset:{},options:[],value:'',classList:{add(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},dispatchEvent(event){events.push([event.type,this.value]);},remove(){}});
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 globalThis.window={location:{hostname:'localhost'},dispatchEvent(){},addEventListener(){}};
 globalThis.document={querySelector:selector=>selector==='.goog-te-combo'?combo:scripts[0]||null,querySelectorAll:()=>selectors,getElementById:()=>null,createElement:element,body:{appendChild(){}},head:{appendChild:script=>scripts.push(script)},set cookie(value){cookies.push(value);}};
 globalThis.MutationObserver=class {constructor(fn){observers.push(fn);}observe(){}};
 const module=await import('../js/utils/translator.js?test='+sequence++);
 const select=()=>{const item=element();item.options=module.SUPPORTED_LANGUAGES.map(({code})=>({value:code}));selectors.push(item);return item;};
 const ready=()=>{combo=element();combo.options=module.SUPPORTED_LANGUAGES.map(({code})=>({value:code}));return combo;};
 const mutate=async()=>{observers.forEach(fn=>fn());await Promise.resolve();};
 return {module,values,selectors,cookies,events,observers,scripts,select,ready,mutate};
}

test('persist selection and restore on a new page',async()=>{
 let env=await setup();env.module.changeLanguage('te');
 assert.equal(env.values.get('praman_lang'),'te');assert.equal(env.values.get('standardsai_lang'),'te');
 env=await setup(Object.fromEntries(env.values));env.ready();const menu=env.select();env.module.initGoogleTranslate();await env.mutate();
 assert.equal(menu.value,'te');assert.deepEqual(env.events,[['change','te']]);
 assert.ok(env.cookies.includes('googtrans=/en/te; path=/; SameSite=Lax'));
});
test('slow provider readiness uses latest language and no timed expiry',async()=>{
 const env=await setup();env.module.initGoogleTranslate();env.module.changeLanguage('hi');env.module.changeLanguage('ta');
 assert.equal(env.events.length,0);env.ready();await env.mutate();assert.deepEqual(env.events,[['change','ta']]);
 await env.mutate();assert.equal(env.events.length,1);
});
test('switch to English dynamically, synchronize late menus, bind only once',async()=>{
 const env=await setup({praman_lang:'hi'});env.ready();env.module.initGoogleTranslate();await env.mutate();
 env.module.changeLanguage('en');assert.deepEqual(env.events.at(-1),['change','en']);
 const menu=env.select();await env.mutate();assert.equal(menu.value,'en');const handler=menu.change;
 await env.mutate();assert.equal(menu.change,handler);assert.equal(env.events.length,2);
 env.module.initGoogleTranslate();assert.equal(env.observers.length,1);assert.equal(env.scripts.length,1);
});
test('invalid stored values fall back to valid legacy preference',async()=>{
 const env=await setup({praman_lang:'invalid',standardsai_lang:'mr'});assert.equal(env.module.getSavedLanguage(),'mr');
 env.module.initGoogleTranslate();assert.equal(env.values.get('praman_lang'),'mr');
});
