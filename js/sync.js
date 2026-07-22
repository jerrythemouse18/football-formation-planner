/**
 * sync.js - Cross-device persistence for teams & rosters via URL hash
 *
 * Data model:
 * {
 *   activeTeam: "team-1",
 *   teams: [
 *     { id, name, colors: {jersey, text, gk}, formation, players: [{number, name, role}] }
 *   ]
 * }
 */

const Sync = {
    HASH_PREFIX: 'data=',
    LOCAL_KEY: 'formation_teams_v1',

    // === Encoding ===

    encode(data) {
        const json = JSON.stringify(data);
        // Use URI-safe base64
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    decode(encoded) {
        try {
            // Restore standard base64
            let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            const json = decodeURIComponent(escape(atob(b64)));
            return JSON.parse(json);
        } catch (e) {
            console.warn('Sync: decode failed', e);
            return null;
        }
    },

    // === Persistence ===

    save(data) {
        const encoded = this.encode(data);
        const url = new URL(window.location);
        url.hash = this.HASH_PREFIX + encoded;
        history.replaceState(null, '', url);
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify(data));
    },

    loadFromHash() {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith(this.HASH_PREFIX)) {
            return this.decode(hash.slice(this.HASH_PREFIX.length));
        }
        return null;
    },

    loadFromLocal() {
        try {
            const raw = localStorage.getItem(this.LOCAL_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },

    async loadFromFile() {
        try {
            const resp = await fetch('data/teams.json?t=' + Date.now());
            if (!resp.ok) return null;
            const data = await resp.json();
            return {
                activeTeam: data.activeTeam,
                teams: data.teams,
            };
        } catch { return null; }
    },

    /**
     * Load with priority: URL hash > localStorage > teams.json > null
     */
    async load() {
        const fromHash = this.loadFromHash();
        if (fromHash && fromHash.teams) return { source: 'hash', data: fromHash };

        const fromLocal = this.loadFromLocal();
        if (fromLocal && fromLocal.teams) return { source: 'local', data: fromLocal };

        const fromFile = await this.loadFromFile();
        if (fromFile && fromFile.teams) return { source: 'file', data: fromFile };

        return null;
    },

    // === Helpers ===

    generateId() {
        return 'team-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    },

    async copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            return true;
        } catch {
            const ta = document.createElement('textarea');
            ta.value = window.location.href;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        }
    },
};
