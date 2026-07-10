// 3D plot view — renders a 2-D grid of z-values as a rotatable 3-D surface.
// Modes: wireframe (0), surface (1), scatter (2), surface_wireframe (3).
// Left-drag orbits, Shift+drag pans, wheel zooms.
// Based on view_plot.js and view_time_iq.js.
class view_3dplot extends view_zoom_pan {
    constructor(data) {
        super(data);

        this.rotX = -0.5;  // radians, look-down angle
        this.rotY = 0.75;  // radians, spin angle
        this.rotZ = 0;
        this.scale = 1.0;
        this.render_mode = 0; // 0=wireframe, 1=surface, 2=scatter, 3=surface+wireframe

        this.zMin = 0;
        this.zMax = 1;

        // For orbit drag tracking
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._dragRotX = 0;
        this._dragRotY = 0;
        this._isOrbiting = false;

        this._autoRange();
    }

    // ------------------------------------------------------------------
    // Range
    // ------------------------------------------------------------------

    _autoRange() {
        if (!this.data || this.data.length === 0) return;
        let min = 1e30, max = -1e30;
        for (let r = 0; r < this.data.length; r++) {
            const row = this.data[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const v = row[c];
                if (!isFinite(v)) continue;
                if (v < min) min = v;
                if (v > max) max = v;
            }
        }
        if (min < 1e29) {
            this.zMin = min;
            this.zMax = max;
            if (this.zMin === this.zMax) {
                this.zMin -= 0.5;
                this.zMax += 0.5;
            }
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    setAngle(rotX, rotY) {
        if (rotX !== undefined) this.rotX = rotX;
        if (rotY !== undefined) this.rotY = rotY;
    }

    setRenderMode(mode) {
        const modes = ['wireframe', 'surface', 'scatter', 'surface_wireframe'];
        if (typeof mode === 'number') {
            this.render_mode = Math.max(0, Math.min(modes.length - 1, mode | 0));
        } else if (typeof mode === 'string') {
            const idx = modes.indexOf(mode);
            if (idx >= 0) this.render_mode = idx;
        }
    }

    // ------------------------------------------------------------------
    // 3-D projection
    // ------------------------------------------------------------------

    // Project a normalized point (nx, ny, nz) in [-1, 1] to canvas coords.
    // Returns { sx, sy, z } — z is rotated depth (used for sorting).
    _project(nx, ny, nz) {
        let x = nx, y = ny, z = nz;

        // Rotate around Y
        const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);
        let x1 = x * cosY + z * sinY;
        let z1 = -x * sinY + z * cosY;
        x = x1; z = z1;

        // Rotate around X
        const cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX);
        let y1 = y * cosX - z * sinX;
        let z2 = y * sinX + z * cosX;
        y = y1; z = z2;

        // Rotate around Z
        const cosZ = Math.cos(this.rotZ), sinZ = Math.sin(this.rotZ);
        let x2 = x * cosZ - y * sinZ;
        let y2 = x * sinZ + y * cosZ;
        x = x2; y = y2;

        // Perspective — mild foreshortening
        const focal = 3.0;
        const w = focal / (focal + z * 0.5);

        const cx = this.width / 2 + this.x0;
        const cy = this.height / 2 + this.y0;
        const s = Math.min(this.width, this.height) * 0.38 * this.scale * this.sx;

        return {
            sx: cx + x * s * w,
            sy: cy - y * s * w,   // canvas Y is inverted
            z: z
        };
    }

    // Build flat arrays of projected vertices + original indices.
    // Returns { cols, rows, verts: [{sx,sy,z,row,col}] }
    _buildVertices() {
        const rows = this.data.length;
        if (rows === 0) return null;
        const cols = this.data[0].length;
        if (cols === 0) return null;

        const verts = [];
        const zRange = this.zMax - this.zMin || 1;

        for (let r = 0; r < rows; r++) {
            const row = this.data[r];
            if (!row) continue;
            for (let c = 0; c < cols && c < row.length; c++) {
                const nz = (row[c] - this.zMin) / zRange * 2 - 1; // [-1, 1]
                const nx = c / (cols - 1) * 2 - 1;                // [-1, 1]
                const ny = r / (rows - 1) * 2 - 1;                // [-1, 1]

                const p = this._project(nx, ny, nz);
                verts.push({
                    sx: p.sx, sy: p.sy, z: p.z,
                    row: r, col: c,
                    val: row[c]
                });
            }
        }
        return { cols, rows, verts };
    }

