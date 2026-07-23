/**
 * players.js - Player node management and drag-and-drop
 */

const Players = {
    players: [],
    overlay: null,
    editingPlayer: null,
    onPositionChange: null,

    init(overlayId) {
        this.overlay = document.getElementById(overlayId);
    },

    /**
     * Set all players from formation positions
     */
    setPlayers(positions, colors) {
        this.players = positions.map((pos, i) => ({
            id: i,
            x: pos.x,
            y: pos.y,
            number: pos.number || i + 1,
            name: pos.name || '',
            role: pos.role || '',
            isGK: i === 0,
        }));
        this.render(colors);
    },

    /**
     * Update a single player's position
     */
    updatePosition(id, x, y) {
        const player = this.players[id];
        if (player) {
            player.x = x;
            player.y = y;
        }
    },

    /**
     * Update a player's info
     */
    updateInfo(id, { name, number, role }) {
        const player = this.players[id];
        if (player) {
            if (name !== undefined) player.name = name;
            if (number !== undefined) player.number = number;
            if (role !== undefined) player.role = role;
        }
    },

    /**
     * Get current state for saving
     */
    getState() {
        return this.players.map(p => ({ ...p }));
    },

    /**
     * Render all player nodes
     */
    render(colors) {
        this.overlay.innerHTML = '';

        this.players.forEach((player, i) => {
            const node = document.createElement('div');
            node.className = 'player-node';
            node.dataset.id = i;
            
            const bgColor = player.isGK ? colors.gk : colors.jersey;
            node.style.backgroundColor = bgColor;
            node.style.color = colors.text;
            node.style.left = player.x + 'px';
            node.style.top = player.y + 'px';
            
            node.textContent = player.number;

            // Label below
            const label = document.createElement('span');
            label.className = 'player-label';
            label.textContent = player.name || player.role;
            node.appendChild(label);

            // Drag events
            this._setupDrag(node, i);

            // Double-click to edit (desktop)
            node.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this._showEditPopup(i, e);
            });

            // Long-press to edit (mobile)
            this._setupLongPress(node, i);

            this.overlay.appendChild(node);
        });
    },

    /**
     * Re-position nodes without full re-render (for resize)
     */
    reposition() {
        const nodes = this.overlay.querySelectorAll('.player-node');
        nodes.forEach((node) => {
            const id = parseInt(node.dataset.id);
            const player = this.players[id];
            if (player) {
                node.style.left = player.x + 'px';
                node.style.top = player.y + 'px';
            }
        });
    },

    /**
     * Setup long-press to edit (mobile-friendly)
     */
    _setupLongPress(node, playerId) {
        let pressTimer = null;
        let didLongPress = false;
        let startTouch = null;

        const LONG_PRESS_MS = 500;
        const MOVE_THRESHOLD = 10;

        node.addEventListener('touchstart', (e) => {
            didLongPress = false;
            const touch = e.touches[0];
            startTouch = { x: touch.clientX, y: touch.clientY };

            pressTimer = setTimeout(() => {
                didLongPress = true;
                // Vibrate if available
                if (navigator.vibrate) navigator.vibrate(30);
                this._showEditPopup(playerId, { target: node, clientX: startTouch.x, clientY: startTouch.y });
            }, LONG_PRESS_MS);
        }, { passive: true });

        node.addEventListener('touchmove', (e) => {
            if (!startTouch) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - startTouch.x);
            const dy = Math.abs(touch.clientY - startTouch.y);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                clearTimeout(pressTimer);
            }
        }, { passive: true });

        node.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
            startTouch = null;
        });

        node.addEventListener('touchcancel', () => {
            clearTimeout(pressTimer);
            startTouch = null;
        });

        // Store flag so drag handler can skip if long-press fired
        node._longPress = { get fired() { return didLongPress; }, reset() { didLongPress = false; } };
    },

    /**
     * Setup drag-and-drop for a player node
     */
    _setupDrag(node, playerId) {
        let isDragging = false;
        let startX, startY;

        const onStart = (e) => {
            if (App.currentTool !== 'select') return;
            // Don't start drag if long-press just fired
            if (node._longPress && node._longPress.fired) {
                node._longPress.reset();
                return;
            }
            e.preventDefault();
            isDragging = true;
            node.classList.add('dragging');

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const { width, height } = Pitch.getDimensions();

            // Calculate new position relative to pitch
            let newX = this.players[playerId].x + (clientX - startX);
            let newY = this.players[playerId].y + (clientY - startY);

            // Clamp to pitch bounds
            newX = Math.max(10, Math.min(width - 10, newX));
            newY = Math.max(10, Math.min(height - 10, newY));

            this.players[playerId].x = newX;
            this.players[playerId].y = newY;
            
            node.style.left = newX + 'px';
            node.style.top = newY + 'px';

            startX = clientX;
            startY = clientY;
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            node.classList.remove('dragging');

            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            if (this.onPositionChange) {
                this.onPositionChange();
            }
        };

        node.addEventListener('mousedown', onStart);
        node.addEventListener('touchstart', onStart, { passive: false });
    },

    /**
     * Show edit popup for a player
     */
    _showEditPopup(playerId, event) {
        const popup = document.getElementById('player-edit-popup');
        const player = this.players[playerId];
        
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-player-number').value = player.number;
        document.getElementById('edit-player-role').value = player.role;

        // On mobile (narrow viewport), center the popup
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            popup.style.left = '50%';
            popup.style.top = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
        } else {
            popup.style.transform = '';
            // Position popup near click
            const rect = event.target.getBoundingClientRect();
            popup.style.left = (rect.right + 10) + 'px';
            popup.style.top = rect.top + 'px';
        }

        popup.classList.remove('hidden');

        // Desktop: keep in viewport
        if (!isMobile) {
            const popupRect = popup.getBoundingClientRect();
            const rect = event.target.getBoundingClientRect();
            if (popupRect.right > window.innerWidth) {
                popup.style.left = (rect.left - popupRect.width - 10) + 'px';
            }
            if (popupRect.bottom > window.innerHeight) {
                popup.style.top = (window.innerHeight - popupRect.height - 10) + 'px';
            }
        }

        this.editingPlayer = playerId;
        
        // Auto-focus name field on mobile for keyboard
        if (isMobile) {
            setTimeout(() => document.getElementById('edit-player-name').focus(), 100);
        }
    },

    /**
     * Render the sidebar player list
     */
    renderList(container, colors) {
        container.innerHTML = '';
        this.players.forEach((player, i) => {
            const item = document.createElement('div');
            item.className = 'player-list-item';
            item.innerHTML = `
                <span class="player-num" style="background:${player.isGK ? colors.gk : colors.jersey};color:${colors.text}">${player.number}</span>
                <span class="player-info">${player.name || 'Player ' + player.number}</span>
                <span class="player-role">${player.role}</span>
                <button class="btn-edit-inline" title="Edit">✏️</button>
            `;
            // Tap name/number to highlight on pitch
            item.querySelector('.player-info').addEventListener('click', () => {
                const node = this.overlay.querySelector(`[data-id="${i}"]`);
                if (node) {
                    node.style.transform = 'translate(-50%, -50%) scale(1.4)';
                    setTimeout(() => { node.style.transform = ''; }, 500);
                }
            });
            // Edit button opens popup
            item.querySelector('.btn-edit-inline').addEventListener('click', (e) => {
                e.stopPropagation();
                this._showEditPopup(i, { target: item, clientX: 0, clientY: 0 });
            });
            container.appendChild(item);
        });
    },
};
