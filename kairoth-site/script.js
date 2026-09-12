// ============================================================
// KAIROTH — Chat Engine, Avatar Mood System, Email Notification
// ============================================================

// ---- CONFIG: fill these in from your EmailJS dashboard ----
const EMAILJS_PUBLIC_KEY = "5NONtaC_EAl8RwY_p";
const EMAILJS_SERVICE_ID = "service_27o4k5x";
const EMAILJS_TEMPLATE_ID = "template_clzasba";

// Initialize EmailJS (safe no-op if key not yet filled in)
if (window.emailjs && EMAILJS_PUBLIC_KEY !== "5NONtaC_EAl8RwY_p") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ---- DOM refs ----
const avatarDock = document.getElementById('avatarDock');
const avatarBtn = document.getElementById('avatarBtn');
const avatarFace = document.getElementById('avatarFace');
const avatarLabel = document.getElementById('avatarLabel');
const chatPanel = document.getElementById('chatPanel');
const chatScrim = document.getElementById('chatScrim');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatInputRow = document.getElementById('chatInputRow');
const chatHeaderFace = document.getElementById('chatHeaderFace');
const chatHeaderStatus = document.getElementById('chatHeaderStatus');
const chatCharacter = document.getElementById('chatCharacter');
const introSkipBar = document.getElementById('introSkipBar');
const introSkipBtn = document.getElementById('introSkipBtn');

const openTriggers = [
  document.getElementById('navOpenChat'),
  document.getElementById('heroOpenChat'),
  document.getElementById('finalOpenChat')
];

// ---- MOOD SYSTEM ----
// moods: idle, happy, listening, concerned, reassuring, thinking
function setMood(mood, statusText) {
  avatarFace.setAttribute('data-mood', mood);
  chatHeaderFace.setAttribute('data-mood', mood);
  chatCharacter.setAttribute('data-mood', mood);
  if (statusText) chatHeaderStatus.textContent = statusText;
}

// ---- OPEN / CLOSE CHAT ----
let chatStarted = false;

function openChat() {
  chatPanel.classList.add('open');
  chatScrim.classList.add('active');
  chatPanel.setAttribute('aria-hidden', 'false');
  if (!chatStarted) {
    chatStarted = true;
    startConversation();
  }
  setTimeout(() => chatInput.focus(), 400);
}

function closeChat() {
  chatPanel.classList.remove('open');
  chatScrim.classList.remove('active');
  chatPanel.setAttribute('aria-hidden', 'true');
}

openTriggers.forEach(btn => btn && btn.addEventListener('click', openChat));
avatarBtn.addEventListener('click', () => {
  if (chatPanel.classList.contains('open')) closeChat(); else openChat();
});
chatClose.addEventListener('click', closeChat);
chatScrim.addEventListener('click', closeChat);

// ---- AUTO-OPEN ON ENTRY ----
// The brief requires the superhero to appear as soon as someone enters the
// site, so we open the chat automatically shortly after load (giving the
// hero entrance animation a moment to land first).
window.addEventListener('load', () => {
  setTimeout(() => { openChat(); }, 1400);
});

// ---- MESSAGE RENDERING ----
function addMessage(text, sender = 'kairoth') {
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addSystemNote(text) {
  const div = document.createElement('div');
  div.className = 'msg system-note';
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typingIndicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// say(): Kairoth "speaks" with a typing delay proportional to message length
function say(text, mood, statusText, delay) {
  return new Promise(resolve => {
    if (mood) setMood(mood, statusText);
    showTyping();
    const wait = delay !== undefined ? delay : Math.min(1600, 500 + text.length * 12);
    setTimeout(() => {
      hideTyping();
      addMessage(text, 'kairoth');
      resolve();
    }, wait);
  });
}

function showQuickReplies(options, onPick) {
  const row = document.createElement('div');
  row.className = 'quick-replies';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      row.remove();
      addMessage(opt, 'user');
      onPick(opt);
    });
    row.appendChild(btn);
  });
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ---- INPUT HANDLING ----
let currentResolve = null; // resolves the pending "waitForUserText" promise

function waitForUserText(placeholder) {
  chatInput.disabled = false;
  chatSend.disabled = false;
  chatInput.placeholder = placeholder || 'Say something...';
  chatInput.focus();
  return new Promise(resolve => { currentResolve = resolve; });
}