    // ------------------------------------------------------------------
    // Color helpers
    // ------------------------------------------------------------------

    // Map t in [0,1] to a heat colour: blue → cyan → green → yellow → red
    _heatColor(t) {
        t = Math.max(0, Math.min(1, t));
        let r, g, b;
        if (t < 0.25) {
            const u = t / 0.25;
            r = 0; g = u * 255; b = 255;
        } else if (t < 0.50) {
            const u = (t - 0.25) / 0.25;
            r = 0; g = 255; b = (1 - u) * 255;
        } else if (t < 0.75) {
            const u = (t - 0.50) / 0.25;
            r = u * 255; g = 255; b = 0;
        } else {
            const u = (t - 0.75) / 0.25;
            r = 255; g = (1 - u) * 255; b = 0;
        }
        return `rgb(${r|0},${g|0},${b|0})`;
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    onRender() {
        let ctx = this.context;

        // Clear
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);

        const info = this._buildVertices();
        if (!info) return;

        const zRange = this.zMax - this.zMin || 1;

        ctx.save();
        switch (this.render_mode) {
            case 0: this._renderWireframe(ctx, info, zRange); break;
            case 1: this._renderSurface(ctx, info, zRange); break;
            case 2: this._renderScatter(ctx, info, zRange); break;
            case 3:
                this._renderSurface(ctx, info, zRange);
                this._renderWireframe(ctx, info, zRange);
                break;
        }
        ctx.restore();

        this._drawAxes(ctx, info);
    }

    // ------------------------------------------------------------------
    // Wireframe
    // ------------------------------------------------------------------

    _renderWireframe(ctx, info, zRange) {
        const { cols, rows, verts } = info;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.5;

        // Helper: get vertex at row, col
        const at = (r, c) => verts[r * cols + c];

        // Lines along rows (constant Y)
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            for (let c = 0; c < cols; c++) {
                const p = at(r, c);
                if (c === 0) ctx.moveTo(p.sx, p.sy);
                else ctx.lineTo(p.sx, p.sy);
            }
            ctx.stroke();
        }

