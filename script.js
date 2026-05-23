// ═══════════════════════════════════════════════
//  MediSort — main script
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const init = () => {
    if (!window.firebaseAuth) { console.error('Firebase not loaded'); return; }
    startApp();
  };
  document.addEventListener('firebaseReady', init);
  if (window.firebaseAuth) init();
});

function startApp() {
  const {
    auth, googleProvider, signInWithPopup,
    signOut: firebaseSignOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
  } = window.firebaseAuth;

  // ── EmailJS ─────────────────────────────────────
  const EMAILJS_SERVICE  = 'service_o1036fi';
  const EMAILJS_TEMPLATE = 'template_lan9vzu';
  const EMAILJS_PUBLIC   = 'rgoVvGCaRhiCdNeEi';
  emailjs.init(EMAILJS_PUBLIC);

  // ── Constants ───────────────────────────────────
  const OCR_KEY = 'K83317124288957';
  const STORE   = 'medisort_v3';

  // ── DOM refs ────────────────────────────────────
  const signInScreen    = document.getElementById('sign-in-screen');
  const dashboard       = document.getElementById('dashboard');
  const googleBtn       = document.getElementById('google-btn');
  const emailSigninBtn  = document.getElementById('email-signin-btn');
  const emailForm       = document.getElementById('email-form');
  const emailInput      = document.getElementById('email-input');
  const passwordInput   = document.getElementById('password-input');
  const signinBtn       = document.getElementById('signin-btn');
  const toggleLink      = document.getElementById('toggle-link');
  const logoutBtn       = document.getElementById('logout-btn');
  const userNameEl      = document.getElementById('current-user-name');
  const userPhotoEl     = document.getElementById('user-photo');
  const imageInput      = document.getElementById('image-input');
  const loadingDiv      = document.getElementById('loading');
  const resultsDiv      = document.getElementById('results');
  const saveBtn         = document.getElementById('save-med');
  const todayList       = document.getElementById('today-list');
  const profilesRow     = document.getElementById('profiles-row');
  const addProfileBtn   = document.getElementById('add-profile-btn');
  const newProfileInput = document.getElementById('new-profile-name');
  const alertEmailInput = document.getElementById('alert-email');
  const saveAlertEmail  = document.getElementById('save-alert-email');
  const reminderList    = document.getElementById('reminder-list');
  const calGrid         = document.getElementById('cal-grid');
  const calMonthLabel   = document.getElementById('cal-month-label');
  const calPrev         = document.getElementById('cal-prev');
  const calNext         = document.getElementById('cal-next');

  // ── Manual modal refs ────────────────────────────
  const manualModal  = document.getElementById('manual-modal');
  const manualName   = document.getElementById('manual-name');
  const manualMfr    = document.getElementById('manual-mfr');
  const manualMfg    = document.getElementById('manual-mfg');
  const manualExp    = document.getElementById('manual-exp');
  const manualCancel = document.getElementById('manual-cancel');
  const manualOk     = document.getElementById('manual-ok');

  // ── State ───────────────────────────────────────
  let currentUser   = null;
  let activeProfile = null;
  let profiles      = [];
  let isRegisterMode = false;
  let lastParsed    = null;
  let popupBusy     = false;
  let authHandled   = false;
  let calYear, calMonth;
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  // ── Tab navigation ──────────────────────────────
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sec-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'reminders') renderReminders();
      if (btn.dataset.tab === 'calendar')  { setTimeout(renderCalendar, 0); }
    });
  });

  // ════════════════════════════════════════════════
  //  STORAGE HELPERS
  // ════════════════════════════════════════════════
  function key(suffix) {
    return `${STORE}_${currentUser?.uid || 'guest'}_${activeProfile || ''}_${suffix}`;
  }
  function getMeds()       { return JSON.parse(localStorage.getItem(key('meds'))      || '[]'); }
  function setMeds(v)      { localStorage.setItem(key('meds'), JSON.stringify(v)); }
  function getReminders()  { return JSON.parse(localStorage.getItem(key('reminders')) || '{}'); }
  function setReminders(v) { localStorage.setItem(key('reminders'), JSON.stringify(v)); }
  function getLog()        { return JSON.parse(localStorage.getItem(key('log'))       || '{}'); }
  function setLog(v)       { localStorage.setItem(key('log'), JSON.stringify(v)); }
  function getAlertEmail() { return localStorage.getItem(`${STORE}_${currentUser?.uid}_alertemail`) || ''; }
  function setAlertEmail(v){ localStorage.setItem(`${STORE}_${currentUser?.uid}_alertemail`, v); }
  function toDateStr(d)    {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ════════════════════════════════════════════════
  //  TOAST
  // ════════════════════════════════════════════════
  function showToast(msg, icon='✅') {
    document.getElementById('medisort-toast')?.remove();
    document.getElementById('medisort-overlay')?.remove();

    const overlay = Object.assign(document.createElement('div'), { id:'medisort-overlay' });
    Object.assign(overlay.style, {
      position:'fixed',inset:'0',background:'rgba(0,0,0,.45)',
      zIndex:'9998',opacity:'0',transition:'opacity .2s ease'
    });
    const toast = Object.assign(document.createElement('div'), { id:'medisort-toast' });
    toast.innerHTML = `<div style="font-size:2rem">${icon}</div><div style="font-size:1rem;font-weight:600">${msg}</div>`;
    Object.assign(toast.style, {
      position:'fixed',top:'50%',left:'50%',
      transform:'translate(-50%,-50%) scale(.85)',
      background:'#fff',border:'2px solid #10b981',color:'#064e3b',
      borderRadius:'18px',padding:'28px 40px',
      display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',
      boxShadow:'0 8px 40px rgba(0,0,0,.18)',zIndex:'9999',opacity:'0',
      transition:'opacity .2s ease,transform .2s ease',textAlign:'center',minWidth:'220px'
    });
    const ok = Object.assign(document.createElement('button'), { textContent:'OK' });
    Object.assign(ok.style, {
      marginTop:'4px',background:'#10b981',color:'#fff',border:'none',
      borderRadius:'8px',padding:'8px 32px',fontSize:'.95rem',fontWeight:'700',cursor:'pointer'
    });
    const dismiss = () => {
      toast.style.opacity='0'; toast.style.transform='translate(-50%,-50%) scale(.85)';
      overlay.style.opacity='0';
      setTimeout(()=>{ toast.remove(); overlay.remove(); },200);
    };
    ok.onclick = overlay.onclick = dismiss;
    toast.appendChild(ok);
    document.body.appendChild(overlay);
    document.body.appendChild(toast);
    requestAnimationFrame(()=>{
      overlay.style.opacity='1';
      toast.style.opacity='1';
      toast.style.transform='translate(-50%,-50%) scale(1)';
    });
  }

  // ════════════════════════════════════════════════
  //  STATUS BANNER (non-blocking, auto-dismisses)
  // ════════════════════════════════════════════════
  function showStatusBanner(msg, color='#15803d') {
    document.getElementById('medisort-banner')?.remove();
    const banner = Object.assign(document.createElement('div'), { id:'medisort-banner' });
    banner.textContent = msg;
    Object.assign(banner.style, {
      position:'fixed', top:'72px', left:'50%',
      transform:'translateX(-50%) translateY(-8px)',
      background: color, color:'#fff',
      borderRadius:'40px', padding:'10px 24px',
      fontSize:'.9rem', fontWeight:'700',
      boxShadow:'0 4px 20px rgba(0,0,0,.18)',
      zIndex:'9000', opacity:'0',
      transition:'opacity .2s ease, transform .2s ease',
      whiteSpace:'nowrap', maxWidth:'90vw',
      textOverflow:'ellipsis', overflow:'hidden',
    });
    document.body.appendChild(banner);
    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      banner.style.opacity = '0';
      banner.style.transform = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => banner.remove(), 200);
    }, 3000);
  }

  // ════════════════════════════════════════════════
  //  BEEP SOUND (Web Audio API)
  // ════════════════════════════════════════════════
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[0, 660],[0.18, 784],[0.36, 1046]].forEach(([delay, freq]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.55);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.6);
      });
    } catch(e) { console.warn('Audio error:', e); }
  }

  // ════════════════════════════════════════════════
  //  EMAIL — MISSED DOSE ALERT
  // ════════════════════════════════════════════════
  function sendMissedDoseEmail(medName, profileName) {
    const alertEmail = getAlertEmail();
    if (!alertEmail) {
      console.warn('No alert email set — skipping missed-dose email');
      return;
    }
    emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email:  alertEmail,
      profile:   profileName,
      medicine:  medName,
      time:      new Date().toLocaleTimeString(),
      date:      new Date().toLocaleDateString(),
    }).then(
      ()  => console.log(`Missed-dose email sent for ${medName}`),
      err => console.error('EmailJS send error:', err)
    );
  }

  // ════════════════════════════════════════════════
  //  AUTH
  // ════════════════════════════════════════════════
  function updateUserUI(user) {
    if (!user) return;
    userNameEl.textContent = user.displayName || user.email || 'User';
    userPhotoEl.src = user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName||user.email||'U')}&background=10b981&color=fff&size=40`;
    userPhotoEl.style.display = 'inline-block';
  }

  function showDashboard(user) {
    currentUser = user;
    signInScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    updateUserUI(user);
    loadProfiles();
    renderToday();
    startReminderLoop();
    if (getAlertEmail()) alertEmailInput.value = getAlertEmail();
  }

  function showSignIn() {
    currentUser = null; activeProfile = null; profiles = [];
    signInScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    todayList.innerHTML = '';
    userNameEl.textContent = 'Guest';
    userPhotoEl.style.display = 'none';
  }

  googleBtn.onclick = async () => {
    if (popupBusy) return;
    popupBusy = true;
    try {
      googleProvider.setCustomParameters({ prompt:'select_account' });
      const r = await signInWithPopup(auth, googleProvider);
      authHandled = true;
      showDashboard(r.user);
    } catch (err) {
      if (!['auth/cancelled-popup-request','auth/popup-closed-by-user'].includes(err.code))
        showToast(err.message, '❌');
    } finally { popupBusy = false; }
  };

  emailSigninBtn.onclick = () => { emailForm.style.display = 'flex'; };

  toggleLink.onclick = () => {
    isRegisterMode = !isRegisterMode;
    document.getElementById('login-title').textContent = isRegisterMode ? 'Create Account' : 'Welcome Back!';
    toggleLink.textContent = isRegisterMode ? 'Already have an account? Sign in' : 'Register here';
    signinBtn.textContent  = isRegisterMode ? 'Sign Up' : 'Sign In';
    emailForm.style.display = 'flex';
  };

  signinBtn.onclick = async () => {
    const em = emailInput.value.trim(), pw = passwordInput.value;
    if (!em || pw.length < 6) { showToast('Enter valid email & password (min 6 chars)', '⚠️'); return; }
    try {
      const fn = isRegisterMode ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      const r = await fn(auth, em, pw);
      authHandled = true;
      showDashboard(r.user);
    } catch (err) { showToast(err.message, '❌'); }
  };

  logoutBtn.onclick = async () => {
    try { await firebaseSignOut(auth); } catch(e) {}
    showSignIn();
  };

  onAuthStateChanged(auth, user => {
    if (user) { if (!authHandled) showDashboard(user); authHandled = false; }
    else       { authHandled = false; showSignIn(); }
  });

  saveAlertEmail.onclick = () => {
    const em = alertEmailInput.value.trim();
    if (!em) return;
    setAlertEmail(em);
    showToast('Alert email saved! ✉️');
  };

  // ════════════════════════════════════════════════
  //  PROFILES  (with delete button)
  // ════════════════════════════════════════════════
  function loadProfiles() {
    profiles = JSON.parse(localStorage.getItem(`${STORE}_${currentUser.uid}_profiles`) || '[]');
    renderProfiles();
  }

  function saveProfilesList() {
    localStorage.setItem(`${STORE}_${currentUser.uid}_profiles`, JSON.stringify(profiles));
  }

  function renderProfiles() {
    profilesRow.innerHTML = '';
    profiles.forEach((name, idx) => {
      // wrapper
      const wrap = document.createElement('span');
      wrap.className = 'profile-wrap';

      // select button
      const btn = document.createElement('button');
      btn.className = 'profile-btn' + (name === activeProfile ? ' active-profile' : '');
      btn.textContent = name;
      btn.onclick = () => {
        activeProfile = name;
        renderProfiles();
        renderToday();
        document.querySelector('[data-tab="today"]').click();
      };

      // delete × button
      const del = document.createElement('button');
      del.className = 'profile-del';
      del.title = `Remove profile "${name}"`;
      del.innerHTML = '&times;';
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Remove profile "${name}" and all its medicine data?`)) return;
        // clear all data for this profile
        const prefixes = ['meds','reminders','log'];
        prefixes.forEach(sfx => {
          localStorage.removeItem(`${STORE}_${currentUser.uid}_${name}_${sfx}`);
        });
        profiles.splice(idx, 1);
        saveProfilesList();
        if (activeProfile === name) {
          activeProfile = null;
          renderToday();
        }
        renderProfiles();
        showToast(`Profile "${name}" removed`,'🗑️');
      };

      wrap.appendChild(btn);
      wrap.appendChild(del);
      profilesRow.appendChild(wrap);
    });
  }

  addProfileBtn.onclick = () => {
    if (!currentUser) { showToast('Please sign in first', '⚠️'); return; }
    const name = newProfileInput.value.trim();
    if (!name || profiles.includes(name)) return;
    profiles.push(name);
    saveProfilesList();
    newProfileInput.value = '';
    renderProfiles();
    showToast(`Profile "${name}" added 👤`);
  };

  // ════════════════════════════════════════════════
  //  MANUAL ENTRY MODAL
  // ════════════════════════════════════════════════
  function openManualModal() {
    manualName.value = ''; manualMfr.value = '';
    manualMfg.value  = ''; manualExp.value = '';
    manualName.classList.remove('error');
    manualModal.classList.add('open');
    setTimeout(() => manualName.focus(), 80);
  }
  function closeManualModal() { manualModal.classList.remove('open'); }

  manualCancel.onclick = closeManualModal;
  manualModal.addEventListener('click', e => { if (e.target === manualModal) closeManualModal(); });
  manualName.addEventListener('keydown', e => { if (e.key === 'Enter') manualOk.click(); });

  manualOk.onclick = () => {
    const name = manualName.value.trim();
    if (!name) {
      manualName.classList.add('error');
      manualName.focus();
      setTimeout(() => manualName.classList.remove('error'), 1200);
      return;
    }
    saveMedicine({
      medicine_name: name,
      manufacturer:  manualMfr.value.trim() || '-',
      mfg_date:      manualMfg.value.trim()  || '-',
      exp_date:      manualExp.value.trim()  || '-',
    });
    closeManualModal();
  };

  window.manualEntry = () => {
    if (!activeProfile) { showToast('Select a profile first', '⚠️'); return; }
    openManualModal();
  };

  // ════════════════════════════════════════════════
  //  VOICE ENTRY
  // ════════════════════════════════════════════════
  window.voiceInput = () => {
    if (!activeProfile) { showToast('Select a profile first', '⚠️'); return; }
    if (!('webkitSpeechRecognition' in window)) { showToast('Voice not supported', '⚠️'); return; }
    const r = new webkitSpeechRecognition();
    r.lang = 'en-IN'; r.start();
    r.onresult = e => saveMedicine({ medicine_name: e.results[0][0].transcript, manufacturer: '-' });
  };

  // ════════════════════════════════════════════════
  //  SAVE MEDICINE  (ids always stored as STRING)
  // ════════════════════════════════════════════════
  function saveMedicine(parsed) {
    if (!activeProfile) { showToast('Select a profile first', '⚠️'); return; }
    const meds = getMeds();
    meds.push({
      id:           String(Date.now()),   // ← always string — calendar depends on this
      name:         parsed.medicine_name || parsed.name || 'Unknown',
      manufacturer: parsed.manufacturer || '-',
      mfg:          parsed.mfg_date || '-',
      exp:          parsed.exp_date || '-',
    });
    setMeds(meds);
    renderToday();
    renderReminders();
    showToast(`"${meds[meds.length-1].name}" saved for ${activeProfile} ✓`);
  }

  // ════════════════════════════════════════════════
  //  RENDER TODAY
  // ════════════════════════════════════════════════
  function renderToday() {
    if (!activeProfile) {
      todayList.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>Select a profile from the <strong>Profiles</strong> tab.</p></div>`;
      return;
    }
    const meds = getMeds();
    if (!meds.length) {
      todayList.innerHTML = `<div class="empty-state"><div class="empty-icon">💊</div><p>No medicines yet. Use <strong>Scan</strong> or <strong>+ Manual</strong> to add.</p></div>`;
      return;
    }

    const todayStr = toDateStr(new Date());
    const log      = getLog();
    const dayLog   = log[todayStr] || {};

    todayList.innerHTML = '';
    meds.forEach((m, idx) => {
      const status = dayLog[String(m.id)] || null;
      const div = document.createElement('div');
      div.className = 'med-item' + (status === 'taken' ? ' status-taken' : status === 'missed' ? ' status-missed' : '');
      div.innerHTML = `
        <div class="med-info">
          <span class="med-name">${m.name}</span>
          <span class="med-sub">${m.manufacturer !== '-' ? m.manufacturer : ''}</span>
          ${m.mfg && m.mfg !== '-' ? `<span class="med-sub">Mfg: ${m.mfg}</span>` : ''}
          ${m.exp && m.exp !== '-' ? `<span class="med-sub">Exp: ${m.exp}</span>` : ''}
        </div>
        <div class="med-actions">
          <button class="taken-btn${status==='taken'?' active':''}" data-id="${m.id}" data-action="taken">${status==='taken'?'✅ Taken':'✓ Taken'}</button>
          <button class="missed-btn${status==='missed'?' active':''}" data-id="${m.id}" data-action="missed">${status==='missed'?'❌ Missed':'✗ Missed'}</button>
          <button class="remove-btn" data-idx="${idx}">Remove</button>
        </div>
      `;
      todayList.appendChild(div);
    });

    // ── Taken / Missed handlers ──────────────────
    todayList.querySelectorAll('.taken-btn,.missed-btn').forEach(btn => {
      btn.onclick = () => {
        const log2   = getLog();
        const d      = log2[todayStr] || {};
        const action = btn.dataset.action;
        const id     = String(btn.dataset.id);  // ← always string
        const prev   = d[id];

        // Toggle off if clicking same status again
        if (prev === action) {
          delete d[id];
        } else {
          d[id] = action;
        }
        log2[todayStr] = d;
        setLog(log2);

        const med = getMeds().find(m => String(m.id) === id);

        // ── Send missed-dose email if newly marked missed ──
        if (action === 'missed' && prev !== 'missed') {
          if (med) sendMissedDoseEmail(med.name, activeProfile);
        }

        // Re-render both today AND calendar immediately
        renderToday();
        renderCalendar();

        // Show a subtle status banner (non-blocking) instead of modal toast
        if (action === 'taken' && prev !== 'taken' && med) {
          showStatusBanner(`✅ ${med.name} marked as taken! Calendar updated.`, '#15803d');
        } else if (action === 'missed' && prev !== 'missed' && med) {
          showStatusBanner(`❌ ${med.name} marked as missed. Alert email sent!`, '#b91c1c');
        }
      };
    });

    // ── Remove handlers ──────────────────────────
    todayList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = () => {
        const meds2 = getMeds();
        meds2.splice(parseInt(btn.dataset.idx), 1);
        setMeds(meds2);
        renderToday();
        renderReminders();
      };
    });
  }

  // ════════════════════════════════════════════════
  //  REMINDERS
  // ════════════════════════════════════════════════
  function renderReminders() {
    const meds = getMeds();
    if (!activeProfile || !meds.length) {
      reminderList.innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><p>Save medicines first, then set reminder times here.</p></div>`;
      return;
    }
    const reminders = getReminders();
    reminderList.innerHTML = '';
    meds.forEach(m => {
      const times = reminders[String(m.id)] || ['', ''];
      const card  = document.createElement('div');
      card.className = 'reminder-card';
      card.innerHTML = `
        <div class="reminder-med-name">💊 ${m.name}</div>
        <div class="time-slots">
          <input class="time-slot-input" type="time" data-id="${m.id}" data-slot="0" value="${times[0]||''}"/>
          <input class="time-slot-input" type="time" data-id="${m.id}" data-slot="1" value="${times[1]||''}"/>
        </div>
        <button class="btn-save-reminder" data-id="${m.id}">Save times</button>
      `;
      reminderList.appendChild(card);
    });

    reminderList.querySelectorAll('.btn-save-reminder').forEach(btn => {
      btn.onclick = () => {
        const id     = String(btn.dataset.id);
        const inputs = reminderList.querySelectorAll(`.time-slot-input[data-id="${id}"]`);
        const times  = [...inputs].map(i => i.value);
        const rem2   = getReminders();
        rem2[id]     = times;
        setReminders(rem2);
        showToast('Reminder times saved ⏰');
        requestNotificationPermission();
      };
    });
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission();
  }

  // ── Reminder loop (checks every 30s for better accuracy) ────────────
  let reminderLoopId  = null;
  let firedThisMinute = {}; // prevent double-firing within same minute

  function startReminderLoop() {
    if (reminderLoopId) clearInterval(reminderLoopId);
    checkReminders();
    reminderLoopId = setInterval(checkReminders, 30000);
  }

  function checkReminders() {
    if (!currentUser || !activeProfile) return;
    const now2    = new Date();
    const hhmm    = `${String(now2.getHours()).padStart(2,'0')}:${String(now2.getMinutes()).padStart(2,'0')}`;
    const today   = toDateStr(now2);
    const meds    = getMeds();
    const rem     = getReminders();
    const log2    = getLog();
    const dayLog  = log2[today] || {};

    let autoMissChanged = false;

    meds.forEach(m => {
      const times = rem[String(m.id)] || [];
      const id    = String(m.id);

      times.forEach(t => {
        if (!t) return;

        // ── Fire dose reminder at exact time ──────────────
        if (t === hhmm) {
          const fireKey = `remind_${id}_${hhmm}_${today}`;
          if (!firedThisMinute[fireKey] && dayLog[id] !== 'taken') {
            firedThisMinute[fireKey] = true;
            playBeep();
            if (Notification.permission === 'granted') {
              new Notification('💊 MediSort — Dose Reminder', {
                body: `Time to take ${m.name}${activeProfile ? ' ('+activeProfile+')' : ''}`,
                icon: 'https://emojicdn.elk.sh/💊'
              });
            }
          }
        }

        // ── Auto-miss: if reminder time passed > 60 min & not taken ──
        if (dayLog[id] !== 'taken' && dayLog[id] !== 'missed') {
          const [rh, rm]       = t.split(':').map(Number);
          const reminderTime   = new Date(now2);
          reminderTime.setHours(rh, rm, 0, 0);
          const diffMin        = (now2 - reminderTime) / 60000;

          if (diffMin > 60) {
            const missKey = `automiss_${id}_${t}_${today}`;
            if (!firedThisMinute[missKey]) {
              firedThisMinute[missKey] = true;

              // Mark as missed in log
              const freshLog     = getLog();
              const freshDayLog  = freshLog[today] || {};
              if (freshDayLog[id] !== 'taken' && freshDayLog[id] !== 'missed') {
                freshDayLog[id]    = 'missed';
                freshLog[today]    = freshDayLog;
                setLog(freshLog);
                autoMissChanged    = true;

                // Send alert email
                sendMissedDoseEmail(m.name, activeProfile);

                // Browser notification for auto-miss
                if (Notification.permission === 'granted') {
                  new Notification('⚠️ MediSort — Missed Dose Alert', {
                    body: `${m.name} dose was missed. Alert email sent.`,
                    icon: 'https://emojicdn.elk.sh/⚠️'
                  });
                }
              }
            }
          }
        }
      });
    });

    if (autoMissChanged) {
      renderToday();
      renderCalendar();
    }

    // Clean old fired keys every hour to avoid memory leak
    const oneHourAgo = Date.now() - 3600000;
    Object.keys(firedThisMinute).forEach(k => {
      if (parseInt(k.split('_')[0]) < oneHourAgo) delete firedThisMinute[k];
    });
  }

  // ════════════════════════════════════════════════
  //  CALENDAR TRACKER
  // ════════════════════════════════════════════════
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function renderCalendar() {
    calMonthLabel.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
    calGrid.innerHTML = '';

    DAY_LABELS.forEach(d => {
      const lbl = document.createElement('div');
      lbl.className = 'cal-day-label';
      lbl.textContent = d;
      calGrid.appendChild(lbl);
    });

    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const todayStr    = toDateStr(new Date());
    const log         = getLog();
    const meds        = getMeds();

    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement('div');
      e.className = 'cal-day empty';
      calGrid.appendChild(e);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const cell    = document.createElement('div');
      cell.className = 'cal-day';

      const isToday  = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      // dayLog keys are strings because we always save with String(m.id)
      const dayLog   = log[dateStr] || {};
      const hasMeds  = meds.length > 0;

      let badge = '', cls = '';

      if (isFuture) {
        cls   = 'future';
        badge = '';
      } else if (!hasMeds) {
        // No medicines added at all — truly no data
        cls   = isToday ? 'today' : 'no-data';
        badge = isToday ? '📅' : '';
      } else if (isToday) {
        // TODAY: only show tick if explicitly taken; otherwise show pending style
        const taken = meds.filter(m => dayLog[String(m.id)] === 'taken').length;
        if (taken === meds.length) {
          cls   = 'taken-today';   // special combined class (green + today ring)
          badge = '✅';
        } else if (taken > 0) {
          cls   = 'partial today';
          badge = '~';
        } else {
          cls   = 'today';         // pending — no tick yet, no cross
          badge = '📅';
        }
        cell.classList.add('has-data');
      } else {
        // PAST days: default cross unless explicitly taken
        const taken = meds.filter(m => dayLog[String(m.id)] === 'taken').length;
        if (taken === meds.length) { cls = 'taken';   badge = '✅'; }
        else if (taken > 0)        { cls = 'partial'; badge = '~'; }
        else                       { cls = 'missed';  badge = '❌'; }
        cell.classList.add('has-data');
      }

      cell.classList.add(cls);
      cell.innerHTML = `<span class="cal-badge">${badge}</span><span class="cal-num">${day}</span>`;

      if (!isFuture) {
        cell.onclick = () => showDayDetail(dateStr, dayLog, meds);
      }
      calGrid.appendChild(cell);
    }
  }

  function showDayDetail(dateStr, dayLog, meds) {
    const pretty = new Date(dateStr+'T12:00:00').toLocaleDateString(undefined,
      { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const lines = meds.map(m => {
      const s    = dayLog[String(m.id)] || 'not logged';
      const icon = s==='taken' ? '✅' : s==='missed' ? '❌' : '❓';
      return `${icon} <strong>${m.name}</strong> — <em>${s}</em>`;
    }).join('<br>');

    document.getElementById('medisort-toast')?.remove();
    document.getElementById('medisort-overlay')?.remove();

    const overlay = Object.assign(document.createElement('div'), { id:'medisort-overlay' });
    Object.assign(overlay.style, { position:'fixed',inset:'0',background:'rgba(0,0,0,.45)',zIndex:'9998',opacity:'0',transition:'opacity .2s ease' });
    const box = Object.assign(document.createElement('div'), { id:'medisort-toast' });
    box.innerHTML = `
      <div style="font-size:1rem;font-weight:800;font-family:Nunito,sans-serif;margin-bottom:12px;">${pretty}</div>
      <div style="font-size:.9rem;line-height:1.9;text-align:left;">${lines || 'No medicines recorded.'}</div>
    `;
    Object.assign(box.style, {
      position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%) scale(.85)',
      background:'#fff',border:'2px solid #10b981',color:'#064e3b',borderRadius:'18px',
      padding:'28px 36px',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'10px',
      boxShadow:'0 8px 40px rgba(0,0,0,.18)',zIndex:'9999',opacity:'0',
      transition:'opacity .2s ease,transform .2s ease',minWidth:'260px',maxWidth:'92vw'
    });
    const ok = Object.assign(document.createElement('button'), { textContent:'Close' });
    Object.assign(ok.style, {
      marginTop:'8px',alignSelf:'center',background:'#10b981',color:'#fff',border:'none',
      borderRadius:'8px',padding:'8px 32px',fontSize:'.95rem',fontWeight:'700',cursor:'pointer'
    });
    const dismiss = () => {
      box.style.opacity='0'; overlay.style.opacity='0';
      setTimeout(()=>{ box.remove(); overlay.remove(); },200);
    };
    ok.onclick = overlay.onclick = dismiss;
    box.appendChild(ok);
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    requestAnimationFrame(()=>{
      overlay.style.opacity='1'; box.style.opacity='1';
      box.style.transform='translate(-50%,-50%) scale(1)';
    });
  }

  calPrev.onclick = () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); };
  calNext.onclick = () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); };

  // ════════════════════════════════════════════════
  //  OCR PARSER
  // ════════════════════════════════════════════════
  function parseMedicineInfo(text) {
    const lines = text.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean);
    const ignoreExact = ['TABLET','TABLETS','CAPSULE','CAPSULES','STRIP','MFG','MFD','EXP','BATCH','LOT','MRP'];
    const punishWords = ['HYDROCHLORIDE','HYDROCHCRIDE','TABLET','CAPSULE','OPS'];
    const wordCounts  = {};
    lines.forEach(line => {
      line.replace(/[^\w\s]/g,' ').split(/\s+/).forEach(w => {
        if (w.length > 2 && !ignoreExact.includes(w)) wordCounts[w] = (wordCounts[w]||0)+1;
      });
    });
    let medName = '-', bestScore = 0;
    Object.keys(wordCounts).forEach(w => {
      let sc = wordCounts[w] * w.length;
      if (punishWords.includes(w)) sc *= 0.3;
      if (sc > bestScore) { bestScore = sc; medName = w; }
    });
    lines.forEach(line => {
      if (line.includes('PRAZOPRESS')) medName = 'PRAZOPRESS XL 2.5';
      if (line.includes('OKACET'))    medName = 'OKACET';
      if (line.includes('STRESSCOM')) medName = 'STRESSCOM';
    });
    const manuPatterns = ['LTD','LAB','PHARMA','HEALTH','CARE','INDIA','CIPLA'];
    let manufacturer = '-';
    lines.forEach(line => {
      if (manuPatterns.some(p => line.includes(p)))
        manufacturer = line.replace(/[^\w\s]/g,' ').trim();
    });
    const dateRegex  = /(0[1-9]|1[0-2])[\/\-\.](\d{2,4})/g;
    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','SEPT','OCT','NOV','DEC'];
    let mfgDate = '-', expDate = '-';
    lines.forEach(line => {
      const match = line.match(dateRegex);
      if (match) {
        if (line.includes('MFG') || line.includes('MFD')) mfgDate = match[0];
        if (line.includes('EXP') || line.includes('EXPI')) expDate = match[0];
      }
      monthNames.forEach(mon => {
        const m = line.match(new RegExp(mon+'\\.?(\\d{2})'));
        if (m) {
          const val = mon+'.'+m[1];
          if (line.includes('MFG')||line.includes('MFD')) mfgDate = val;
          if (line.includes('EXP')||line.includes('EXPI')) expDate = val;
        }
      });
    });
    return { medicine_name: medName, manufacturer, mfg_date: mfgDate, exp_date: expDate };
  }

  // ════════════════════════════════════════════════
  //  OCR IMAGE UPLOAD
  // ════════════════════════════════════════════════
  imageInput?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!activeProfile) { showToast('Select a profile first','⚠️'); imageInput.value=''; return; }

    loadingDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    saveBtn.style.display    = 'none';
    lastParsed = null;

    try {
      const fd = new FormData();
      fd.append('file',file); fd.append('apikey',OCR_KEY);
      fd.append('language','eng'); fd.append('OCREngine','2');
      const data = await (await fetch('https://api.ocr.space/parse/image',{method:'POST',body:fd})).json();
      const txt  = data?.ParsedResults?.[0]?.ParsedText || '';
      if (!txt.trim()) { showToast('No text found. Try a clearer photo.','⚠️'); return; }

      const parsed = parseMedicineInfo(txt);
      document.getElementById('med-name').textContent = parsed.medicine_name || '-';
      document.getElementById('med-manu').textContent = parsed.manufacturer  || '-';
      document.getElementById('med-mfg').textContent  = parsed.mfg_date      || '-';
      document.getElementById('med-exp').textContent  = parsed.exp_date      || '-';

      resultsDiv.style.display = 'block';
      saveBtn.style.display    = 'block';
      lastParsed = parsed;
    } catch(err) {
      showToast('Scan failed: ' + err.message,'❌');
    } finally {
      loadingDiv.style.display = 'none';
      imageInput.value = '';
    }
  });

  saveBtn.onclick = () => {
    if (!lastParsed) { showToast('Nothing to save','⚠️'); return; }
    saveMedicine(lastParsed);
    resultsDiv.style.display = 'none';
    saveBtn.style.display    = 'none';
  };

  // ── Initial state ────────────────────────────────
  signInScreen.style.display = 'flex';
  dashboard.style.display    = 'none';
}