function submitUserText() {
  const val = chatInput.value.trim();
  if (!val) return;

  if (postFlowMode) {
    addMessage(val, 'user');
    chatInput.value = '';
    handleFollowUpMessage(val);
    return;
  }

  if (!currentResolve) return;
  addMessage(val, 'user');
  chatInput.value = '';
  const resolve = currentResolve;
  currentResolve = null;
  chatInput.disabled = true;
  chatSend.disabled = true;
  resolve(val);
}
chatSend.addEventListener('click', submitUserText);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitUserText(); });

// ---- VALIDATION HELPERS ----
function looksLikeEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}
function looksLikeAge(str) {
  const n = parseInt(str, 10);
  return !isNaN(n) && n > 0 && n < 130;
}

// ---- CONVERSATION STATE ----
const visitor = { name: '', age: '', location: '', email: '', grievance: '' };

// ---- SELF-INTRODUCTION (skippable) ----
// Covers name & identity, origin story, purpose, powers/abilities, and mission —
// told in his own voice, in short chat-sized beats. A visitor can skip ahead
// at any point; the loop simply stops advancing once skipped.
let skipIntroFlag = false;

const introLines = [
  { text: "The veil trembles... someone is on the other side.", mood: 'thinking', status: 'a presence is forming', delay: 1200 },
  { text: "I'm Kairoth — Warden of the Five Elements, a sorcerer from a universe you've never seen.", mood: 'happy', status: 'introducing himself' },
  { text: "My world sits just behind the veil from yours — full of demons, spirits, and ghosts, and sorcerers like me. None of us are simply good or evil. Each kind holds both in it.", mood: 'happy' },
  { text: "I was raised into an ancient order sworn to hold the balance between them. Fire, water, earth, wind, space — the five elements answer to me now. And when they aren't enough, there's still the urumi at my waist.", mood: 'happy' },
  { text: "My order has kept a quiet watch on your world through places like this site for generations. That's how I came to understand your side of things too — your machines, your systems, your kind of trouble, not just mine.", mood: 'listening' },
  { text: "My mission hasn't changed in all that time: hold the line against what crosses the veil, and help whoever finds their way to it. Demon, spirit, or person — doesn't matter to me which.", mood: 'listening' }
];

function showSkipBar() {
  skipIntroFlag = false;
  introSkipBar.classList.add('active');
  introSkipBtn.disabled = false;
  introSkipBtn.textContent = 'Skip his story →';
}
function hideSkipBar() {
  introSkipBar.classList.remove('active');
}
introSkipBtn.addEventListener('click', () => {
  skipIntroFlag = true;
  introSkipBtn.disabled = true;
  introSkipBtn.textContent = 'Skipping...';
});

async function runIntro() {
  showSkipBar();
  for (const line of introLines) {
    if (skipIntroFlag) break;
    await say(line.text, line.mood, line.status, line.delay);
  }
  hideSkipBar();
}

