/* CyberPatriot "Let's Talk" guided chat
   Walks a visitor through a few quick questions, then either:
   - sends the inquiry (saved as a lead in the dashboard + emailed via Formspree), or
   - opens their own email app with everything pre-filled to cyber1patriot@gmail.com. */
(function () {
  var OWNER_EMAIL = 'cyber1patriot@gmail.com';
  var SUPABASE_URL = 'https://ohkhdvcywwqgcxijdoig.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zFSIWw_tffP44hh2_DvuzA_udNqeCKO';
  var FORMSPREE = 'https://formspree.io/f/xgojngea';

  var BUSINESS_TYPES = ['Restaurant / Bar / Café', 'Salon / Spa / Barber', 'Retail / Boutique', 'Contractor / Trades', 'Fitness / Personal Trainer', 'Professional Services', 'Other'];
  var NEEDS = ['A brand-new website', 'Redesign my current website', 'Monthly care plan (hosting & updates)', 'Not sure yet'];
  var TIMELINES = ['As soon as possible', 'Within 2 weeks', 'Within a month', 'No rush'];

  var STEPS = [
    { key: 'name', ask: function () { return "Hi! I'm here to help you get started. Answer a few quick questions and Freddy will follow up personally. What's your name?"; },
      type: 'text', placeholder: 'Your name', autocomplete: 'name', required: true },
    { key: 'business_type', ask: function (a) { return 'Nice to meet you, ' + first(a.name) + '! What kind of business do you have?'; },
      type: 'choice', options: BUSINESS_TYPES },
    { key: 'business_type_other', when: function (a) { return a.business_type === 'Other'; },
      ask: function () { return 'What does your business do?'; }, type: 'text', placeholder: 'e.g. Photography studio, florist…', required: true },
    { key: 'business', ask: function () { return "What's the name of your business?"; },
      type: 'text', placeholder: 'Business name', autocomplete: 'organization', skip: 'No name yet' },
    { key: 'need', ask: function () { return 'What can I help you with?'; }, type: 'choice', options: NEEDS },
    { key: 'current_site', when: function (a) { return a.need === NEEDS[1]; },
      ask: function () { return "What's the address of your current website?"; }, type: 'text', placeholder: 'e.g. mybusiness.com', autocomplete: 'url', skip: 'Skip' },
    { key: 'timeline', ask: function () { return 'When would you like it done?'; }, type: 'choice', options: TIMELINES },
    { key: 'details', ask: function () { return 'Anything else Freddy should know? Features you want, websites you like, ideas…'; },
      type: 'textarea', placeholder: 'Type a few details (optional)', skip: 'Nothing else' },
    { key: 'email', ask: function () { return "What's the best email to reach you?"; },
      type: 'email', placeholder: 'you@email.com', autocomplete: 'email', required: true },
    { key: 'phone', ask: function () { return 'And a phone number, if you prefer a call or text? (optional)'; },
      type: 'tel', placeholder: '(304) 555-0123', autocomplete: 'tel', skip: 'Email is fine' }
  ];

  var answers = {}, stepIndex = -1, built = false, sent = false, lastFocus = null;
  var root, panel, log, inputArea, launcher;

  function first(n) { return (n || '').trim().split(/\s+/)[0] || 'there'; }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (text != null) e.textContent = text;
    return e;
  }
  function track(label) { try { if (window.cpTrack) window.cpTrack('form_submit', { label: label, target: 'chat' }); } catch (e) {} }

  function injectStyles() {
    var css = ''
      + '.cpc{position:fixed;right:28px;bottom:96px;z-index:600;width:380px;max-width:calc(100vw - 32px);height:min(600px,calc(100vh - 130px));background:#fff;color:#0e1b33;display:none;flex-direction:column;box-shadow:0 24px 60px rgba(8,14,26,.38);font-family:"Plus Jakarta Sans",system-ui,sans-serif;border:1px solid rgba(14,27,51,.12)}'
      + '.cpc.open{display:flex}'
      + '.cpc-head{background:#0e1b33;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}'
      + '.cpc-av{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      + '.cpc-av svg{width:24px;height:auto;border-radius:2px}'
      + '.cpc-title{flex:1;min-width:0}.cpc-title b{display:block;font-size:15px;font-family:Fraunces,Georgia,serif}.cpc-title span{font-size:12px;color:#c9d2e2}'
      + '.cpc-x{background:none;border:none;color:#fff;font-size:26px;line-height:1;cursor:pointer;width:44px;height:44px;margin:-8px -8px -8px 0}'
      + '.cpc-x:focus-visible,.cpc button:focus-visible,.cpc input:focus-visible,.cpc textarea:focus-visible,.cpc a:focus-visible{outline:2px solid #b22234;outline-offset:2px}'
      + '.cpc-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f5f7fb}'
      + '.cpc-msg{max-width:86%;padding:10px 13px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}'
      + '.cpc-bot{background:#fff;border:1px solid #dde3ec;align-self:flex-start}'
      + '.cpc-me{background:#0e1b33;color:#fff;align-self:flex-end}'
      + '.cpc-sum{background:#fff;border:1px solid #dde3ec;align-self:stretch;max-width:none;font-size:13px}'
      + '.cpc-sum dl{margin:6px 0 0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px}.cpc-sum dt{color:#4a5568;font-weight:600}.cpc-sum dd{margin:0;word-break:break-word}'
      + '.cpc-in{border-top:1px solid #dde3ec;padding:12px;background:#fff;flex-shrink:0}'
      + '.cpc-chips{display:flex;flex-wrap:wrap;gap:8px}'
      + '.cpc-chip{border:1px solid #0e1b33;background:#fff;color:#0e1b33;font:600 13px "Plus Jakarta Sans",system-ui,sans-serif;padding:10px 14px;min-height:44px;cursor:pointer;text-align:left}'
      + '.cpc-chip:hover{background:#0e1b33;color:#fff}'
      + '.cpc-chip.ghost{border-color:#cbd3df;color:#4a5568}.cpc-chip.ghost:hover{background:#eef1f6;color:#0e1b33}'
      + '.cpc-row{display:flex;gap:8px;align-items:flex-end}'
      + '.cpc-field{flex:1;min-width:0;border:1px solid #b8c2d1;padding:11px 12px;font:15px "Plus Jakarta Sans",system-ui,sans-serif;color:#0e1b33;background:#fff;resize:none}'
      + '.cpc-field:focus{border-color:#0e1b33;outline:none}'
      + '.cpc-send{background:#0e1b33;color:#fff;border:none;min-width:44px;min-height:44px;padding:0 16px;font:700 14px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}'
      + '.cpc-send:hover{background:#1b2d52}'
      + '.cpc-err{color:#b22234;font-size:12.5px;margin:6px 2px 0;min-height:1em}'
      + '.cpc-under{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px}'
      + '.cpc-under button{background:none;border:none;color:#4a5568;text-decoration:underline;cursor:pointer;font:12px "Plus Jakarta Sans",system-ui,sans-serif;padding:6px 0}'
      + '.cpc-actions{display:flex;flex-direction:column;gap:8px}'
      + '.cpc-primary{background:#0e1b33;color:#fff;border:none;padding:13px;min-height:46px;font:700 14px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;text-align:center;text-decoration:none;display:block}'
      + '.cpc-primary:hover{background:#1b2d52}.cpc-primary[disabled]{opacity:.6;cursor:wait}'
      + '.cpc-secondary{border:1px solid #0e1b33;color:#0e1b33;background:#fff;padding:12px;min-height:46px;font:700 14px "Plus Jakarta Sans",system-ui,sans-serif;text-align:center;text-decoration:none;display:block;cursor:pointer}'
      + '.cpc-secondary:hover{background:#eef1f6}'
      + '.cpc-legal{font-size:11.5px;color:#4a5568;margin:2px 0 0;line-height:1.5}.cpc-legal a{color:#1e3a8a}'
      + '.cpc-typing{display:inline-flex;gap:4px}.cpc-typing i{width:6px;height:6px;border-radius:50%;background:#9aa6b8;animation:cpcb 1s infinite}.cpc-typing i:nth-child(2){animation-delay:.15s}.cpc-typing i:nth-child(3){animation-delay:.3s}'
      + '@keyframes cpcb{0%,80%,100%{opacity:.3}40%{opacity:1}}'
      + '@media (prefers-reduced-motion:reduce){.cpc-typing i{animation:none}}'
      + '@media(max-width:560px){.cpc{right:0;left:0;bottom:0;width:100%;max-width:none;height:min(88vh,640px)}}';
    var st = el('style'); st.textContent = css; document.head.appendChild(st);
  }

  function flagSVG() {
    var f = document.querySelector('.brand-flag');
    return f ? f.outerHTML.replace('class="brand-flag"', '') : '';
  }

  function build() {
    if (built) return; built = true;
    injectStyles();
    root = el('div', { class: 'cpc', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'cpcTitle' });
    var head = el('div', { class: 'cpc-head' });
    var av = el('div', { class: 'cpc-av', 'aria-hidden': 'true' }); av.innerHTML = flagSVG();
    var title = el('div', { class: 'cpc-title' });
    var tb = el('b', { id: 'cpcTitle' }, "Let's talk"); var ts = el('span', null, 'Freddy · usually replies within a day');
    title.appendChild(tb); title.appendChild(ts);
    var x = el('button', { class: 'cpc-x', type: 'button', 'aria-label': 'Close chat' }, '×');
    x.addEventListener('click', close);
    head.appendChild(av); head.appendChild(title); head.appendChild(x);
    log = el('div', { class: 'cpc-log', 'aria-live': 'polite' });
    inputArea = el('div', { class: 'cpc-in' });
    root.appendChild(head); root.appendChild(log); root.appendChild(inputArea);
    document.body.appendChild(root);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    start();
  }

  function say(text, who) {
    var m = el('div', { class: 'cpc-msg ' + (who === 'me' ? 'cpc-me' : 'cpc-bot') }, text);
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  function botSay(text, then) {
    var t = el('div', { class: 'cpc-msg cpc-bot', 'aria-hidden': 'true' });
    t.innerHTML = '<span class="cpc-typing"><i></i><i></i><i></i></span>';
    log.appendChild(t); log.scrollTop = log.scrollHeight;
    setTimeout(function () { t.remove(); say(text); if (then) then(); }, reduceMotion() ? 0 : 450);
  }
  function reduceMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function clearInput() { inputArea.innerHTML = ''; }

  function start() {
    log.innerHTML = ''; answers = {}; stepIndex = -1; sent = false;
    botSay("Hi, I'm Freddy's assistant. How would you like to reach out?", function () {
      clearInput();
      var chips = el('div', { class: 'cpc-chips' });
      var a = el('button', { class: 'cpc-chip', type: 'button' }, 'Answer a few quick questions');
      a.addEventListener('click', function () { say(a.textContent, 'me'); next(); });
      var b = el('a', { class: 'cpc-chip ghost', href: mailtoLink(true) }, 'Email Freddy directly');
      b.addEventListener('click', function () { track('Chat · email directly'); });
      chips.appendChild(a); chips.appendChild(b); inputArea.appendChild(chips);
      a.focus();
    });
  }

  function next() {
    stepIndex++;
    while (stepIndex < STEPS.length && STEPS[stepIndex].when && !STEPS[stepIndex].when(answers)) stepIndex++;
    if (stepIndex >= STEPS.length) return finish();
    var s = STEPS[stepIndex];
    clearInput();
    botSay(s.ask(answers), function () { renderInput(s); });
  }

  function back() {
    // step back to the previous question that applies
    var i = stepIndex - 1;
    while (i >= 0 && STEPS[i].when && !STEPS[i].when(answers)) i--;
    if (i < 0) return;
    delete answers[STEPS[stepIndex] && STEPS[stepIndex].key];
    stepIndex = i - 1;
    say('Go back', 'me');
    next();
  }

  function renderInput(s) {
    clearInput();
    if (s.type === 'choice') {
      var chips = el('div', { class: 'cpc-chips', role: 'group', 'aria-label': s.ask(answers) });
      s.options.forEach(function (opt) {
        var c = el('button', { class: 'cpc-chip', type: 'button' }, opt);
        c.addEventListener('click', function () { answer(s, opt); });
        chips.appendChild(c);
      });
      inputArea.appendChild(chips);
      underRow(s);
      var f = chips.querySelector('button'); if (f) f.focus();
      return;
    }
    var form = el('form', { novalidate: 'novalidate' });
    var row = el('div', { class: 'cpc-row' });
    var field = s.type === 'textarea' ? el('textarea', { class: 'cpc-field', rows: '3' }) : el('input', { class: 'cpc-field', type: s.type === 'email' ? 'email' : s.type === 'tel' ? 'tel' : 'text' });
    field.setAttribute('placeholder', s.placeholder || '');
    field.setAttribute('aria-label', s.ask(answers));
    if (s.autocomplete) field.setAttribute('autocomplete', s.autocomplete);
    field.maxLength = s.type === 'textarea' ? 2000 : 200;
    if (answers[s.key]) field.value = answers[s.key];
    var send = el('button', { class: 'cpc-send', type: 'submit', 'aria-label': 'Send answer' }, '→');
    row.appendChild(field); row.appendChild(send);
    var err = el('p', { class: 'cpc-err', role: 'alert' });
    form.appendChild(row); form.appendChild(err);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = field.value.trim();
      if (!v && s.required) { err.textContent = 'Please fill this in to continue.'; field.focus(); return; }
      if (v && s.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { err.textContent = 'That email doesn’t look right. Please check it.'; field.focus(); return; }
      if (!v && s.skip) { answer(s, '', s.skip); return; }
      if (!v) return;
      answer(s, v);
    });
    if (s.type === 'textarea') field.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : send.click(); } });
    inputArea.appendChild(form);
    underRow(s);
    field.focus();
  }

  function underRow(s) {
    var u = el('div', { class: 'cpc-under' });
    var left = el('span');
    if (stepIndex > 0) { var b = el('button', { type: 'button' }, '← Back'); b.addEventListener('click', back); left.appendChild(b); }
    u.appendChild(left);
    if (s.skip) { var sk = el('button', { type: 'button' }, s.skip); sk.addEventListener('click', function () { answer(s, '', s.skip); }); u.appendChild(sk); }
    inputArea.appendChild(u);
  }

  function answer(s, value, shownText) {
    answers[s.key] = value;
    say(shownText || value, 'me');
    next();
  }

  function typeLabel() {
    return answers.business_type === 'Other' && answers.business_type_other ? 'Other: ' + answers.business_type_other : (answers.business_type || '');
  }
  function messageText() {
    var lines = [];
    if (answers.need) lines.push('Needs: ' + answers.need);
    if (answers.current_site) lines.push('Current website: ' + answers.current_site);
    if (answers.phone) lines.push('Phone: ' + answers.phone);
    if (answers.details) lines.push('Details: ' + answers.details);
    return lines.join('\n');
  }
  function summaryPairs() {
    return [['Name', answers.name], ['Business', answers.business], ['Type', typeLabel()], ['Needs', answers.need],
      ['Current site', answers.current_site], ['Timeline', answers.timeline], ['Email', answers.email], ['Phone', answers.phone], ['Details', answers.details]]
      .filter(function (p) { return p[1]; });
  }
  function mailtoLink(blank) {
    var subject = blank ? 'Website inquiry' : 'Website inquiry from ' + (answers.name || '') + (answers.business ? ' (' + answers.business + ')' : '');
    var body = blank ? 'Hi Freddy,\n\nI’m interested in a website for my business.\n\nBusiness name:\nType of business:\nWhat I need:\nTimeline:\n\nThanks!'
      : 'Hi Freddy,\n\n' + summaryPairs().map(function (p) { return p[0] + ': ' + p[1]; }).join('\n') + '\n\nThanks!';
    return 'mailto:' + OWNER_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function finish() {
    clearInput();
    botSay('Thanks, ' + first(answers.name) + "! Here's what I've got:", function () {
      var box = el('div', { class: 'cpc-msg cpc-sum' });
      var dl = el('dl');
      summaryPairs().forEach(function (p) { dl.appendChild(el('dt', null, p[0])); dl.appendChild(el('dd', null, p[1])); });
      box.appendChild(dl); log.appendChild(box); log.scrollTop = log.scrollHeight;
      botSay('How would you like to send it?', renderSendOptions);
    });
  }

  function renderSendOptions() {
    clearInput();
    var wrap = el('div', { class: 'cpc-actions' });
    var sendBtn = el('button', { class: 'cpc-primary', type: 'button' }, 'Send to Freddy');
    var mail = el('a', { class: 'cpc-secondary', href: mailtoLink(false) }, 'Email it from my own email instead');
    var legal = el('p', { class: 'cpc-legal' });
    legal.innerHTML = 'By sending, you agree to our <a href="terms-of-service.html" target="_blank" rel="noopener">Terms of Service</a> and <a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.';
    var err = el('p', { class: 'cpc-err', role: 'alert' });
    var edit = el('div', { class: 'cpc-under' }); var eb = el('button', { type: 'button' }, 'Start over'); eb.addEventListener('click', start); edit.appendChild(eb);
    sendBtn.addEventListener('click', function () { submitLead(sendBtn, err); });
    mail.addEventListener('click', function () { track('Chat · emailed from own email'); });
    wrap.appendChild(sendBtn); wrap.appendChild(mail); wrap.appendChild(legal); wrap.appendChild(err);
    inputArea.appendChild(wrap); inputArea.appendChild(edit);
    sendBtn.focus();
  }

  function submitLead(btn, err) {
    if (sent) return;
    btn.disabled = true; btn.textContent = 'Sending…'; err.textContent = '';
    var lead = {
      name: (answers.name || '').slice(0, 200), email: (answers.email || '').slice(0, 200),
      business: (answers.business || '').slice(0, 200), business_type: typeLabel().slice(0, 200),
      timeline: (answers.timeline || '').slice(0, 100), message: messageText().slice(0, 5000),
      status: 'new', source: 'chat'
    };
    var saveLead = fetch(SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=minimal' },
      body: JSON.stringify(lead)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });

    var form = {
      _subject: 'New chat inquiry from ' + lead.name + (lead.business ? ' (' + lead.business + ')' : ''),
      _replyto: lead.email, source: 'Website chat',
      name: lead.name, email: lead.email, business: lead.business, business_type: lead.business_type,
      need: answers.need || '', current_website: answers.current_site || '', timeline: lead.timeline,
      phone: answers.phone || '', message: answers.details || '',
      agreed_at: new Date().toString(), agreement_text: 'Submitter agreed to the CyberPatriot Terms of Service and Privacy Policy at patrioticwebsites.com (chat)'
    };
    var sendEmail = fetch(FORMSPREE, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(form)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });

    Promise.all([saveLead, sendEmail]).then(function (res) {
      if (res[0] || res[1]) {
        sent = true; track('Chat');
        clearInput();
        botSay('Sent! Freddy will get back to you at ' + lead.email + ' within one business day. Thanks for reaching out, ' + first(lead.name) + '.', function () {
          var wrap = el('div', { class: 'cpc-actions' });
          var done = el('button', { class: 'cpc-secondary', type: 'button' }, 'Close');
          done.addEventListener('click', close);
          wrap.appendChild(done); inputArea.appendChild(wrap); done.focus();
        });
      } else {
        btn.disabled = false; btn.textContent = 'Try sending again';
        err.textContent = 'Something went wrong sending your message. You can try again, or use "Email it from my own email instead."';
      }
    });
  }

  function open() {
    lastFocus = document.activeElement;
    build();
    root.classList.add('open');
    if (launcher) launcher.setAttribute('aria-expanded', 'true');
    var f = root.querySelector('.cpc-in button, .cpc-in input, .cpc-in textarea, .cpc-in a');
    if (f) f.focus();
  }
  function close() {
    if (!root) return;
    root.classList.remove('open');
    if (launcher) launcher.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function toggle() { if (root && root.classList.contains('open')) close(); else open(); }

  window.cpChat = { open: open, close: close, toggle: toggle };

  launcher = document.getElementById('quote-btn');
  if (launcher) {
    launcher.removeAttribute('onclick');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', "Let's talk: open chat");
    launcher.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
  }
})();
