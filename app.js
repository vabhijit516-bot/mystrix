/**
 * MYSTRIX — Nine Encrypted Rooms
 * Full Cyberpunk Puzzle Simulation with Matrix Rain, Sound FX, & Shared Leaderboard
 */

import {
  checkSupabaseStatus,
  fetchAllTeams,
  syncTeamToSupabase,
  clearAllTeamsFromSupabase,
  subscribeToLeaderboard,
  SUPABASE_SCHEMA_SQL
} from './supabase.js';

// 1. Room Puzzle Data & Answers
export const ROOMS_DATA = [
  {
    id: 1,
    title: 'The Mirror Gate',
    encrypted: '12Xnoen',
    hints: [
      'I look better in a mirror.',
      'Read me backward to move forward.'
    ],
    // Read backward: neonX21
    acceptedAnswers: ['neonx21']
  },
  {
    id: 2,
    title: 'The Vector Vortex',
    encrypted: 'vtorce99',
    hints: [
      'I’m all mixed up.',
      'Sort my letters to see the path.'
    ],
    // Unscramble vtorce -> vector + 99
    acceptedAnswers: ['vector99']
  },
  {
    id: 3,
    title: 'The Caesar Circuit',
    encrypted: 'pduwlf08',
    hints: [
      'I stepped three spaces forward.',
      'Shift my code, not my numbers.'
    ],
    // Shift -3: matrix + 08
    acceptedAnswers: ['matrix08']
  },
  {
    id: 4,
    title: 'The Glitch Lab',
    encrypted: '7ltgcih',
    hints: [
      'The number runs ahead.',
      'Rearrange me to fix the glitch.'
    ],
    // 7 stays ahead + glitch
    acceptedAnswers: ['7glitch']
  },
  {
    id: 5,
    title: 'The Reflection Vault',
    encrypted: '31edoced',
    hints: [
      'Digits lead the way.',
      'My true form hides in reflection.'
    ],
    // Primary: 31decoded (also supports 13decoded)
    acceptedAnswers: ['31decoded', '13decoded']
  },
  {
    id: 6,
    title: 'The Binary Carousel',
    encrypted: 'bniray72',
    hints: [
      'Flip me, then roll the start away.',
      'What begins first will end last.'
    ],
    // Primary: binary72 (also supports nary72bi)
    acceptedAnswers: ['binary72', 'nary72bi']
  },
  {
    id: 7,
    title: 'The Kernel Switch',
    encrypted: 'ekrlen91',
    hints: [
      'Two letters have lost their seats.',
      'Fix the order to compile me.'
    ],
    // Primary: kernel91 (also supports 91kernel)
    acceptedAnswers: ['kernel91', '91kernel']
  },
  {
    id: 8,
    title: 'The Proxy Portal',
    encrypted: 'pyorx33',
    hints: [
      'Switch and spin.',
      'Trade two, then flip the line.'
    ],
    // Primary: proxy33 (also supports 33proxy)
    acceptedAnswers: ['proxy33', '33proxy', '33yxorp', 'yxorp33', '33xoryp']
  },
  {
    id: 9,
    title: 'The Quantum Mirage',
    encrypted: '6mutnaq',
    hints: [
      'I’m your mirror’s trickster.',
      'My center hides a tiny swap.'
    ],
    // Primary: quantum6
    acceptedAnswers: ['quantum6', '6quantum', 'qantum6', '6qantum']
  }
];

// Initial Rival Teams for the Shared Leaderboard (Empty by default)
export const DEFAULT_RIVAL_TEAMS = [];


// Audio FX Synthesizer via Web Audio API
class CyberAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  beep(freq = 880, duration = 0.08, type = 'sine') {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  successChime() {
    if (this.muted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.beep(freq, 0.18, 'triangle'), idx * 80);
    });
  }

  deniedBuzz() {
    if (this.muted) return;
    this.init();
    try {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (_) {}
  }
}

const audio = new CyberAudio();

