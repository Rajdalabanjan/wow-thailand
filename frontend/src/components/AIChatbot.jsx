import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Mic, Volume2, VolumeX, Sparkles, AlertCircle,
  Compass, Hotel, Car, Users, Calendar, ArrowRight, CheckCircle2, ShieldCheck,
  Maximize2, Minimize2
} from 'lucide-react';
import chatbotAvatar from '../assets/aichatbot.webp';
import chatbotAnimationVideo from '../assets/chatbot-animation.mp4';
import { chatWithAI, createAiLead, updateAiLeadChat, getAIChatbotSettings } from '../services/api';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

const aiMessages = [
  "Plan Your Thailand Trip",
  "Need Help? Ask Luzia",
  "Let's Explore Thailand",
  "Welcome to Thailand! 🌴"
];

const CRAFT_SUGGESTIONS = [
  'Plan trip for 4 people',
  'I want an SUV',
  '5-star beach resort',
  'Include Scuba Diving'
];

const DEFAULT_SUGGESTIONS = [
  '🏨 Luxury Beachfront Hotels',
  '🏝️ Phi Phi & Island Tours',
  '🚖 Airport Cab Pickup (BKK / DMK / HKT)',
  '🚢 Chao Phraya Dinner Cruise',
  '🚖 Bangkok to Pattaya Private Cab',
  '🎯 Sightseeing & Day Activities'
];

