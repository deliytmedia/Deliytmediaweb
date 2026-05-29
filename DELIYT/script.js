 // ============================================================================
// DELIYTMEDIA FRONTEND CHAT — v5 (CORS-FIXED for Google Apps Script)
//
// ROOT CAUSE OF "Something went wrong" ERROR:
// Google Apps Script does NOT handle CORS preflight (OPTIONS) requests.
// Sending Content-Type: application/json triggers a preflight → blocked.
//
// FIX: Send as URLSearchParams (application/x-www-form-urlencoded).
// This is a "simple request" — NO preflight, no CORS block.
// The Apps Script backend reads it via e.parameter.field_name.
// ============================================================================

const CHAT_CONFIG = {
  // ⚠️  PASTE YOUR APPS SCRIPT WEB APP URL BELOW ↓
  webhookUrl: 'https://script.google.com/macros/s/AKfycbyuMprK8Y4egMApssn2ETLygpER_2PD9KVk6fCXOptZ9y15oDJbbXb4NLLBTHTNzI7J/exec',
  // ────────────────────────────────────────────────

  conversationId: null,
  isOpen:         false,
  isTyping:       false,
  greetingShown:  false
};

// ── Session: persist within tab, fresh on page reload ────────────────────────
function initSession() {
  if (!CHAT_CONFIG.conversationId) {
    var stored = sessionStorage.getItem('deliy_conv_id');
    if (stored) {
      CHAT_CONFIG.conversationId = stored;
      CHAT_CONFIG.greetingShown  = true;
    } else {
      CHAT_CONFIG.conversationId =
        'CONV_' + Date.now() + '_' +
        Math.random().toString(36).substr(2, 9).toUpperCase();
      sessionStorage.setItem('deliy_conv_id', CHAT_CONFIG.conversationId);
    }
  }
}

function isBackendConnected() {
  return CHAT_CONFIG.webhookUrl &&
         CHAT_CONFIG.webhookUrl !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' &&
         CHAT_CONFIG.webhookUrl.startsWith('https://');
}

// ── THE FIX: Always send as URLSearchParams (no preflight) ───────────────────
// Apps Script backend reads: e.parameter.conversation_id, e.parameter.message etc.
function buildPayload(message, extra) {
  var params = {
    conversation_id: CHAT_CONFIG.conversationId,
    message:         message,
    timestamp:       new Date().toISOString()
  };
  if (extra) Object.assign(params, extra);
  return new URLSearchParams(params);
}

async function postToBackend(message, extra) {
  var response = await fetch(CHAT_CONFIG.webhookUrl, {
    method:  'POST',
    // NO Content-Type header → browser defaults to application/x-www-form-urlencoded
    // This avoids the CORS preflight that kills Google Apps Script
    body: buildPayload(message, extra)
  });
  return await response.json();
}

