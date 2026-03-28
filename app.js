/* ═══════════════════════════════════════════
   PAWKIT — app.js
   All app logic: gate, sections, data, PDF
═══════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'welcome',   label: 'About the Sitter',       icon: '🐾' },
  { id: 'profile',   label: 'Pet Profile',             icon: '🐕' },
  { id: 'routine',   label: 'Daily Routine',           icon: '🕐' },
  { id: 'rules',     label: 'House Rules',             icon: '📋' },
  { id: 'emergency', label: 'Emergency Info',          icon: '🚨' },
  { id: 'special',   label: 'Special Instructions',    icon: '💊' },
  { id: 'logistics', label: 'Pickup & Dropoff',        icon: '🚗' },
];

const DEFAULT_INTRO = `Welcome! I'm so happy to be looking after [Pet Name]. This care pack has everything you need to know about how I'll be caring for your pet while you're away.

Please don't hesitate to reach out at any time — regular updates and photos are always included!`;

// ── State ────────────────────────────────────────────────────────────────────

let currentSection = 'welcome';
let currentTheme = 'fresh';
let saveTimeout = null;
let disabledSections = new Set();

const defaultData = () => ({
  welcome: {
    sitterName: '', businessName: '', intro: DEFAULT_INTRO, email: '', phone: ''
  },
  profile: {
    petName: '', species: '', breed: '', age: '', weight: '', color: '', microchip: '', notes: ''
  },
  routine: {
    morningFeedTime: '', morningFeedAmount: '',
    eveningFeedTime: '', eveningFeedAmount: '',
    feedNotes: '', walkSchedule: '', playtime: '', bedtime: ''
  },
  rules: {
    allowedRooms: '', crateAtNight: false, noFurniture: false, noUnsupervised: false, customRules: ''
  },
  emergency: {
    ownerName: '', ownerPhone: '',
    secondaryName: '', secondaryPhone: '',
    vetName: '', vetPhone: '', vetAddress: '', emergencyVet: ''
  },
  special: {
    medications: [],
    allergies: '', behavioral: '', doList: '', dontList: ''
  },
  logistics: {
    dropoffDate: '', dropoffTime: '', pickupDate: '', pickupTime: '',
    whatToBring: '', payment: '', cancellation: ''
  }
});

let projectData = defaultData();

// ── Gate ─────────────────────────────────────────────────────────────────────

function initGate() {
  const saved = localStorage.getItem('pk_code');
  if (saved && VALID_CODES.includes(saved)) {
    showApp();
    return;
  }

  const input = document.getElementById('code-input');
  const btn = document.getElementById('unlock-btn');
  const error = document.getElementById('gate-error');

  input.addEventListener('input', () => {
    let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 4)  val = val.slice(0, 4) + '-' + val.slice(4);
    if (val.length > 9)  val = val.slice(0, 9) + '-' + val.slice(9);
    if (val.length > 14) val = val.slice(0, 14);
    input.value = val;
    error.classList.add('hidden');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') tryUnlock();
  });

  btn.addEventListener('click', tryUnlock);

  function tryUnlock() {
    const code = input.value.trim().toUpperCase();
    if (VALID_CODES.includes(code)) {
      localStorage.setItem('pk_code', code);
      showApp();
    } else {
      error.classList.remove('hidden');
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
    }
  }
}

function showApp() {
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

// ── App Init ─────────────────────────────────────────────────────────────────

function initApp() {
  loadData();
  loadTheme();
  buildSidebar();
  buildSections();
  bindTopbar();
  bindGenerate();
  populateAllFields();
  updateSidebar();
  updateProgress();
  activateSection('welcome');
}

// ── Data persistence ─────────────────────────────────────────────────────────

function loadData() {
  try {
    const saved = localStorage.getItem('pk_project');
    if (saved) {
      const parsed = JSON.parse(saved);
      projectData = deepMerge(defaultData(), parsed);
    }
  } catch (e) { /* use defaults */ }
  try {
    const savedDisabled = localStorage.getItem('pk_disabled');
    if (savedDisabled) disabledSections = new Set(JSON.parse(savedDisabled));
  } catch (e) { /* ignore */ }
}

function saveData() {
  localStorage.setItem('pk_project', JSON.stringify(projectData));
  localStorage.setItem('pk_disabled', JSON.stringify([...disabledSections]));
  const status = document.getElementById('save-status');
  status.textContent = 'Saved';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => { status.textContent = 'Auto-saved'; }, 2000);
}

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (key in target && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function loadTheme() {
  const saved = localStorage.getItem('pk_theme');
  if (saved) setTheme(saved, false);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const EYE_ON  = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>`;
const EYE_OFF = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.4" opacity="0.3"/><line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

function buildSidebar() {
  const nav = document.getElementById('section-nav');
  nav.innerHTML = '';
  for (const s of SECTIONS) {
    const item = document.createElement('div');
    item.className = 'section-nav__item';
    item.dataset.section = s.id;

    const toggleHTML = s.id !== 'welcome'
      ? `<button class="section-nav__toggle" id="toggle-${s.id}" title="Include in PDF" tabindex="-1">${EYE_ON}</button>`
      : '';

    item.innerHTML = `
      <span class="section-nav__dot" id="dot-${s.id}"></span>
      <span class="section-nav__label">${s.label}</span>
      ${toggleHTML}
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.section-nav__toggle')) return;
      activateSection(s.id);
    });

    if (s.id !== 'welcome') {
      item.querySelector('.section-nav__toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSectionDisabled(s.id);
      });
    }

    nav.appendChild(item);
  }
}

function activateSection(id) {
  currentSection = id;
  document.querySelectorAll('.section-nav__item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === id);
  });
  document.querySelectorAll('.section-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.section === id);
  });
}

function toggleSectionDisabled(id) {
  if (disabledSections.has(id)) {
    disabledSections.delete(id);
  } else {
    disabledSections.add(id);
  }
  updateSidebar();
  updateProgress();
  saveData();
}

function isSectionDisabled(id) {
  return disabledSections.has(id);
}

function updateSidebar() {
  for (const s of SECTIONS) {
    const dot = document.getElementById(`dot-${s.id}`);
    const item = document.querySelector(`.section-nav__item[data-section="${s.id}"]`);
    const toggle = document.getElementById(`toggle-${s.id}`);
    const disabled = isSectionDisabled(s.id);
    const filled = isSectionFilled(s.id);

    if (dot) dot.classList.toggle('filled', filled && !disabled);
    if (item) item.classList.toggle('section-disabled', disabled);
    if (toggle) toggle.innerHTML = disabled ? EYE_OFF : EYE_ON;
    if (toggle) toggle.title = disabled ? 'Excluded from PDF — click to include' : 'Included in PDF — click to exclude';
  }
}

function isSectionFilled(id) {
  const d = projectData;
  switch (id) {
    case 'welcome':   return !!(d.welcome.sitterName);
    case 'profile':   return !!(d.profile.petName);
    case 'routine':   return !!(d.routine.morningFeedTime || d.routine.walkSchedule || d.routine.morningFeedAmount);
    case 'rules':     return !!(d.rules.allowedRooms.trim() || d.rules.customRules.trim() || d.rules.crateAtNight || d.rules.noFurniture || d.rules.noUnsupervised);
    case 'emergency': return !!(d.emergency.ownerPhone || d.emergency.vetPhone);
    case 'special':   return !!(d.special.medications.length > 0 || d.special.allergies.trim() || d.special.behavioral.trim());
    case 'logistics': return !!(d.logistics.dropoffTime || d.logistics.pickupTime || d.logistics.dropoffDate);
    default: return false;
  }
}