// ---- MAIN CONVERSATION FLOW ----
async function startConversation() {
  chatInput.disabled = true;
  chatSend.disabled = true;

  await runIntro();

  await say("But enough about me. What's your name?", 'happy', 'listening');

  let name = await waitForUserText("Tell me your name...");
  visitor.name = name;

  await say(`${capitalize(name)}. Good — a name makes this easier to hold onto.`, 'happy', `talking with ${capitalize(name)}`);
  await say("How old are you, if you don't mind my asking? Age changes how a spell — or an answer — should be shaped.", 'happy');

  let age = await waitForUserText("Your age...");
  while (!looksLikeAge(age)) {
    await say("That didn't quite land as a number I recognize. Try again?", 'thinking');
    age = await waitForUserText("Your age...");
  }
  visitor.age = age;

  await say("Noted. And whereabouts are you writing from? Even roughly — city, region, country is fine.", 'happy');
  let location = await waitForUserText("Your location...");
  visitor.location = location;

  await say(`${location}. I've walked stranger places than that, believe it or not.`, 'happy');
  await say("One more thing before we get to it — an email, so word can reach you if I need to follow up. This stays between us.", 'listening');

  let email = await waitForUserText("Your email...");
  while (!looksLikeEmail(email)) {
    await say("That doesn't look like a working email to me. One more try?", 'thinking');
    email = await waitForUserText("your@email.com");
  }
  visitor.email = email;

  await say("Good. That's everything I need to hold on my end.", 'reassuring', `listening to ${capitalize(visitor.name)}`);
  await say("So... tell me. How can I help you?", 'listening', 'listening closely', 1400);

  let grievance = await waitForUserText("Tell me what's going on...");
  visitor.grievance = grievance;
  await handleGrievanceResponse(grievance);
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---- GRIEVANCE RESPONSE: tries live API first, falls back to scripted ----
async function handleGrievanceResponse(text) {
  setMood('concerned', 'weighing your words');
  showTyping();

  let replyText = null;
  try {
    replyText = await fetchKairothReply(text, visitor);
  } catch (e) {
    replyText = null; // fall back below
  }

  hideTyping();

  if (!replyText) {
    replyText = scriptedFallbackReply(text);
  }

  setMood('reassuring', 'here with you');
  addMessage(replyText, 'kairoth');

  await sleep(600);
  await say("I've sent word of this through the veil to be looked after properly. You won't have to carry it alone from here.", 'reassuring');
  await sendNotificationEmail(visitor);
  await say("Is there anything else you want to tell me before the veil settles again?", 'reassuring');

  postFlowMode = true;
  chatInput.disabled = false;
  chatSend.disabled = false;
  chatInput.placeholder = "Anything else...";
  chatInput.focus();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// After the main scripted flow ends, submitUserText() routes free-form
// messages through this handler instead of resolving a waitForUserText promise.
let postFlowMode = false;

async function handleFollowUpMessage(val) {
  chatInput.disabled = true;
  chatSend.disabled = true;
  setMood('thinking', 'considering');
  showTyping();

  let reply = null;
  try {
    reply = await fetchKairothReply(val, visitor);
  } catch (e) { reply = null; }
  hideTyping();
  if (!reply) reply = scriptedFallbackReply(val);
  setMood('reassuring', 'here with you');
  addMessage(reply, 'kairoth');
  chatInput.disabled = false;
  chatSend.disabled = false;
  chatInput.focus();
}

// ---- LIVE API CALL (Netlify Function proxy — key stays server-side) ----
async function fetchKairothReply(userText, visitorInfo) {
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userText, visitor: visitorInfo })
  });
  if (!res.ok) throw new Error('API not available');
  const data = await res.json();
  if (!data.reply) throw new Error('No reply');
  return data.reply;
}