// 2. Application State
class MystrixApp {
  constructor() {
    this.currentTeam = null;
    this.unlockedRooms = [];
    this.roomCompletions = {}; // { [roomId]: timestamp }
    this.activeRoomId = null;
    this.rivalTeams = [];

    // DOM Elements
    this.canvas = document.getElementById('matrix-canvas');
    this.relayContent = document.getElementById('relay-content');
    this.teamBanner = document.getElementById('team-banner');
    this.teamDisplayName = document.getElementById('team-display-name');
    this.resetTeamLink = document.getElementById('reset-team-link');
    this.progressFraction = document.getElementById('progress-fraction');
    this.missionProgressBar = document.getElementById('mission-progress-bar');
    this.progressCaption = document.getElementById('progress-caption');
    this.roomGrid = document.getElementById('room-grid');

    // Registration Dialog
    this.registrationOverlay = document.getElementById('registration-overlay');
    this.registrationForm = document.getElementById('registration-form');
    this.teamNameInput = document.getElementById('team-name-input');
    this.teamLeadInput = document.getElementById('team-lead-input');
    this.teamMemberInput = document.getElementById('team-member-input');
    this.teamLeadName = document.getElementById('team-lead-name');
    this.teamMemberName = document.getElementById('team-member-name');
    this.teamCharCount = document.getElementById('team-char-count');
    this.registrationError = document.getElementById('registration-error');
    this.registrationSubmitBtn = document.getElementById('registration-submit-btn');
    this.registrationBtnText = document.getElementById('registration-btn-text');

    // Checkpoint Dialog
    this.checkpointOverlay = document.getElementById('checkpoint-overlay');
    this.checkpointCloseBtn = document.getElementById('checkpoint-close-btn');
    this.checkpointRoomTitle = document.getElementById('checkpoint-room-title');
    this.checkpointTargetNumber = document.getElementById('checkpoint-target-number');
    this.checkpointStatusText = document.getElementById('checkpoint-status-text');
    this.checkpointEncryptedKey = document.getElementById('checkpoint-encrypted-key');
    this.checkpointHintsList = document.getElementById('checkpoint-hints-list');
    this.checkpointForm = document.getElementById('checkpoint-form');
    this.accessKeyInput = document.getElementById('access-key-input');
    this.checkpointFeedback = document.getElementById('checkpoint-feedback');
    this.checkpointFeedbackIcon = document.getElementById('checkpoint-feedback-icon');
    this.checkpointFeedbackMsg = document.getElementById('checkpoint-feedback-msg');
    this.checkpointAuthBtn = document.getElementById('checkpoint-auth-btn');
    this.checkpointAbortBtn = document.getElementById('checkpoint-abort-btn');

    // Leaderboards
    this.viewAllProgressBtn = document.getElementById('view-all-progress-btn');
    this.leaderboardOverlay = document.getElementById('leaderboard-overlay');
    this.leaderboardBackBtn = document.getElementById('leaderboard-back-btn');
    this.leaderboardCompactBody = document.getElementById('leaderboard-compact-body');
    this.leaderboardFullBody = document.getElementById('leaderboard-full-body');
    this.teamsCountBadge = document.getElementById('teams-count-badge');
    this.fullTeamsCountBadge = document.getElementById('full-teams-count-badge');
    this.clearLeaderboardBtn = document.getElementById('clear-leaderboard-btn');
    this.fullClearLeaderboardBtn = document.getElementById('full-clear-leaderboard-btn');
    this.emailLeaderboardBtn = document.getElementById('email-leaderboard-btn');
    this.fullEmailLeaderboardBtn = document.getElementById('full-email-leaderboard-btn');

    // Audio button
    this.audioToggleBtn = document.getElementById('audio-toggle-btn');
    this.audioStatus = document.getElementById('audio-status');

    // Supabase Live Synchronization & Elements
    this.supabaseStatusBadge = document.getElementById('supabase-status-badge');
    this.supabaseStatusText = document.getElementById('supabase-status-text');
    this.liveToastContainer = document.getElementById('live-toast-container');
    this.sqlSetupModal = document.getElementById('sql-setup-modal');
    this.closeSqlModalBtn = document.getElementById('close-sql-modal-btn');
    this.copySqlBtn = document.getElementById('copy-sql-btn');
    this.testSupabaseBtn = document.getElementById('test-supabase-btn');
    this.supabasePollInterval = null;
    this.isSupabaseConnected = false;

    this.init();
  }

  init() {
    this.loadState();
    this.setupMatrixRain();
    this.setupEventListeners();
    this.renderRoomGrid();
    this.updateProgressUI();
    this.renderLeaderboards();

    if (!this.currentTeam) {
      this.openRegistrationModal();
    } else {
      this.updateTeamBanner();
    }

    // Initialize Supabase realtime database integration
    this.initSupabaseIntegration();
  }