function updateProgress() {
  const enabledSections = SECTIONS.filter(s => !isSectionDisabled(s.id));
  const filled = enabledSections.filter(s => isSectionFilled(s.id)).length;
  const total = enabledSections.length;
  const disabledCount = disabledSections.size;

  let label = `${filled} of ${total} sections filled`;
  if (disabledCount > 0) label += ` · ${disabledCount} excluded`;
  document.getElementById('topbar-progress').textContent = label;

  const petName = projectData.profile.petName;
  document.getElementById('topbar-property-name').textContent = petName || '';
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function bindTopbar() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme, true));
  });
}

function setTheme(theme, save) {
  currentTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  if (save) localStorage.setItem('pk_theme', theme);
}

// ── Sections HTML builder ─────────────────────────────────────────────────────

function buildSections() {
  const area = document.getElementById('content-area');
  area.innerHTML = '';
  for (const s of SECTIONS) {
    const panel = document.createElement('div');
    panel.className = 'section-panel';
    panel.dataset.section = s.id;
    panel.innerHTML = buildSectionHTML(s.id);
    area.appendChild(panel);
  }
  bindSectionEvents();
}

function buildSectionHTML(id) {
  switch (id) {
    case 'welcome':   return buildWelcomeHTML();
    case 'profile':   return buildProfileHTML();
    case 'routine':   return buildRoutineHTML();
    case 'rules':     return buildRulesHTML();
    case 'emergency': return buildEmergencyHTML();
    case 'special':   return buildSpecialHTML();
    case 'logistics': return buildLogisticsHTML();
    default: return '';
  }
}

function buildWelcomeHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">About the Sitter</h2>
      <p class="section-panel__desc">Your name and intro appear on the cover and welcome letter of the care pack.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Sitter</span>
      <div class="field-row">
        <label class="field-label">Your Name <span class="field-optional">required</span></label>
        <input class="field-input" data-field="welcome.sitterName" placeholder="e.g. Sophie" maxlength="60">
      </div>
      <div class="field-row">
        <label class="field-label">Business Name <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="welcome.businessName" placeholder="e.g. Sophie's Pet Care" maxlength="80">
      </div>
      <div class="field-row">
        <label class="field-label">Email <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="welcome.email" placeholder="hello@example.com" type="email">
      </div>
      <div class="field-row">
        <label class="field-label">Phone <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="welcome.phone" placeholder="+1 555 000 0000" type="tel">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Welcome Message</span>
      <div class="field-row">
        <label class="field-label">Your intro to the owners <span class="field-optional">optional</span></label>
        <textarea class="field-textarea field-textarea--tall" data-field="welcome.intro" placeholder="${DEFAULT_INTRO.substring(0, 80)}…"></textarea>
      </div>
    </div>
  `;
}

function buildProfileHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">Pet Profile</h2>
      <p class="section-panel__desc">The pet's name appears on the cover. Fill in as much detail as you have.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Identity</span>
      <div class="field-row">
        <label class="field-label">Pet Name <span class="field-optional">required</span></label>
        <input class="field-input" data-field="profile.petName" placeholder="e.g. Biscuit" maxlength="60">
      </div>
      <div class="field-row">
        <label class="field-label">Species <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.species" placeholder="e.g. Dog, Cat, Rabbit…" maxlength="40">
      </div>
      <div class="field-row">
        <label class="field-label">Breed <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.breed" placeholder="e.g. Golden Retriever" maxlength="60">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Details</span>
      <div class="field-row">
        <label class="field-label">Age <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.age" placeholder="e.g. 3 years" maxlength="30" style="max-width:200px">
      </div>
      <div class="field-row">
        <label class="field-label">Weight <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.weight" placeholder="e.g. 12 kg" maxlength="30" style="max-width:200px">
      </div>
      <div class="field-row">
        <label class="field-label">Colour / Markings <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.color" placeholder="e.g. Golden with white chest patch" maxlength="80">
      </div>
      <div class="field-row">
        <label class="field-label">Microchip Number <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="profile.microchip" placeholder="e.g. 985112345678903" maxlength="30">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">General Notes</span>
      <div class="field-row">
        <label class="field-label">Personality / background <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="profile.notes" placeholder="e.g. Very friendly, loves people, anxious around loud noises…"></textarea>
      </div>
    </div>
  `;
}

function buildRoutineHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">Daily Routine</h2>
      <p class="section-panel__desc">Feeding times, walks, and bedtime. Leave anything blank to skip it in the PDF.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Morning Feed</span>
      <div class="field-row">
        <label class="field-label">Time <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.morningFeedTime" placeholder="e.g. 7:30 AM" style="max-width:160px">
      </div>
      <div class="field-row">
        <label class="field-label">Amount / Food <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.morningFeedAmount" placeholder="e.g. 150g dry kibble + half a pouch">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Evening Feed</span>
      <div class="field-row">
        <label class="field-label">Time <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.eveningFeedTime" placeholder="e.g. 5:30 PM" style="max-width:160px">
      </div>
      <div class="field-row">
        <label class="field-label">Amount / Food <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.eveningFeedAmount" placeholder="e.g. 150g dry kibble">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Additional Notes</span>
      <div class="field-row">
        <label class="field-label">Extra feeding notes <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="routine.feedNotes" placeholder="e.g. Always add warm water to dry food. Slow feeder bowl is on the shelf."></textarea>
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Exercise & Play</span>
      <div class="field-row">
        <label class="field-label">Walk schedule <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="routine.walkSchedule" placeholder="e.g. Morning walk 8 AM (~30 min), short toilet break at lunch, evening walk 6 PM (~45 min)"></textarea>
      </div>
      <div class="field-row">
        <label class="field-label">Playtime notes <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.playtime" placeholder="e.g. Loves fetch — tennis ball is in the red bag">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Bedtime</span>
      <div class="field-row">
        <label class="field-label">Bedtime routine <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="routine.bedtime" placeholder="e.g. Settles at 9 PM in crate in the kitchen">
      </div>
    </div>
  `;
}

function buildRulesHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">House Rules</h2>
      <p class="section-panel__desc">Where the pet is allowed and any specific household rules.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Access</span>
      <div class="field-row">
        <label class="field-label">Allowed rooms / areas <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="rules.allowedRooms" placeholder="e.g. Living room, kitchen and garden. Not allowed in bedrooms or upstairs."></textarea>
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Standard Rules</span>
      <div class="toggle-row">
        <span class="toggle-row__label">Crated at night</span>
        <label class="toggle">
          <input type="checkbox" data-field="rules.crateAtNight">
          <span class="toggle__track"></span>
        </label>
      </div>
      <div class="toggle-row">
        <span class="toggle-row__label">Not allowed on furniture</span>
        <label class="toggle">
          <input type="checkbox" data-field="rules.noFurniture">
          <span class="toggle__track"></span>
        </label>
      </div>
      <div class="toggle-row">
        <span class="toggle-row__label">No unsupervised outdoor time</span>
        <label class="toggle">
          <input type="checkbox" data-field="rules.noUnsupervised">
          <span class="toggle__track"></span>
        </label>
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Additional Rules</span>
      <div class="field-row">
        <label class="field-label">Custom rules <span class="field-optional">one per line</span></label>
        <textarea class="field-textarea field-textarea--tall" data-field="rules.customRules" placeholder="e.g. Always double-check the gate is latched&#10;Use the harness on walks, not just the collar&#10;Do not give human food"></textarea>
      </div>
    </div>
  `;
}

function buildEmergencyHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">Emergency Info</h2>
      <p class="section-panel__desc">Owner contacts and vet details — visible at a glance in the PDF.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Owner Contacts</span>
      <div class="field-row">
        <label class="field-label">Owner name</label>
        <input class="field-input" data-field="emergency.ownerName" placeholder="e.g. James & Sarah">
      </div>
      <div class="field-row">
        <label class="field-label">Owner phone <span class="field-optional">primary</span></label>
        <input class="field-input" data-field="emergency.ownerPhone" placeholder="+1 555 000 0000" type="tel">
      </div>
      <div class="field-row">
        <label class="field-label">Secondary contact name <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.secondaryName" placeholder="e.g. Grandma Pat">
      </div>
      <div class="field-row">
        <label class="field-label">Secondary contact phone <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.secondaryPhone" placeholder="+1 555 000 0001" type="tel">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Vet</span>
      <div class="field-row">
        <label class="field-label">Vet name / practice <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.vetName" placeholder="e.g. Elm Street Veterinary Clinic">
      </div>
      <div class="field-row">
        <label class="field-label">Vet phone <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.vetPhone" placeholder="+1 555 000 0002" type="tel">
      </div>
      <div class="field-row">
        <label class="field-label">Vet address <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.vetAddress" placeholder="e.g. 42 Elm Street, Springfield">
      </div>
      <div class="field-row">
        <label class="field-label">24h emergency vet <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="emergency.emergencyVet" placeholder="e.g. City Emergency Vets — +1 555 999 9999">
      </div>
    </div>
  `;
}

function buildSpecialHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">Special Instructions</h2>
      <p class="section-panel__desc">Medications, allergies, and anything important to know about this pet.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Medications</span>
      <div id="medications-list" class="dynamic-list" style="padding:8px 16px"></div>
      <button class="add-btn" id="add-medication-btn" style="margin:8px 16px 12px;width:calc(100% - 32px)">+ Add Medication</button>
    </div>
    <div class="field-group">
      <span class="field-group__label">Health Notes</span>
      <div class="field-row">
        <label class="field-label">Allergies / dietary restrictions <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="special.allergies" placeholder="e.g. Allergic to chicken — check all treat ingredients"></textarea>
      </div>
      <div class="field-row">
        <label class="field-label">Behavioural notes <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="special.behavioral" placeholder="e.g. Gets anxious during thunderstorms — keep in interior room with music on"></textarea>
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Do's & Don'ts</span>
      <div class="field-row">
        <label class="field-label">Things the pet loves <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="special.doList" placeholder="e.g. Belly rubs, squeaky toys, running in the garden, cuddles on the sofa"></textarea>
      </div>
      <div class="field-row">
        <label class="field-label">Things to avoid <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="special.dontList" placeholder="e.g. Loud sudden noises, strangers approaching from behind, the vacuum cleaner"></textarea>
      </div>
    </div>
  `;
}

function buildLogisticsHTML() {
  return `
    <div class="section-panel__header">
      <h2 class="section-panel__title">Pickup & Dropoff</h2>
      <p class="section-panel__desc">Dates, times, what to bring, and payment details.</p>
    </div>
    <div class="field-group">
      <span class="field-group__label">Dropoff</span>
      <div class="field-row">
        <label class="field-label">Date <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="logistics.dropoffDate" placeholder="e.g. Monday 14 July" style="max-width:240px">
      </div>
      <div class="field-row">
        <label class="field-label">Time <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="logistics.dropoffTime" placeholder="e.g. 9:00 AM" style="max-width:160px">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Pickup</span>
      <div class="field-row">
        <label class="field-label">Date <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="logistics.pickupDate" placeholder="e.g. Friday 18 July" style="max-width:240px">
      </div>
      <div class="field-row">
        <label class="field-label">Time <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="logistics.pickupTime" placeholder="e.g. 5:00 PM" style="max-width:160px">
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">What to Bring</span>
      <div class="field-row">
        <label class="field-label">Items to pack <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="logistics.whatToBring" placeholder="e.g. Food (enough for the stay), favourite toy, bed/blanket, lead and harness, vaccination booklet"></textarea>
      </div>
    </div>
    <div class="field-group">
      <span class="field-group__label">Payment & Policy</span>
      <div class="field-row">
        <label class="field-label">Payment method <span class="field-optional">optional</span></label>
        <input class="field-input" data-field="logistics.payment" placeholder="e.g. Bank transfer on day of dropoff">
      </div>
      <div class="field-row">
        <label class="field-label">Cancellation policy <span class="field-optional">optional</span></label>
        <textarea class="field-textarea" data-field="logistics.cancellation" placeholder="e.g. Full refund if cancelled 7+ days in advance. 50% refund within 7 days."></textarea>
      </div>
    </div>
  `;
}

// ── Bind Events ───────────────────────────────────────────────────────────────

function bindSectionEvents() {
  document.querySelectorAll('[data-field]').forEach(el => {
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.addEventListener('change', () => {
        setNestedValue(projectData, el.dataset.field, el.checked);
        onDataChange();
      });
    } else {
      el.addEventListener('input', () => {
        setNestedValue(projectData, el.dataset.field, el.value);
        onDataChange();
      });
    }
  });

  document.getElementById('add-medication-btn').addEventListener('click', () => {
    projectData.special.medications.push({ name: '', dose: '', timing: '', notes: '' });
    renderMedications();
    onDataChange();
  });
}

function onDataChange() {
  updateSidebar();
  updateProgress();
  saveData();
}

// ── Populate fields from data ─────────────────────────────────────────────────

function populateAllFields() {
  document.querySelectorAll('[data-field]').forEach(el => {
    const val = getNestedValue(projectData, el.dataset.field);
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = !!val;
    } else if (val !== undefined && val !== null) {
      el.value = val;
    }
  });

  renderMedications();
}

// ── Dynamic renders ───────────────────────────────────────────────────────────

