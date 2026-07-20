/**
 * formations.js - Formation presets and validation
 */

const Formations = {
    // Formations indexed by outfield player count (excludes GK)
    presets: {
        10: [
            { name: '4-4-2', lines: [4, 4, 2] },
            { name: '4-3-3', lines: [4, 3, 3] },
            { name: '4-2-3-1', lines: [4, 2, 3, 1] },
            { name: '4-1-4-1', lines: [4, 1, 4, 1] },
            { name: '4-5-1', lines: [4, 5, 1] },
            { name: '3-5-2', lines: [3, 5, 2] },
            { name: '3-4-3', lines: [3, 4, 3] },
            { name: '5-3-2', lines: [5, 3, 2] },
            { name: '5-4-1', lines: [5, 4, 1] },
            { name: '4-3-2-1', lines: [4, 3, 2, 1] },
            { name: '4-1-2-1-2', lines: [4, 1, 2, 1, 2] },
            { name: '3-4-1-2', lines: [3, 4, 1, 2] },
            { name: '4-2-4', lines: [4, 2, 4] },
            { name: '3-3-4', lines: [3, 3, 4] },
        ],
        9: [
            { name: '4-3-2', lines: [4, 3, 2] },
            { name: '3-4-2', lines: [3, 4, 2] },
            { name: '4-4-1', lines: [4, 4, 1] },
            { name: '3-3-3', lines: [3, 3, 3] },
            { name: '4-2-3', lines: [4, 2, 3] },
        ],
        8: [
            { name: '3-3-2', lines: [3, 3, 2] },
            { name: '4-2-2', lines: [4, 2, 2] },
            { name: '3-4-1', lines: [3, 4, 1] },
            { name: '4-3-1', lines: [4, 3, 1] },
            { name: '2-4-2', lines: [2, 4, 2] },
        ],
        7: [
            { name: '3-2-2', lines: [3, 2, 2] },
            { name: '2-3-2', lines: [2, 3, 2] },
            { name: '3-3-1', lines: [3, 3, 1] },
            { name: '2-4-1', lines: [2, 4, 1] },
        ],
        6: [
            { name: '2-2-2', lines: [2, 2, 2] },
            { name: '3-2-1', lines: [3, 2, 1] },
            { name: '2-3-1', lines: [2, 3, 1] },
            { name: '3-1-2', lines: [3, 1, 2] },
        ],
        5: [
            { name: '2-2-1', lines: [2, 2, 1] },
            { name: '2-1-2', lines: [2, 1, 2] },
            { name: '1-3-1', lines: [1, 3, 1] },
            { name: '3-1-1', lines: [3, 1, 1] },
        ],
        4: [
            { name: '2-1-1', lines: [2, 1, 1] },
            { name: '1-2-1', lines: [1, 2, 1] },
            { name: '2-2', lines: [2, 2] },
        ],
        3: [
            { name: '1-1-1', lines: [1, 1, 1] },
            { name: '2-1', lines: [2, 1] },
            { name: '1-2', lines: [1, 2] },
        ],
        2: [
            { name: '1-1', lines: [1, 1] },
            { name: '2', lines: [2] },
        ],
        1: [
            { name: '1', lines: [1] },
        ],
    },

    /**
     * Get available formations for a given total player count (including GK)
     */
    getFormations(totalPlayers) {
        const outfield = totalPlayers - 1;
        return this.presets[outfield] || [];
    },

    /**
     * Parse a custom formation string like "4-3-3" or "4-2-3-1"
     * Returns { valid, lines, total, name } 
     */
    parseCustom(str) {
        const cleaned = str.trim().replace(/[\s,]+/g, '-');
        const parts = cleaned.split('-').map(Number);
        
        if (parts.some(isNaN) || parts.some(n => n < 1)) {
            return { valid: false, error: 'Invalid format. Use numbers separated by dashes (e.g. 4-3-3)' };
        }

        const total = parts.reduce((sum, n) => sum + n, 0);
        if (total > 10) {
            return { valid: false, error: `Too many outfield players (${total}). Max is 10.` };
        }
        if (total < 1) {
            return { valid: false, error: 'Need at least 1 outfield player.' };
        }

        return {
            valid: true,
            lines: parts,
            total: total + 1, // include GK
            name: parts.join('-'),
        };
    },

    /**
     * Generate player positions for a formation on a pitch
     * Returns array of { x, y } positions (0-1 normalized)
     * x = across pitch (0=left, 1=right), y = down pitch (0=own goal, 1=opp goal)
     */
    generatePositions(lines, pitchWidth, pitchHeight) {
        const positions = [];
        const totalLines = lines.length;
        
        // GK position
        positions.push({
            x: pitchWidth / 2,
            y: pitchHeight * 0.06,
            role: 'GK',
            number: 1,
        });

        // Y spacing: distribute lines evenly from ~15% to ~88% of pitch height
        const yStart = 0.15;
        const yEnd = 0.88;
        
        lines.forEach((count, lineIndex) => {
            const y = yStart + (lineIndex / (totalLines - 1 || 1)) * (yEnd - yStart);
            
            // X spacing: distribute evenly across pitch width
            for (let i = 0; i < count; i++) {
                const xPadding = 0.12;
                const xRange = 1 - (xPadding * 2);
                const x = count === 1 
                    ? 0.5 
                    : xPadding + (i / (count - 1)) * xRange;
                
                positions.push({
                    x: x * pitchWidth,
                    y: y * pitchHeight,
                    role: this._inferRole(lineIndex, totalLines, i, count),
                    number: positions.length + 1,
                });
            }
        });

        return positions;
    },

    /**
     * Infer a basic role label based on line position
     */
    _inferRole(lineIndex, totalLines, posInLine, lineSize) {
        if (totalLines <= 1) return 'FW';
        
        const ratio = lineIndex / (totalLines - 1);
        
        if (ratio < 0.3) {
            // Defensive line
            if (lineSize >= 4) {
                if (posInLine === 0 || posInLine === lineSize - 1) return 'WB';
                return 'CB';
            }
            return 'CB';
        } else if (ratio < 0.7) {
            // Midfield
            if (lineSize === 1) return 'CDM';
            if (posInLine === 0 || posInLine === lineSize - 1) return 'WM';
            return 'CM';
        } else {
            // Attacking
            if (lineSize === 1) return 'ST';
            if (lineSize === 2) return posInLine === 0 ? 'LF' : 'RF';
            if (posInLine === 0) return 'LW';
            if (posInLine === lineSize - 1) return 'RW';
            return lineSize >= 3 && posInLine === Math.floor(lineSize / 2) ? 'ST' : 'CF';
        }
    },
};