        // Lines along columns (constant X)
        for (let c = 0; c < cols; c++) {
            ctx.beginPath();
            for (let r = 0; r < rows; r++) {
                const p = at(r, c);
                if (r === 0) ctx.moveTo(p.sx, p.sy);
                else ctx.lineTo(p.sx, p.sy);
            }
            ctx.stroke();
        }
    }

    // ------------------------------------------------------------------
    // Surface (filled quads, painter-sorted by depth)
    // ------------------------------------------------------------------

    _renderSurface(ctx, info, zRange) {
        const { cols, rows, verts } = info;
        const at = (r, c) => verts[r * cols + c];

        // Build quads with average depth for painter sort
        const quads = [];
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const p00 = at(r, c);
                const p01 = at(r, c + 1);
                const p10 = at(r + 1, c);
                const p11 = at(r + 1, c + 1);

                const avgZ = (p00.z + p01.z + p10.z + p11.z) / 4;
                const avgVal = (p00.val + p01.val + p10.val + p11.val) / 4;

                quads.push({
                    z: avgZ,
                    val: avgVal,
                    pts: [p00, p01, p11, p10]
                });
            }
        }

        // Painter sort — far to near
        quads.sort((a, b) => a.z - b.z);

        const tNorm = (v) => (v - this.zMin) / zRange;

        for (const q of quads) {
            ctx.fillStyle = this._heatColor(tNorm(q.val));
            ctx.beginPath();
            ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
            for (let i = 1; i < 4; i++) {
                ctx.lineTo(q.pts[i].sx, q.pts[i].sy);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    // ------------------------------------------------------------------
    // Scatter
    // ------------------------------------------------------------------

    _renderScatter(ctx, info, zRange) {
        const { verts } = info;
        const tNorm = (v) => (v - this.zMin) / zRange;

        // Size dot by depth (farther = smaller)
        const rng = this._zRange(verts);
        const zSpan = Math.max(0.001, rng.max - rng.min);

        for (let i = 0; i < verts.length; i++) {
            const p = verts[i];
            const depth = (p.z - rng.min) / zSpan; // 0 = near, 1 = far
            const radius = Math.max(1, 4 * (1 - depth * 0.5));

            ctx.fillStyle = this._heatColor(tNorm(p.val));
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ------------------------------------------------------------------
    // Axes
    // ------------------------------------------------------------------

    _drawAxes(ctx, info) {
        const { cols, rows } = info;

        // Project the eight corners of the bounding cube
        // and find the screen-space bounds of the projected object.
        const pts = [
            this._project(-1, -1, -1), this._project(1, -1, -1),
            this._project(-1,  1, -1), this._project(1,  1, -1),
            this._project(-1, -1,  1), this._project(1, -1,  1),
            this._project(-1,  1,  1), this._project(1,  1,  1)
        ];

        let minX =  Infinity, maxX = -Infinity;
        let minY =  Infinity, maxY = -Infinity;
        for (const p of pts) {
            if (p.sx < minX) minX = p.sx;
            if (p.sx > maxX) maxX = p.sx;
            if (p.sy < minY) minY = p.sy;
            if (p.sy > maxY) maxY = p.sy;
        }

        // Decide which corner of the data space is the "origin" corner
        // by testing where (-1, -1, -Z) projects (lower-left of data grid
        // at minimum z). We'll draw axis arrows from that corner.
        const origin = this._project(-1, -1, -1);

        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';

        // X-axis label
        const xEnd = this._project(1, -1, -1);
        ctx.fillText('col →', (origin.sx + xEnd.sx) / 2, Math.max(xEnd.sy, origin.sy) + 14);

        // Y-axis label
        const yEnd = this._project(-1, 1, -1);
        ctx.fillText('row →', yEnd.sx, yEnd.sy);

        // Z-axis label (top-right-ish corner at max z)
        const zEnd = this._project(-1, -1, 1);
        ctx.textAlign = 'start';
        ctx.fillText('↑ z', zEnd.sx + 6, zEnd.sy);

        // Z range label
        const zRng = this.zMax - this.zMin;
        if (zRng > 0.0001) {
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            const topPt = this._project(-1, -1, 1.1);
            const botPt = this._project(-1, -1, -1.1);
            ctx.fillText(this.zMax.toFixed(2), topPt.sx + 4, topPt.sy);
            ctx.fillText(this.zMin.toFixed(2), botPt.sx + 4, botPt.sy);
        }

        // Grid count labels on the floor plane
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        const stepC = Math.max(1, cols >> 2);
        for (let c = 0; c < cols; c += stepC) {
            const p = this._project(c / (cols - 1) * 2 - 1, -1, -1);
            ctx.fillText(c, p.sx, p.sy + 12);
        }
        const stepR = Math.max(1, rows >> 2);
        ctx.textAlign = 'end';
        for (let r = 0; r < rows; r += stepR) {
            const p = this._project(-1, r / (rows - 1) * 2 - 1, -1);
            ctx.fillText(r, p.sx - 8, p.sy + 4);
        }
        ctx.textAlign = 'start';
    }

    // ------------------------------------------------------------------
    // Mouse: orbit drag (no shift) vs pan (shift)
    // ------------------------------------------------------------------

    onMouseButtonDown(event) {
        this.mouse_button = 1;
        this._dragStartX = event.offsetX;
        this._dragStartY = event.offsetY;
        this._dragRotX = this.rotX;
        this._dragRotY = this.rotY;
        this._isOrbiting = !event.shiftKey;
    }

    onMouseMove(event) {
        const oldX = this.mouse_x;
        const oldY = this.mouse_y;
        this.mouse_x = event.offsetX;
        this.mouse_y = event.offsetY;

        if (this.mouse_button === 1) {
            if (this._isOrbiting) {
                // Orbit
                const dx = this.mouse_x - this._dragStartX;
                const dy = this.mouse_y - this._dragStartY;
                this.rotX = this._dragRotX + dy * 0.01;
                this.rotY = this._dragRotY + dx * 0.01;
                this.onRender();
            } else {
                // Pan (base class behaviour)
                const dx = this.mouse_x - oldX;
                const dy = this.mouse_y - oldY;
                this.x0 += dx;
                this.y0 += dy;
                this.onRender();
            }
        }
    }

    onMouseButtonUp(event) {
        this.mouse_button = 0;
        this._isOrbiting = false;
    }

    onRightClick() {
        // Reset view
        this.rotX = -0.5;
        this.rotY = 0.75;
        this.rotZ = 0;
        this.scale = 1.0;
        this.x0 = 0;
        this.y0 = 0;
        this.sx = 1;
        this.sy = 1;
        this.onRender();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    _zRange(verts) {
        let min =  Infinity, max = -Infinity;
        for (const v of verts) {
            if (v.z < min) min = v.z;
            if (v.z > max) max = v.z;
        }
        return { min, max };
    }
}