  // Supabase Real-Time Integration & Toasts
  showCyberToast(title, body, highlight = false) {
    if (!this.liveToastContainer) return;
    const toast = document.createElement('div');
    toast.className = `cyber-toast ${highlight ? 'highlight' : ''}`;
    toast.innerHTML = `
      <div class="cyber-toast-content">
        <div class="cyber-toast-title">${title}</div>
        <div class="cyber-toast-body">${body}</div>
      </div>
    `;
    this.liveToastContainer.appendChild(toast);

    audio.beep(highlight ? 880 : 540, 0.08, 'sine');

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  updateSupabaseStatusUI(state, text) {
    if (!this.supabaseStatusBadge || !this.supabaseStatusText) return;
    this.supabaseStatusBadge.className = `supabase-status-badge ${state}`;
    this.supabaseStatusText.textContent = text;
  }

  openSqlSetupModal() {
    if (!this.sqlSetupModal) return;
    this.relayContent?.classList.add('blurred');
    this.sqlSetupModal.style.display = 'flex';
  }

  closeSqlSetupModal() {
    if (!this.sqlSetupModal) return;
    this.relayContent?.classList.remove('blurred');
    this.sqlSetupModal.style.display = 'none';
  }

  getCurrentTeamRecord() {
    if (!this.currentTeam) return null;
    const solvedTimes = Object.values(this.roomCompletions).sort();
    const lastSolved = solvedTimes.length ? solvedTimes[solvedTimes.length - 1] : null;
    return {
      id: this.currentTeam.id,
      name: this.currentTeam.name,
      lead: this.currentTeam.lead || '—',
      member: this.currentTeam.member || '—',
      completed_count: this.unlockedRooms.length,
      score: this.unlockedRooms.length * 100,
      last_completed_at: lastSolved,
      created_at: this.currentTeam.created_at,
      room_completions: this.roomCompletions,
      completions: this.unlockedRooms.map((id) => ({
        room_id: id,
        completed_at: this.roomCompletions[id] || new Date().toISOString()
      }))
    };
  }

  async initSupabaseIntegration() {
    this.updateSupabaseStatusUI('connecting', 'SUPABASE: CONNECTING...');

    await this.refreshSupabaseState(true);

    // Setup Realtime Live Channel
    try {
      subscribeToLeaderboard((payload) => {
        this.handleSupabaseRealtime(payload);
      });
    } catch (err) {
      console.warn('[Supabase Realtime] Init error:', err);
    }

    // Backup polling loop every 8s
    if (this.supabasePollInterval) clearInterval(this.supabasePollInterval);
    this.supabasePollInterval = setInterval(() => {
      this.refreshSupabaseState(false);
    }, 8000);
  }

  async refreshSupabaseState(isInitial = false) {
    const status = await checkSupabaseStatus();

    if (!status.available) {
      this.isSupabaseConnected = false;
      this.updateSupabaseStatusUI('error', 'SUPABASE: SETUP SCHEMA (CLICK)');
      if (isInitial) {
        console.info('[Supabase] Teams table not found yet. Click the badge to run setup SQL.');
      }
      return;
    }

    this.isSupabaseConnected = true;
    this.updateSupabaseStatusUI('live', 'SUPABASE: LIVE SYNC');

    // Fetch latest teams
    const { success, data: remoteTeams } = await fetchAllTeams();
    if (success && Array.isArray(remoteTeams)) {
      this.mergeRemoteTeams(remoteTeams);
    }

    // Sync current team up if exists
    if (this.currentTeam) {
      await syncTeamToSupabase(this.getCurrentTeamRecord());
    }
  }

  mergeRemoteTeams(remoteTeams) {
    const prevMap = new Map(this.rivalTeams.map((t) => [t.id, t]));
    const currentId = this.currentTeam?.id;

    // Filter out user's current team from rivals
    const otherTeams = remoteTeams.filter((t) => t.id !== currentId);

    // Check for newly discovered teams during polling
    otherTeams.forEach((team) => {
      if (!prevMap.has(team.id) && this.rivalTeams.length > 0) {
        this.showCyberToast(
          'NEW CONTENDER DETECTED',
          `Team "${team.name}" (Lead: ${team.lead || '—'}) entered the leaderboard!`
        );
      }
    });

    this.rivalTeams = otherTeams;
    this.renderLeaderboards();
  }

  handleSupabaseRealtime(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const currentId = this.currentTeam?.id;

    if (eventType === 'INSERT') {
      if (newRecord.id !== currentId) {
        const exists = this.rivalTeams.some((t) => t.id === newRecord.id);
        if (!exists) {
          this.rivalTeams.push(newRecord);
          this.showCyberToast(
            'NEW CONTENDER ONLINE',
            `Team "${newRecord.name}" (Lead: ${newRecord.lead || '—'}, Member: ${newRecord.member || '—'}) joined!`,
            true
          );
          this.renderLeaderboards();
        }
      }
    } else if (eventType === 'UPDATE') {
      if (newRecord.id !== currentId) {
        const idx = this.rivalTeams.findIndex((t) => t.id === newRecord.id);
        const oldTeam = idx !== -1 ? this.rivalTeams[idx] : null;

        if (oldTeam && newRecord.completed_count > (oldTeam.completed_count || 0)) {
          this.showCyberToast(
            'RIVAL CHAMBER CRACKED!',
            `Team "${newRecord.name}" solved ${newRecord.completed_count}/9 chambers!`,
            true
          );
        }

        if (idx !== -1) {
          this.rivalTeams[idx] = newRecord;
        } else {
          this.rivalTeams.push(newRecord);
        }
        this.renderLeaderboards();
      }
    } else if (eventType === 'DELETE') {
      if (oldRecord) {
        this.rivalTeams = this.rivalTeams.filter((t) => t.id !== oldRecord.id);
        this.renderLeaderboards();
      }
    }
  }

  // State Persistence
  loadState() {
    try {
      const savedTeam = localStorage.getItem('mystrix_team_session');
      if (savedTeam) {
        this.currentTeam = JSON.parse(savedTeam);
      }

      const savedProgress = localStorage.getItem('mystrix_team_progress');
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        this.unlockedRooms = parsed.unlockedRooms || [];
        this.roomCompletions = parsed.roomCompletions || {};
      }

      const savedRivals = localStorage.getItem('mystrix_rival_teams');
      if (savedRivals) {
        try {
          const parsed = JSON.parse(savedRivals);
          const hasOldMocks = Array.isArray(parsed) && parsed.some(t => t.name === 'ByteBandits' || t.name === 'QuantumPhantoms' || t.name === 'CipherSquad_Alpha');
          if (hasOldMocks) {
            this.rivalTeams = [];
            localStorage.removeItem('mystrix_rival_teams');
          } else {
            this.rivalTeams = parsed;
          }
        } catch (_) {
          this.rivalTeams = [];
        }
      } else {
        this.rivalTeams = [];
      }
    } catch (e) {
      console.warn('Failed to load local storage:', e);
      this.rivalTeams = [];
    }
  }

