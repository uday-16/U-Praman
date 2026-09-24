import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../js/utils/storage.js';
const user = {id:'test-user', name:'Test Officer', role:'Procurement Officer'};
let values;
function setup() {
 values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.window={location:{port:'8000'}};
}
function response(data,ok=true){globalThis.fetch=async()=>({ok,json:async()=>data});}
test('cached profile alone and malformed profile do not count as login',()=>{
 setup();Storage.setUser(user);assert.equal(Storage.isLoggedIn(),false);
 values.set('praman_user','broken-json');assert.equal(Storage.isLoggedIn(),false);
});

test('administrator-like email does not grant an administrator role',()=>{
 setup();Storage.setUser({...user,email:'admin@praman.gov.in'});
 assert.equal(Storage.isAdmin(),false);
});
test('registration does not grant dashboard access',async()=>{
 setup();response({user,access_token:'registration-token'});
 const result=await Storage.registerUser({fullName:'Test Officer',email:'test@example.com',department:'Test',password:'test'});
 assert.ok(result.success);assert.equal(Storage.isLoggedIn(),false);assert.equal(Storage.getToken(),'');
});
test('failed login or response without token cannot grant access',async()=>{
 setup();response({detail:'Incorrect password'},false);
 assert.equal((await Storage.loginUser({email:'test@example.com',password:'bad'})).success,false);
 assert.equal(Storage.isLoggedIn(),false);
 response({user});assert.equal((await Storage.loginUser({email:'test@example.com',password:'test'})).success,false);
 assert.equal(Storage.isLoggedIn(),false);
});
test('successful login stores session; server rejection clears it',async()=>{
 setup();response({user,access_token:'server-session'});
 assert.ok((await Storage.loginUser({email:'test@example.com',password:'test'})).success);
 assert.ok(Storage.isLoggedIn());
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer server-session');return {ok:true,json:async()=>user};};
 assert.ok(await Storage.validateSession());
 response({detail:'Expired'},false);assert.equal(await Storage.validateSession(),false);assert.equal(Storage.isLoggedIn(),false);
});
test('workspace guard waits for verification before revealing content',async()=>{
 setup();Storage.setUser(user);Storage.setToken('session');
 let finish;globalThis.fetch=()=>new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>user});});
 const attributes=new Map();let redirected=null;
 window.location={origin:'https://praman.example',href:'https://praman.example/pages/compare.html?ids=IS-001',pathname:'/pages/compare.html',replace:url=>{redirected=url;}};
 window.addEventListener=()=>{};
 globalThis.document={documentElement:{setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k)}};
 const guard=await import('../js/utils/workspace-guard.js?test=allowed');
 assert.equal(attributes.size,0);finish();assert.equal(await guard.workspaceReady,true);
 assert.equal(attributes.get('data-workspace-authenticated'),'true');assert.equal(redirected,null);
 response({detail:'Invalid'},false);
 const denied=await import('../js/utils/workspace-guard.js?test=denied');
 assert.equal(await denied.workspaceReady,false);
 assert.equal(redirected,'/pages/login.html?redirect=%2Fpages%2Fcompare.html%3Fids%3DIS-001');
});
