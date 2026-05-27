// ============================================================================
// DELIYTMEDIA FRONTEND CHAT — v3
// Connects to Apps Script Agent Backend
// Supports: qualification flow, date picker, slot picker
// ============================================================================

const CHAT_CONFIG = {
  webhookUrl:     'https://script.google.com/macros/s/AKfycbzDLDQjGZhKK5p2dj6i6r3GsqnjxMqtnjO6X8PzSoJEJ4ROBJUIdpzT4oWpbapZzHW9',
  conversationId: null,
  isOpen:         false,
  isTyping:       false
};

function initSession() {
  if (!CHAT_CONFIG.conversationId) {
    CHAT_CONFIG.conversationId =
      'CONV_' + Date.now() + '_' +
      Math.random().toString(36).substr(2, 9).toUpperCase();
  }
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

// ── Send message ──────────────────────────────────────────────────────────────
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

  try {
    var params = new URLSearchParams({
      conversation_id: CHAT_CONFIG.conversationId,
      message:         message,
      timestamp:       new Date().toISOString()
    });
    var response = await fetch(CHAT_CONFIG.webhookUrl, { method: 'POST', body: params });
    var data     = await response.json();
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    handleAgentResponse(data);
  } catch (err) {
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    appendMessage(getFallbackResponse(message), 'bot');
  } finally {
    input.disabled = false;
    document.getElementById('chatSend').disabled = false;
    input.focus();
  }
}

// ── Central response handler ──────────────────────────────────────────────────
function handleAgentResponse(data) {
  if (!data || !data.response) {
    appendMessage("Something went wrong. Please email hello@deliytmedia.com directly.", 'bot');
    return;
  }
  if (data.response === '__DATE_PICKER__' && data.availability) {
    appendMessage("Almost there! Choose a date for your strategy call:", 'bot');
    appendDatePicker(data.availability);
  } else if (data.response === '__SLOT_PICKER__' && data.slots) {
    appendMessage('Now pick a time on ' + (data.date_label || 'your chosen date') + ' (WAT):', 'bot');
    appendSlotPicker(data.slots, data.date_label);
  } else {
    appendMessage(data.response, 'bot');
  }
}

// ── DATE PICKER ───────────────────────────────────────────────────────────────
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

// ── SLOT PICKER ───────────────────────────────────────────────────────────────
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

// ── Send picker value to backend ──────────────────────────────────────────────
async function sendPickerValue(value) {
  showTyping();
  CHAT_CONFIG.isTyping = true;
  try {
    var params = new URLSearchParams({
      conversation_id: CHAT_CONFIG.conversationId,
      message:         value,
      timestamp:       new Date().toISOString()
    });
    var response = await fetch(CHAT_CONFIG.webhookUrl, { method: 'POST', body: params });
    var data     = await response.json();
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    handleAgentResponse(data);
  } catch (err) {
    hideTyping();
    CHAT_CONFIG.isTyping = false;
    appendMessage("Something went wrong. Please try again.", 'bot');
  }
}

// ── Append message ────────────────────────────────────────────────────────────
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

// ── Format text (bold, bullets, code, linebreaks) ─────────────────────────────
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

// ── Enter key ─────────────────────────────────────────────────────────────────
function handleChatKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// ── Smooth scroll ─────────────────────────────────────────────────────────────
function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Fallback responses (backend not yet connected) ────────────────────────────
function getFallbackResponse(message) {
  var l = message.toLowerCase();
  if (['hi','hey','hello','good morning'].some(function(w) { return l.startsWith(w); }))
    return "Hey! I'm your Deliytmedia assistant. What kind of business do you run?";
  if (l.includes('price') || l.includes('cost') || l.includes('how much'))
    return "Pricing depends on what you need. WhatsApp agents from N200k, SaaS platforms from N500k. What are you building?";
  if (l.includes('book') || l.includes('call') || l.includes('schedule'))
    return "I'd love to get you on a strategy call! First, what kind of business do you run?";
  if (l.includes('whatsapp'))
    return "Our WhatsApp agents handle inquiries 24/7. What kind of business is it for?";
  return "Tell me about your business and what you're trying to solve.";
}

// ── Init on page load ─────────────────────────────────────────────────────────
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

  // Scroll animations
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

// ── Injected styles for pickers + animations ──────────────────────────────────
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
    '.slot-btn{flex-direction:row;justify-content:center;font-weight:600}';
  document.head.appendChild(s);
})();