  saveState() {
    try {
      if (this.currentTeam) {
        localStorage.setItem('mystrix_team_session', JSON.stringify(this.currentTeam));
      } else {
        localStorage.removeItem('mystrix_team_session');
      }

      localStorage.setItem('mystrix_team_progress', JSON.stringify({
        unlockedRooms: this.unlockedRooms,
        roomCompletions: this.roomCompletions
      }));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  // 3. Matrix Digital Rain Canvas Effect
  setupMatrixRain() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    let width = (this.canvas.width = window.innerWidth);
    let height = (this.canvas.height = window.innerHeight);

    const chars = '01MYSTRIXACCESSDENIEDCHAMBERUNLOCKED992108741301011001010100';
    const fontSize = 14;
    let columns = Math.ceil(width / fontSize);
    let drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));

    const resize = () => {
      width = this.canvas.width = window.innerWidth;
      height = this.canvas.height = window.innerHeight;
      columns = Math.ceil(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
    };

    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#00ff66';
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    setInterval(draw, 33);
  }

  // 4. UI Setup & Listeners
  setupEventListeners() {
    // Audio Toggle
    this.audioToggleBtn?.addEventListener('click', () => {
      audio.muted = !audio.muted;
      this.audioStatus.textContent = audio.muted ? 'AUDIO OFF' : 'AUDIO ON';
      this.audioToggleBtn.style.borderColor = audio.muted ? 'var(--muted)' : 'var(--accent)';
      if (!audio.muted) audio.beep(660, 0.05);
    });

    // Reset team button
    this.resetTeamLink?.addEventListener('click', () => {
      if (confirm('Are you sure you want to register a new team? Your current session will be reset.')) {
        this.currentTeam = null;
        this.unlockedRooms = [];
        this.roomCompletions = {};
        this.saveState();
        this.updateProgressUI();
        this.renderRoomGrid();
        this.renderLeaderboards();
        this.openRegistrationModal();
      }
    });

    // Team registration inputs
    const validateRegForm = () => {
      const val = this.teamNameInput?.value || '';
      const lead = this.teamLeadInput?.value?.trim() || '';
      const member = this.teamMemberInput?.value?.trim() || '';
      this.teamCharCount.textContent = `${val.length}/50 characters`;
      const trimmed = val.trim();
      const isValid = trimmed.length >= 3 && trimmed.length <= 50 && lead.length >= 1 && member.length >= 1;
      this.registrationSubmitBtn.disabled = !isValid;
      this.registrationError.style.display = 'none';
    };

    this.teamNameInput?.addEventListener('input', validateRegForm);
    this.teamLeadInput?.addEventListener('input', validateRegForm);
    this.teamMemberInput?.addEventListener('input', validateRegForm);

    this.registrationForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleTeamRegistration();
    });

    // Checkpoint inputs
    this.accessKeyInput?.addEventListener('input', () => {
      this.checkpointFeedback.style.display = 'none';
      this.checkpointFeedback.classList.remove('granted');
    });

    this.checkpointForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAnswerSubmit();
    });

    // Modal buttons
    this.checkpointCloseBtn?.addEventListener('click', () => this.closeCheckpointModal());
    this.checkpointAbortBtn?.addEventListener('click', () => this.closeCheckpointModal());

    this.viewAllProgressBtn?.addEventListener('click', () => this.openLeaderboardModal());
    this.leaderboardBackBtn?.addEventListener('click', () => this.closeLeaderboardModal());

    // Reset leaderboard buttons
    this.clearLeaderboardBtn?.addEventListener('click', () => this.promptClearLeaderboard());
    this.fullClearLeaderboardBtn?.addEventListener('click', () => this.promptClearLeaderboard());

    // Share / Email leaderboard buttons
    this.emailLeaderboardBtn?.addEventListener('click', () => this.shareLeaderboardViaEmail());
    this.fullEmailLeaderboardBtn?.addEventListener('click', () => this.shareLeaderboardViaEmail());

    // Close overlays when clicking backdrop
    this.checkpointOverlay?.addEventListener('click', (e) => {
      if (e.target === this.checkpointOverlay) this.closeCheckpointModal();
    });

    this.leaderboardOverlay?.addEventListener('click', (e) => {
      if (e.target === this.leaderboardOverlay) this.closeLeaderboardModal();
    });

    // Supabase Status Badge and SQL Modal listeners
    this.supabaseStatusBadge?.addEventListener('click', () => {
      this.openSqlSetupModal();
    });

    this.closeSqlModalBtn?.addEventListener('click', () => {
      this.closeSqlSetupModal();
    });

    this.sqlSetupModal?.addEventListener('click', (e) => {
      if (e.target === this.sqlSetupModal) this.closeSqlSetupModal();
    });

    this.copySqlBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
        this.copySqlBtn.textContent = 'COPIED TO CLIPBOARD ✓';
        audio.beep(880, 0.1);
        setTimeout(() => {
          this.copySqlBtn.textContent = 'COPY SQL QUERY';
        }, 2000);
      } catch (_) {
        alert('Please copy the SQL query from the code box.');
      }
    });

    this.testSupabaseBtn?.addEventListener('click', async () => {
      this.testSupabaseBtn.textContent = 'CHECKING...';
      await this.refreshSupabaseState(true);
      if (this.isSupabaseConnected) {
        this.testSupabaseBtn.textContent = 'SUCCESS! TABLE READY ✓';
        audio.successChime();
        setTimeout(() => {
          this.closeSqlSetupModal();
          this.testSupabaseBtn.textContent = 'CHECK STATUS';
        }, 1200);
      } else {
        this.testSupabaseBtn.textContent = 'NOT FOUND YET';
        audio.deniedBuzz();
        setTimeout(() => {
          this.testSupabaseBtn.textContent = 'CHECK STATUS';
        }, 1500);
      }
    });

    // Global keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.sqlSetupModal && this.sqlSetupModal.style.display !== 'none') {
          this.closeSqlSetupModal();
        } else if (this.checkpointOverlay.style.display !== 'none') {
          this.closeCheckpointModal();
        } else if (this.leaderboardOverlay.style.display !== 'none') {
          this.closeLeaderboardModal();
        }
      }
    });
  }

  // 5. Team Registration Flow
  openRegistrationModal() {
    this.relayContent.classList.add('blurred');
    this.registrationOverlay.style.display = 'flex';
    this.teamNameInput.value = '';
    if (this.teamLeadInput) this.teamLeadInput.value = '';
    if (this.teamMemberInput) this.teamMemberInput.value = '';
    this.teamCharCount.textContent = '0/50 characters';
    this.registrationSubmitBtn.disabled = true;
    this.registrationError.style.display = 'none';
    setTimeout(() => this.teamNameInput.focus(), 50);
  }

  closeRegistrationModal() {
    this.relayContent.classList.remove('blurred');
    this.registrationOverlay.style.display = 'none';
  }

  handleTeamRegistration() {
    const name = this.teamNameInput.value.trim();
    const lead = this.teamLeadInput ? this.teamLeadInput.value.trim() : 'Lead';
    const member = this.teamMemberInput ? this.teamMemberInput.value.trim() : 'Member';

    if (name.length < 3 || name.length > 50) {
      this.registrationError.textContent = 'ERROR: Team name must be between 3 and 50 characters.';
      this.registrationError.style.display = 'flex';
      audio.deniedBuzz();
      return;
    }

    if (!lead || !member) {
      this.registrationError.textContent = 'ERROR: Please provide both Team Lead and Member names.';
      this.registrationError.style.display = 'flex';
      audio.deniedBuzz();
      return;
    }

    // Animate connecting state
    this.registrationSubmitBtn.disabled = true;
    this.registrationBtnText.textContent = 'REGISTERING...';
    audio.beep(440, 0.08);

    setTimeout(() => {
      this.currentTeam = {
        id: 'team_' + Math.random().toString(36).substring(2, 10),
        name: name,
        lead: lead,
        member: member,
        created_at: new Date().toISOString()
      };
      this.unlockedRooms = [];
      this.roomCompletions = {};
      this.saveState();

      // Store team registration in Supabase database
      syncTeamToSupabase(this.getCurrentTeamRecord());

      audio.successChime();
      this.closeRegistrationModal();
      this.updateTeamBanner();
      this.updateProgressUI();
      this.renderRoomGrid();
      this.renderLeaderboards();
      this.registrationBtnText.textContent = 'START CHALLENGE';
    }, 600);
  }

  updateTeamBanner() {
    if (this.currentTeam) {
      this.teamDisplayName.textContent = this.currentTeam.name;
      if (this.teamLeadName) this.teamLeadName.textContent = this.currentTeam.lead || '—';
      if (this.teamMemberName) this.teamMemberName.textContent = this.currentTeam.member || '—';
      this.teamBanner.style.display = 'flex';
    } else {
      this.teamBanner.style.display = 'none';
    }
  }

  // 6. Rooms Grid Rendering
  renderRoomGrid() {
    this.roomGrid.innerHTML = '';

    ROOMS_DATA.forEach((room) => {
      const isUnlocked = this.unlockedRooms.includes(room.id);
      const completionTime = this.roomCompletions[room.id];
      const timeStr = completionTime
        ? new Date(completionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';

      const button = document.createElement('button');
      button.className = `room-tile ${isUnlocked ? 'unlocked' : ''}`;
      button.setAttribute('aria-label', `Room ${room.id}: ${room.title}`);

      // Lock or Open SVG Icon
      const iconSvg = isUnlocked
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-open"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

      button.innerHTML = `
        ${iconSvg}
        <div class="room-copy">
          <div class="room-status ${isUnlocked ? 'text-primary' : ''}">${isUnlocked ? 'ACCESS GRANTED' : 'LOCKED'}</div>
          ${isUnlocked && timeStr ? `<div class="room-solved-time">SOLVED ${timeStr}</div>` : ''}
          <div class="room-title">${room.title}</div>
          <div class="room-number">ROOM ${String(room.id).padStart(2, '0')}</div>
        </div>
      `;

      button.addEventListener('click', () => {
        audio.beep(750, 0.05);
        this.openCheckpointModal(room.id);
      });

      this.roomGrid.appendChild(button);
    });
  }

  // 7. Checkpoint Modal Logic
  openCheckpointModal(roomId) {
    const room = ROOMS_DATA.find((r) => r.id === roomId);
    if (!room) return;

    this.activeRoomId = roomId;
    const isUnlocked = this.unlockedRooms.includes(roomId);

    this.checkpointRoomTitle.textContent = room.title.toUpperCase();
    this.checkpointTargetNumber.textContent = `ROOM ${String(roomId).padStart(2, '0')}`;
    this.checkpointEncryptedKey.textContent = room.encrypted;

    // Render Hints
    this.checkpointHintsList.innerHTML = room.hints
      .map((hint, i) => `<p><span>0${i + 1}</span>“${hint}”</p>`)
      .join('');

    // Input & Button states
    this.accessKeyInput.value = '';
    this.checkpointFeedback.style.display = 'none';
    this.checkpointFeedback.classList.remove('granted');

    if (isUnlocked) {
      this.checkpointStatusText.textContent = 'CHAMBER UNLOCKED';
      this.accessKeyInput.value = room.acceptedAnswers[0];
      this.accessKeyInput.disabled = true;
      this.checkpointAuthBtn.disabled = true;
      this.checkpointAbortBtn.textContent = 'CONTINUE';

      this.checkpointFeedback.classList.add('granted');
      this.checkpointFeedback.style.display = 'flex';
      this.checkpointFeedbackIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path>`;
      this.checkpointFeedbackMsg.textContent = 'ACCESS GRANTED — CHAMBER UNLOCKED';
    } else {
      this.checkpointStatusText.textContent = 'AUTHENTICATION REQUIRED';
      this.accessKeyInput.disabled = false;
      this.checkpointAuthBtn.disabled = false;
      this.checkpointAuthBtn.textContent = 'AUTHENTICATE';
      this.checkpointAbortBtn.textContent = 'ABORT';
      setTimeout(() => this.accessKeyInput.focus(), 60);
    }

    this.relayContent.classList.add('blurred');
    this.checkpointOverlay.style.display = 'flex';
  }

  closeCheckpointModal() {
    this.relayContent.classList.remove('blurred');
    this.checkpointOverlay.style.display = 'none';
    this.activeRoomId = null;
  }

  handleAnswerSubmit() {
    if (this.activeRoomId === null) return;
    const room = ROOMS_DATA.find((r) => r.id === this.activeRoomId);
    if (!room) return;

    const isUnlocked = this.unlockedRooms.includes(room.id);
    if (isUnlocked) {
      this.closeCheckpointModal();
      return;
    }

    const rawInput = this.accessKeyInput.value.trim();
    if (!rawInput) {
      audio.deniedBuzz();
      return;
    }

    const normalized = rawInput.toLowerCase();
    const isCorrect = room.acceptedAnswers.some(
      (ans) => ans.toLowerCase() === normalized
    );

    this.checkpointAuthBtn.disabled = true;
    this.checkpointAuthBtn.textContent = 'CHECKING...';

    setTimeout(() => {
      this.checkpointAuthBtn.disabled = false;
      this.checkpointAuthBtn.textContent = 'AUTHENTICATE';

      if (isCorrect) {
        audio.successChime();
        this.unlockedRooms.push(room.id);
        this.roomCompletions[room.id] = new Date().toISOString();
        this.saveState();

        // Sync score and completion timings to Supabase
        syncTeamToSupabase(this.getCurrentTeamRecord());

        this.checkpointStatusText.textContent = 'CHAMBER UNLOCKED';
        this.accessKeyInput.disabled = true;
        this.checkpointAuthBtn.disabled = true;
        this.checkpointAbortBtn.textContent = 'CONTINUE';

        this.checkpointFeedback.classList.add('granted');
        this.checkpointFeedback.style.display = 'flex';
        this.checkpointFeedbackIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path>`;
        this.checkpointFeedbackMsg.textContent = 'ACCESS GRANTED — CHAMBER UNLOCKED';

        this.updateProgressUI();
        this.renderRoomGrid();
        this.renderLeaderboards();
      } else {
        audio.deniedBuzz();
        this.checkpointFeedback.classList.remove('granted');
        this.checkpointFeedback.style.display = 'flex';
        this.checkpointFeedbackIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>`;
        this.checkpointFeedbackMsg.textContent = 'ACCESS DENIED';
        this.accessKeyInput.focus();
      }
    }, 450);
  }

  // 8. Progress Calculation
  updateProgressUI() {
    const count = this.unlockedRooms.length;
    this.progressFraction.textContent = `${count}/9`;
    this.missionProgressBar.value = count;

    if (count === 9) {
      this.progressCaption.textContent = 'ALL SYSTEMS COMPROMISED ✓';
      this.progressCaption.classList.add('completed');
    } else {
      const pct = Math.round((count / 9) * 100);
      this.progressCaption.textContent = `${pct}% COMPLETE`;
      this.progressCaption.classList.remove('completed');
    }
  }

  // Admin Authorization: Restricted to team "erroris"
  isAdminTeam() {
    return !!(this.currentTeam && this.currentTeam.name.trim().toLowerCase() === 'erroris');
  }

  // Reset & Clear Leaderboard (erroris admin only)
  promptClearLeaderboard() {
    if (!this.isAdminTeam()) {
      audio.deniedBuzz();
      alert('ACCESS DENIED: Root reset privileges are exclusively reserved for team "erroris".');
      return;
    }

    const ok = confirm('Reset the leaderboard? All recorded scores and rankings will be cleared.');
    if (!ok) return;

    audio.beep(400, 0.1, 'sawtooth');
    this.rivalTeams = [];
    localStorage.removeItem('mystrix_rival_teams');

    // Also reset active team mission progress
    this.unlockedRooms = [];
    this.roomCompletions = {};
    localStorage.removeItem('mystrix_team_progress');

    // Clear remote Supabase database for all players
    clearAllTeamsFromSupabase();

    this.saveState();
    this.updateProgressUI();
    this.renderRoomGrid();
    this.renderLeaderboards();
  }

  // Share Leaderboard via Email to vabhijit516@gmail.com
  shareLeaderboardViaEmail() {
    const teams = this.getSortedLeaderboard();
    const recipient = 'vabhijit516@gmail.com';
    const dateStr = new Date().toLocaleString();

    let body = `MYSTRIX — NINE ENCRYPTED ROOMS\n`;
    body += `OFFICIAL LEADERBOARD REPORT\n`;
    body += `Target Recipient: ${recipient}\n`;
    body += `Report Timestamp: ${dateStr}\n`;
    body += `Total Recorded Teams: ${teams.length}\n`;
    body += `Admin Clearance: Restricted to team "erroris"\n\n`;

    body += `========================================\n`;
    body += `CURRENT STANDINGS & RANKINGS:\n`;
    body += `========================================\n`;

    if (teams.length === 0) {
      body += `No teams on record yet.\n`;
    } else {
      teams.forEach((t, i) => {
        const rank = String(i + 1).padStart(2, '0');
        const lastSolve = t.last_completed_at ? new Date(t.last_completed_at).toLocaleString() : 'None';
        body += `Rank ${rank}: ${t.name} — Progress: ${t.completed_count}/9 rooms — Last Solved: ${lastSolve}\n`;
        
        if (t.completions && t.completions.length > 0) {
          const detailStamps = t.completions
            .sort((a, b) => a.room_id - b.room_id)
            .map(c => `  • Room ${String(c.room_id).padStart(2, '0')}: Solved at ${new Date(c.completed_at).toLocaleTimeString()}`)
            .join('\n');
          body += `${detailStamps}\n`;
        }
        body += `\n`;
      });
    }

    body += `========================================\n`;
    body += `Nine Chambers Reference Solutions:\n`;
    body += `R01: neonX21 | R02: vector99 | R03: matrix08\n`;
    body += `R04: 7glitch  | R05: 31decoded| R06: binary72\n`;
    body += `R07: kernel91 | R08: proxy33  | R09: quantum6\n`;
    body += `========================================\n`;

    const subject = `[Mystrix CTF] Leaderboard Standings & Question Timestamps - ${dateStr}`;
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body);
      }
    } catch (_) {}

    audio.beep(880, 0.1, 'sine');
    window.open(mailtoUrl, '_blank');
    alert(`Leaderboard report prepared for ${recipient} and copied to clipboard!`);
  }

  // 9. Shared Leaderboards Rendering
  getSortedLeaderboard() {
    const list = this.rivalTeams.map((t) => ({
      ...t,
      completed_count: Number(t.completed_count || 0),
      completions: Array.isArray(t.completions)
        ? t.completions
        : (t.room_completions && typeof t.room_completions === 'object'
            ? Object.entries(t.room_completions).map(([rid, dt]) => ({ room_id: Number(rid), completed_at: dt }))
            : []),
      isCurrentTeam: false
    }));

    if (this.currentTeam) {
      const record = this.getCurrentTeamRecord();
      const userTeamEntry = {
        ...record,
        isCurrentTeam: true
      };
      // Ensure no duplicate if current team is also in rival list
      const filtered = list.filter((t) => t.id !== this.currentTeam.id);
      filtered.push(userTeamEntry);
      list.length = 0;
      list.push(...filtered);
    }

    // Sort: most completed rooms first; if tied, earliest last_completed_at wins
    list.sort((a, b) => {
      const aCount = Number(a.completed_count || 0);
      const bCount = Number(b.completed_count || 0);
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      if (a.last_completed_at && b.last_completed_at) {
        return new Date(a.last_completed_at) - new Date(b.last_completed_at);
      }
      if (a.last_completed_at && !b.last_completed_at) return -1;
      if (!a.last_completed_at && b.last_completed_at) return 1;
      return 0;
    });

    return list;
  }

  renderLeaderboards() {
    const teams = this.getSortedLeaderboard();
    const countText = `${teams.length} ${teams.length === 1 ? 'TEAM' : 'TEAMS'}`;
    if (this.teamsCountBadge) this.teamsCountBadge.textContent = countText;
    if (this.fullTeamsCountBadge) this.fullTeamsCountBadge.textContent = countText;

    // Admin Clearance: Only team "erroris" sees the Reset Button
    const isAdmin = this.isAdminTeam();
    if (this.clearLeaderboardBtn) {
      this.clearLeaderboardBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    if (this.fullClearLeaderboardBtn) {
      this.fullClearLeaderboardBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    // Compact Leaderboard
    if (this.leaderboardCompactBody) {
      if (teams.length === 0) {
        this.leaderboardCompactBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="5" class="leaderboard-empty">NO TEAMS ON RECORD — CLAIM RANK 01</td>
          </tr>
        `;
      } else {
        this.leaderboardCompactBody.innerHTML = teams
          .map((team, idx) => {
            const rank = String(idx + 1).padStart(2, '0');
            const isMe = team.isCurrentTeam ? 'current-team-row' : '';
            const lastTimeStr = team.last_completed_at
              ? new Date(team.last_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—';
            
            // Latest solved question
            const latestCompletion = (team.completions && team.completions.length > 0)
              ? team.completions[team.completions.length - 1]
              : null;
            const roomLabel = latestCompletion ? `ROOM 0${latestCompletion.room_id}` : '';

            return `
              <tr class="${isMe}">
                <td>${rank}</td>
                <td><strong>${team.name}</strong></td>
                <td>
                  <div class="team-members-cell">
                    <span class="lead-line"><span class="badge-role">LEAD:</span> ${team.lead || '—'}</span>
                    <span class="member-line"><span class="badge-role">MEMBER:</span> ${team.member || '—'}</span>
                  </div>
                </td>
                <td>
                  <span class="text-accent">${team.completed_count}/9</span>
                  <progress class="mission-progress" value="${team.completed_count}" max="9" aria-label="${team.name} progress"></progress>
                </td>
                <td>
                  <div class="solve-time-tag">
                    ${roomLabel ? `<span class="room-ref">${roomLabel}</span>` : ''}
                    <span>${lastTimeStr}</span>
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // Full Detailed Leaderboard
    if (this.leaderboardFullBody) {
      if (teams.length === 0) {
        this.leaderboardFullBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="6" class="leaderboard-empty">NO REGISTERED TEAMS ON RECORD</td>
          </tr>
        `;
      } else {
        this.leaderboardFullBody.innerHTML = teams
          .map((team, idx) => {
            const rank = String(idx + 1).padStart(2, '0');
            const isMe = team.isCurrentTeam ? 'current-team-row' : '';
            const lastDateStr = team.last_completed_at
              ? new Date(team.last_completed_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: '2-digit', day: '2-digit', year: 'numeric' })
              : '—';

            // Room badges 1-9
            const roomBadges = ROOMS_DATA.map((room) => {
              const completion = team.completions?.find((c) => c.room_id === room.id);
              const isSolved = !!completion;
              const solveTimeStr = isSolved ? new Date(completion.completed_at).toLocaleTimeString() : '';
              const tooltip = isSolved
                ? `${room.title} — Solved at ${solveTimeStr}`
                : `${room.title} — Locked`;

              return `
                <span class="${isSolved ? 'solved' : ''}" title="${tooltip}">
                  ${isSolved ? '✓' : room.id}
                </span>
              `;
            }).join('');

            // Individual Question Finishing Times Breakdown
            const roomStamps = (team.completions || [])
              .sort((a, b) => a.room_id - b.room_id)
              .map(c => `
                <span class="room-stamp" title="Room ${c.room_id} finished at ${new Date(c.completed_at).toLocaleTimeString()}">
                  R0${c.room_id}: ${new Date(c.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              `)
              .join('');

            return `
              <tr class="${isMe}">
                <td>${rank}</td>
                <td><strong>${team.name}</strong></td>
                <td>
                  <div class="team-members-cell">
                    <span class="lead-line"><span class="badge-role">LEAD:</span> ${team.lead || '—'}</span>
                    <span class="member-line"><span class="badge-role">MEMBER:</span> ${team.member || '—'}</span>
                  </div>
                </td>
                <td>
                  <span class="text-accent">${team.completed_count}/9</span>
                  <progress class="mission-progress" value="${team.completed_count}" max="9" aria-label="${team.name} progress"></progress>
                </td>
                <td>
                  <div class="leaderboard-rooms">${roomBadges}</div>
                  ${roomStamps ? `<div class="team-solved-breakdown">${roomStamps}</div>` : ''}
                </td>
                <td style="font-size: 11px; color: var(--muted-foreground);">${lastDateStr}</td>
              </tr>
            `;
          })
          .join('');
      }
    }
  }

  openLeaderboardModal() {
    audio.beep(800, 0.05);
    this.renderLeaderboards();
    this.relayContent.classList.add('blurred');
    this.leaderboardOverlay.style.display = 'flex';
  }

  closeLeaderboardModal() {
    this.relayContent.classList.remove('blurred');
    this.leaderboardOverlay.style.display = 'none';
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.__mystrixApp = new MystrixApp();
});