// ---- SCRIPTED FALLBACK ENGINE ----
// Used automatically if the live API is unreachable, misconfigured, or rate
// limited — so the chat never breaks even if the function has a bad day.
// Each category has a few variants so it doesn't feel identical on repeat.
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function scriptedFallbackReply(text) {
  const lower = text.toLowerCase();

  // A visitor in real crisis takes priority over everything else.
  if (/(suicide|kill myself|end my life|self.?harm|hurt myself|don'?t want to (live|be here))/.test(lower)) {
    return "Whatever this is, it's too heavy for the veil alone to hold. Please reach out to someone who can be there with you in person right now — a crisis line, a person you trust, someone real and near. I'm not going anywhere, but you need more than me for this one.";
  }

  if (/(scared|afraid|anxious|worried|panic|nervous)/.test(lower)) {
    return pick([
      "Fear is just your mind bracing for a blow it hasn't confirmed is coming. Breathe. Whatever this is, you didn't have to face it alone — and now you're not.",
      "Even sorcerers get afraid before a working goes wrong — the difference is doing it anyway. You're already doing that, just by saying this out loud."
    ]);
  }
  if (/(sad|hurt|lonely|lost|cry|depress|down|empty)/.test(lower)) {
    return pick([
      "That sounds heavy to carry. You don't need to have it figured out right now — you just needed someone on the other side to actually hear it. I do.",
      "Some weight doesn't need fixing right away, just witnessing. I've got you on that front, for whatever it's worth from across the veil."
    ]);
  }
  if (/(angry|furious|mad|frustrated|pissed|rage)/.test(lower)) {
    return pick([
      "That kind of anger usually means something that mattered to you got stepped on. That's worth taking seriously — including by you.",
      "Anger's not the enemy here — it's just pointing at whatever actually hurt. Worth following where it's pointing."
    ]);
  }
  if (/(relationship|breakup|broke up|partner|boyfriend|girlfriend|husband|wife|marriage)/.test(lower)) {
    return "Matters of the heart don't answer to any of my five elements, unfortunately — believe me, I've tried. But I'll say this: whatever happened, it doesn't erase what was real about it.";
  }
  if (/(family|parents|mother|father|mom|dad|sibling|brother|sister)/.test(lower)) {
    return "Family troubles cross every universe I've seen — yours and mine both. There's no clean spell for it, just patience, and knowing where you stand is not nothing.";
  }
  if (/(work|job|boss|fired|career|coworker|office)/.test(lower)) {
    return "Work troubles have a way of following you home even through a veil. Whatever's happening there, it doesn't get to define the whole of you.";
  }
  if (/(school|exam|test|study|college|university|grades|homework)/.test(lower)) {
    return "Pressure like that can feel enormous up close. Zoom out far enough and even the worst exam is one page in a much longer story. Still — I get why it doesn't feel that way right now.";
  }
  if (/(money|financ|debt|broke|bills|afford)/.test(lower)) {
    return "Money troubles are their own kind of curse — the quiet, grinding kind. No element of mine conjures currency, sadly, but the situation you're in isn't the whole of who you are.";
  }
  if (/(alone|nobody|no one|isolat)/.test(lower)) {
    return "You reached across an actual veil between universes to say something — that's not nothing, and it's not nobody. I'm on the other end of it, for what that's worth.";
  }
  if (/(confiden|doubt|not good enough|failure|worthless)/.test(lower)) {
    return "I've fought things with teeth and claws that were less relentless than self-doubt. It lies more than it tells the truth — worth remembering that on the hard days.";
  }
  if (/(decision|choice|don'?t know what to do|confused|stuck)/.test(lower)) {
    return "Uncertainty is uncomfortable, but it usually means you actually care about getting it right. That's a better place to decide from than certainty ever is.";
  }
  if (/(tech|computer|bug|code|error|system|network|app|website)/.test(lower)) {
    return "Ah — a problem with shape and rules, my favorite kind. Whether it's a curse or a codebase, the method's the same: find where the pattern breaks.";
  }
  if (/(health|sick|illness|pain|hospital|doctor)/.test(lower)) {
    return "That's a weight I take seriously, even from my side of the veil. I'm not a healer in your world's sense, but please don't carry a real health concern alone — get it looked at by someone who can actually help, alongside talking to me.";
  }
  if (/(thank you|thanks|appreciate)/.test(lower)) {
    return "You don't need to thank me for listening. That part's easy. The rest — carrying it — that's the part you're doing, and doing it well enough to be here.";
  }

  return pick([
    "I hear you. That's a real thing to be sitting with, and you were right to say it out loud.",
    "Say more, if you want to. I'm not going anywhere — the veil holds as long as you need it to.",
    "That matters more than you might think, saying it plainly like that. I'm listening."
  ]);
}

// ---- EMAIL NOTIFICATION (EmailJS) ----
async function sendNotificationEmail(visitorInfo) {
  if (!window.emailjs || EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
    console.warn('EmailJS not configured yet — skipping real send.');
    addSystemNote('(email notification not yet configured)');
    return;
  }
  const now = new Date();
  const params = {
    visitor_name: visitorInfo.name,
    visitor_age: visitorInfo.age,
    visitor_location: visitorInfo.location,
    visitor_email: visitorInfo.email,
    visitor_grievance: visitorInfo.grievance,
    submitted_at: now.toLocaleString()
  };
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
  } catch (err) {
    console.error('EmailJS send failed:', err);
    addSystemNote('(there was an issue sending the notification email)');
  }
}

// ---- Idle avatar label rotation (adds life before chat opens) ----
const idleLines = [
  "Kairoth is listening",
  "the veil is thin here",
  "ask, and he'll answer"
];
let idleIdx = 0;
setInterval(() => {
  if (chatPanel.classList.contains('open')) return;
  idleIdx = (idleIdx + 1) % idleLines.length;
  avatarLabel.textContent = idleLines[idleIdx];
}, 4000);