// ── Open / Close / Toggle ─────────────────────────────────────────────────────
function openChat() {
  if (CHAT_CONFIG.isOpen) return;
  CHAT_CONFIG.isOpen = true;
  initSession();
  document.getElementById('chatOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';

  var bubble = document.getElementById('chatBubbleBtn');
  if (bubble) {
    bubble.classList.add('is-open');
    var ic = bubble.querySelector('.bubble-icon-chat');
    var ix = bubble.querySelector('.bubble-icon-close');
    if (ic) ic.style.display = 'none';
    if (ix) ix.style.display = 'block';
  }

  if (!CHAT_CONFIG.greetingShown) {
    CHAT_CONFIG.greetingShown = true;
    clearStaticGreeting();
    triggerGreeting();
  }

  setTimeout(function() {
    var inp = document.getElementById('chatInput');
    if (inp) inp.focus();
  }, 350);
}

function closeChat() {
  if (!CHAT_CONFIG.isOpen) return;
  CHAT_CONFIG.isOpen = false;
  document.getElementById('chatOverlay').classList.remove('active');
  document.body.style.overflow = '';
  var bubble = document.getElementById('chatBubbleBtn');
  if (bubble) {
    bubble.classList.remove('is-open');
    var ic = bubble.querySelector('.bubble-icon-chat');
    var ix = bubble.querySelector('.bubble-icon-close');
    if (ic) ic.style.display = 'block';
    if (ix) ix.style.display = 'none';
  }
}

function toggleChat() { CHAT_CONFIG.isOpen ? closeChat() : openChat(); }

function handleOverlayClick(event) {
  if (event.target === document.getElementById('chatOverlay')) closeChat();
}

function clearStaticGreeting() {
  var c = document.getElementById('chatMessages');
  if (c) c.innerHTML = '';
}

// ── Trigger greeting from backend (GREETING state) ───────────────────────────
async function triggerGreeting() {
  if (!isBackendConnected()) {
    appendMessage("👋 Hey! I'm Deliy, your Deliytmedia assistant.\n\nWhat can we help you build?", 'bot');
    appendServiceMenu();
    return;
  }
  showTyping();
  try {
    var data = await postToBackend('__INIT__');
    hideTyping();
    handleAgentResponse(data);
    if (!document.getElementById('serviceMenu')) appendServiceMenu();
  } catch (err) {
    hideTyping();
    appendMessage("👋 Hey! I'm Deliy, your Deliytmedia assistant.\n\nWhat can we help you build?", 'bot');
    appendServiceMenu();
    console.error('[Deliy] Greeting error:', err);
  }
}

// ── Main send ─────────────────────────────────────────────────────────────────
async function sendMessage() {
  var input   = document.getElementById('chatInput');
  var message = input.value.trim();
  if (!message || CHAT_CONFIG.isTyping) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('chatSend').disabled = true;

  appendMessage(message, 'user');
  showTyping();
  CHAT_CONFIG.isTyping = true;

  if (!isBackendConnected()) {
    setTimeout(function() {
      hideTyping();
      CHAT_CONFIG.isTyping = false;
      appendMessage(getSmartFallback(message), 'bot');
      input.disabled = false;
      document.getElementById('chatSend').disabled = false;
      input.focus();
    }, 700);
    return;
  }

  try {
    var data = await postToBackend(message);
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    handleAgentResponse(data);
  } catch (err) {
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    // Show the actual error type to help diagnose
    var errMsg = "⚠️ Connection error. ";
    if (err.message && err.message.includes('NetworkError')) {
      errMsg += "Network blocked — check your Apps Script is deployed as 'Anyone' access.";
    } else if (err.message && err.message.includes('Failed to fetch')) {
      errMsg += "Could not reach the server. Is your Apps Script URL correct and deployed?";
    } else {
      errMsg += "Please try again or email hello@deliytmedia.com.";
    }
    appendMessage(errMsg, 'bot');
    console.error('[Deliy] sendMessage error:', err);
  } finally {
    input.disabled = false;
    document.getElementById('chatSend').disabled = false;
    input.focus();
  }
}

// ── Central response handler ──────────────────────────────────────────────────
function handleAgentResponse(data) {
  if (!data) {
    appendMessage("Something went wrong — no response from server.", 'bot');
    return;
  }

  // Support both {response: "..."} and {message: "..."} shapes
  var resp = data.response || data.message || data.text || null;

  if (!resp) {
    // human_mode = true means admin has taken over — show a polite holding message
    if (data.human_mode === true) {
      appendMessage('Our team has been notified and will reply to you shortly. 🙏', 'bot');
      return;
    }
    appendMessage("Got an empty response from the server. Check Apps Script logs.", 'bot');
    console.warn('[Deliy] Empty response payload:', data);
    return;
  }

  if (resp === '__DATE_PICKER__' && data.availability) {
    appendMessage("Almost there! Choose a date for your strategy call:", 'bot');
    appendDatePicker(data.availability);
  } else if (resp === '__SLOT_PICKER__' && data.slots) {
    appendMessage(
      'Now pick a time on ' + (data.date_label || 'your chosen date') + ' (WAT):',
      'bot'
    );
    appendSlotPicker(data.slots, data.date_label);
  } else {
    appendMessage(resp, 'bot');
  }

  // Optional: quick-reply buttons if backend sends them
  if (data.quick_replies && Array.isArray(data.quick_replies) && data.quick_replies.length) {
    appendQuickReplies(data.quick_replies);
  }
}

// ── Quick-reply chips ─────────────────────────────────────────────────────────
function appendQuickReplies(replies) {
  var container = document.getElementById('chatMessages');
  var old = document.getElementById('quickReplies');
  if (old) old.remove();
  var wrapper = document.createElement('div');
  wrapper.className = 'qr-wrapper';
  wrapper.id        = 'quickReplies';
  replies.forEach(function(r) {
    var btn = document.createElement('button');
    btn.className   = 'qr-btn';
    btn.textContent = r;
    btn.addEventListener('click', function() {
      document.getElementById('quickReplies')?.remove();
      document.getElementById('chatInput').value = r;
      sendMessage();
    });
    wrapper.appendChild(btn);
  });
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

// ── Date picker ───────────────────────────────────────────────────────────────
function appendDatePicker(availDates) {
  var container = document.getElementById('chatMessages');
  var wrapper   = document.createElement('div');
  wrapper.className = 'message bot-message picker-wrapper';
  var grid = document.createElement('div');
  grid.className = 'picker-grid';
  availDates.forEach(function(d) {
    var btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.innerHTML =
      '<span class="picker-main">' + d.label + '</span>' +
      '<span class="picker-sub">' + d.slots.length + ' slot' +
      (d.slots.length !== 1 ? 's' : '') + ' open</span>';
    btn.addEventListener('click', function() { selectDate(d.date, d.label); });
    grid.appendChild(btn);
  });
  wrapper.appendChild(grid);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function selectDate(dateValue, dateLabel) {
  removePickers();
  appendMessage(dateLabel, 'user');
  sendPickerValue(dateValue);
}

// ── Slot picker ───────────────────────────────────────────────────────────────
function appendSlotPicker(slots, dateLabel) {
  var container = document.getElementById('chatMessages');
  var wrapper   = document.createElement('div');
  wrapper.className = 'message bot-message picker-wrapper';
  var grid = document.createElement('div');
  grid.className = 'picker-grid slot-grid';
  slots.forEach(function(s) {
    var btn = document.createElement('button');
    btn.className   = 'picker-btn slot-btn';
    btn.textContent = s.label;
    btn.addEventListener('click', function() { selectSlot(s.value, s.label); });
    grid.appendChild(btn);
  });
  wrapper.appendChild(grid);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function selectSlot(slotValue, slotLabel) {
  removePickers();
  appendMessage(slotLabel, 'user');
  sendPickerValue(slotValue);
}

function removePickers() {
  document.querySelectorAll('.picker-wrapper').forEach(function(el) { el.remove(); });
}

async function sendPickerValue(value) {
  showTyping();
  CHAT_CONFIG.isTyping = true;
  try {
    var data = await postToBackend(value);
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    handleAgentResponse(data);
  } catch (err) {
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    appendMessage("Something went wrong. Please try again.", 'bot');
  }
}

// ── Append message to chat ────────────────────────────────────────────────────
function appendMessage(text, sender) {
  var container = document.getElementById('chatMessages');
  var wrapper   = document.createElement('div');
  wrapper.className = 'message ' + sender + '-message';
  var bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.innerHTML = formatText(text);
  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function formatText(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  var lines  = text.split('\n');
  var out    = [];
  var inList = false;
  lines.forEach(function(line) {
    var t = line.trim();
    if (t.startsWith('- ') || t.startsWith('* ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + t.slice(2) + '</li>');
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(t === '' ? '<br>' : '<p>' + t + '</p>');
    }
  });
  if (inList) out.push('</ul>');
  return out.join('');
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function showTyping() {
  if (document.getElementById('typingIndicator')) return;
  var container = document.getElementById('chatMessages');
  var wrapper   = document.createElement('div');
  wrapper.className = 'message bot-message';
  wrapper.id        = 'typingIndicator';
  wrapper.innerHTML =
    '<div class="message-content typing-bubble">' +
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>' +
    '</div>';
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  var el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ── Smart staged fallback (backend not connected) ─────────────────────────────
var _fbStage = 0;
function getSmartFallback(message) {
  var stage = _fbStage++;
  if (stage === 0) return "Got it — **" + message + "**. What's the main problem you're trying to fix?";
  if (stage === 1) return "Understood. Roughly what budget are you working with — under ₦500k, ₦500k–₦2M, or above ₦2M?";
  if (stage === 2) return "Perfect. I'd love to book you a free 30-minute strategy call. What's your name and email?";
  if (stage === 3) return "Thanks! We'll be in touch within 24 hours to confirm your slot. 🙌";
  var l = message.toLowerCase();
  if (l.includes('price') || l.includes('cost')) return "WhatsApp agents from ₦200k, SaaS platforms from ₦500k. Final price is scoped on the strategy call.";
  return "The best next step is a free strategy call. Want me to help set that up?";
}

// ── Enter key ─────────────────────────────────────────────────────────────────
function handleChatKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initSession();

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      scrollToSection(a.getAttribute('href').slice(1));
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && CHAT_CONFIG.isOpen) closeChat();
  });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(
    '.service-card,.step-card,.faq-item,.problem-card,.check-item'
  ).forEach(function(el) {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
});

// ── Injected styles ───────────────────────────────────────────────────────────
(function() {
  var s = document.createElement('style');
  s.textContent =
    '.animate-on-scroll{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}' +
    '.animate-on-scroll.visible{opacity:1;transform:translateY(0)}' +
    '.typing-bubble{display:flex !important;gap:6px;align-items:center;padding:14px 18px !important}' +
    '.dot{width:8px;height:8px;border-radius:50%;background:#BFFF00;animation:dotB 1.4s infinite;display:inline-block}' +
    '.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}' +
    '@keyframes dotB{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-8px);opacity:1}}' +
    '.message-content code{background:rgba(191,255,0,.1);padding:2px 6px;border-radius:4px;font-size:.88em}' +
    '.message-content p{margin-bottom:6px}.message-content p:last-child{margin-bottom:0}' +
    '.message-content ul{margin:6px 0 6px 18px}.message-content li{margin-bottom:4px}' +
    '.message-content strong{color:#BFFF00}' +
    '.picker-wrapper{max-width:100% !important;width:100%}' +
    '.picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px 0}' +
    '.slot-grid{grid-template-columns:repeat(3,1fr)}' +
    '.picker-btn{background:#1c1c2e;border:1.5px solid rgba(191,255,0,.2);border-radius:12px;' +
    'padding:10px 12px;cursor:pointer;transition:all .2s;text-align:center;' +
    'color:#fff;font-family:Outfit,sans-serif;font-size:.88rem;' +
    'display:flex;flex-direction:column;align-items:center;gap:3px;width:100%}' +
    '.picker-btn:hover{background:rgba(191,255,0,.1);border-color:#BFFF00;' +
    'transform:translateY(-2px);box-shadow:0 4px 14px rgba(191,255,0,.2)}' +
    '.picker-main{font-weight:700;font-size:.9rem;color:#fff}' +
    '.picker-sub{font-size:.75rem;color:#8888aa}' +
    '.slot-btn{flex-direction:row;justify-content:center;font-weight:600}' +
    '.qr-wrapper{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 8px 0}' +
    '.qr-btn{background:transparent;border:1.5px solid rgba(191,255,0,.35);border-radius:20px;' +
    'padding:7px 16px;cursor:pointer;color:#BFFF00;font-family:Outfit,sans-serif;' +
    'font-size:.83rem;font-weight:600;transition:all .18s;white-space:nowrap}' +
    '.qr-btn:hover{background:rgba(191,255,0,.12);border-color:#BFFF00;transform:translateY(-1px)}' +
    // Service menu
    '.service-menu{display:flex;flex-direction:column;gap:7px;padding:4px 0 8px 0;width:100%}' +
    '.svc-btn{display:flex;align-items:center;gap:10px;background:#1c1c2e;' +
    'border:1.5px solid rgba(191,255,0,0.15);border-radius:12px;padding:10px 14px;' +
    'cursor:pointer;transition:all .2s;text-align:left;width:100%;font-family:Outfit,sans-serif}' +
    '.svc-btn:hover{background:rgba(191,255,0,0.08);border-color:rgba(191,255,0,0.5);transform:translateX(3px)}' +
    '.svc-emoji{font-size:1.1rem;flex-shrink:0;width:24px;text-align:center}' +
    '.svc-info{display:flex;flex-direction:column;gap:1px}' +
    '.svc-label{font-size:0.87rem;font-weight:700;color:#fff}' +
    '.svc-price{font-size:0.73rem;color:#BFFF00;font-weight:600}';
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE MENU + UPDATED HANDLERS (appended patch)
// ══════════════════════════════════════════════════════════════════════════════

var SERVICES_MENU = [
  { id:'1', emoji:'💬', label:'WhatsApp AI Agent',       price:'from ₦200k'  },
  { id:'2', emoji:'🖥️', label:'Custom SaaS / Website',   price:'from ₦500k'  },
  { id:'3', emoji:'⚙️', label:'Business Automation',     price:'from ₦150k'  },
  { id:'4', emoji:'📱', label:'Social Media Management', price:'from ₦80k/mo'},
  { id:'5', emoji:'✍️', label:'Content Marketing',       price:'from ₦120k/mo'},
  { id:'6', emoji:'🚀', label:'Full Growth Package',     price:'from ₦800k'  }
];

function appendServiceMenu() {
  var old = document.getElementById('serviceMenu');
  if (old) old.remove();
  var container = document.getElementById('chatMessages');
  var wrapper   = document.createElement('div');
  wrapper.id        = 'serviceMenu';
  wrapper.className = 'service-menu';
  SERVICES_MENU.forEach(function(svc) {
    var btn = document.createElement('button');
    btn.className = 'svc-btn';
    btn.innerHTML =
      '<span class="svc-emoji">' + svc.emoji + '</span>' +
      '<span class="svc-info"><span class="svc-label">' + svc.label + '</span>' +
      '<span class="svc-price">' + svc.price + '</span></span>';
    btn.addEventListener('click', function() {
      document.getElementById('serviceMenu')?.remove();
      appendMessage(svc.emoji + ' ' + svc.label, 'user');
      document.getElementById('chatInput').value = svc.id;
      sendMessage();
    });
    wrapper.appendChild(btn);
  });
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}