export default function AIChatbot() {
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [leadId, setLeadId] = useState(null);
  const [aiLeadId, setAiLeadId] = useState(null);
  const [activeContext, setActiveContext] = useState(null);
  const [activeProposal, setActiveProposal] = useState(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [chatMode, setChatMode] = useState('normal');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [currentLang, setCurrentLang] = useState('en');

  const avatarVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatWindowRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const headerRef = useRef(null);
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastDeltaYRef = useRef(0);

  // Auto-focus helper to ensure cursor is ALWAYS in the input box
  const focusInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 60);
  }, []);

  // Clear stale session on fresh browser load so every page refresh is a clean new chatbot session
  useEffect(() => {
    try {
      sessionStorage.removeItem('tg_lead_submitted_session');
      sessionStorage.removeItem('tg_lead_id');
      sessionStorage.removeItem('tg_ai_lead_id');
      localStorage.removeItem('tg_customer_lead');
    } catch (e) { }
  }, []);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadError, setLeadError] = useState('');
  const [hasSubmittedLead, setHasSubmittedLead] = useState(false);
  const pendingQueryRef = useRef('');
  const leadNameRef = useRef('');
  const leadPhoneRef = useRef('');
  const isSubmittingRef = useRef(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState(() => {
    try {
      return localStorage.getItem('tg_luzia_voice_style') || 'soft';
    } catch (e) {
      return 'soft';
    }
  });
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const lastSpokenMsgRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const isStartingMicRef = useRef(false);
  const pendingVoiceTranscriptRef = useRef(null);
  const [availableVoices, setAvailableVoices] = useState([]);

  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  // Helper to verify if customer name and 10-digit phone have already been captured for this session
  const checkContactCollected = useCallback(() => {
    try {
      const sessionDone = sessionStorage.getItem('tg_lead_submitted_session') === 'true';
      const name = leadNameRef.current || leadName;
      const phone = leadPhoneRef.current || leadPhone;
      const cleanP = (phone || '').replace(/\D/g, '').slice(-10);
      if (sessionDone && name?.trim() && cleanP.length === 10) {
        return true;
      }
      const saved = localStorage.getItem('tg_customer_lead');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name?.trim() && (parsed.phone || '').replace(/\D/g, '').length >= 10) {
          leadNameRef.current = parsed.name.trim();
          leadPhoneRef.current = parsed.phone;
          setLeadName(parsed.name.trim());
          setLeadPhone(parsed.phone);
          return true;
        }
      }
    } catch (e) { }
    return false;
  }, [leadName, leadPhone]);

  // Open chatbot window
  const handleOpenChat = useCallback((extraOptions = {}) => {
    setIsOpen(true);
    const isCraftMode = extraOptions?.mode === 'craft_my_trip';
    if (isCraftMode) {
      setChatMode('craft_my_trip');
      setActiveContext(prev => ({ ...(prev || {}), mode: 'craft_my_trip' }));
      if (!checkContactCollected()) {
        setShowLeadForm(true);
      }
      setMessages(prev => {
        if (prev.length === 0) {
          return [{
            role: 'assistant',
            content: "Olá! I’m **Luzia** 🌴 Let's craft your dream Thailand trip together!\n\nAre you looking for accommodation, a self-drive vehicle, experiences, or a complete Thailand holiday?"
          }];
        }
        return prev;
      });
    }
  }, [checkContactCollected]);

  // Handle drag gesture on the chatbot header (drag up -> fullscreen, drag down -> restore/close)
  const handleHeaderPointerDown = useCallback((e) => {
    // Don't drag if clicking buttons, inputs, links, or audio controls
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.btn')) {
      return;
    }

    // Only respond to primary button (left mouse click) or touch
    if (e.button !== undefined && e.button !== 0) return;

    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    lastDeltaYRef.current = 0;
    setIsDragging(true);
    setDragDeltaY(0);

    const onPointerMove = (ev) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientY - dragStartYRef.current;
      lastDeltaYRef.current = delta;

      if (!isFullScreen) {
        // Normal mode: dragging UP is negative delta
        // Allow visual travel up to -260px and down to 180px
        setDragDeltaY(Math.max(-260, Math.min(180, delta)));
      } else {
        // Fullscreen mode: dragging DOWN is positive delta
        setDragDeltaY(Math.max(-40, Math.min(260, delta)));
      }
    };

    const onPointerUp = (ev) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const finalDelta = lastDeltaYRef.current;
      setDragDeltaY(0);

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!isFullScreen) {
        // Dragged UP by >= 35px -> Expand to Full Screen!
        if (finalDelta < -35) {
          setIsFullScreen(true);
        } else if (finalDelta > 90) {
          // Dragged DOWN by >= 90px -> Close/Minimize
          setIsOpen(false);
          setIsFullScreen(false);
        }
      } else {
        // Fullscreen mode: Dragged DOWN by >= 40px -> Restore to normal floating window!
        if (finalDelta > 40) {
          setIsFullScreen(false);
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [isFullScreen]);

  // Background scroll lock when in full-screen mode
  useEffect(() => {
    if (isOpen && isFullScreen) {
      lockScroll('luzia-fullscreen');
    } else {
      unlockScroll('luzia-fullscreen');
    }
    return () => {
      unlockScroll('luzia-fullscreen');
    };
  }, [isOpen, isFullScreen]);

  // Escape key listener to exit fullscreen or close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullScreen]);

  // Listen to open_ai_chat event (including Craft My Trip mode)
  useEffect(() => {
    const handleOpenAIChat = (e) => {
      const isCraftMode = e?.detail?.mode === 'craft_my_trip';
      handleOpenChat(isCraftMode ? { mode: 'craft_my_trip' } : {});
    };
    window.addEventListener('open_ai_chat', handleOpenAIChat);
    return () => window.removeEventListener('open_ai_chat', handleOpenAIChat);
  }, [handleOpenChat]);

  // Global navigation helper & listener for Luzia chatbot buttons & links
  useEffect(() => {
    const handleSophiaNav = (e) => {
      const tab = e?.detail?.tab;
      const itemId = e?.detail?.itemId;
      const itemType = e?.detail?.itemType;
      const itemName = e?.detail?.itemName ? decodeURIComponent(e.detail.itemName) : '';
      const explicitUrl = e?.detail?.targetUrl;

      if (tab || explicitUrl) {
        // Close chatbot
        setIsOpen(false);

        const tabMap = {
          bikes: 'bikes',
          cars: 'cars',
          hotels: 'hotels',
          activities: 'activities',
          packages: 'packages',
          flights: 'flights',
          selfdrive: 'selfdrive',
          'self-drive': 'selfdrive',
          craft: 'craftmytrip',
          craftmytrip: 'craftmytrip',
          'custom-trip': 'custom-trip'
        };
        const resolvedTab = tabMap[tab] || tab || 'cars';
        const targetPath = '/' + (resolvedTab === 'craftmytrip' ? 'craft' : (resolvedTab === 'self-drive' ? 'selfdrive' : resolvedTab));
        const finalUrl = explicitUrl || (targetPath + (itemId ? `?id=${encodeURIComponent(itemId)}` : ''));

        const curPath = window.location.pathname.toLowerCase();
        const isPortal = curPath.startsWith('/superadmin') || curPath.startsWith('/super-admin') ||
                         curPath.startsWith('/admin') || curPath.startsWith('/vendor') ||
                         curPath.startsWith('/hotel-vendor') || curPath.startsWith('/flight-vendor') ||
                         curPath.startsWith('/subadmin') || curPath.startsWith('/sub-admin') ||
                         curPath.startsWith('/customer') || curPath.startsWith('/b2b') ||
                         curPath.startsWith('/driver') || curPath.startsWith('/portal');

        if (isPortal) {
          window.location.href = finalUrl;
          return;
        }

        // Fire navigation event to App.jsx to switch tab and open the requested item
        window.dispatchEvent(new CustomEvent('sophia_switch_tab', {
          detail: { tab: resolvedTab, itemId, itemType, itemName, targetUrl: finalUrl }
        }));

        try {
          window.history.pushState({}, '', finalUrl);
        } catch (_) {}
      }
    };

    window.sophiaNavigate = (tab, itemId, itemType, encodedName, targetUrl) => {
      let itemName = '';
      try { itemName = encodedName ? decodeURIComponent(encodedName) : ''; } catch (_) {}
      handleSophiaNav({ detail: { tab, itemId, itemType, itemName, targetUrl } });
    };

    window.addEventListener('sophia_nav', handleSophiaNav);
    return () => {
      window.removeEventListener('sophia_nav', handleSophiaNav);
      delete window.sophiaNavigate;
    };
  }, []);

  // Listen to sophia_send_msg event - fired when customer clicks in-chat action buttons like [Get Price for My Dates]
  useEffect(() => {
    const handleSophiaSendMsg = (e) => {
      const text = e?.detail?.text;
      if (text) {
        handleSendMessage(null, text);
      }
    };
    window.addEventListener('sophia_send_msg', handleSophiaSendMsg);
    return () => window.removeEventListener('sophia_send_msg', handleSophiaSendMsg);
  }, [messages, activeContext, isLoading]);

  // Sync AI Chatbot enabled state from database
  useEffect(() => {
    let isMounted = true;
    getAIChatbotSettings()
      .then(res => {
        if (isMounted && res && typeof res.ai_chatbot_enabled !== 'undefined') {
          setIsChatbotEnabled(Boolean(res.ai_chatbot_enabled));
        }
      })
      .catch(() => { });

    const handleToggleEvent = (e) => {
      if (e?.detail && typeof e.detail.enabled !== 'undefined') {
        setIsChatbotEnabled(Boolean(e.detail.enabled));
      }
    };
    window.addEventListener('ai_chatbot_toggled', handleToggleEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('ai_chatbot_toggled', handleToggleEvent);
    };
  }, []);

  // Load available browser voices for TTS
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) setAvailableVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Real-time canvas processing to strip black background into true transparency
  // Automatically stops and pauses when chat window is open to guarantee 0% CPU consumption
  useEffect(() => {
    const video = avatarVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (isOpen) {
      try { video.pause(); } catch (e) { }
      return;
    }

    let animId;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
    }

    // Full HD Native 1280x720 video processing resolution for crystal clear clarity
    const TARGET_WIDTH = 1280;
    const TARGET_HEIGHT = 720;

    // Adaptive loop timestamps based on current video duration
    const LOOP_START_SEC = 0.04;
    const getLoopEndSec = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0.5) {
        return Math.min(dur - 0.22, 9.75);
      }
      return 9.75;
    };

    const renderCurrentFrame = () => {
      if (video.readyState >= 2) {
        // Prevent playing into the fading/blackout frames at the end, and skip initial black frame 0
        const endSec = getLoopEndSec();
        if (video.currentTime >= endSec || video.currentTime < 0.02) {
          video.currentTime = LOOP_START_SEC;
          return; // Keep holding previous clean frame on canvas until seek completes
        }

        if (canvas.width !== TARGET_WIDTH || canvas.height !== TARGET_HEIGHT) {
          canvas.width = TARGET_WIDTH;
          canvas.height = TARGET_HEIGHT;
        }

        ctx.drawImage(video, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        const frame = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        const data = frame.data;
        const l = data.length / 4;
        const cw = TARGET_WIDTH;
        const ch = TARGET_HEIGHT;

        // Quick brightness check at center zone to guard against any temporary decoding blackout
        let sampleSum = 0;
        const samplePoints = [
          (Math.floor(ch * 0.35) * cw + Math.floor(cw * 0.50)) * 4,
          (Math.floor(ch * 0.50) * cw + Math.floor(cw * 0.50)) * 4,
          (Math.floor(ch * 0.40) * cw + Math.floor(cw * 0.45)) * 4,
          (Math.floor(ch * 0.40) * cw + Math.floor(cw * 0.55)) * 4
        ];
        for (let p of samplePoints) {
          sampleSum += data[p] + data[p + 1] + data[p + 2];
        }
        if (sampleSum < 40) {
          // If the sampled character area is virtually black, hold previous valid frame
          return;
        }

        const invCw = 1 / cw;
        const invCh = 1 / ch;
        let px = 0;
        let py = 0;

        for (let i = 0; i < l; i++) {
          const idx = i << 2;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const normX = px * invCw;
          const normY = py * invCh;

          px++;
          if (px === cw) {
            px = 0;
            py++;
          }

          // 1. Extreme edge borders and bottom-right corner watermark
          if (normX < 0.02 || normX > 0.98 || normY < 0.02 || (normX > 0.84 && normY > 0.74)) {
            data[idx + 3] = 0;
            continue;
          }

          const maxChannel = r > g ? (r > b ? r : b) : (g > b ? g : b);

          // 2. Ambient outer space (top sky and far sides) - zero tolerance for background haze
          if ((normY < 0.05 || normX < 0.16 || normX > 0.90) && maxChannel <= 50) {
            data[idx + 3] = 0;
            continue;
          }

          // Distance squared to background center (R=11, G=18, B=26)
          const dr = r - 11;
          const dg = g - 18;
          const db = b - 26;
          const distSq = dr * dr + dg * dg + db * db;

          // 3. Dynamic sway-aware face protection (covers eyes, dark pupils, nose, mouth)
          const dxFace = (normX - 0.47) / 0.14;
          const dyFace = (normY - 0.35) / 0.16;
          if (dxFace * dxFace + dyFace * dyFace <= 1.0 && (r >= b - 2 || maxChannel > 38) && distSq > 110) {
            data[idx + 3] = 255;
            continue;
          }

          // 4. Head & Hair zone: protect warm brown hair across crown, bangs, and side curls
          const dxHead = (normX - 0.47) / 0.19;
          const dyHead = (normY - 0.27) / 0.23;
          if (dxHead * dxHead + dyHead * dyHead <= 1.0) {
            if ((r >= b - 2 && (r > 20 || maxChannel > 34)) && distSq > 110) {
              data[idx + 3] = 255;
              continue;
            }
          }

          // 5. Pure background removal:
          // Key out cold navy background, compression noise, and dark artifacts anywhere in the frame
          if (
            distSq <= 110 ||
            (maxChannel <= 38 && b >= r + 2 && r <= 22) ||
            (maxChannel <= 32 && b >= r)
          ) {
            data[idx + 3] = 0;
            continue;
          }

          // 6. Character body, clothes, collar, waving hand, and floating hearts
          data[idx + 3] = 255;
        }
        ctx.putImageData(frame, 0, 0);
      }
    };

    const drawFrame = () => {
      renderCurrentFrame();
      animId = requestAnimationFrame(drawFrame);
    };

    const handleImmediateRedraw = () => {
      renderCurrentFrame();
    };

    const handleLoopCheck = () => {
      const endSec = getLoopEndSec();
      if (video.currentTime >= endSec || video.currentTime < 0.02) {
        video.currentTime = LOOP_START_SEC;
      }
    };

    const handleEnded = () => {
      video.currentTime = LOOP_START_SEC;
      video.play().catch(() => { });
    };

    video.addEventListener('play', handleImmediateRedraw);
    video.addEventListener('seeking', handleImmediateRedraw);
    video.addEventListener('seeked', handleImmediateRedraw);
    video.addEventListener('timeupdate', handleLoopCheck);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadeddata', handleImmediateRedraw);

    video.play().catch(() => { });
    animId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('play', handleImmediateRedraw);
      video.removeEventListener('seeking', handleImmediateRedraw);
      video.removeEventListener('seeked', handleImmediateRedraw);
      video.removeEventListener('timeupdate', handleLoopCheck);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadeddata', handleImmediateRedraw);
    };
  }, [isOpen]);

  // Cycling speech pill text every 4 seconds
  useEffect(() => {
    if (isOpen) return;
    const intervalId = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % aiMessages.length);
        setFade(true);
      }, 500);
    }, 4000);
    return () => clearInterval(intervalId);
  }, [isOpen]);

  // Auto-scroll to bottom smoothly whenever messages or proposal updates
  useEffect(() => {
    const scrollBottom = () => {
      const el = chatBodyRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    };
    scrollBottom();
    const t1 = setTimeout(scrollBottom, 80);
    const t2 = setTimeout(scrollBottom, 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, activeProposal]);

  // Initial welcome message if chat opened fresh
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Sawasdee! I’m Luzia, your WOW THAILAND assistant. How can I help you? We provide verified Luxury Hotels, Sightseeing & Island Tours, and Private Airport Cabs & Transfers in Thailand!"
      }]);
    }
  }, [isOpen]);

  // Auto-focus input whenever chat window opens and lead form is not showing
  useEffect(() => {
    if (isOpen && !showLeadForm) {
      focusInput();
    }
  }, [isOpen, showLeadForm, focusInput]);

  // Keep cursor focused automatically when response finishes loading
  useEffect(() => {
    if (!isLoading && isOpen && !showLeadForm) {
      focusInput();
    }
  }, [isLoading, isOpen, showLeadForm, focusInput]);

  // ─── SCROLL ISOLATION FOR CHATBOT ─────────────────────────────────────────
  // Uses CSS overscroll-behavior: contain for native compositor-thread scrolling.
  // Wheel events over non-scrollable headers/footers forward cleanly to message body.
  useEffect(() => {
    const windowEl = chatWindowRef.current;
    if (!windowEl || !isOpen) return;

    const handleWheel = (e) => {
      const bodyEl = chatBodyRef.current;
      if (!bodyEl) return;
      // If wheel is already over scrollable body, allow native composited scrolling
      if (bodyEl.contains(e.target)) return;

      // Wheel over header, footer, or borders: forward scroll delta to chat body
      e.preventDefault();
      bodyEl.scrollTop += e.deltaY;
    };

    const handleKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';
      const bodyEl = chatBodyRef.current;
      if (!bodyEl) return;

      if (['PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'PageUp') bodyEl.scrollTop -= bodyEl.clientHeight * 0.8;
        if (e.key === 'PageDown') bodyEl.scrollTop += bodyEl.clientHeight * 0.8;
        if (e.key === 'Home') bodyEl.scrollTop = 0;
        if (e.key === 'End') bodyEl.scrollTop = bodyEl.scrollHeight;
        return;
      }

      if (!isInput && ['ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') bodyEl.scrollTop -= 40;
        if (e.key === 'ArrowDown') bodyEl.scrollTop += 40;
        if (e.key === ' ') bodyEl.scrollTop += 120;
      }
    };

    windowEl.addEventListener('wheel', handleWheel, { passive: false });
    windowEl.addEventListener('keydown', handleKeyDown);

    return () => {
      windowEl.removeEventListener('wheel', handleWheel);
      windowEl.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Tiered Natural Female Voice Selection (Prioritizes Soft, Natural & Modern Voices)
  const getBestFemaleEnglishVoice = (voices, style = voiceStyle) => {
    if (!voices || voices.length === 0) return null;
    const isEnglish = (v) => (v.lang || '').toLowerCase().startsWith('en');
    const enVoices = voices.filter(isEnglish);

    if (style === 'indian') {
      const neerja = enVoices.find(v => (v.name || '').toLowerCase().includes('neerja'));
      if (neerja) return neerja;
      const heera = enVoices.find(v => (v.name || '').toLowerCase().includes('heera'));
      if (heera) return heera;
    }

    // Default 'soft' or any non-Indian style:
    // 1. Check for modern Natural / Online voices (Jenny, Aria, Neerja Online, Sara)
    const natural = enVoices.find(v => {
      const n = (v.name || '').toLowerCase();
      return (n.includes('natural') || n.includes('online') || n.includes('neural')) &&
             (n.includes('jenny') || n.includes('aria') || n.includes('sara') || n.includes('female'));
    });
    if (natural) return natural;

    // 2. Google / Apple high quality voices
    const googleApple = enVoices.find(v => {
      const n = (v.name || '').toLowerCase();
      return n.includes('google uk english female') || n.includes('google us english') || n.includes('samantha') || n.includes('victoria');
    });
    if (googleApple) return googleApple;

    // 3. Microsoft Zira (Clear, soft, friendly American female on Windows - much softer than Heera)
    const zira = enVoices.find(v => (v.name || '').toLowerCase().includes('zira'));
    if (zira) return zira;

    // 4. Any other non-male female voice (Libby, Jenny, Ava, etc.)
    const otherFemale = enVoices.find(v => {
      const n = (v.name || '').toLowerCase();
      if (/\b(male|david|mark|george|ravi|guy)\b/i.test(n)) return false;
      return /\b(female|zira|jenny|aria|libby|samantha|victoria|karen|serena|fiona|ava)\b/i.test(n);
    });
    if (otherFemale) return otherFemale;

    // 5. Fallback
    return enVoices.find(v => !/\b(male|david|mark|george|ravi|guy)\b/i.test(v.name || '')) || enVoices[0] || voices[0];
  };

  const cleanTextForSpeech = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/฿\s*([\d,]+)/g, '$1 rupees')
      .replace(/\/day/gi, ' per day')
      .replace(/\/night/gi, ' per night')
      .replace(/\/person/gi, ' per person')
      .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/👉|→|•|★|⭐/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[*_~`#]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const LANG_LOCALE_MAP = {
    en: 'en-US',
    hi: 'hi-IN',
    mr: 'mr-IN',
    kn: 'kn-IN',
    kok: 'kok-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    ml: 'ml-IN',
    bn: 'bn-IN',
    ru: 'ru-RU',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES'
  };

  const speakText = (rawText, overrideStyle = null) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    const clean = cleanTextForSpeech(rawText);
    if (!clean) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      activeUtteranceRef.current = utterance;
      utterance.lang = LANG_LOCALE_MAP[currentLang] || 'en-US';
      utterance.rate = 0.92; // Slightly more relaxed, conversational tempo
      utterance.pitch = 0.96; // Warmer, softer tone (removes harsh squeakiness)

      const voicesToUse = availableVoices.length > 0 ? availableVoices : (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
      let matchedVoice = null;
      if (currentLang !== 'en') {
        const langPrefix = currentLang.toLowerCase();
        matchedVoice = voicesToUse.find(v => {
          const vLang = (v.lang || '').toLowerCase().replace('_', '-');
          return vLang.startsWith(langPrefix) || (LANG_LOCALE_MAP[currentLang] && vLang.startsWith(LANG_LOCALE_MAP[currentLang].toLowerCase()));
        });
      }
      if (!matchedVoice) {
        matchedVoice = getBestFemaleEnglishVoice(voicesToUse, overrideStyle || voiceStyle);
      }
      if (matchedVoice) utterance.voice = matchedVoice;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  // Speak latest assistant reply without duplicate re-speech
  useEffect(() => {
    if (!isOpen || isMuted || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      if (lastSpokenMsgRef.current === lastMsg) return;
      lastSpokenMsgRef.current = lastMsg;
      speakText(lastMsg.content);
    }
  }, [messages, isOpen, isMuted, currentLang]);

  // Cancel speech on close
  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopListening();
    }
  }, [isOpen]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  // Voice Input (Speech-to-Text)
  const startListening = () => {
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser. Please type your message.");
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    if (isStartingMicRef.current) return;

    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setVoiceError(null);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
      recognitionRef.current = null;
    }

    try {
      isStartingMicRef.current = true;
      const recognition = new SpeechRecognition();
      recognition.lang = LANG_LOCALE_MAP[currentLang] || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isStartingMicRef.current = false;
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        isStartingMicRef.current = false;
        setIsListening(false);
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          handleSendMessage(null, transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        isStartingMicRef.current = false;
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError("Microphone access denied. Please check browser permissions.");
        } else if (event.error !== 'no-speech') {
          setVoiceError("Could not capture speech. Please try speaking again.");
        }
        setTimeout(() => setVoiceError(null), 4000);
      };

      recognition.onend = () => {
        isStartingMicRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isStartingMicRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isStartingMicRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Note: External IAMKRATU synchronization is executed securely and authoritatively on the backend
  // within createAiLead and chatWithAI (backend/LuziaLeadService.php). No credentials are exposed to the client.

  // Lead Submission
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setLeadError('');
    const cleanName = (leadName || '').trim();
    let cleanPhone = (leadPhone || '').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    if (!cleanName) {
      setLeadError('Please enter your name.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setLeadError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const preTyped = pendingQueryRef.current || (input ? input.trim() : '');
    leadNameRef.current = cleanName;
    leadPhoneRef.current = cleanPhone;
    setLeadName(cleanName);
    setLeadPhone(cleanPhone);
    setShowLeadForm(false);
    setHasSubmittedLead(true);
    try {
      localStorage.setItem('tg_customer_lead', JSON.stringify({ name: cleanName, phone: cleanPhone }));
      sessionStorage.setItem('tg_lead_submitted_session', 'true');
    } catch (e) { }

    let activeLId = null;
    let activeAiId = null;

    try {
      const res = await createAiLead(cleanName, cleanPhone, preTyped || 'Chat initiated via IAMKRATU AI');
      if (res && res.success) {
        activeLId = res.lead_id || res.id;
        activeAiId = res.id;
        if (activeLId) {
          setLeadId(activeLId);
          try { sessionStorage.setItem('tg_lead_id', activeLId); } catch (e) { }
        }
        if (activeAiId) {
          setAiLeadId(activeAiId);
          try { sessionStorage.setItem('tg_ai_lead_id', activeAiId); } catch (e) { }
        }
        window.dispatchEvent(new CustomEvent('realtime-lead-created', { detail: { lead_id: activeLId, ai_lead_id: activeAiId, name: cleanName, phone: cleanPhone } }));
        window.dispatchEvent(new CustomEvent('wowthailand-notification-sync', { detail: { type: 'lead', lead_id: activeLId } }));
      }
    } catch (err) {
      console.error('Lead submit failed:', err);
    }

    pendingQueryRef.current = '';
    setInput('');
    focusInput();
    if (preTyped) {
      handleSendMessage(null, preTyped, activeLId, activeAiId);
    } else {
      setMessages([{
        role: 'assistant',
        content: `Sawasdee ${cleanName}! I’m **Luzia**, your WOW THAILAND assistant. How can I assist you with Luxury Hotels, Sightseeing Tours, or Airport Cabs & Transfers today?`
      }]);
    }
  };

  // Message Handler
  const handleSendMessage = async (e, directText = null, overrideLeadId = null, overrideAiLeadId = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSend = typeof directText === 'string' ? directText : input;
    if (!textToSend.trim() || isLoading || isSubmittingRef.current) return;

    isSubmittingRef.current = true;

    const effLeadId = overrideLeadId || leadId;
    const effAiLeadId = overrideAiLeadId || aiLeadId;

    stopListening();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // Check if user clicked "Craft My Trip with AI 🤖" suggestion
    if (textToSend.includes('Craft My Trip with AI') || textToSend.toLowerCase().includes('craft my trip')) {
      setActiveContext(prev => ({ ...(prev || {}), mode: 'craft_my_trip' }));
    }

    // Direct booking / confirmation click from suggestion chip: "Book [Name] →" or "Confirm & Book →"
    if ((textToSend.startsWith('Book ') || textToSend.startsWith('Confirm & Book') || textToSend.startsWith('View ')) && textToSend.endsWith('→')) {
      const activeItId = activeContext?.booking_preview?.item_id || activeContext?.active_item_id;
      const activeItType = activeContext?.booking_preview?.item_type || activeContext?.active_item_type;
      const activeItName = activeContext?.booking_preview?.item_name || activeContext?.active_item_name;
      if (activeItId || activeItName) {
        const tab = activeItType === 'car' ? 'cars' : (activeItType === 'hotel' ? 'hotels' : (activeItType === 'activity' ? 'activities' : (activeItType === 'package' ? 'packages' : 'bikes')));
        const targetUrl = `/${tab}?id=${encodeURIComponent(activeItId || '')}`;
        if (typeof window !== 'undefined' && window.sophiaNavigate) {
          window.sophiaNavigate(tab, String(activeItId || ''), activeItType, activeItName, targetUrl);
        } else {
          setIsOpen(false);
          window.location.href = targetUrl;
        }
        return;
      }
    }

    // Detect service category switch (e.g. user was on hotel and now mentions vehicles/cars/bikes)
    const textLower = textToSend.toLowerCase();
    const curType = activeContext?.booking_preview?.item_type || activeContext?.active_item_type;
    const isSwitchingToVehicle = /\b(vehicles?|cars?|thars?|suvs?|bikes?|scooters?|activa|two\s*wheelers?)\b/i.test(textLower) && curType === 'hotel';
    const isSwitchingToHotel = /\b(hotels?|resorts?|stays?|rooms?|villas?)\b/i.test(textLower) && (curType === 'car' || curType === 'bike' || curType === 'vehicle');
    const isSwitchingToActivity = /\b(activities|sightseeing|scuba|watersports?|cruises?)\b/i.test(textLower) && curType && curType !== 'activity' && curType !== 'sightseeing';
    const isResettingCategory = /\b(other|another|different|change|switch)\s+(cars?|bikes?|hotels?|resorts?|vehicles?|stays?)\b/i.test(textLower);

    let effectiveContext = activeContext;
    if (isSwitchingToVehicle || isSwitchingToHotel || isSwitchingToActivity || isResettingCategory) {
      effectiveContext = {
        ...(activeContext || {}),
        active_item_id: null,
        active_item_name: null,
        booking_preview: null,
        active_item_type: null
      };
      setActiveContext(effectiveContext);
    }

    const userMsg = { role: 'user', content: textToSend.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let currentLeadId = effLeadId;
    let currentAiLeadId = effAiLeadId;
    const cleanP = (leadPhone || '').replace(/\D/g, '').slice(-10);

    // Auto-create lead in CRM if contact info exists but leadId is not yet assigned
    if (!currentLeadId && cleanP.length === 10) {
      try {
        const autoLeadRes = await createAiLead(leadName || 'Customer', cleanP, textToSend.trim());
        if (autoLeadRes && autoLeadRes.success) {
          currentLeadId = autoLeadRes.lead_id || autoLeadRes.id;
          currentAiLeadId = autoLeadRes.id;
          if (currentLeadId) {
            setLeadId(currentLeadId);
            try { sessionStorage.setItem('tg_lead_id', currentLeadId); } catch (e) { }
          }
          if (currentAiLeadId) {
            setAiLeadId(currentAiLeadId);
            try { sessionStorage.setItem('tg_ai_lead_id', currentAiLeadId); } catch (e) { }
          }
          window.dispatchEvent(new CustomEvent('realtime-lead-created', { detail: { lead_id: currentLeadId, ai_lead_id: currentAiLeadId } }));
          window.dispatchEvent(new CustomEvent('wowthailand-notification-sync', { detail: { type: 'lead', lead_id: currentLeadId } }));
        }
      } catch (e) { }
    }

    if (currentLeadId) {
      updateAiLeadChat(currentLeadId, newMessages, currentAiLeadId).catch(() => { });
    }

    try {
      const aiRes = await chatWithAI(newMessages, { ...(effectiveContext || {}), language: currentLang }, {
        language: currentLang,
        lead_id: currentLeadId,
        ai_lead_id: currentAiLeadId,
        customer_name: leadName || '',
        customer_phone: cleanP || ''
      });
      const replyText = typeof aiRes === 'string' ? aiRes : (aiRes?.reply || '');

      if (aiRes?.language && aiRes.language !== currentLang) {
        setCurrentLang(aiRes.language);
      }

      if (aiRes && aiRes.lead_id && !currentLeadId) {
        currentLeadId = aiRes.lead_id;
        setLeadId(aiRes.lead_id);
        try { sessionStorage.setItem('tg_lead_id', aiRes.lead_id); } catch (e) { }
      }
      if (aiRes && aiRes.ai_lead_id && !currentAiLeadId) {
        currentAiLeadId = aiRes.ai_lead_id;
        setAiLeadId(aiRes.ai_lead_id);
        try { sessionStorage.setItem('tg_ai_lead_id', aiRes.ai_lead_id); } catch (e) { }
      }

      if (aiRes && aiRes.context) {
        // Always preserve the last known craft_proposal in context so backend can rebuild it on next turn
        const incomingProposal = aiRes.craft_proposal || aiRes.context?.craft_proposal || activeContext?.craft_proposal;
        setActiveContext({ ...aiRes.context, craft_proposal: incomingProposal });
      }

      // Show review card only when backend returns a real proposal (after car/hotel/activity selection)
      // When browsing options (craft_proposal is null), hide the card to keep UI clean
      if (aiRes && aiRes.craft_proposal) {
        setActiveProposal(aiRes.craft_proposal);
      } else {
        setActiveProposal(null);
      }

      const updatedMessages = [...newMessages, { role: 'assistant', content: replyText }];
      setMessages(updatedMessages);

      if (currentLeadId) {
        updateAiLeadChat(currentLeadId, updatedMessages, currentAiLeadId).catch(() => { });
      }
      window.dispatchEvent(new CustomEvent('realtime-lead-created', { detail: { lead_id: currentLeadId, ai_lead_id: currentAiLeadId } }));
      window.dispatchEvent(new CustomEvent('wowthailand-notification-sync', { detail: { type: 'lead', lead_id: currentLeadId } }));
    } catch (err) {
      const errorMessages = [...newMessages, {
        role: 'assistant',
        content: "I'm having trouble connecting to my system right now. Please try again in a moment!"
      }];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
      focusInput();
    }
  };

  // ─── DRAFT HANDOFF: REVIEW TRIP IN BUILDER ─────────────────────────────────
  const handleReviewTripInBuilder = () => {
    if (!activeProposal) return;

    // Rule 9: Manual Draft Protection
    try {
      const existingDraftStr = sessionStorage.getItem('tg_craft_draft');
      if (existingDraftStr) {
        const d = JSON.parse(existingDraftStr);
        const hasExistingPlan = Boolean(d.selectedVehicle || d.selectedHotel || (d.selectedActivities && d.selectedActivities.length > 0) || d.selectedFlight);
        if (hasExistingPlan) {
          setShowConfirmReplace(true);
          return;
        }
      }
    } catch (e) { }

    executeDraftHandoff(activeProposal);
  };

  const executeDraftHandoff = (proposal) => {
    // Write validated proposal to sessionStorage.tg_craft_draft matching exact state contract
    const craftDraft = {
      step: 5,
      selectedVehicle: proposal.vehicle || null,
      memberCount: proposal.memberCount || 1,
      selectedHotel: proposal.hotel || null,
      selectedActivities: proposal.activities || [],
      withFlight: false,
      selectedFlight: null,
      pickupDate: proposal.pickup_date,
      dropDate: proposal.drop_date
    };

    try {
      sessionStorage.setItem('tg_craft_draft', JSON.stringify(craftDraft));
    } catch (e) { }

    // Dispatch craft_draft_updated event for instant Step 5 hydration
    window.dispatchEvent(new CustomEvent('craft_draft_updated', { detail: craftDraft }));

    setIsOpen(false);
    setShowConfirmReplace(false);

    // If on portal or not on /craft route, navigate smoothly
    const curP = window.location.pathname.toLowerCase();
    if (curP.startsWith('/superadmin') || curP.startsWith('/super-admin') || curP.startsWith('/admin') || curP.startsWith('/vendor') || curP.startsWith('/portal')) {
      window.location.href = '/craft';
    } else if (!curP.startsWith('/craft')) {
      window.history.pushState(null, '', '/craft');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleKeepCurrentTrip = () => {
    setShowConfirmReplace(false);
    setIsOpen(false);
    const curP = window.location.pathname.toLowerCase();
    if (curP.startsWith('/superadmin') || curP.startsWith('/super-admin') || curP.startsWith('/admin') || curP.startsWith('/vendor') || curP.startsWith('/portal')) {
      window.location.href = '/craft';
    } else if (!curP.startsWith('/craft')) {
      window.history.pushState(null, '', '/craft');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const isCraftModeActive = activeContext?.mode === 'craft_my_trip' || Boolean(activeProposal) || Boolean(activeContext?.craft_proposal);
  let suggestions = DEFAULT_SUGGESTIONS;
  if (isCraftModeActive) {
    const lastMsg = messages[messages.length - 1]?.content || '';
    if (lastMsg.includes('category of car') || lastMsg.includes('available vehicles') || lastMsg.includes('Luxury Cars & Premium') || lastMsg.includes('SUVs & 4x4') || lastMsg.includes('7-Seater')) {
      // Browsing car categories - show category chips
      if (lastMsg.includes('Luxury Cars & Premium') || lastMsg.includes('DEFENDAR')) {
        suggestions = ['DEFENDAR', 'Toyota Fortuner'];
      } else if (lastMsg.includes('SUVs & 4x4') || lastMsg.includes('Toyota Fortuner VIP')) {
        suggestions = ['Toyota Fortuner VIP', 'Toyota Fortuner VIP'];
      } else if (lastMsg.includes('7-Seater') || lastMsg.includes('Ertiga')) {
        suggestions = ['Toyota Commuter VIP 9-Seater'];
      } else {
        suggestions = ['💎 Luxury Cars', '🚙 SUVs / Thar', '🚐 7-Seater Ertiga', '🚗 Swift'];
      }
    } else if (lastMsg.includes('category of stay') || lastMsg.includes('star rating') || lastMsg.includes('5-Star Luxury') || lastMsg.includes('4-Star Beachfront') || lastMsg.includes('3-Star')) {
      // Browsing hotel star categories
      if (lastMsg.includes('5-Star Luxury') || lastMsg.includes('Taj Exotica')) {
        suggestions = ['Taj Exotica Resort & Spa'];
      } else if (lastMsg.includes('4-Star Beachfront') || lastMsg.includes('Kata & Karon')) {
        suggestions = ['The Grand Kata & Karon'];
      } else if (lastMsg.includes('3-Star') || lastMsg.includes('Casa Patong')) {
        suggestions = ['Casa Patong Boutique Resort'];
      } else {
        suggestions = ['5-Star Luxury', '4-Star Beachfront', '3-Star Budget'];
      }
    } else if (lastMsg.includes('experiences would you like') || lastMsg.includes('options by category') || lastMsg.includes('Water Sports') || lastMsg.includes('Heritage Tours')) {
      // Browsing activities
      suggestions = ['🤿 Scuba Diving', '🪂 Parasailing', '🏛️ Heritage Tour', '🏖️ Bangkok & Pattaya Tour'];
    } else if (activeProposal) {
      // Proposal card is showing - offer modification options
      suggestions = ['Change the car', 'Change hotel', 'Change activities', 'Review My Trip'];
    } else if (activeContext?.craft_proposal) {
      // No card showing but we have a proposal in context (browsing mode) - keep modification chips
      suggestions = ['Change the car', 'Change hotel', 'Change activities'];
    } else {
      suggestions = CRAFT_SUGGESTIONS;
    }
  } else {
    // Normal mode: dynamic chips for active item
    if (activeContext?.booking_preview) {
      const itName = activeContext.booking_preview.item_name || activeContext.active_item_name || 'Now';
      suggestions = [`Book ${itName} →`, 'Change dates', 'Explore Hotels', 'Rent a Car', 'Rent a Bike'];
    } else if (activeContext?.active_item_name) {
      suggestions = [`Book ${activeContext.active_item_name} →`, 'Tomorrow for 3 days', 'This Weekend', 'Oct 25 to Oct 28'];
    } else if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]?.content || '';
      const lastMsgLower = lastMsg.toLowerCase();
      if (lastMsgLower.includes('combo package') || lastMsgLower.includes('fits your') || (lastMsgLower.includes('verified self-drive') && lastMsgLower.includes('verified hotels'))) {
        suggestions = ['Book Swift Package →', 'Explore Casa Patong', 'Upgrade to Thar 4x4', 'Add Scuba Diving'];
      } else if (lastMsgLower.includes('dates noted:') || lastMsgLower.includes('travel dates note') || lastMsgLower.includes('how many people')) {
        suggestions = ['2 Guests', 'Solo (1 Person)', 'Family of 4', 'Group of 6'];
      } else if ((lastMsgLower.includes('what are your travel dates') || lastMsgLower.includes('when are you planning')) && !activeContext?.travel_dates) {
        suggestions = ['Tomorrow for 3 days', 'This Weekend', 'Oct 25 to Oct 28'];
      } else if (lastMsgLower.includes('vehicle') || lastMsgLower.includes('car or a bike')) {
        suggestions = ['Browse Cars', 'Browse Bikes', 'Toyota Fortuner 4x4', 'Honda PCX 160'];
      } else if (lastMsgLower.includes('hotel') || lastMsgLower.includes('resort') || lastMsgLower.includes('stay') || lastMsgLower.includes('room')) {
        suggestions = ['Casa Patong Boutique Resort', 'The Grand Kata & Karon', 'Taj Exotica Resort', 'Explore Hotels'];
      } else if (lastMsgLower.includes('bike') || lastMsgLower.includes('scooter')) {
        suggestions = ['Honda PCX 160 Hunter 350', 'Honda PCX 160', 'Honda PCX 160 eSP+', 'Browse Bikes'];
      } else if (lastMsgLower.includes('car') || lastMsgLower.includes('thar') || lastMsgLower.includes('suv')) {
        suggestions = ['Toyota Fortuner 4x4', 'Toyota Commuter VIP 9-Seater', 'Toyota Fortuner VIP', 'Browse Cars'];
      } else if (lastMsgLower.includes('scuba') || lastMsgLower.includes('activity') || lastMsgLower.includes('watersport')) {
        suggestions = ['Scuba Diving Experience', 'Phi Phi Islands & Maya Bay', 'Chao Phraya Sunset Cruise', 'Explore Activities'];
      }
    }
  }

  if (!isChatbotEnabled) return null;

  return (
    <>
      {/* ─── FLOATING AI ASSISTANT ROBOT TRIGGER ──────────────────────── */}
      <video
        ref={avatarVideoRef}
        src={chatbotAnimationVideo}
        id="ai-hidden-video"
        autoPlay
        muted
        playsInline
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />

      <div
        onClick={() => handleOpenChat()}
        role="button"
        tabIndex={0}
        aria-label="Open Luzia AI Assistant"
        className={`sophia-floating-trigger ai-floating-trigger ${isOpen ? 'is-hidden' : 'is-visible'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenChat();
          }
        }}
      >
        {/* Left Speech Bubble / Pill Badge */}
        <div className="sophia-speech-pill ai-speech-pill">
          <span className="sophia-status-dot ai-status-indicator" />
          <span
            className="sophia-speech-text"
            style={{
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '15px',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.35s ease-in-out',
              whiteSpace: 'nowrap'
            }}
          >
            {aiMessages[msgIndex]}
          </span>
        </div>

        {/* Floating Robot Avatar Wrapper with Centered Round Aura & Canvas */}
        <div className="sophia-avatar-wrapper ai-avatar-wrapper">
          <canvas
            ref={canvasRef}
            id="ai-avatar-canvas"
            width="1280"
            height="720"
          />
        </div>
      </div>

      <style>{`
        /* 1. Main Floating Trigger Container */
        .sophia-floating-trigger,
        .ai-floating-trigger {
          position: fixed;
          bottom: 6px;
          right: -32px;
          z-index: 1045;
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
          background: transparent !important;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        }
        .sophia-floating-trigger.is-hidden,
        .ai-floating-trigger.is-hidden {
          transform: scale(0);
          opacity: 0;
          pointer-events: none;
        }
        .sophia-floating-trigger.is-visible,
        .ai-floating-trigger.is-visible {
          transform: scale(1);
          opacity: 1;
          pointer-events: auto;
        }
        .sophia-floating-trigger:hover,
        .ai-floating-trigger:hover {
          transform: scale(1.03);
        }
        .sophia-floating-trigger:active,
        .ai-floating-trigger:active {
          transform: scale(0.97);
        }

        /* 2. Overlapping Speech Pill Badge */
        .sophia-speech-pill,
        .ai-speech-pill {
          position: relative;
          z-index: 1;
          margin-right: -48px;
          padding: 12px 26px;
          background: #ffffff;
          border: 1.5px solid rgba(0, 168, 255, 0.28);
          box-shadow: 0 10px 25px rgba(0, 140, 255, 0.14), 0 4px 6px rgba(0, 0, 0, 0.03);
          border-radius: 9999px;
          color: #0f172a !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          transition: all 0.3s ease;
          animation: sophiaPillFloat 3.8s ease-in-out infinite;
        }
        @keyframes sophiaPillFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .sophia-speech-text {
          color: #0f172a !important;
          font-weight: 700 !important;
          font-size: 15.5px !important;
          letter-spacing: -0.2px;
        }
        .sophia-floating-trigger:hover .sophia-speech-pill,
        .ai-floating-trigger:hover .sophia-speech-pill {
          box-shadow: 0 14px 30px rgba(0, 140, 255, 0.2), 0 6px 10px rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 168, 255, 0.4);
        }

        /* 3. Glowing Status Indicator Dot */
        .sophia-status-dot,
        .ai-status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
          animation: dot-pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes dot-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* 4. Large Avatar Container */
        .sophia-avatar-wrapper,
        .ai-avatar-wrapper {
          position: relative;
          z-index: 10;
          width: 325px;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible !important;
          background: transparent !important;
          border: none !important;
          animation: sophiaAntiGravityFloat 3.8s ease-in-out infinite;
        }
        @keyframes sophiaAntiGravityFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* 5. Canvas Display Resolution & HD Clarity */
        #ai-avatar-canvas {
          -webkit-mask-image: linear-gradient(to bottom, black 84%, rgba(0, 0, 0, 0.85) 93%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 84%, rgba(0, 0, 0, 0.85) 93%, transparent 100%);
          width: 325px;
          height: auto;
          z-index: 10;
          position: relative;
          pointer-events: none;
          display: block;
          filter: drop-shadow(0 10px 24px rgba(0, 140, 255, 0.22)) contrast(1.04) brightness(1.02);
          image-rendering: -webkit-optimize-contrast;
        }

        @media (max-width: 640px) {
          .sophia-floating-trigger,
          .ai-floating-trigger {
            right: -24px !important;
            bottom: 4px !important;
          }
          .sophia-avatar-wrapper,
          .ai-avatar-wrapper,
          #ai-avatar-canvas {
            width: 255px !important;
          }
          .sophia-speech-pill,
          .ai-speech-pill {
            margin-right: -32px !important;
            padding: 9px 18px !important;
            font-size: 13.5px !important;
          }
        }

        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        @keyframes mic-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .listening-pulse {
          animation: mic-pulse 1.4s infinite;
        }

        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        /* Chatbot Solid Background & Flex Scroll Consistency */
        .ai-chatbot-window {
          background: #ffffff !important;
          background-color: #ffffff !important;
          overscroll-behavior: contain !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-y;
          isolation: isolate;
        }
        .ai-chatbot-body {
          background: #f8fafc !important;
          background-color: #f8fafc !important;
          min-height: 0 !important;
          flex: 1 1 0% !important;
          overscroll-behavior: contain !important;
          overscroll-behavior-y: contain !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        .ai-chatbot-footer {
          background: #ffffff !important;
          background-color: #ffffff !important;
          border-top: 1px solid #e2e8f0 !important;
        }
        .ai-chatbot-suggestions {
          overscroll-behavior-x: contain !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-x;
          -webkit-overflow-scrolling: touch;
        }

        /* Luzia Custom Input Styling & Subtle Focus States (Requirement 4) */
        .luzia-form-control {
          border: 1.5px solid #e2e8f0 !important;
          color: #1e293b !important;
          background-color: #ffffff !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .luzia-form-control:focus {
          border-color: #FF6B35 !important;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.18) !important;
          outline: none !important;
        }
        .luzia-input-group {
          border: 1.5px solid #e2e8f0;
          background-color: #ffffff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .luzia-input-group:focus-within {
          border-color: #FF6B35 !important;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.18) !important;
        }
        .luzia-input-group input:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .luzia-cta-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .luzia-cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 107, 53, 0.35) !important;
        }
        .luzia-cta-btn:active {
          transform: translateY(0);
        }
        .luzia-hdr-btn:hover {
          background: rgba(255, 255, 255, 0.35) !important;
        }

        /* Desktop & Tablet Chatbot Window (min-width: 601px) */
        @media (min-width: 601px) {
          .ai-chatbot-window {
            width: 395px !important;
            max-width: calc(100vw - 32px) !important;
            height: min(605px, calc(100dvh - 36px), calc(100vh - 36px)) !important;
            max-height: calc(100dvh - 36px) !important;
            right: 24px !important;
            border-radius: 22px !important;
            transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .ai-chatbot-window.is-open {
            bottom: 24px !important;
          }
          .ai-chatbot-window.is-open.is-fullscreen {
            top: 16px !important;
            bottom: 16px !important;
            right: 16px !important;
            left: 16px !important;
            width: auto !important;
            max-width: min(1040px, calc(100vw - 32px)) !important;
            margin: 0 auto !important;
            height: calc(100dvh - 32px) !important;
            max-height: calc(100dvh - 32px) !important;
            border-radius: 24px !important;
            box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 107, 53, 0.25) !important;
          }
        }

        /* Mobile Chatbot Window (max-width: 600px) */
        @media (max-width: 600px) {
          .ai-chatbot-window {
            bottom: -720px !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: min(620px, 92dvh, 92vh) !important;
            max-height: 94dvh !important;
            border-top-left-radius: 20px !important;
            border-top-right-radius: 20px !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .ai-chatbot-window.is-open {
            bottom: 0 !important;
          }
          .ai-chatbot-window.is-open.is-fullscreen {
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
          }
        }

        .ai-chatbot-window.is-dragging {
          transition: none !important;
        }

        .luzia-drag-pill {
          cursor: grab;
          transition: all 0.2s ease;
        }
        .luzia-drag-pill:hover {
          background: rgba(255, 255, 255, 0.95) !important;
          transform: scaleY(1.3);
        }
      `}</style>

      {/* ─── FULLSCREEN BACKDROP OVERLAY ───────────────────────────── */}
      {isOpen && isFullScreen && (
        <div
          className="ai-chatbot-backdrop position-fixed animate-fade-in"
          onClick={() => setIsFullScreen(false)}
          style={{
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1045,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* ─── CHATBOT WINDOW ───────────────────────────────────────────── */}
      <div
        ref={chatWindowRef}
        className={`ai-chatbot-window position-fixed shadow-2xl rounded-4 overflow-hidden bg-white d-flex flex-column ${isOpen ? 'is-open' : 'is-closed'} ${isFullScreen ? 'is-fullscreen' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{
          bottom: isOpen ? (isFullScreen ? '16px' : '24px') : '-660px',
          right: '24px',
          width: '395px',
          height: 'min(605px, calc(100dvh - 36px), calc(100vh - 36px))',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 36px)',
          zIndex: 1050,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          boxShadow: isFullScreen 
            ? '0 30px 80px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 107, 53, 0.25)' 
            : '0 20px 40px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.08)',
          borderRadius: '22px',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          isolation: 'isolate',
          transform: isDragging ? `translateY(${dragDeltaY}px)` : 'none'
        }}
      >
        {/* Header Drag Handle & Title Bar */}
        <div
          ref={headerRef}
          onPointerDown={handleHeaderPointerDown}
          onDoubleClick={() => setIsFullScreen(prev => !prev)}
          className="d-flex flex-column"
          style={{
            background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
            color: 'white',
            borderTopLeftRadius: '22px',
            borderTopRightRadius: '22px',
            flexShrink: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          {/* Tactile Grab Pill */}
          <div
            className="w-100 d-flex flex-column align-items-center justify-content-center pt-2 pb-1"
            title={isFullScreen ? "Drag down or click to restore normal size" : "Drag up or click to make full screen"}
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(prev => !prev);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="luzia-drag-pill"
              style={{
                width: isDragging ? '54px' : '40px',
                height: '4px',
                borderRadius: '999px',
                background: isDragging ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                boxShadow: isDragging ? '0 0 10px rgba(255,255,255,0.9)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            {isDragging && (
              <span
                className="badge rounded-pill mt-1 text-xxs fw-bold animate-fade-in"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: '9.5px',
                  padding: '1.5px 8px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {!isFullScreen
                  ? (dragDeltaY < -35 ? "Release for Full Screen ⬆️" : "Drag Up for Full Screen ⬆️")
                  : (dragDeltaY > 35 ? "Release to Restore ⬇️" : "Drag Down to Restore ⬇️")}
              </span>
            )}
          </div>

          {/* Main Header Content */}
          <div className="d-flex align-items-center justify-content-between px-3 pb-2.5 pt-0.5">
            <div className="d-flex align-items-center gap-2.5" style={{ minWidth: 0 }}>
              <div className="rounded-circle bg-white d-flex align-items-center justify-content-center shadow-sm overflow-hidden flex-shrink-0" style={{ width: '38px', height: '38px' }}>
                <img src={chatbotAvatar} alt="Luzia AI" style={{ width: '92%', height: '92%', objectFit: 'contain' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-1.5 flex-wrap">
                  <h6 className="mb-0 fw-bold text-white text-truncate" style={{ fontSize: '15px', lineHeight: '1.2' }}>Luzia</h6>
                  <span className="badge bg-white text-dark rounded-pill px-2 py-0.5 shadow-xs" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2px' }}>AI Travel Expert</span>
                </div>
                <small style={{ opacity: 0.95, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }}></span>
                  <span className="text-truncate">Online | WOW THAILAND Assistant</span>
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-1.5 flex-shrink-0 ms-2">
              {/* Voice Tone Selector */}
              <div className="position-relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVoiceMenu(prev => !prev);
                  }}
                  title="Change Luzia's Voice Tone"
                  aria-label="Change Luzia's Voice Tone"
                  className="btn btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center luzia-hdr-btn"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: showVoiceMenu ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)',
                    color: 'white',
                    border: 'none',
                    backdropFilter: 'blur(4px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={15} />
                </button>

                {showVoiceMenu && (
                  <div
                    className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg p-2 animate-fade-in border text-dark"
                    style={{
                      zIndex: 1060,
                      minWidth: '210px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.18)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="fw-bold px-2 py-1 text-muted text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      Luzia Voice Tone
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceStyle('soft');
                        try { localStorage.setItem('tg_luzia_voice_style', 'soft'); } catch (e) {}
                        setShowVoiceMenu(false);
                        speakText("Hi! I'm Luzia. This is my soft and warm voice.", 'soft');
                      }}
                      className={`dropdown-item w-100 text-start px-2 py-1.5 rounded-2 d-flex align-items-center justify-content-between mb-1 ${voiceStyle === 'soft' ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                    >
                      <span>🌸 Soft &amp; Warm (Zira)</span>
                      {voiceStyle === 'soft' && <CheckCircle2 size={14} className="text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceStyle('natural');
                        try { localStorage.setItem('tg_luzia_voice_style', 'natural'); } catch (e) {}
                        setShowVoiceMenu(false);
                        speakText("Hi! I'm Luzia. This is my clear and natural voice.", 'natural');
                      }}
                      className={`dropdown-item w-100 text-start px-2 py-1.5 rounded-2 d-flex align-items-center justify-content-between mb-1 ${voiceStyle === 'natural' ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                    >
                      <span>✨ Clear &amp; Natural</span>
                      {voiceStyle === 'natural' && <CheckCircle2 size={14} className="text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceStyle('indian');
                        try { localStorage.setItem('tg_luzia_voice_style', 'indian'); } catch (e) {}
                        setShowVoiceMenu(false);
                        speakText("Namaste! I'm Luzia. This is my Indian English voice.", 'indian');
                      }}
                      className={`dropdown-item w-100 text-start px-2 py-1.5 rounded-2 d-flex align-items-center justify-content-between ${voiceStyle === 'indian' ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                    >
                      <span>🇮🇳 Indian Accent (Neerja)</span>
                      {voiceStyle === 'indian' && <CheckCircle2 size={14} className="text-primary" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Unmute Luzia's Voice" : "Mute Luzia's Voice"}
                aria-label={isMuted ? "Unmute Luzia's Voice" : "Mute Luzia's Voice"}
                className="btn btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center luzia-hdr-btn"
                style={{ width: '32px', height: '32px', background: isMuted ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)', color: 'white', border: 'none', backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullScreen(prev => !prev);
                }}
                title={isFullScreen ? "Restore Window (or drag down)" : "Expand to Full Screen (or drag up)"}
                aria-label={isFullScreen ? "Restore Window" : "Expand to Full Screen"}
                className="btn btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center luzia-hdr-btn"
                style={{ width: '32px', height: '32px', background: isFullScreen ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)', color: 'white', border: 'none', backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullScreen(false);
                }}
                aria-label="Close Chat"
                className="btn btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center luzia-hdr-btn"
                style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.25)', color: 'white', border: 'none', backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── SINGLE SOPHIA: Native chat for all modes ─── */}
        <>
          {/* Chat Body */}
          <div
            ref={chatBodyRef}
            className="ai-chatbot-body flex-grow-1 p-3 overflow-auto"
            style={{
              background: '#f8fafc',
              position: 'relative',
              overscrollBehavior: 'contain',
              overscrollBehaviorY: 'contain',
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="w-100" style={{ maxWidth: isFullScreen ? '860px' : '100%', margin: '0 auto' }}>
              {showLeadForm ? (
              <div className="d-flex flex-column gap-3 w-100 py-1">
                {/* 1. Friendly Luzia Greeting Message Bubble */}
                <div className="d-flex align-items-start gap-2.5">
                  <div className="rounded-circle bg-white d-flex align-items-center justify-content-center shadow-xs flex-shrink-0 border" style={{ width: '34px', height: '34px', overflow: 'hidden' }}>
                    <img src={chatbotAvatar} alt="Luzia AI" style={{ width: '92%', height: '92%', objectFit: 'contain' }} />
                  </div>
                  <div
                    className="p-3 bg-white text-dark border rounded-4 shadow-xs"
                    style={{
                      borderBottomLeftRadius: '4px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      maxWidth: '88%',
                      color: '#1e293b'
                    }}
                  >
                    <div className="fw-semibold mb-1">Hi there! 👋</div>
                    <div>I'm <strong>Luzia</strong>, your AI Travel Expert.</div>
                    <div>Let's plan your perfect Thailand trip! 🌴</div>
                  </div>
                </div>

                {/* 2. Lead Capture Form Card */}
                <div
                  className="bg-white p-3.5 rounded-4 shadow-sm w-100 border text-center"
                  style={{
                    borderColor: '#e2e8f0',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                    style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,159,28,0.18))' }}
                  >
                    <Sparkles size={20} style={{ color: '#FF6B35' }} />
                  </div>
                  <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>Let's Plan Your Thailand Trip! 🌴</h6>
                  <p className="text-muted mb-3" style={{ fontSize: '12px', lineHeight: '1.45' }}>
                    Enter your details to unlock instant live recommendations, dates &amp; booking access.
                  </p>

                  <form onSubmit={handleLeadSubmit}>
                    <div className="mb-2.5 text-start">
                      <label htmlFor="luzia-lead-name" className="form-label text-secondary fw-semibold mb-1" style={{ fontSize: '11.5px' }}>
                        Your Name
                      </label>
                      <input
                        id="luzia-lead-name"
                        type="text"
                        className="form-control luzia-form-control rounded-3 px-3"
                        placeholder="e.g. Rahul Sharma"
                        value={leadName}
                        onChange={e => { setLeadName(e.target.value); if (leadError) setLeadError(''); }}
                        style={{ height: '42px', fontSize: '13px' }}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="mb-3 text-start">
                      <label htmlFor="luzia-lead-phone" className="form-label text-secondary fw-semibold mb-1" style={{ fontSize: '11.5px' }}>
                        Mobile / WhatsApp Number
                      </label>
                      <div className="input-group luzia-input-group rounded-3 overflow-hidden" style={{ height: '42px' }}>
                        <span className="input-group-text bg-light text-muted border-0 fw-bold px-3" style={{ fontSize: '12.5px' }}>+91</span>
                        <input
                          id="luzia-lead-phone"
                          type="tel"
                          className="form-control border-0 shadow-none px-2.5"
                          placeholder="10-digit number"
                          maxLength={10}
                          value={leadPhone}
                          onChange={e => {
                            setLeadPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                            if (leadError) setLeadError('');
                          }}
                          style={{ fontSize: '13px', height: '100%' }}
                          required
                        />
                      </div>
                    </div>

                    {leadError && (
                      <div className="alert alert-danger py-1.5 px-2.5 mb-2.5 d-flex align-items-center gap-1.5 border-0 rounded-3 text-start" style={{ fontSize: '11.5px', background: '#fef2f2', color: '#b91c1c' }}>
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>{leadError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="btn-luzia-get-recommendations"
                      className="btn w-100 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center justify-content-center gap-2 luzia-cta-btn"
                      style={{
                        height: '44px',
                        background: 'linear-gradient(135deg, #FF6B35 0%, #FF9F1C 100%)',
                        border: 'none',
                        fontSize: '13.5px',
                        boxShadow: '0 4px 14px rgba(255, 107, 53, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Get Recommendations</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>

                  <div className="mt-2.5 text-muted d-flex align-items-center justify-content-center gap-1.5" style={{ fontSize: '11px' }}>
                    <ShieldCheck size={13} className="text-muted" />
                    <span>Privacy guaranteed. Zero spam.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`d-flex flex-column ${msg.role === 'user' ? 'align-items-end' : 'align-items-start'}`}>
                    <div
                      className={`p-3 rounded-4 shadow-xs ${msg.role === 'user' ? 'text-white' : 'bg-white text-dark border'}`}
                      style={{
                        maxWidth: '88%',
                        background: msg.role === 'user' ? '#0B192C' : 'white',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                        fontSize: '13.5px',
                        lineHeight: '1.55',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: typeof msg.content === 'string'
                          ? msg.content
                            // Bold: **text** → <strong>text</strong>
                            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                            // Inline italic: *text* → <em>text</em>
                            .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
                            // Markdown links: [text](/path?id=...&type=...) → styled clickable buttons with item metadata
                            .replace(
                              /\[([^\]]+)\]\(\/(bikes|cars|hotels|activities|packages|flights|selfdrive|self-drive|craft|custom-trip)([^\)]*)\)/g,
                              (match, text, tab, query) => {
                                let itemId = '';
                                let itemType = '';
                                if (query) {
                                  const idM = query.match(/[?&]id=([^&]+)/);
                                  if (idM) itemId = idM[1];
                                  const typeM = query.match(/[?&]type=([^&]+)/);
                                  if (typeM) itemType = typeM[1];
                                }
                                if (!itemId && activeContext?.active_item_id) itemId = String(activeContext.active_item_id);
                                if (!itemType && activeContext?.active_item_type) itemType = String(activeContext.active_item_type);
                                const itemName = activeContext?.active_item_name || '';
                                const safeEncodedName = encodeURIComponent(itemName || '').replace(/'/g, '%27');
                                const targetUrl = `/${tab}${query || (itemId ? `?id=${encodeURIComponent(itemId)}` : '')}`;
                                return `<a href="${targetUrl}" onclick="window.sophiaNavigate('${tab}','${itemId}','${itemType}','${safeEncodedName}','${targetUrl}');return false;" style="display:inline-block;margin-top:6px;padding:7px 16px;background:linear-gradient(135deg,#FF6B35,#FF9F1C);color:#fff;border-radius:20px;text-decoration:none;font-weight:700;font-size:12.5px;box-shadow:0 3px 10px rgba(255,107,53,0.3);cursor:pointer;">${text}</a>`;
                              }
                            )
                            // Action link: [Get Price for My Dates](#get-price)
                            .replace(
                              /\[([^\]]+)\]\(#get-price\)/g,
                              (match, text) => {
                                return `<a href="#" onclick="window.dispatchEvent(new CustomEvent('sophia_send_msg',{detail:{text:'Get Price for My Dates'}}));return false;" style="display:inline-block;margin-top:6px;padding:7px 16px;background:#ffffff;color:#FF6B35;border:1.5px solid #FF6B35;border-radius:20px;text-decoration:none;font-weight:700;font-size:12.5px;cursor:pointer;transition:all 0.2s;">${text}</a>`;
                              }
                            )
                            // Generic internal markdown links [Text](/some-path) -> styled redirect button
                            .replace(
                              /\[([^\]]+)\]\((\/[^)]+)\)/g,
                              (match, text, url) => {
                                const cleanUrl = url.trim();
                                return `<a href="${cleanUrl}" onclick="window.location.href='${cleanUrl}';return false;" style="display:inline-block;margin-top:6px;padding:7px 16px;background:linear-gradient(135deg,#FF6B35,#FF9F1C);color:#fff;border-radius:20px;text-decoration:none;font-weight:700;font-size:12.5px;box-shadow:0 3px 10px rgba(255,107,53,0.3);cursor:pointer;">${text}</a>`;
                              }
                            )
                            // Generic external markdown links
                            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#FF6B35;font-weight:600;text-decoration:underline;">$1</a>')
                          : msg.content
                      }}
                    />
                  </div>
                ))}

                {/* ─── SOPHIA SINGLE-ITEM BOOKING SUMMARY CARD ──────────────── */}
                {activeContext?.booking_preview && !activeProposal && (
                  <div
                    className="card border-0 shadow-sm rounded-4 overflow-hidden my-2 align-self-stretch animate-fade-in"
                    style={{ background: '#ffffff', border: '1.5px solid #fed7aa', boxShadow: '0 8px 24px rgba(255, 107, 53, 0.12)' }}
                  >
                    <div className="p-3" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)', color: 'white' }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <Sparkles size={18} />
                          <div>
                            <div className="fw-bold" style={{ fontSize: '14px' }}>Booking Summary</div>
                            <small style={{ color: '#fff7ed', fontSize: '11px' }}>
                              {activeContext.booking_preview.item_type === 'bike' ? 'Two-Wheeler Rental' : (activeContext.booking_preview.item_type === 'car' ? 'Self-Drive Car' : (activeContext.booking_preview.item_type === 'hotel' ? 'Hotel Stay' : 'Activity Experience'))}
                            </small>
                          </div>
                        </div>
                        <span className="badge bg-white text-dark fw-bold px-2 py-1 rounded-pill shadow-xs" style={{ fontSize: '11px' }}>
                          {activeContext.booking_preview.item_type === 'bike' || activeContext.booking_preview.item_type === 'car'
                            ? `${activeContext.booking_preview.days || 1} ${activeContext.booking_preview.days === 1 ? 'Rental Day' : 'Rental Days'}`
                            : (activeContext.booking_preview.duration || `${activeContext.booking_preview.days || 1} Days`)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3" style={{ fontSize: '12px', color: '#334155' }}>
                      {/* Item Name */}
                      <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                        <span className="text-muted d-flex align-items-center gap-1.5">
                          {activeContext.booking_preview.item_type === 'bike' ? '🏍️ Bike:' : (activeContext.booking_preview.item_type === 'car' ? <><Car size={13} /> Vehicle:</> : (activeContext.booking_preview.item_type === 'hotel' ? <><Hotel size={13} /> Hotel:</> : <><Compass size={13} /> Activity:</>))}
                        </span>
                        <span className="text-dark fw-bold">{activeContext.booking_preview.item_name}</span>
                      </div>

                      {/* Dates */}
                      <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                        <span className="text-muted d-flex align-items-center gap-1.5"><Calendar size={13} /> {activeContext.booking_preview.item_type === 'bike' || activeContext.booking_preview.item_type === 'car' ? 'Rental Dates:' : 'Dates:'}</span>
                        <span className="text-dark fw-semibold">{activeContext.booking_preview.travel_dates || `${activeContext.booking_preview.pickup_date} to ${activeContext.booking_preview.drop_date}`}</span>
                      </div>

                      {/* Estimated Total */}
                      <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 mb-3" style={{ background: '#fff7ed', border: '1px dashed #fdba74' }}>
                        <div>
                          <span className="fw-semibold text-dark d-block" style={{ fontSize: '12px' }}>Total Amount:</span>
                          <small className="text-muted" style={{ fontSize: '10px' }}>Transparent pricing · 18% GST included · Official voucher</small>
                        </div>
                        <span className="fw-bold" style={{ fontSize: '16px', color: '#c2410c' }}>
                          ฿{Number(activeContext.booking_preview.estimated_total || 0).toLocaleString('en-US')}
                        </span>
                      </div>

                      {/* Confirm & Book Button */}
                      <button
                        type="button"
                        id="btn-confirm-and-book"
                        onClick={() => {
                          const bp = activeContext.booking_preview;
                          const tab = bp.item_type === 'bike' ? 'bikes' : (bp.item_type === 'car' ? 'cars' : (bp.item_type === 'hotel' ? 'hotels' : 'activities'));
                          const targetUrl = `/${tab}?id=${encodeURIComponent(bp.item_id || '')}`;
                          if (typeof window !== 'undefined' && window.sophiaNavigate) {
                            window.sophiaNavigate(tab, String(bp.item_id || ''), bp.item_type, bp.item_name, targetUrl);
                          } else {
                            setIsOpen(false);
                            window.location.href = targetUrl;
                          }
                        }}
                        className="btn w-100 fw-bold text-white shadow-sm py-2.5 rounded-pill d-flex align-items-center justify-content-center gap-2 hover-scale transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
                          border: 'none',
                          fontSize: '13px',
                          boxShadow: '0 4px 14px rgba(255, 107, 53, 0.35)',
                          cursor: 'pointer'
                        }}
                      >
                        <span>Confirm & Book {activeContext.booking_preview.item_name}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── SOPHIA TRIP PROPOSAL CARD ──────────────────────────── */}
                {activeProposal && (
                  <div
                    className="card border-0 shadow-sm rounded-4 overflow-hidden my-2 align-self-stretch animate-fade-in"
                    style={{ background: '#ffffff', border: '1.5px solid #fed7aa', boxShadow: '0 8px 24px rgba(255, 107, 53, 0.12)' }}
                  >
                    <div className="p-3" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)', color: 'white' }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <Sparkles size={18} />
                          <div>
                            <div className="fw-bold" style={{ fontSize: '14px' }}>Sophia's Trip Proposal</div>
                            <small style={{ color: '#fff7ed', fontSize: '11px' }}>Custom Thailand Vacation</small>
                          </div>
                        </div>
                        <span className="badge bg-white text-dark fw-bold px-2 py-1 rounded-pill shadow-xs" style={{ fontSize: '11px' }}>
                          {activeProposal.days || 3} Days
                        </span>
                      </div>
                    </div>

                    <div className="p-3" style={{ fontSize: '12px', color: '#334155' }}>
                      {/* Dates & Travellers */}
                      <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                        <span className="text-muted d-flex align-items-center gap-1.5"><Calendar size={13} /> Dates:</span>
                        <span className="text-dark fw-semibold">{activeProposal.pickup_date} to {activeProposal.drop_date}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                        <span className="text-muted d-flex align-items-center gap-1.5"><Users size={13} /> Travellers:</span>
                        <span className="text-dark fw-semibold">{activeProposal.memberCount || 2} Adults</span>
                      </div>

                      {/* Vehicle */}
                      {activeProposal.vehicle && (
                        <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                          <span className="text-muted d-flex align-items-center gap-1.5"><Car size={13} /> Vehicle:</span>
                          <div className="text-end">
                            <span className="text-dark fw-bold d-block">{activeProposal.vehicle.name}</span>
                            <small className="text-muted">{activeProposal.vehicle.seating ? `${activeProposal.vehicle.seating} • ` : ''}฿{Number(activeProposal.vehicle.price).toLocaleString('en-US')}/day</small>
                          </div>
                        </div>
                      )}

                      {/* Hotel */}
                      {activeProposal.hotel && (
                        <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                          <span className="text-muted d-flex align-items-center gap-1.5"><Hotel size={13} /> Stay:</span>
                          <div className="text-end">
                            <span className="text-dark fw-bold d-block">{activeProposal.hotel.name}</span>
                            <small className="text-muted">{activeProposal.hotel.stars ? `${activeProposal.hotel.stars}★ • ` : ''}฿{Number(activeProposal.hotel.price).toLocaleString('en-US')}/night</small>
                          </div>
                        </div>
                      )}

                      {/* Sightseeing & Activities */}
                      {activeProposal.activities && activeProposal.activities.length > 0 && (
                        <div className="pb-2 mb-2 border-bottom">
                          <span className="text-muted d-flex align-items-center gap-1.5 mb-1"><Compass size={13} /> Experiences ({activeProposal.activities.length}):</span>
                          <div className="d-flex flex-column gap-1 ps-2">
                            {activeProposal.activities.map((a, i) => (
                              <div key={i} className="d-flex align-items-center justify-content-between" style={{ fontSize: '11px' }}>
                                <span className="text-dark text-truncate" style={{ maxWidth: '210px' }}>• {a.title || a.name}</span>
                                <span className="text-muted">฿{Number(a.price).toLocaleString('en-US')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Estimated Preview */}
                      <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 mb-3" style={{ background: '#fff7ed', border: '1px dashed #fdba74' }}>
                        <div>
                          <span className="fw-semibold text-dark d-block" style={{ fontSize: '12px' }}>Estimated Total:</span>
                          <small className="text-muted" style={{ fontSize: '10px' }}>Final pricing calculated with GST in builder</small>
                        </div>
                        <span className="fw-bold" style={{ fontSize: '16px', color: '#c2410c' }}>
                          ฿{Number(activeProposal.estimated_total || 0).toLocaleString('en-US')}
                        </span>
                      </div>

                      {/* Manual Draft Protection Confirmation Box */}
                      {showConfirmReplace ? (
                        <div className="p-2.5 rounded-3 mb-2 bg-light border">
                          <div className="d-flex align-items-center gap-1.5 text-warning mb-1">
                            <AlertCircle size={15} />
                            <strong className="text-dark" style={{ fontSize: '11.5px' }}>Trip Already in Progress</strong>
                          </div>
                          <p className="text-muted mb-2" style={{ fontSize: '11px' }}>
                            You already have a trip in progress in Craft My Trip. Do you want to replace it with Sophia's plan?
                          </p>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary flex-grow-1 rounded-pill py-1 fw-bold"
                              style={{ fontSize: '11px' }}
                              onClick={handleKeepCurrentTrip}
                            >
                              Keep Current Trip
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm text-white flex-grow-1 rounded-pill py-1 fw-bold"
                              style={{ background: '#059669', border: 'none', fontSize: '11px' }}
                              onClick={() => executeDraftHandoff(activeProposal)}
                            >
                              Replace With Sophia's
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="btn-review-trip-in-builder"
                          onClick={handleReviewTripInBuilder}
                          className="btn w-100 fw-bold text-white shadow-sm py-2.5 rounded-pill d-flex align-items-center justify-content-center gap-2 hover-scale transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            border: 'none',
                            fontSize: '13px',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                            cursor: 'pointer'
                          }}
                        >
                          <span>Review My Trip in Builder</span>
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="align-self-start p-3 bg-white rounded-4 border shadow-xs d-flex align-items-center gap-2" style={{ borderBottomLeftRadius: '4px' }}>
                    <div className="typing-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', animation: 'typing 1.4s infinite ease-in-out both' }}></div>
                    <div className="typing-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', animation: 'typing 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></div>
                    <div className="typing-dot bg-secondary rounded-circle" style={{ width: '6px', height: '6px', animation: 'typing 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          {!showLeadForm && (
            <div className="p-3 bg-white border-top flex-shrink-0">
              <div className="w-100" style={{ maxWidth: isFullScreen ? '860px' : '100%', margin: '0 auto' }}>
              {voiceError && (
                <div className="alert alert-warning py-1 px-2 mb-2 d-flex align-items-center gap-1.5 border-0 shadow-xs" style={{ fontSize: '11px', background: '#fffbeb', color: '#b45309' }}>
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}
              {/* Suggestion Chips */}
              <div
                className="ai-chatbot-suggestions d-flex gap-2 overflow-auto pb-2 mb-2 custom-scrollbar"
                style={{
                  overscrollBehaviorX: 'contain',
                  overscrollBehaviorY: 'contain',
                  touchAction: 'pan-x',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      handleSendMessage(null, s);
                      focusInput();
                    }}
                    className="btn btn-sm rounded-pill fw-bold text-nowrap"
                    style={{ fontSize: '11.5px', border: '1px solid #FF6B35', color: '#FF6B35', background: 'transparent' }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input form */}
              <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2 p-1 rounded-pill border" style={{ background: isListening ? '#fef2f2' : '#f1f5f9', borderColor: isListening ? '#ef4444' : '#e2e8f0', transition: 'all 0.25s' }}>
                <button
                  type="button"
                  onClick={startListening}
                  title={isListening ? "Listening... Click to stop" : "Speak to Luzia with your voice"}
                  className={`btn rounded-circle d-flex align-items-center justify-content-center p-0 ${isListening ? 'listening-pulse' : ''}`}
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    background: isListening ? '#ef4444' : 'transparent',
                    color: isListening ? 'white' : '#FF6B35',
                    border: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Mic size={18} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control border-0 bg-transparent shadow-none px-2"
                  placeholder={isListening ? "Listening... Speak now 🎙️" : "Ask Luzia or craft your trip..."}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  readOnly={isLoading}
                  autoFocus
                  style={{ fontSize: '13px' }}
                />
                <button
                  id="ai-submit"
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="btn rounded-circle d-flex align-items-center justify-content-center p-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
                    color: 'white',
                    border: 'none',
                    cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
              </div>
            </div>
          )}
        </>
      </div>
    </>
  );
}
