import { api } from './utils/api.js';
const dialog=document.getElementById('password-reset-dialog');
const status=document.getElementById('reset-status');
document.getElementById('forgot-password-link').addEventListener('click',event => {event.preventDefault();dialog.showModal();});
document.getElementById('close-reset').addEventListener('click',()=>dialog.close());
document.getElementById('send-reset-code').addEventListener('click',async event => {
  const email=document.getElementById('reset-email');
  if (!email.reportValidity()) return;
  event.target.disabled=true; status.textContent='Sending verification code…';
  try { const data=await api('/auth/request-email-otp',{method:'POST',body:{email:email.value.trim()}});status.textContent=data.message; }
  catch(error) {status.textContent=error.message;} finally {event.target.disabled=false;}
});
document.getElementById('password-reset-form').addEventListener('submit',async event => {
  event.preventDefault();const button=event.target.querySelector('[type=submit]');
  const password=document.getElementById('reset-password').value;
  if(password!==document.getElementById('reset-confirm').value){status.textContent='The new passwords do not match.';return;}
  button.disabled=true;
  try {const result=await api('/auth/reset-password',{method:'POST',body:{email:document.getElementById('reset-email').value.trim(),otp_code:document.getElementById('reset-code').value.trim(),new_password:password}});event.target.reset();status.textContent=result.message;}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
