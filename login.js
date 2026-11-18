import {makeSharedSupabaseClient,supportedHost,safeDestination,dashboardUrl,hasSharedSession} from './sso.js';
const cfg=window.SMART_AC_CONFIG||{};
const form=document.getElementById('login-form');
const notice=document.getElementById('notice');
const submit=document.getElementById('login-button');
const password=document.getElementById('password');
const toggle=document.getElementById('toggle-password');
const destination=safeDestination(new URLSearchParams(location.search).get('next'),cfg);
let supabase;
const notify=(message,success=false)=>{notice.textContent=message;notice.classList.toggle('ok',success);notice.hidden=false;};
const busy=on=>{submit.disabled=on;submit.firstChild.textContent=on?'Memeriksa akun... ':'Masuk ke Sistem ';};
function go(){location.replace(destination||dashboardUrl(cfg));}
async function roleAllowed(){
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return false;
  const {data:member,error:roleError}=await supabase.from('app_members').select('role').eq('user_id',user.id).maybeSingle();
  if(roleError)throw roleError;
  return ['admin','operator','viewer'].includes(member?.role);
}
async function init(){
  if(!supportedHost()){notify('Halaman login hanya boleh dibuka menggunakan HTTPS di dashboard.penyelamatharimu.my.id.');form.querySelectorAll('input,button').forEach(x=>x.disabled=true);return;}
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){notify('Supabase belum dikonfigurasi. Isi URL proyek dan publishable key pada config.js di GitHub.');form.querySelectorAll('input,button').forEach(x=>x.disabled=true);return;}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase=makeSharedSupabaseClient(createClient,cfg);
    if(hasSharedSession()&&await roleAllowed())go();
  }catch(e){console.error('Login initialization',e);notify('Gagal menghubungkan layanan login. Periksa internet dan pengaturan Supabase.');}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!supabase)return notify('Layanan login belum siap. Muat ulang halaman.');
  busy(true);notice.hidden=true;
  try{
    const {error}=await supabase.auth.signInWithPassword({email:form.elements.namedItem('email').value.trim(),password:password.value});
    if(error)throw error;
    if(!await roleAllowed()){
      await supabase.auth.signOut();
      throw new Error('Akun ini belum diberi role di tabel app_members. Hubungi admin Supabase.');
    }
    go();
  }catch(e){console.error('Login failed',e);notify(/invalid login credentials/i.test(e.message)?'Email atau password salah. Periksa kembali akun lu.':e.message||'Login gagal.');busy(false);}
});
toggle.addEventListener('click',()=>{const show=password.type==='password';password.type=show?'text':'password';toggle.textContent=show?'Tutup':'Lihat';toggle.setAttribute('aria-pressed',String(show));toggle.setAttribute('aria-label',show?'Sembunyikan password':'Tampilkan password');});
init();
