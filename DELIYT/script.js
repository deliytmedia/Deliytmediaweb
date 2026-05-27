// ============================================================================
// DELIYTMEDIA FRONTEND CHAT — Connects to Apps Script Agent Backend
// ============================================================================

const CHAT_CONFIG = {
  webhookUrl:     'https://script.google.com/macros/s/AKfycbzDLDQjGZhKK5p2dj6i6r3GsqnjxMqtnjO6X8PzSoJEJ4ROBJUIdpzT4oWpbapZzHW9/exec',
  conversationId: null,
  isOpen:         false,
  isTyping:       false
};

// ── Generate conversation ID ──────────────────────────────────────────────────
function initSession() {
  if (!CHAT_CONFIG.conversationId) {
    CHAT_CONFIG.conversationId =
      'CONV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}

// ── Open chat — modal + blur ──────────────────────────────────────────────────
function openChat() {
  if (CHAT_CONFIG.isOpen) return;
  CHAT_CONFIG.isOpen = true;
  initSession();

  const overlay = document.getElementById('chatOverlay');
  const bubble  = document.getElementById('chatBubbleBtn');

  // Show overlay
  overlay.classList.add('active');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Switch bubble icon → X
  if (bubble) {
    bubble.classList.add('is-open');
    const iconChat  = bubble.querySelector('.bubble-icon-chat');
    const iconClose = bubble.querySelector('.bubble-icon-close');
    if (iconChat)  iconChat.style.display  = 'none';
    if (iconClose) iconClose.style.display = 'block';
  }

  // Focus input after animation
  setTimeout(() => {
    const input = document.getElementById('chatInput');
    if (input) input.focus();
  }, 350);
}

// ── Close chat ────────────────────────────────────────────────────────────────
function closeChat() {
  if (!CHAT_CONFIG.isOpen) return;
  CHAT_CONFIG.isOpen = false;

  const overlay = document.getElementById('chatOverlay');
  const bubble  = document.getElementById('chatBubbleBtn');

  overlay.classList.remove('active');
  document.body.style.overflow = '';

  // Switch bubble icon back
  if (bubble) {
    bubble.classList.remove('is-open');
    const iconChat  = bubble.querySelector('.bubble-icon-chat');
    const iconClose = bubble.querySelector('.bubble-icon-close');
    if (iconChat)  iconChat.style.display  = 'block';
    if (iconClose) iconClose.style.display = 'none';
  }
}

// ── Toggle (bubble button) ────────────────────────────────────────────────────
function toggleChat() {
  CHAT_CONFIG.isOpen ? closeChat() : openChat();
}

// ── Click on overlay backdrop closes modal ────────────────────────────────────
function handleOverlayClick(event) {
  // Only close if clicking the dark backdrop, not the modal itself
  if (event.target === document.getElementById('chatOverlay')) {
    closeChat();
  }
}

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input   = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || CHAT_CONFIG.isTyping) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('chatSend').disabled = true;

  // Show user message
  appendMessage(message, 'user');

  // Show typing indicator
  showTyping();
  CHAT_CONFIG.isTyping = true;

  try {
    // Apps Script doesn't support CORS preflight from localhost.
    // We use a URL-encoded GET-style POST to avoid the preflight check.
    // This works on both localhost and Netlify.
    const params = new URLSearchParams({
      conversation_id: CHAT_CONFIG.conversationId,
      message:         message,
      timestamp:       new Date().toISOString()
    });

    const response = await fetch(CHAT_CONFIG.webhookUrl, {
      method:  'POST',
      // No Content-Type header = no preflight = no CORS block
      body: params
    });

    const data = await response.json();

    hideTyping();
    CHAT_CONFIG.isTyping = false;

    if (data.response) {
      appendMessage(data.response, 'bot');
    } else {
      appendMessage("Something went wrong. Please email hello@deliytmedia.com directly.", 'bot');
    }

  } catch (err) {
    hideTyping();
    CHAT_CONFIG.isTyping = false;

    // Demo fallback when webhook not yet connected
    const fallback = getFallbackResponse(message);
    appendMessage(fallback, 'bot');

  } finally {
    input.disabled = false;
    document.getElementById('chatSend').disabled = false;
    input.focus();
  }
}

