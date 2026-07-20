/**
 * storage.js - Save/Load functionality using localStorage
 */

const Storage = {
    STORAGE_KEY: 'formation-planner-saves',

    /**
     * Get all saved formations
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * Save a formation
     */
    save(name, state) {
        const saves = this.getAll();
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name,
            date: new Date().toISOString(),
            state,
        };
        saves.unshift(entry);
        // Keep max 50 saves
        if (saves.length > 50) saves.pop();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
        return entry;
    },

    /**
     * Delete a saved formation
     */
    delete(id) {
        const saves = this.getAll().filter(s => s.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
    },

    /**
     * Load a saved formation by id
     */
    load(id) {
        return this.getAll().find(s => s.id === id) || null;
    },
};
