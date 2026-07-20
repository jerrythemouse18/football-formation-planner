/**
 * drawing.js - Tactical drawing tools (arrows, lines, freehand, zones)
 */

const Drawing = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    currentPath: [],
    drawings: [],
    color: '#ffff00',
    tool: 'arrow',
    startPoint: null,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this._setupEvents();
    },

    resize(width, height, offsetX, offsetY) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.canvas.style.left = offsetX + 'px';
        this.canvas.style.top = offsetY + 'px';
        this.ctx.scale(dpr, dpr);
        this.redraw();
    },

    setTool(tool) {
        this.tool = tool;
        if (tool === 'select') {
            this.canvas.classList.remove('drawing');
        } else {
            this.canvas.classList.add('drawing');
        }
    },

    setColor(color) {
        this.color = color;
    },

    clear() {
        this.drawings = [];
        this.redraw();
    },

    getState() {
        return [...this.drawings];
    },

    setState(drawings) {
        this.drawings = drawings || [];
        this.redraw();
    },

    _setupEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.tool === 'select') return;
            this.isDrawing = true;
            this.startPoint = getPos(e);
            this.currentPath = [this.startPoint];
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawing) return;
            const pos = getPos(e);
            this.currentPath.push(pos);
            this._drawPreview(pos);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            const endPoint = getPos(e);
            this._finishDrawing(endPoint);
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.redraw();
            }
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.tool === 'select') return;
            e.preventDefault();
            this.isDrawing = true;
            this.startPoint = getPos(e);
            this.currentPath = [this.startPoint];
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            this.currentPath.push(pos);
            this._drawPreview(pos);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            const pos = this.currentPath[this.currentPath.length - 1];
            this._finishDrawing(pos);
        });
    },

    _drawPreview(currentPos) {
        this.redraw();
        const ctx = this.ctx;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);

        switch (this.tool) {
            case 'arrow':
            case 'line':
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(this.startPoint.x, this.startPoint.y);
                ctx.lineTo(currentPos.x, currentPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
                break;

            case 'freehand':
                ctx.beginPath();
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                this.currentPath.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();
                break;

            case 'zone':
                const x = Math.min(this.startPoint.x, currentPos.x);
                const y = Math.min(this.startPoint.y, currentPos.y);
                const w = Math.abs(currentPos.x - this.startPoint.x);
                const h = Math.abs(currentPos.y - this.startPoint.y);
                ctx.globalAlpha = 0.2;
                ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = 0.6;
                ctx.strokeRect(x, y, w, h);
                ctx.globalAlpha = 1;
                break;
        }
    },

    _finishDrawing(endPoint) {
        // Only save if there's meaningful movement
        const dx = endPoint.x - this.startPoint.x;
        const dy = endPoint.y - this.startPoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5 && this.tool !== 'freehand') {
            this.redraw();
            return;
        }
        if (this.tool === 'freehand' && this.currentPath.length < 3) {
            this.redraw();
            return;
        }

        this.drawings.push({
            tool: this.tool,
            color: this.color,
            start: { ...this.startPoint },
            end: { ...endPoint },
            path: this.tool === 'freehand' ? [...this.currentPath] : null,
        });

        this.redraw();
        
        if (App.onDrawingChange) {
            App.onDrawingChange();
        }
    },

    redraw() {
        const ctx = this.ctx;
        const w = parseInt(this.canvas.style.width);
        const h = parseInt(this.canvas.style.height);
        ctx.clearRect(0, 0, w, h);

        this.drawings.forEach(d => {
            ctx.strokeStyle = d.color;
            ctx.fillStyle = d.color;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            switch (d.tool) {
                case 'arrow':
                    this._drawArrow(ctx, d.start, d.end);
                    break;
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(d.start.x, d.start.y);
                    ctx.lineTo(d.end.x, d.end.y);
                    ctx.stroke();
                    break;
                case 'freehand':
                    if (d.path && d.path.length > 1) {
                        ctx.beginPath();
                        d.path.forEach((p, i) => {
                            if (i === 0) ctx.moveTo(p.x, p.y);
                            else ctx.lineTo(p.x, p.y);
                        });
                        ctx.stroke();
                    }
                    break;
                case 'zone':
                    const x = Math.min(d.start.x, d.end.x);
                    const y = Math.min(d.start.y, d.end.y);
                    const zw = Math.abs(d.end.x - d.start.x);
                    const zh = Math.abs(d.end.y - d.start.y);
                    ctx.globalAlpha = 0.15;
                    ctx.fillRect(x, y, zw, zh);
                    ctx.globalAlpha = 0.5;
                    ctx.strokeRect(x, y, zw, zh);
                    ctx.globalAlpha = 1;
                    break;
            }
        });
    },

    _drawArrow(ctx, from, to) {
        const headLen = 12;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        // Line
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
            to.x - headLen * Math.cos(angle - Math.PI / 6),
            to.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            to.x - headLen * Math.cos(angle + Math.PI / 6),
            to.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    },
};
