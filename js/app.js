/**
 * app.js - Main application controller (multi-team support)
 */

const App = {
    currentTool: 'select',
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    onDrawingChange: null,

    // Team state
    teams: [],
    activeTeamId: null,

    colors: {
        jersey: '#e74c3c',
        text: '#ffffff',
        gk: '#f39c12',
    },

    init() {
        // Initialize modules
        Pitch.init('pitch-canvas');
        Players.init('pitch-overlay');
        Drawing.init('draw-canvas');

        // Setup overlay positioning
        this._syncOverlay();

        // Bind events
        this._bindControls();
        this._bindKeyboard();
        this._bindResize();

        // Track position changes for undo
        Players.onPositionChange = () => {
            this._saveState();
            this._persistTeams();
        };
        this.onDrawingChange = () => this._saveState();

        // Load teams (async — sets up formations after)
        this._loadTeams();
    },

    // === Team Management ===

    async _loadTeams() {
        const result = await Sync.load();
        if (result && result.data && result.data.teams && result.data.teams.length > 0) {
            this.teams = result.data.teams;
            this.activeTeamId = result.data.activeTeam || this.teams[0].id;
        } else {
            // Default: one empty team
            this.teams = [{
                id: Sync.generateId(),
                name: 'Team A',
                colors: { jersey: '#e74c3c', text: '#ffffff', gk: '#f39c12' },
                formation: '4-3-3',
                playerCount: 11,
                players: [],
            }];
            this.activeTeamId = this.teams[0].id;
        }

        this._populateTeamSelect();
        this._switchToTeam(this.activeTeamId);
        this._persistTeams();
    },

    _getActiveTeam() {
        return this.teams.find(t => t.id === this.activeTeamId) || this.teams[0];
    },

    _populateTeamSelect() {
        const select = document.getElementById('team-select');
        select.innerHTML = this.teams.map(t =>
            `<option value="${t.id}" ${t.id === this.activeTeamId ? 'selected' : ''}>${t.name}</option>`
        ).join('');
    },

    _switchToTeam(teamId) {
        // Save current team state before switching
        this._saveCurrentTeamState();

        this.activeTeamId = teamId;
        const team = this._getActiveTeam();

        // Apply team colors
        this.colors = { ...team.colors };
        document.getElementById('jersey-color').value = this.colors.jersey;
        document.getElementById('text-color').value = this.colors.text;
        document.getElementById('gk-color').value = this.colors.gk;
        document.getElementById('team-name').value = team.name;

        // Apply formation
        const playerCount = team.playerCount || 11;
        document.getElementById('player-count').value = playerCount;
        this._populateFormationSelect(playerCount);

        // Parse formation to get lines
        const formationStr = team.formation || '4-3-3';
        const parsed = Formations.parseCustom(formationStr);
        let lines = [4, 3, 3];
        if (parsed.valid) {
            lines = parsed.lines;
            // Select matching preset
            const formations = Formations.getFormations(playerCount);
            const matchIdx = formations.findIndex(f => f.name === formationStr);
            if (matchIdx >= 0) {
                document.getElementById('formation-select').value = matchIdx;
            }
        }

        // Generate positions
        const { width, height } = Pitch.getDimensions();
        const positions = Formations.generatePositions(lines, width, height);

        // Apply saved player data (names, numbers, roles) over generated positions
        if (team.players && team.players.length > 0) {
            positions.forEach((pos, i) => {
                if (team.players[i]) {
                    if (team.players[i].name) pos.name = team.players[i].name;
                    if (team.players[i].number) pos.number = team.players[i].number;
                    if (team.players[i].role) pos.role = team.players[i].role;
                }
            });
        }

        Players.setPlayers(positions, this.colors);
        this._updatePlayerList();

        // Clear drawings when switching teams
        Drawing.clear();

        // Update team select
        document.getElementById('team-select').value = teamId;

        // Reset history for new team context
        this.history = [];
        this.historyIndex = -1;
        this._saveState();
    },

    _saveCurrentTeamState() {
        if (!this.activeTeamId) return;
        const team = this._getActiveTeam();
        if (!team) return;

        team.name = document.getElementById('team-name').value || team.name;
        team.colors = { ...this.colors };
        team.playerCount = parseInt(document.getElementById('player-count').value) || 11;
        
        const formSelect = document.getElementById('formation-select');
        const count = team.playerCount;
        const formations = Formations.getFormations(count);
        const idx = parseInt(formSelect.value) || 0;
        if (formations[idx]) {
            team.formation = formations[idx].name;
        }

        // Save player names/numbers/roles
        team.players = Players.players.map(p => ({
            number: p.number,
            name: p.name || '',
            role: p.role || '',
        }));
    },

    _addTeam() {
        const name = prompt('New team name:', `Team ${String.fromCharCode(65 + this.teams.length)}`);
        if (!name) return;

        const newTeam = {
            id: Sync.generateId(),
            name,
            colors: { jersey: '#3498db', text: '#ffffff', gk: '#f39c12' },
            formation: '4-3-3',
            playerCount: 11,
            players: [],
        };

        this.teams.push(newTeam);
        this._populateTeamSelect();
        this._switchToTeam(newTeam.id);
        this._persistTeams();
        this._showToast(`Team "${name}" created`);
    },

    _deleteTeam() {
        if (this.teams.length <= 1) {
            this._showToast('Cannot delete the only team');
            return;
        }
        const team = this._getActiveTeam();
        if (!confirm(`Delete team "${team.name}"?`)) return;

        this.teams = this.teams.filter(t => t.id !== this.activeTeamId);
        this.activeTeamId = this.teams[0].id;
        this._populateTeamSelect();
        this._switchToTeam(this.activeTeamId);
        this._persistTeams();
        this._showToast('Team deleted');
    },

    _persistTeams() {
        this._saveCurrentTeamState();
        Sync.save({
            activeTeam: this.activeTeamId,
            teams: this.teams,
        });
    },

    // === Formation ===

    _syncOverlay() {
        const { width, height, offsetX, offsetY } = Pitch.getDimensions();
        const overlay = document.getElementById('pitch-overlay');
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
        overlay.style.left = offsetX + 'px';
        overlay.style.top = offsetY + 'px';
        Drawing.resize(width, height, offsetX, offsetY);
    },

    _bindControls() {
        // Mobile panel toggle
        const panelBtn = document.getElementById('btn-panel');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');

        const openPanel = () => {
            sidebar.classList.add('open');
            backdrop.classList.add('visible');
            panelBtn.textContent = '✕ Close';
        };
        const closePanel = () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('visible');
            panelBtn.textContent = '⚙️ Controls';
        };

        if (panelBtn) {
            panelBtn.addEventListener('click', () => {
                sidebar.classList.contains('open') ? closePanel() : openPanel();
            });
            if (backdrop) backdrop.addEventListener('click', closePanel);
        }

        // Mobile action buttons
        const mobileUndo = document.getElementById('btn-undo-mobile');
        const mobileRedo = document.getElementById('btn-redo-mobile');
        const mobileSave = document.getElementById('btn-save-mobile');
        const mobileLoad = document.getElementById('btn-load-mobile');
        const mobileExport = document.getElementById('btn-export-mobile');
        if (mobileUndo) mobileUndo.addEventListener('click', () => this.undo());
        if (mobileRedo) mobileRedo.addEventListener('click', () => this.redo());
        if (mobileSave) mobileSave.addEventListener('click', () => this._showSaveDialog());
        if (mobileLoad) mobileLoad.addEventListener('click', () => this._showLoadDialog());
        if (mobileExport) mobileExport.addEventListener('click', () => this._exportPNG());

        // === Team controls ===
        document.getElementById('team-select').addEventListener('change', (e) => {
            this._switchToTeam(e.target.value);
            this._persistTeams();
        });
        document.getElementById('btn-add-team').addEventListener('click', () => this._addTeam());
        document.getElementById('btn-delete-team').addEventListener('click', () => this._deleteTeam());

        document.getElementById('team-name').addEventListener('change', () => {
            const team = this._getActiveTeam();
            team.name = document.getElementById('team-name').value;
            this._populateTeamSelect();
            document.getElementById('team-select').value = this.activeTeamId;
            this._persistTeams();
        });

        // === Formation controls ===
        const countInput = document.getElementById('player-count');
        countInput.addEventListener('change', () => {
            const count = Math.max(1, Math.min(11, parseInt(countInput.value) || 11));
            countInput.value = count;
            this._populateFormationSelect(count);
            const formations = Formations.getFormations(count);
            if (formations.length > 0) {
                this._applyFormation(formations[0].lines);
            }
            this._persistTeams();
        });

        const formSelect = document.getElementById('formation-select');
        formSelect.addEventListener('change', () => {
            const idx = parseInt(formSelect.value);
            const count = parseInt(countInput.value) || 11;
            const formations = Formations.getFormations(count);
            if (formations[idx]) {
                this._applyFormation(formations[idx].lines);
                this._persistTeams();
            }
        });

        // Custom formation
        document.getElementById('btn-apply-custom').addEventListener('click', () => {
            const input = document.getElementById('formation-custom').value;
            const result = Formations.parseCustom(input);
            if (result.valid) {
                countInput.value = result.total;
                this._populateFormationSelect(result.total);
                this._applyFormation(result.lines);
                const formations = Formations.getFormations(result.total);
                const matchIdx = formations.findIndex(f => f.name === result.name);
                if (matchIdx >= 0) formSelect.value = matchIdx;
                this._persistTeams();
            } else {
                alert(result.error);
            }
        });

        document.getElementById('formation-custom').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-apply-custom').click();
        });

        // Reset positions
        document.getElementById('btn-reset-positions').addEventListener('click', () => {
            const count = parseInt(countInput.value) || 11;
            const formations = Formations.getFormations(count);
            const idx = parseInt(formSelect.value) || 0;
            if (formations[idx]) {
                this._applyFormation(formations[idx].lines);
                this._persistTeams();
            }
        });

        // === Colors ===
        document.getElementById('jersey-color').addEventListener('input', (e) => {
            this.colors.jersey = e.target.value;
            this._rerenderPlayers();
            this._persistTeams();
        });
        document.getElementById('text-color').addEventListener('input', (e) => {
            this.colors.text = e.target.value;
            this._rerenderPlayers();
            this._persistTeams();
        });
        document.getElementById('gk-color').addEventListener('input', (e) => {
            this.colors.gk = e.target.value;
            this._rerenderPlayers();
            this._persistTeams();
        });

        // === Drawing tools ===
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                Drawing.setTool(this.currentTool);
            });
        });

        document.getElementById('draw-color').addEventListener('input', (e) => {
            Drawing.setColor(e.target.value);
        });

        document.getElementById('btn-clear-drawings').addEventListener('click', () => {
            Drawing.clear();
            this._saveState();
        });

        // Undo/Redo
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());

        // Save/Load/Export
        document.getElementById('btn-save').addEventListener('click', () => this._showSaveDialog());
        document.getElementById('btn-load').addEventListener('click', () => this._showLoadDialog());
        document.getElementById('btn-export').addEventListener('click', () => this._exportPNG());

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => this._hideModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._hideModal();
        });

        // Player edit popup
        document.getElementById('btn-save-player').addEventListener('click', () => this._savePlayerEdit());
        document.getElementById('btn-cancel-player').addEventListener('click', () => this._hidePlayerEdit());

        document.addEventListener('click', (e) => {
            const popup = document.getElementById('player-edit-popup');
            if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
                const nodes = document.querySelectorAll('.player-node');
                let clickedNode = false;
                nodes.forEach(n => { if (n.contains(e.target)) clickedNode = true; });
                if (!clickedNode) this._hidePlayerEdit();
            }
        });

        // Share roster link button
        document.getElementById('btn-share-roster').addEventListener('click', () => this._copyShareLink());
    },

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
            if (e.key === 'Escape') {
                document.querySelector('[data-tool="select"]').click();
                this._hidePlayerEdit();
            }
        });
    },

    _bindResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldDim = Pitch.getDimensions();
                const newDim = Pitch.resize();
                this._syncOverlay();

                if (oldDim.width && oldDim.height) {
                    const scaleX = newDim.width / oldDim.width;
                    const scaleY = newDim.height / oldDim.height;
                    Players.players.forEach(p => {
                        p.x *= scaleX;
                        p.y *= scaleY;
                    });
                    Drawing.drawings.forEach(d => {
                        if (d.start) { d.start.x *= scaleX; d.start.y *= scaleY; }
                        if (d.end) { d.end.x *= scaleX; d.end.y *= scaleY; }
                        if (d.path) d.path.forEach(p => { p.x *= scaleX; p.y *= scaleY; });
                    });
                }

                this._rerenderPlayers();
                Drawing.redraw();
            }, 150);
        });
    },

    _populateFormationSelect(totalPlayers) {
        const select = document.getElementById('formation-select');
        const formations = Formations.getFormations(totalPlayers);
        select.innerHTML = formations.map((f, i) =>
            `<option value="${i}">${f.name}</option>`
        ).join('');
    },

    _applyFormation(lines) {
        const { width, height } = Pitch.getDimensions();
        const positions = Formations.generatePositions(lines, width, height);

        // Preserve existing names/numbers where possible
        const oldPlayers = Players.players;
        positions.forEach((pos, i) => {
            if (oldPlayers[i]) {
                pos.name = oldPlayers[i].name;
                if (oldPlayers[i].number) pos.number = oldPlayers[i].number;
            }
        });

        Players.setPlayers(positions, this.colors);
        this._updatePlayerList();
        this._saveState();
    },

    _rerenderPlayers() {
        Players.render(this.colors);
        this._updatePlayerList();
    },

    _updatePlayerList() {
        const container = document.getElementById('player-list');
        Players.renderList(container, this.colors);
    },

    // === State Management (Undo/Redo) ===

    _saveState() {
        const state = {
            players: Players.getState(),
            drawings: Drawing.getState(),
            colors: { ...this.colors },
            teamName: document.getElementById('team-name').value,
        };

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.stringify(state));
        if (this.history.length > this.maxHistory) this.history.shift();
        this.historyIndex = this.history.length - 1;
        this._updateUndoRedoButtons();
    },

    _restoreState(stateStr) {
        const state = JSON.parse(stateStr);

        this.colors = state.colors;
        document.getElementById('jersey-color').value = state.colors.jersey;
        document.getElementById('text-color').value = state.colors.text;
        document.getElementById('gk-color').value = state.colors.gk;
        document.getElementById('team-name').value = state.teamName || '';

        Players.players = state.players;
        Players.render(this.colors);
        this._updatePlayerList();

        Drawing.setState(state.drawings);
    },

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this._restoreState(this.history[this.historyIndex]);
            this._updateUndoRedoButtons();
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this._restoreState(this.history[this.historyIndex]);
            this._updateUndoRedoButtons();
        }
    },

    _updateUndoRedoButtons() {
        document.getElementById('btn-undo').disabled = this.historyIndex <= 0;
        document.getElementById('btn-redo').disabled = this.historyIndex >= this.history.length - 1;
    },

    // === Save/Load ===

    _showSaveDialog() {
        const name = prompt('Formation name:', document.getElementById('team-name').value || 'My Formation');
        if (!name) return;

        const state = {
            players: Players.getState(),
            drawings: Drawing.getState(),
            colors: { ...this.colors },
            teamName: document.getElementById('team-name').value,
            formation: document.getElementById('formation-select').selectedOptions[0]?.text || '',
            playerCount: parseInt(document.getElementById('player-count').value),
        };

        Storage.save(name, state);
        alert('Formation saved!');
    },

    _showLoadDialog() {
        const saves = Storage.getAll();
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Saved Formations';

        if (saves.length === 0) {
            body.innerHTML = '<p class="no-saves">No saved formations yet.</p>';
        } else {
            body.innerHTML = saves.map(s => `
                <div class="saved-item" data-id="${s.id}">
                    <div>
                        <div class="saved-name">${s.name}</div>
                        <div class="saved-meta">${s.state.formation || ''} · ${new Date(s.date).toLocaleDateString()}</div>
                    </div>
                    <div class="saved-item-actions">
                        <button class="btn btn-small btn-primary btn-load-item" data-id="${s.id}">Load</button>
                        <button class="btn btn-small btn-secondary btn-delete-item" data-id="${s.id}">🗑️</button>
                    </div>
                </div>
            `).join('');

            body.querySelectorAll('.btn-load-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const save = Storage.load(btn.dataset.id);
                    if (save) {
                        this._loadState(save.state);
                        this._hideModal();
                    }
                });
            });

            body.querySelectorAll('.btn-delete-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('Delete this formation?')) {
                        Storage.delete(btn.dataset.id);
                        this._showLoadDialog();
                    }
                });
            });
        }

        modal.classList.remove('hidden');
    },

    _loadState(state) {
        document.getElementById('player-count').value = state.playerCount || state.players.length;
        this._populateFormationSelect(state.playerCount || state.players.length);

        this.colors = state.colors || this.colors;
        document.getElementById('jersey-color').value = this.colors.jersey;
        document.getElementById('text-color').value = this.colors.text;
        document.getElementById('gk-color').value = this.colors.gk;
        document.getElementById('team-name').value = state.teamName || '';

        Players.players = state.players;
        Players.render(this.colors);
        this._updatePlayerList();

        Drawing.setState(state.drawings);
        this._saveState();
        this._persistTeams();
    },

    _hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    // === Player Edit ===

    _savePlayerEdit() {
        const id = Players.editingPlayer;
        if (id === null) return;

        Players.updateInfo(id, {
            name: document.getElementById('edit-player-name').value.trim(),
            number: parseInt(document.getElementById('edit-player-number').value) || id + 1,
            role: document.getElementById('edit-player-role').value.trim().toUpperCase(),
        });

        this._rerenderPlayers();
        this._hidePlayerEdit();
        this._saveState();
        this._persistTeams();
    },

    _hidePlayerEdit() {
        document.getElementById('player-edit-popup').classList.add('hidden');
        Players.editingPlayer = null;
    },

    // === Share Link ===

    async _copyShareLink() {
        this._persistTeams();
        const ok = await Sync.copyLink();
        if (ok) {
            this._showToast('Link copied! Open on any device to load all your teams.');
        } else {
            this._showToast('Could not copy — check browser permissions.');
        }
    },

    // === Toast ===

    _showToast(message) {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
    },

    // === Export ===

    _exportPNG() {
        const { width, height } = Pitch.getDimensions();

        const exportCanvas = document.createElement('canvas');
        const dpr = 2;
        exportCanvas.width = width * dpr;
        exportCanvas.height = height * dpr;
        const ctx = exportCanvas.getContext('2d');
        ctx.scale(dpr, dpr);

        ctx.drawImage(Pitch.canvas, 0, 0, width, height);
        ctx.drawImage(Drawing.canvas, 0, 0, width, height);

        Players.players.forEach(player => {
            const bgColor = player.isGK ? this.colors.gk : this.colors.jersey;

            ctx.beginPath();
            ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = this.colors.text;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.number, player.x, player.y);

            const label = player.name || player.role;
            if (label) {
                ctx.font = '9px Inter, sans-serif';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 3;
                ctx.fillText(label, player.x, player.y + 26);
                ctx.shadowBlur = 0;
            }
        });

        const teamName = document.getElementById('team-name').value;
        if (teamName) {
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(teamName, 16, 16);
        }

        const link = document.createElement('a');
        link.download = `formation-${teamName || 'export'}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
