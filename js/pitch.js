/**
 * pitch.js - Pitch rendering on canvas
 */

const Pitch = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,

    // Standard pitch aspect ratio (approx 105m x 68m)
    ASPECT_RATIO: 68 / 105, // width/height (portrait orientation for top-down view)

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
    },

    resize() {
        const container = this.canvas.parentElement;
        const maxW = container.clientWidth - 40;
        const maxH = container.clientHeight - 40;

        // Calculate pitch dimensions maintaining aspect ratio
        // Pitch is taller than wide (portrait, top = own goal)
        const pitchRatio = this.ASPECT_RATIO; // width/height
        
        let w, h;
        if (maxW / maxH > pitchRatio) {
            // Container is wider than needed
            h = maxH;
            w = h * pitchRatio;
        } else {
            // Container is taller than needed
            w = maxW;
            h = w / pitchRatio;
        }

        this.width = Math.floor(w);
        this.height = Math.floor(h);

        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(dpr, dpr);

        // Position canvas centered in container
        this.offsetX = (container.clientWidth - this.width) / 2;
        this.offsetY = (container.clientHeight - this.height) / 2;
        this.canvas.style.left = this.offsetX + 'px';
        this.canvas.style.top = this.offsetY + 'px';

        this.draw();
        return { width: this.width, height: this.height, offsetX: this.offsetX, offsetY: this.offsetY };
    },

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Background (green pitch)
        ctx.fillStyle = '#2d8a4e';
        ctx.fillRect(0, 0, w, h);

        // Pitch stripes (alternating slightly different greens)
        const stripeCount = 12;
        const stripeH = h / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#328f53';
            ctx.fillRect(0, i * stripeH, w, stripeH);
        }

        // Pitch markings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        // Outer boundary
        const pad = 10;
        ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

        // Halfway line
        const midY = h / 2;
        ctx.beginPath();
        ctx.moveTo(pad, midY);
        ctx.lineTo(w - pad, midY);
        ctx.stroke();

        // Center circle
        const centerRadius = w * 0.15;
        ctx.beginPath();
        ctx.arc(w / 2, midY, centerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Center spot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(w / 2, midY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Penalty areas
        const penW = w * 0.55;
        const penH = h * 0.14;
        const penX = (w - penW) / 2;
        
        // Bottom penalty area
        ctx.strokeRect(penX, h - pad - penH, penW, penH);
        // Top penalty area
        ctx.strokeRect(penX, pad, penW, penH);

        // Goal areas (6-yard box)
        const goalW = w * 0.28;
        const goalH = h * 0.05;
        const goalX = (w - goalW) / 2;
        
        // Bottom goal area
        ctx.strokeRect(goalX, h - pad - goalH, goalW, goalH);
        // Top goal area
        ctx.strokeRect(goalX, pad, goalW, goalH);

        // Penalty spots
        const penSpotY = h * 0.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(w / 2, pad + penSpotY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w / 2, h - pad - penSpotY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Penalty arcs
        ctx.beginPath();
        ctx.arc(w / 2, pad + penSpotY, centerRadius * 0.65, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w / 2, h - pad - penSpotY, centerRadius * 0.65, 1.2 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();

        // Corner arcs
        const cornerR = 8;
        // Top-left
        ctx.beginPath();
        ctx.arc(pad, pad, cornerR, 0, Math.PI * 0.5);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.arc(w - pad, pad, cornerR, Math.PI * 0.5, Math.PI);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.arc(pad, h - pad, cornerR, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.arc(w - pad, h - pad, cornerR, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        // Goals (nets)
        const netW = w * 0.16;
        const netH = 8;
        const netX = (w - netW) / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(netX, pad - netH, netW, netH);
        ctx.fillRect(netX, h - pad, netW, netH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeRect(netX, pad - netH, netW, netH);
        ctx.strokeRect(netX, h - pad, netW, netH);
    },

    /**
     * Get pitch dimensions and offset for coordinate mapping
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
        };
    },
};