function renderMedications() {
  const list = document.getElementById('medications-list');
  if (!list) return;
  list.innerHTML = '';
  projectData.special.medications.forEach((med, idx) => {
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
      <button class="dynamic-item__remove" title="Remove">×</button>
      <div class="dynamic-item__row">
        <div class="dynamic-item__field" style="flex:2">
          <label>Medication Name</label>
          <input class="field-input" data-key="name" value="${esc(med.name)}" placeholder="e.g. Apoquel">
        </div>
        <div class="dynamic-item__field" style="flex:1">
          <label>Dose</label>
          <input class="field-input" data-key="dose" value="${esc(med.dose)}" placeholder="e.g. 1 tablet">
        </div>
      </div>
      <div class="dynamic-item__row">
        <div class="dynamic-item__field" style="flex:2">
          <label>When to Give</label>
          <input class="field-input" data-key="timing" value="${esc(med.timing)}" placeholder="e.g. With morning meal">
        </div>
        <div class="dynamic-item__field" style="flex:2">
          <label>Notes</label>
          <input class="field-input" data-key="notes" value="${esc(med.notes)}" placeholder="e.g. Hide in food">
        </div>
      </div>
    `;
    list.appendChild(div);

    div.querySelector('.dynamic-item__remove').addEventListener('click', () => {
      projectData.special.medications.splice(idx, 1);
      renderMedications();
      onDataChange();
    });

    div.querySelectorAll('[data-key]').forEach(el => {
      el.addEventListener('input', () => {
        projectData.special.medications[idx][el.dataset.key] = el.value;
        onDataChange();
      });
    });
  });
}

// ── Generate PDF ──────────────────────────────────────────────────────────────

function bindGenerate() {
  document.getElementById('generate-btn').addEventListener('click', generatePDF);
}

function generatePDF() {
  const modal = document.getElementById('generate-modal');
  modal.classList.remove('hidden');

  setTimeout(() => {
    const html = buildPrintHTML(projectData, currentTheme);
    const win = window.open('', '_blank');
    if (!win) {
      modal.classList.add('hidden');
      alert('Pop-up was blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    modal.classList.add('hidden');

    setTimeout(() => {
      try { win.print(); } catch (e) { /* user closed window */ }
    }, 800);
  }, 100);
}

// ── PDF HTML builder ──────────────────────────────────────────────────────────

function buildPrintHTML(data, theme) {
  const d = data;
  const t = getThemeVars(theme);
  const fontImport = t.fontImport || '';

  const pages = [];
  const skip = (id) => disabledSections.has(id);

  // Cover (always)
  pages.push(buildCoverPage(d, t));

  // Welcome / sitter intro
  if (!skip('welcome') && (d.welcome.intro || d.welcome.sitterName)) {
    pages.push(buildWelcomePage(d, t));
  }

  // Pet Profile
  if (!skip('profile') && d.profile.petName) {
    pages.push(buildProfilePage(d, t));
  }

  // Daily Routine
  if (!skip('routine') && (d.routine.morningFeedTime || d.routine.morningFeedAmount || d.routine.walkSchedule || d.routine.bedtime)) {
    pages.push(buildRoutinePage(d, t));
  }

  // House Rules
  const hasRules = d.rules.allowedRooms.trim() || d.rules.customRules.trim() ||
                   d.rules.crateAtNight || d.rules.noFurniture || d.rules.noUnsupervised;
  if (!skip('rules') && hasRules) pages.push(buildRulesPage(d, t));

  // Emergency Info
  if (!skip('emergency') && (d.emergency.ownerPhone || d.emergency.vetPhone || d.emergency.ownerName)) {
    pages.push(buildEmergencyPage(d, t));
  }

  // Special Instructions
  const hasSpecial = d.special.medications.length > 0 || d.special.allergies.trim() ||
                     d.special.behavioral.trim() || d.special.doList.trim() || d.special.dontList.trim();
  if (!skip('special') && hasSpecial) pages.push(buildSpecialPage(d, t));

  // Logistics
  const hasLogistics = d.logistics.dropoffDate || d.logistics.dropoffTime || d.logistics.pickupDate ||
                       d.logistics.pickupTime || d.logistics.whatToBring.trim() || d.logistics.payment;
  if (!skip('logistics') && hasLogistics) pages.push(buildLogisticsPage(d, t));

  // Back cover (always)
  pages.push(buildBackCoverPage(d, t));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${htmlEnc(d.profile.petName || 'Pet Care Pack')} — Care Pack</title>
${fontImport}
<style>
${basePrintCSS()}
${themePrintCSS(t)}
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

function getThemeVars(theme) {
  const themes = {
    fresh: {
      name: 'fresh',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`,
      headingFont: "'Inter', sans-serif",
      bodyFont: "'Inter', sans-serif",
      pageBg: '#ffffff',
      surfaceBg: '#f0f9ff',
      text: '#0f172a',
      textMuted: '#64748b',
      accent: '#0ea5e9',
      accentLight: '#e0f2fe',
      accentText: '#0369a1',
      border: '#e2e8f0',
      coverBg: '#0c4a6e',
      coverText: '#ffffff',
      coverAccent: '#38bdf8',
      coverSubtext: '#7dd3fc',
      sectionHeaderBg: '#e0f2fe',
      sectionHeaderText: '#0369a1',
      iconColor: '#0ea5e9',
      pagePatternBg: null,
    },
    cozy: {
      name: 'cozy',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">`,
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Lato', sans-serif",
      pageBg: '#faf6f0',
      surfaceBg: '#f5ede1',
      text: '#2d1810',
      textMuted: '#7a5c44',
      accent: '#d97706',
      accentLight: '#fef3c7',
      accentText: '#92400e',
      border: '#e8d5c0',
      coverBg: '#2d1810',
      coverText: '#faf6f0',
      coverAccent: '#fbbf24',
      coverSubtext: '#e8b88a',
      sectionHeaderBg: '#fef3c7',
      sectionHeaderText: '#92400e',
      iconColor: '#d97706',
      pagePatternBg: null,
    },
    playful: {
      name: 'playful',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">`,
      headingFont: "'Nunito', sans-serif",
      bodyFont: "'Nunito', sans-serif",
      pageBg: '#fffaf5',
      surfaceBg: '#fef0e4',
      text: '#2d1a0e',
      textMuted: '#8b5e3c',
      accent: '#f97316',
      accentLight: '#ffedd5',
      accentText: '#c2410c',
      border: '#fed7aa',
      coverBg: '#7c2d12',
      coverText: '#fff7ed',
      coverAccent: '#fb923c',
      coverSubtext: '#fdba74',
      sectionHeaderBg: '#ffedd5',
      sectionHeaderText: '#c2410c',
      iconColor: '#f97316',
      pagePatternBg: null,
    },
    nature: {
      name: 'nature',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">`,
      headingFont: "'DM Serif Display', Georgia, serif",
      bodyFont: "'DM Sans', sans-serif",
      pageBg: '#f8faf5',
      surfaceBg: '#ecf4e8',
      text: '#1a2e14',
      textMuted: '#4a6a3a',
      accent: '#65a30d',
      accentLight: '#ecfccb',
      accentText: '#3f6212',
      border: '#d4edbc',
      coverBg: '#1a2e14',
      coverText: '#f8faf5',
      coverAccent: '#a3e635',
      coverSubtext: '#86a876',
      sectionHeaderBg: '#ecfccb',
      sectionHeaderText: '#3f6212',
      iconColor: '#65a30d',
      pagePatternBg: null,
    },
    gentle: {
      name: 'gentle',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@400;500&display=swap" rel="stylesheet">`,
      headingFont: "'Cormorant Garamond', Georgia, serif",
      bodyFont: "'Jost', sans-serif",
      pageBg: '#faf8ff',
      surfaceBg: '#f3f0ff',
      text: '#1e1b4b',
      textMuted: '#6b7280',
      accent: '#a855f7',
      accentLight: '#f3e8ff',
      accentText: '#7e22ce',
      border: '#ddd6fe',
      coverBg: '#2e1065',
      coverText: '#faf8ff',
      coverAccent: '#c084fc',
      coverSubtext: '#a78bfa',
      sectionHeaderBg: '#f3e8ff',
      sectionHeaderText: '#7e22ce',
      iconColor: '#a855f7',
      pagePatternBg: null,
    },
    blush: {
      name: 'blush',
      fontImport: `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">`,
      headingFont: "'Quicksand', sans-serif",
      bodyFont: "'Quicksand', sans-serif",
      pageBg: '#fff8fb',
      surfaceBg: '#fde8f3',
      text: '#4a0028',
      textMuted: '#9d5a7a',
      accent: '#ec4899',
      accentLight: '#fce7f3',
      accentText: '#9d174d',
      border: '#f9c8e0',
      coverBg: '#831843',
      coverText: '#fff8fb',
      coverAccent: '#f472b6',
      coverSubtext: '#fbcfe8',
      sectionHeaderBg: '#fce7f3',
      sectionHeaderText: '#9d174d',
      iconColor: '#ec4899',
      pagePatternBg: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='594' viewBox='0 0 420 594'%3E%3Cg transform='translate(52,72) rotate(-18)' fill='%23fdd0e8' opacity='0.55'%3E%3Ccircle cx='13' cy='11' r='3'/%3E%3Ccircle cx='23' cy='11' r='3'/%3E%3Ccircle cx='9' cy='17' r='2.5'/%3E%3Ccircle cx='27' cy='17' r='2.5'/%3E%3Cpath d='M18 14C13 14 9 18 9.5 22.5C10 26 13.5 28 18 28C22.5 28 26 26 26.5 22.5C27 18 23 14 18 14Z'/%3E%3C/g%3E%3Cg transform='translate(336,102) rotate(25)' fill='%23fdd0e8' opacity='0.45'%3E%3Ccircle cx='13' cy='11' r='3'/%3E%3Ccircle cx='23' cy='11' r='3'/%3E%3Ccircle cx='9' cy='17' r='2.5'/%3E%3Ccircle cx='27' cy='17' r='2.5'/%3E%3Cpath d='M18 14C13 14 9 18 9.5 22.5C10 26 13.5 28 18 28C22.5 28 26 26 26.5 22.5C27 18 23 14 18 14Z'/%3E%3C/g%3E%3Cg transform='translate(168,252) rotate(-8) scale(0.85)' fill='%23fdd0e8' opacity='0.5'%3E%3Ccircle cx='13' cy='11' r='3'/%3E%3Ccircle cx='23' cy='11' r='3'/%3E%3Ccircle cx='9' cy='17' r='2.5'/%3E%3Ccircle cx='27' cy='17' r='2.5'/%3E%3Cpath d='M18 14C13 14 9 18 9.5 22.5C10 26 13.5 28 18 28C22.5 28 26 26 26.5 22.5C27 18 23 14 18 14Z'/%3E%3C/g%3E%3Cg transform='translate(48,398) rotate(22) scale(0.9)' fill='%23fdd0e8' opacity='0.45'%3E%3Ccircle cx='13' cy='11' r='3'/%3E%3Ccircle cx='23' cy='11' r='3'/%3E%3Ccircle cx='9' cy='17' r='2.5'/%3E%3Ccircle cx='27' cy='17' r='2.5'/%3E%3Cpath d='M18 14C13 14 9 18 9.5 22.5C10 26 13.5 28 18 28C22.5 28 26 26 26.5 22.5C27 18 23 14 18 14Z'/%3E%3C/g%3E%3Cg transform='translate(352,462) rotate(-14) scale(0.8)' fill='%23fdd0e8' opacity='0.5'%3E%3Ccircle cx='13' cy='11' r='3'/%3E%3Ccircle cx='23' cy='11' r='3'/%3E%3Ccircle cx='9' cy='17' r='2.5'/%3E%3Ccircle cx='27' cy='17' r='2.5'/%3E%3Cpath d='M18 14C13 14 9 18 9.5 22.5C10 26 13.5 28 18 28C22.5 28 26 26 26.5 22.5C27 18 23 14 18 14Z'/%3E%3C/g%3E%3C/svg%3E")`,
      pagePatternRepeat: 'no-repeat',
      pagePatternSize: '210mm 297mm',
    },
  };
  return themes[theme] || themes.fresh;
}

function basePrintCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0; }
    body { background: var(--page-bg); }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      background: var(--page-bg);
    }
    .page:last-child { page-break-after: avoid; }
    .page-inner {
      padding: 18mm 16mm 20mm 24mm;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }
    /* Left accent stripe on content pages */
    .accent-stripe {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 7mm;
      background: var(--accent);
      z-index: 2;
    }
    /* Faint watermark icon — bottom right */
    .page-watermark {
      position: absolute;
      bottom: 16mm;
      right: 14mm;
      width: 64mm;
      height: 64mm;
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }
    .page-watermark svg { width: 100%; height: 100%; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

function themePrintCSS(t) {
  return `
    :root {
      --page-bg: ${t.pageBg};
      --surface-bg: ${t.surfaceBg};
      --text: ${t.text};
      --text-muted: ${t.textMuted};
      --accent: ${t.accent};
      --accent-light: ${t.accentLight};
      --accent-text: ${t.accentText};
      --border: ${t.border};
      --heading-font: ${t.headingFont};
      --body-font: ${t.bodyFont};
    }
    body { font-family: var(--body-font); color: var(--text); background: var(--page-bg); }
    h1, h2, h3 { font-family: var(--heading-font); }

    /* Cover — centered layout */
    .cover { background: ${t.coverBg}; color: ${t.coverText}; }
    .cover .page-inner {
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 18mm 20mm;
    }
    .cover__paw {
      width: 40pt;
      height: 40pt;
      margin: 0 auto 20pt;
      opacity: 0.6;
    }
    .cover__paw svg { width: 100%; height: 100%; }
    .cover__label {
      font-size: 9pt;
      font-family: var(--body-font);
      letter-spacing: 4px;
      text-transform: uppercase;
      color: ${t.coverSubtext};
      margin-bottom: 12pt;
    }
    .cover__title {
      font-family: var(--heading-font);
      font-size: 52pt;
      font-weight: 700;
      color: ${t.coverText};
      line-height: 1.1;
      letter-spacing: -1pt;
      margin-bottom: 16pt;
    }
    .cover__divider {
      width: 36pt;
      height: 3pt;
      background: ${t.coverAccent};
      border-radius: 2pt;
      margin: 0 auto 16pt;
    }
    .cover__subtitle {
      font-size: 12pt;
      color: ${t.coverSubtext};
      font-family: var(--body-font);
      font-weight: 400;
      margin-bottom: 8pt;
    }
    .cover__host {
      font-size: 10pt;
      color: ${t.coverSubtext};
      font-family: var(--body-font);
      margin-top: 8pt;
    }

    /* Section header — pill badge + large title */
    .section-badge {
      display: inline-block;
      background: ${t.accent};
      color: #ffffff;
      font-size: 7.5pt;
      font-family: var(--body-font);
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 3.5pt 11pt;
      border-radius: 20pt;
      margin-bottom: 10pt;
    }
    .section-title {
      font-family: var(--heading-font);
      font-size: 30pt;
      font-weight: 700;
      color: ${t.text};
      line-height: 1.15;
      letter-spacing: -0.3pt;
      margin-bottom: 20pt;
    }

    /* Info card */
    .info-card {
      background: var(--surface-bg);
      border-radius: 10pt;
      padding: 22pt 22pt;
      margin-bottom: 14pt;
      border: 1pt solid var(--border);
      page-break-inside: avoid;
    }
    .info-card__label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      font-family: var(--body-font);
      font-weight: 700;
      margin-bottom: 8pt;
    }
    .info-card__value {
      font-size: 14pt;
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.4;
    }
    .info-card__value--large {
      font-size: 26pt;
      font-weight: 700;
      font-family: var(--heading-font);
      color: var(--accent-text);
      letter-spacing: -0.3pt;
      line-height: 1.15;
    }

    .info-grid { display: flex; gap: 12pt; flex-wrap: wrap; margin-bottom: 14pt; }
    .info-grid .info-card { flex: 1; min-width: 110pt; margin-bottom: 0; }

    /* Rule list */
    .rule-list { list-style: none; }
    .rule-list li {
      display: flex;
      align-items: flex-start;
      gap: 12pt;
      padding: 13pt 0;
      border-bottom: 1pt solid var(--border);
      font-size: 12pt;
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.5;
      page-break-inside: avoid;
    }
    .rule-list li:last-child { border-bottom: none; }
    .rule-list li::before {
      content: '—';
      color: var(--accent);
      font-weight: 700;
      font-size: 14pt;
      flex-shrink: 0;
      margin-top: 1pt;
    }

    /* Medication card */
    .med-card {
      border: 1pt solid var(--border);
      border-radius: 10pt;
      margin-bottom: 14pt;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .med-card__header {
      background: var(--surface-bg);
      padding: 12pt 18pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12pt;
    }
    .med-card__name {
      font-family: var(--heading-font);
      font-size: 15pt;
      font-weight: 700;
      color: var(--accent-text);
    }
    .med-card__dose {
      font-size: 12pt;
      color: var(--text-muted);
      font-family: var(--body-font);
    }
    .med-card__body {
      padding: 12pt 18pt;
      font-size: 12pt;
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.6;
    }
    .med-card__timing {
      font-weight: 700;
      color: var(--accent-text);
    }

    /* Emergency contact card */
    .emergency-card {
      background: var(--surface-bg);
      border: 1pt solid var(--border);
      border-radius: 10pt;
      padding: 20pt 22pt;
      margin-bottom: 14pt;
      display: flex;
      align-items: center;
      gap: 18pt;
      page-break-inside: avoid;
    }
    .emergency-card--primary { border-color: ${t.accent}; border-width: 2pt; }
    .emergency-card__label {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      font-family: var(--body-font);
      font-weight: 700;
      min-width: 110pt;
    }
    .emergency-card__value {
      font-size: 22pt;
      font-family: var(--heading-font);
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.3pt;
    }
    .emergency-card__sub {
      font-size: 10pt;
      color: var(--text-muted);
      font-family: var(--body-font);
      margin-top: 2pt;
    }

    /* Do / Don't lists */
    .do-dont { display: flex; gap: 16pt; margin-top: 4pt; }
    .do-dont__col { flex: 1; }
    .do-dont__title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      margin-bottom: 8pt;
      font-family: var(--body-font);
    }
    .do-dont__item {
      font-size: 11pt;
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.6;
      padding: 4pt 0;
      border-bottom: 0.5pt solid var(--border);
    }
    .do-dont__item:last-child { border-bottom: none; }

    /* Welcome letter */
    .welcome-letter {
      font-size: 13pt;
      color: var(--text);
      font-family: var(--body-font);
      line-height: 2;
      white-space: pre-wrap;
      border-left: 4pt solid var(--accent);
      padding-left: 20pt;
      margin-top: 10pt;
    }

    /* Back cover — warm centered */
    .back-cover { background: ${t.coverBg}; color: ${t.coverText}; }
    .back-cover .page-inner {
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .back-cover__paw {
      width: 32pt;
      height: 32pt;
      margin: 0 auto 18pt;
      opacity: 0.5;
    }
    .back-cover__paw svg { width: 100%; height: 100%; }
    .back-cover__title {
      font-family: var(--heading-font);
      font-size: 28pt;
      color: ${t.coverText};
      margin-bottom: 12pt;
    }
    .back-cover__divider {
      width: 36pt;
      height: 2pt;
      background: ${t.coverAccent};
      border-radius: 2pt;
      margin: 0 auto 14pt;
    }
    .back-cover__text {
      font-size: 11pt;
      color: ${t.coverSubtext};
      font-family: var(--body-font);
      line-height: 1.8;
    }

    /* Page footer */
    .page-footer {
      margin-top: auto;
      padding-top: 12pt;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 0.5pt solid var(--border);
    }
    .page-footer__property {
      font-size: 8pt;
      color: var(--text-muted);
      font-family: var(--body-font);
      letter-spacing: 0.5px;
    }
    .page-footer__page {
      font-size: 8pt;
      color: var(--accent);
      font-family: var(--body-font);
      font-weight: 700;
    }

    /* Paw pattern background (blush theme only) */
    ${t.pagePatternBg ? `.page:not(.cover):not(.back-cover) { background-image: ${t.pagePatternBg}; background-repeat: ${t.pagePatternRepeat || 'repeat'}; background-size: ${t.pagePatternSize || '200px 200px'}; }` : ''}
  `;
}

// ── Watermark icons ────────────────────────────────────────────────────────────

const WATERMARK_ICONS = {
  welcome:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><circle cx="30" cy="22" r="12"/><circle cx="70" cy="22" r="12"/><circle cx="15" cy="45" r="9"/><circle cx="85" cy="45" r="9"/><path d="M50 38C30 38 16 52 17 64C18 74 28 82 50 82C72 82 82 74 83 64C84 52 70 38 50 38Z"/></svg>`,
  profile:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><circle cx="50" cy="35" r="20"/><path d="M50 60C28 60 12 72 12 84H88C88 72 72 60 50 60Z"/></svg>`,
  routine:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="8"><circle cx="50" cy="50" r="38"/><path d="M50 24V50L66 66" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rules:     `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M50 8L84 24V50C84 70 68 84 50 92C32 84 16 70 16 50V24Z"/></svg>`,
  emergency: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M36 14H64V36H86V64H64V86H36V64H14V36H36Z"/></svg>`,
  special:   `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="36" y="8" width="28" height="84" rx="14"/><rect x="8" y="36" width="84" height="28" rx="14"/></svg>`,
  logistics: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M8 34H62V72H8Z"/><path d="M62 46H78L92 60V72H62V46Z"/><circle cx="24" cy="78" r="10"/><circle cx="78" cy="78" r="10"/></svg>`,
};

function pageChrome(sectionId, accentColor) {
  const icon = WATERMARK_ICONS[sectionId] || '';
  return `
  <div class="accent-stripe"></div>
  <div class="page-watermark" style="color:${accentColor}">${icon}</div>`;
}

// ── PDF Page Builders ─────────────────────────────────────────────────────────

const PAW_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><circle cx="30" cy="22" r="12"/><circle cx="70" cy="22" r="12"/><circle cx="15" cy="45" r="9"/><circle cx="85" cy="45" r="9"/><path d="M50 38C30 38 16 52 17 64C18 74 28 82 50 82C72 82 82 74 83 64C84 52 70 38 50 38Z"/></svg>`;

function buildCoverPage(d, t) {
  const petName = d.profile.petName || 'Care Pack';
  const sitter = d.welcome.sitterName
    ? `Cared for by ${htmlEnc(d.welcome.businessName || d.welcome.sitterName)}`
    : '';
  const speciesLine = [d.profile.species, d.profile.breed].filter(Boolean).map(htmlEnc).join(' · ');

  // Blush theme: 5 scattered decorative paws on the cover
  const blushDecoPaws = t.name === 'blush' ? `
    <div style="position:absolute;left:24mm;top:32mm;width:18mm;height:18mm;color:${t.coverAccent};opacity:0.22;transform:rotate(-18deg)">${PAW_SVG}</div>
    <div style="position:absolute;right:38mm;top:48mm;width:16mm;height:16mm;color:${t.coverAccent};opacity:0.18;transform:rotate(25deg)">${PAW_SVG}</div>
    <div style="position:absolute;left:80mm;top:122mm;width:15mm;height:15mm;color:${t.coverAccent};opacity:0.20;transform:rotate(-8deg)">${PAW_SVG}</div>
    <div style="position:absolute;left:20mm;bottom:96mm;width:17mm;height:17mm;color:${t.coverAccent};opacity:0.18;transform:rotate(22deg)">${PAW_SVG}</div>
    <div style="position:absolute;right:30mm;bottom:62mm;width:16mm;height:16mm;color:${t.coverAccent};opacity:0.22;transform:rotate(-14deg)">${PAW_SVG}</div>
  ` : '';

  return `
  <div class="page cover">
    ${blushDecoPaws}
    <div class="page-inner">
      <div class="cover__paw" style="color:${t.coverAccent}">${PAW_SVG}</div>
      <p class="cover__label">Pet Care Pack</p>
      <h1 class="cover__title">${htmlEnc(petName)}</h1>
      <div class="cover__divider"></div>
      ${speciesLine ? `<p class="cover__subtitle">${speciesLine}</p>` : `<p class="cover__subtitle">Everything you need to know</p>`}
      ${sitter ? `<p class="cover__host">${htmlEnc(sitter)}</p>` : ''}
    </div>
  </div>`;
}

function buildWelcomePage(d, t) {
  const msg = d.welcome.intro || DEFAULT_INTRO.replace('[Pet Name]', d.profile.petName || 'your pet');
  const processed = msg.replace('[Pet Name]', d.profile.petName || 'your pet');
  const sitterName = d.welcome.sitterName || '';

  return `
  <div class="page">
    ${pageChrome('welcome', t.accent)}
    <div class="page-inner">
      <span class="section-badge">From the Sitter</span>
      <h2 class="section-title">A note from ${htmlEnc(sitterName || 'your sitter')}</h2>
      <p class="welcome-letter">${htmlEnc(processed)}</p>
      ${sitterName ? `<p style="margin-top:16pt;font-size:12pt;font-family:var(--heading-font);font-weight:700;color:var(--accent-text)">— ${htmlEnc(d.welcome.businessName || sitterName)}</p>` : ''}
      ${(d.welcome.phone || d.welcome.email) ? `
      <div class="info-card" style="margin-top:20pt">
        <p class="info-card__label">Contact</p>
        ${d.welcome.phone ? `<p class="info-card__value">${htmlEnc(d.welcome.phone)}</p>` : ''}
        ${d.welcome.email ? `<p class="info-card__value">${htmlEnc(d.welcome.email)}</p>` : ''}
      </div>` : ''}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Welcome</span>
      </div>
    </div>
  </div>`;
}

function buildProfilePage(d, t) {
  const p = d.profile;
  return `
  <div class="page">
    ${pageChrome('profile', t.accent)}
    <div class="page-inner">
      <span class="section-badge">About</span>
      <h2 class="section-title">Pet Profile</h2>
      <div class="info-card">
        <p class="info-card__label">Name</p>
        <p class="info-card__value info-card__value--large">${htmlEnc(p.petName)}</p>
        ${p.species || p.breed ? `<p class="info-card__value" style="margin-top:6pt">${[p.species, p.breed].filter(Boolean).map(htmlEnc).join(' · ')}</p>` : ''}
      </div>
      ${(p.age || p.weight) ? `
      <div class="info-grid">
        ${p.age ? `<div class="info-card"><p class="info-card__label">Age</p><p class="info-card__value info-card__value--large">${htmlEnc(p.age)}</p></div>` : ''}
        ${p.weight ? `<div class="info-card"><p class="info-card__label">Weight</p><p class="info-card__value info-card__value--large">${htmlEnc(p.weight)}</p></div>` : ''}
      </div>` : ''}
      ${p.color ? `<div class="info-card"><p class="info-card__label">Colour / Markings</p><p class="info-card__value">${htmlEnc(p.color)}</p></div>` : ''}
      ${p.microchip ? `<div class="info-card"><p class="info-card__label">Microchip</p><p class="info-card__value">${htmlEnc(p.microchip)}</p></div>` : ''}
      ${p.notes ? `<div class="info-card"><p class="info-card__label">Personality & Notes</p><p class="info-card__value">${htmlEnc(p.notes)}</p></div>` : ''}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Pet Profile</span>
      </div>
    </div>
  </div>`;
}

function buildRoutinePage(d, t) {
  const r = d.routine;
  return `
  <div class="page">
    ${pageChrome('routine', t.accent)}
    <div class="page-inner">
      <span class="section-badge">Schedule</span>
      <h2 class="section-title">Daily Routine</h2>
      ${(r.morningFeedTime || r.morningFeedAmount) ? `
      <div class="info-card">
        <p class="info-card__label">Morning Feed</p>
        ${r.morningFeedTime ? `<p class="info-card__value info-card__value--large">${htmlEnc(r.morningFeedTime)}</p>` : ''}
        ${r.morningFeedAmount ? `<p class="info-card__value" style="margin-top:6pt">${htmlEnc(r.morningFeedAmount)}</p>` : ''}
      </div>` : ''}
      ${(r.eveningFeedTime || r.eveningFeedAmount) ? `
      <div class="info-card">
        <p class="info-card__label">Evening Feed</p>
        ${r.eveningFeedTime ? `<p class="info-card__value info-card__value--large">${htmlEnc(r.eveningFeedTime)}</p>` : ''}
        ${r.eveningFeedAmount ? `<p class="info-card__value" style="margin-top:6pt">${htmlEnc(r.eveningFeedAmount)}</p>` : ''}
      </div>` : ''}
      ${r.feedNotes ? `<div class="info-card"><p class="info-card__label">Feeding Notes</p><p class="info-card__value">${htmlEnc(r.feedNotes)}</p></div>` : ''}
      ${r.walkSchedule ? `<div class="info-card"><p class="info-card__label">Walks</p><p class="info-card__value">${htmlEnc(r.walkSchedule)}</p></div>` : ''}
      ${r.playtime ? `<div class="info-card"><p class="info-card__label">Playtime</p><p class="info-card__value">${htmlEnc(r.playtime)}</p></div>` : ''}
      ${r.bedtime ? `<div class="info-card"><p class="info-card__label">Bedtime</p><p class="info-card__value">${htmlEnc(r.bedtime)}</p></div>` : ''}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Daily Routine</span>
      </div>
    </div>
  </div>`;
}

function buildRulesPage(d, t) {
  const r = d.rules;
  const ruleItems = [];
  if (r.allowedRooms.trim()) ruleItems.push(`Allowed areas: ${htmlEnc(r.allowedRooms.trim())}`);
  if (r.crateAtNight)        ruleItems.push('Crated at night');
  if (r.noFurniture)         ruleItems.push('Not allowed on furniture');
  if (r.noUnsupervised)      ruleItems.push('No unsupervised outdoor time');
  if (r.customRules.trim()) {
    r.customRules.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) ruleItems.push(htmlEnc(trimmed));
    });
  }
  return `
  <div class="page">
    ${pageChrome('rules', t.accent)}
    <div class="page-inner">
      <span class="section-badge">Guidelines</span>
      <h2 class="section-title">House Rules</h2>
      <ul class="rule-list">${ruleItems.map(r => `<li>${r}</li>`).join('')}</ul>
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">House Rules</span>
      </div>
    </div>
  </div>`;
}

function buildEmergencyPage(d, t) {
  const e = d.emergency;
  let contacts = '';
  if (e.ownerPhone) {
    contacts += `<div class="emergency-card emergency-card--primary">
      <span class="emergency-card__label">${htmlEnc(e.ownerName || 'Owner')}</span>
      <div>
        <div class="emergency-card__value">${htmlEnc(e.ownerPhone)}</div>
        ${e.ownerName ? `<div class="emergency-card__sub">${htmlEnc(e.ownerName)}</div>` : ''}
      </div>
    </div>`;
  }
  if (e.secondaryPhone) {
    contacts += `<div class="emergency-card">
      <span class="emergency-card__label">${htmlEnc(e.secondaryName || 'Secondary Contact')}</span>
      <div class="emergency-card__value">${htmlEnc(e.secondaryPhone)}</div>
    </div>`;
  }
  if (e.vetPhone || e.vetName) {
    contacts += `<div class="emergency-card">
      <span class="emergency-card__label">Vet</span>
      <div>
        ${e.vetPhone ? `<div class="emergency-card__value">${htmlEnc(e.vetPhone)}</div>` : ''}
        ${e.vetName ? `<div class="emergency-card__sub">${htmlEnc(e.vetName)}</div>` : ''}
        ${e.vetAddress ? `<div class="emergency-card__sub">${htmlEnc(e.vetAddress)}</div>` : ''}
      </div>
    </div>`;
  }
  if (e.emergencyVet) {
    contacts += `<div class="emergency-card">
      <span class="emergency-card__label">24h Emergency Vet</span>
      <div class="emergency-card__value" style="font-size:14pt">${htmlEnc(e.emergencyVet)}</div>
    </div>`;
  }
  return `
  <div class="page">
    ${pageChrome('emergency', t.accent)}
    <div class="page-inner">
      <span class="section-badge">Important</span>
      <h2 class="section-title">Emergency Info</h2>
      ${contacts}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Emergency</span>
      </div>
    </div>
  </div>`;
}

function buildSpecialPage(d, t) {
  const s = d.special;
  const medCards = s.medications.filter(m => m.name).map(med => `
    <div class="med-card">
      <div class="med-card__header">
        <span class="med-card__name">${htmlEnc(med.name)}</span>
        ${med.dose ? `<span class="med-card__dose">${htmlEnc(med.dose)}</span>` : ''}
      </div>
      <div class="med-card__body">
        ${med.timing ? `<span class="med-card__timing">${htmlEnc(med.timing)}</span>` : ''}
        ${med.notes ? ` — ${htmlEnc(med.notes)}` : ''}
      </div>
    </div>`).join('');
  const doItems = s.doList.trim()
    ? s.doList.split('\n').filter(l => l.trim()).map(l => `<div class="do-dont__item">${htmlEnc(l.trim())}</div>`).join('') : '';
  const dontItems = s.dontList.trim()
    ? s.dontList.split('\n').filter(l => l.trim()).map(l => `<div class="do-dont__item">${htmlEnc(l.trim())}</div>`).join('') : '';
  return `
  <div class="page">
    ${pageChrome('special', t.accent)}
    <div class="page-inner">
      <span class="section-badge">Care Notes</span>
      <h2 class="section-title">Special Instructions</h2>
      ${medCards ? `<div style="margin-bottom:14pt">${medCards}</div>` : ''}
      ${s.allergies ? `<div class="info-card"><p class="info-card__label">Allergies & Dietary Restrictions</p><p class="info-card__value">${htmlEnc(s.allergies)}</p></div>` : ''}
      ${s.behavioral ? `<div class="info-card"><p class="info-card__label">Behavioural Notes</p><p class="info-card__value">${htmlEnc(s.behavioral)}</p></div>` : ''}
      ${(doItems || dontItems) ? `
      <div class="info-card">
        <p class="info-card__label" style="margin-bottom:12pt">Do's &amp; Don'ts</p>
        <div class="do-dont">
          ${doItems ? `<div class="do-dont__col"><p class="do-dont__title">Loves</p>${doItems}</div>` : ''}
          ${dontItems ? `<div class="do-dont__col"><p class="do-dont__title">Avoid</p>${dontItems}</div>` : ''}
        </div>
      </div>` : ''}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Special Instructions</span>
      </div>
    </div>
  </div>`;
}

function buildLogisticsPage(d, t) {
  const l = d.logistics;
  return `
  <div class="page">
    ${pageChrome('logistics', t.accent)}
    <div class="page-inner">
      <span class="section-badge">Dates & Details</span>
      <h2 class="section-title">Pickup & Dropoff</h2>
      ${(l.dropoffDate || l.dropoffTime) ? `
      <div class="info-card">
        <p class="info-card__label">Dropoff</p>
        ${l.dropoffDate ? `<p class="info-card__value info-card__value--large">${htmlEnc(l.dropoffDate)}</p>` : ''}
        ${l.dropoffTime ? `<p class="info-card__value" style="margin-top:4pt">${htmlEnc(l.dropoffTime)}</p>` : ''}
      </div>` : ''}
      ${(l.pickupDate || l.pickupTime) ? `
      <div class="info-card">
        <p class="info-card__label">Pickup</p>
        ${l.pickupDate ? `<p class="info-card__value info-card__value--large">${htmlEnc(l.pickupDate)}</p>` : ''}
        ${l.pickupTime ? `<p class="info-card__value" style="margin-top:4pt">${htmlEnc(l.pickupTime)}</p>` : ''}
      </div>` : ''}
      ${l.whatToBring ? `<div class="info-card"><p class="info-card__label">What to Bring</p><p class="info-card__value">${htmlEnc(l.whatToBring)}</p></div>` : ''}
      ${l.payment ? `<div class="info-card"><p class="info-card__label">Payment</p><p class="info-card__value">${htmlEnc(l.payment)}</p></div>` : ''}
      ${l.cancellation ? `<div class="info-card"><p class="info-card__label">Cancellation Policy</p><p class="info-card__value">${htmlEnc(l.cancellation)}</p></div>` : ''}
      <div class="page-footer">
        <span class="page-footer__property">${htmlEnc(d.profile.petName || '')}</span>
        <span class="page-footer__page">Logistics</span>
      </div>
    </div>
  </div>`;
}

function buildBackCoverPage(d, t) {
  const petName = d.profile.petName || '';
  const sitterName = d.welcome.sitterName || '';
  return `
  <div class="page back-cover">
    <div class="page-inner">
      <div class="back-cover__paw" style="color:${t.coverAccent}">${PAW_SVG}</div>
      ${petName ? `<h2 class="back-cover__title">${htmlEnc(petName)}</h2>` : ''}
      <div class="back-cover__divider"></div>
      <p class="back-cover__text">Thank you for trusting ${htmlEnc(sitterName || 'me')} with ${htmlEnc(petName || 'your pet')}.<br>Looking forward to next time!</p>
    </div>
  </div>`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((cur, key) => (cur && cur[key] !== undefined ? cur[key] : ''), obj);
}

function htmlEnc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

initGate();