// ── Append message to chat ────────────────────────────────────────────────────
function appendMessage(text, sender) {
  const container = document.getElementById('chatMessages');

  const wrapper = document.createElement('div');
  wrapper.className = `message ${sender}-message`;

  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.innerHTML = formatText(text);

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

// ── Format message text (bold, line breaks, bullets) ─────────────────────────
function formatText(text) {
  // Bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Code: `text`
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');

  // Bullet lines starting with -
  const lines = text.split('\n');
  const formatted = [];
  let inList = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) { formatted.push('<ul>'); inList = true; }
      formatted.push(`<li>${trimmed.slice(2)}</li>`);
    } else {
      if (inList) { formatted.push('</ul>'); inList = false; }
      if (trimmed === '') {
        formatted.push('<br>');
      } else {
        formatted.push(`<p>${trimmed}</p>`);
      }
    }
  });

  if (inList) formatted.push('</ul>');
  return formatted.join('');
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function showTyping() {
  const container = document.getElementById('chatMessages');

  const wrapper = document.createElement('div');
  wrapper.className = 'message bot-message';
  wrapper.id = 'typingIndicator';

  wrapper.innerHTML = `
    <div class="message-content typing-bubble">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>`;

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ── Handle Enter key ──────────────────────────────────────────────────────────
function handleChatKeyPress(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── Demo fallback responses (when backend not yet connected) ──────────────────
function getFallbackResponse(message) {
  const lower = message.toLowerCase();

  if (['hi','hey','hello','good morning','good afternoon'].some(w => lower.startsWith(w))) {
    return "Hey! 👋 I'm the Deliytmedia assistant. I can help you understand our services, get pricing, or book a strategy call.\n\nWhat brings you here today?";
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    return "Great question. Pricing depends on what you need:\n\n- **WhatsApp Sales Agent:** From ₦200,000\n- **Custom SaaS Platform:** From ₦500,000\n- **Social Media Marketing:** From ₦50,000/month\n\nWhat type of solution are you looking for?";
  }
  if (lower.includes('book') || lower.includes('call') || lower.includes('schedule')) {
    return "Perfect. A strategy call is the best next step.\n\nWhat's your name?";
  }
  if (lower.includes('whatsapp')) {
    return "Our WhatsApp Sales Agents handle customer inquiries 24/7 — answering questions, sharing pricing, qualifying leads, and booking appointments while your team sleeps.\n\nWhat kind of business do you run?";
  }
  if (lower.includes('social media') || lower.includes('content') || lower.includes('marketing')) {
    return "We handle full social media management — content creation, scheduling, strategy, and analytics reporting.\n\nWhich platforms matter most for your business?";
  }
  return "That's helpful context! To give you the most accurate information, let me connect you with our team.\n\nWhat's the best email to reach you?";
}

// ── Smooth scroll ─────────────────────────────────────────────────────────────
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Init on load ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSession();

  // Smooth nav links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      scrollToSection(a.getAttribute('href').slice(1));
    });
  });

  // Close chat on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && CHAT_CONFIG.isOpen) closeChat();
  });

  // Scroll-triggered animations
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.service-card, .step-card, .faq-item, .problem-card, .check-item').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
});

// Add CSS for animations dynamically
const animStyle = document.createElement('style');
animStyle.textContent = `
  .animate-on-scroll {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .animate-on-scroll.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .typing-bubble {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 14px 18px !important;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #BFFF00;
    animation: dotBounce 1.4s infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-8px); opacity: 1; }
  }
  .message-content code {
    background: rgba(191,255,0,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }
  .message-content p { margin-bottom: 6px; }
  .message-content ul { margin: 8px 0 8px 20px; }
  .message-content li { margin-bottom: 4px; }
  .message-content strong { color: #BFFF00; }
`;
document.head.appendChild(animStyle);