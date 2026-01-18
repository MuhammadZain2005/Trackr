// OFFLINE AI Chatbot UI - No Internet Required!
import { offlineAIAssistant } from './ai-assistant-offline.js';

let editorElement = null;
let isOpen = false;
let messages = [];
let isProcessing = false;

// Initialize the chatbot
export function initOfflineAIChatbot(editor) {
  editorElement = editor;
  setupEventListeners();
  loadChatHistory();
  console.log("[Offline AI] Chatbot initialized - 100% local, no internet needed!");
}

// Setup event listeners
function setupEventListeners() {
  const toggleBtn = document.getElementById('aiChatToggle');
  const closeBtn = document.getElementById('aiChatClose');
  const minimizeBtn = document.getElementById('aiChatMinimize');
  const sendBtn = document.getElementById('aiChatSend');
  const input = document.getElementById('aiChatInput');
  const clearBtn = document.getElementById('aiChatClear');
  const quickActions = document.querySelectorAll('.ai-quick-action');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleChat);
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (minimizeBtn) minimizeBtn.addEventListener('click', minimizeChat);
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (clearBtn) clearBtn.addEventListener('click', clearChat);

  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  quickActions.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
}

function toggleChat() {
  const chatWidget = document.getElementById('aiChatWidget');
  const toggleBtn = document.getElementById('aiChatToggle');
  
  if (chatWidget && toggleBtn) {
    isOpen = !isOpen;
    chatWidget.classList.toggle('ai-chat-open', isOpen);
    toggleBtn.classList.toggle('ai-chat-active', isOpen);
    
    if (isOpen) {
      document.getElementById('aiChatInput')?.focus();
    }
  }
}

function closeChat() {
  isOpen = false;
  const chatWidget = document.getElementById('aiChatWidget');
  const toggleBtn = document.getElementById('aiChatToggle');
  
  if (chatWidget) chatWidget.classList.remove('ai-chat-open');
  if (toggleBtn) toggleBtn.classList.remove('ai-chat-active');
}

function minimizeChat() {
  closeChat();
}

async function sendMessage() {
  const input = document.getElementById('aiChatInput');
  const userMessage = input?.value.trim();

  if (!userMessage || isProcessing) return;

  input.value = '';
  isProcessing = true;
  updateSendButton(true);

  addMessage('user', userMessage);

  // Get current resume content
  const resumeContent = editorElement?.value || '';
  offlineAIAssistant.setResumeContent(resumeContent);

  // Simulate brief "thinking" time for better UX
  const thinkingId = addMessage('assistant', '...', true);
  
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const response = await offlineAIAssistant.sendMessage(userMessage);
    removeMessage(thinkingId);

    if (response.success) {
      addMessage('assistant', response.message);
    } else {
      addMessage('error', 'Sorry, I couldn\'t process that. Try asking differently!');
    }
  } catch (error) {
    removeMessage(thinkingId);
    addMessage('error', 'Something went wrong. Please try again.');
  }

  isProcessing = false;
  updateSendButton(false);
  saveChatHistory();
}

async function handleQuickAction(action) {
  const resumeContent = editorElement?.value || '';
  
  isProcessing = true;
  updateSendButton(true);
  
  if (!isOpen) toggleChat();

  let prompt = '';

  switch (action) {
    case 'tailor':
      prompt = 'How do I tailor my resume for a job?';
      break;
    case 'cover-letter':
      prompt = 'Create a cover letter template for me';
      break;
    case 'suggestions':
      offlineAIAssistant.setResumeContent(resumeContent);
      prompt = 'Review my resume and provide improvement suggestions';
      break;
  }

  addMessage('user', prompt);
  
  const thinkingId = addMessage('assistant', '...', true);
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    const response = await offlineAIAssistant.sendMessage(prompt);
    removeMessage(thinkingId);
    
    if (response.success) {
      addMessage('assistant', response.message);
    }
  } catch (error) {
    removeMessage(thinkingId);
    addMessage('error', 'Something went wrong. Please try again.');
  }

  isProcessing = false;
  updateSendButton(false);
  saveChatHistory();
}

function addMessage(type, content, isThinking = false) {
  const messagesContainer = document.getElementById('aiChatMessages');
  if (!messagesContainer) return null;

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-chat-message ai-chat-message-${type}`;
  messageDiv.id = messageId;

  if (isThinking) {
    messageDiv.innerHTML = `
      <div class="ai-chat-message-content ai-chat-thinking">
        <span class="ai-thinking-dot"></span>
        <span class="ai-thinking-dot"></span>
        <span class="ai-thinking-dot"></span>
      </div>
    `;
  } else {
    const formattedContent = formatMessage(content);
    messageDiv.innerHTML = `<div class="ai-chat-message-content">${formattedContent}</div>`;
  }

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  if (!isThinking) {
    messages.push({ type, content, id: messageId, timestamp: Date.now() });
  }

  return messageId;
}

function removeMessage(messageId) {
  const message = document.getElementById(messageId);
  if (message) message.remove();
}

function formatMessage(content) {
  // Convert markdown-style formatting
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`{3}([\s\S]*?)`{3}/g, '<pre class="ai-code-block">$1</pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  return formatted;
}

function updateSendButton(disabled) {
  const sendBtn = document.getElementById('aiChatSend');
  if (sendBtn) {
    sendBtn.disabled = disabled;
  }
}

function clearChat() {
  const messagesContainer = document.getElementById('aiChatMessages');
  if (messagesContainer) messagesContainer.innerHTML = '';
  messages = [];
  offlineAIAssistant.reset();
  saveChatHistory();
  
  addMessage('assistant', '**Chat cleared!** 🧹\n\nHow can I help you with your resume today?\n\n*Tip: I work 100% offline - no internet needed!*');
}

function saveChatHistory() {
  try {
    localStorage.setItem('aiChatHistoryOffline', JSON.stringify(messages));
  } catch (e) {
    console.warn('Could not save chat history:', e);
  }
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem('aiChatHistoryOffline');
    if (saved) {
      messages = JSON.parse(saved);
      
      const messagesContainer = document.getElementById('aiChatMessages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
          const formattedContent = formatMessage(msg.content);
          const messageDiv = document.createElement('div');
          messageDiv.className = `ai-chat-message ai-chat-message-${msg.type}`;
          messageDiv.id = msg.id;
          messageDiv.innerHTML = `<div class="ai-chat-message-content">${formattedContent}</div>`;
          messagesContainer.appendChild(messageDiv);
        });
      }
    } else {
      addMessage('assistant', `**Welcome to the Offline Resume Assistant!** 🤖

I work 100% locally - **no internet required!**

I can help you with:
• **Resume tailoring** - Click "Tailor Resume"
• **Cover letters** - Click "Cover Letter"  
• **Suggestions** - Click "Get Suggestions"

Or just ask me anything about resumes!

*All your data stays on your device.*`);
    }
  } catch (e) {
    console.warn('Could not load chat history:', e);
  }
}

export { toggleChat, closeChat, sendMessage, clearChat };

