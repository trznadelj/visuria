// Plot view — renders scalar data series with configurable render modes.
// Modes: fast_point (0), point (1), line (2), bar (3).
class view_plot extends view_zoom_pan {
    constructor(data) {
        super(data);
        this.min = 0;
        this.max = 1;
        this.render_mode = 2; // 0=fast_point, 1=point, 2=line, 3=bar

        this._autoRange();
    }

    // ------------------------------------------------------------------
    // Range helpers
    // ------------------------------------------------------------------

    _autoRange() {
        if (!this.data || this.data.length === 0) return;
        let min = 1e30, max = -1e30;
        for (let s = 0; s < this.data.length; s++) {
            const d = this.data[s];
            if (!d) continue;
            for (let i = 0; i < d.length; i++) {
                const v = d[i];
                if (!isFinite(v)) continue;
                if (v < min) min = v;
                if (v > max) max = v;
            }
        }
        if (min < 1e29) {
            this.min = min;
            this.max = max;
            if (this.min === this.max) {
                this.min -= 0.5;
                this.max += 0.5;
            }
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    // mode: 0-'fast_point', 1-'point', 2-'line', 3-'bar'
    // Accepts a number or a string name.
    setRenderMode(mode) {
        const modes = ['fast_point', 'point', 'line', 'bar'];
        if (typeof mode === 'number') {
            this.render_mode = Math.max(0, Math.min(modes.length - 1, mode | 0));
        } else if (typeof mode === 'string') {
            const idx = modes.indexOf(mode);
            if (idx >= 0) this.render_mode = idx;
        }
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    onRender() {
        let ctx = this.context;
        const n = this.data && this.data[0] ? this.data[0].length : 0;

        // Clear background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.width, this.height);

        if (n === 0) return;

        const x0 = this.x0, y0 = this.y0;
        const sx = this.sx * this.width / n;
        const sy = this.sy * this.height / (this.max - this.min);
        const cwidth = sx < 1 ? 1 : Math.max(1, (sx | 0));

        // When zoomed out below 0.5 px/sample, always use fast_point
        // (except for bar mode which is intentionally chunky)
        const useFast = (sx < 0.5 && this.render_mode !== 3);
        const mode = useFast ? 0 : this.render_mode;

        ctx.save();
        switch (mode) {
            case 0: this._renderFastPoint(ctx, x0, sx, sy); break;
            case 1: this._renderPoint(ctx, x0, sx, sy, cwidth); break;
            case 2: this._renderLine(ctx, x0, sx, sy); break;
            case 3: this._renderBar(ctx, x0, sx, sy, cwidth); break;
        }
        ctx.restore();

        this._drawAxes(ctx, n, sx, sy);
    }

    // ------------------------------------------------------------------
    // Render modes
    // ------------------------------------------------------------------

    // fast_point — when zoomed out: bucket max value per output pixel
    // column and draw filled bars from the plot minimum.
    _renderFastPoint(ctx, x0, sx, sy) {
        ctx.fillStyle = 'black';
        const yd = this.height + this.y0;

        for (let s = 0; s < this.data.length; s++) {
            const series = this.data[s];
            let cx = (x0 | 0), h = 0;
            for (let i = 0; i < series.length; i++) {
                const x = (x0 + i * sx) | 0;
                if (x < 0) continue;
                if (x > this.width) break;

                if (cx !== x) {
                    const y = this.height - h * sy + this.y0;
                    ctx.fillRect(cx, y, 1, Math.max(1, yd - y));
                    cx = x;
                    h = 0;
                }
                const yv = series[i] - this.min;
                if (yv > h) h = yv;
            }
            if (h > 0) {
                const y = this.height - h * sy + this.y0;
                ctx.fillRect(cx, y, 1, Math.max(1, yd - y));
            }
        }
    }

    // point — draw a filled square at each sample.
    _renderPoint(ctx, x0, sx, sy, cwidth) {
        ctx.fillStyle = 'black';
        for (let s = 0; s < this.data.length; s++) {
            const series = this.data[s];
            for (let i = 0; i < series.length; i++) {
                const x = x0 + i * sx;
                if (x < 0) continue;
                if (x > this.width) break;
                const y = this.height - series[i] * sy + this.y0;
                ctx.fillRect(x, y, cwidth, cwidth);
            }
        }
    }

    // line — connect samples with straight segments.
    _renderLine(ctx, x0, sx, sy) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        for (let s = 0; s < this.data.length; s++) {
            const series = this.data[s];
            ctx.beginPath();
            let started = false;

            for (let i = 0; i < series.length; i++) {
                const x = x0 + i * sx;
                if (x < 0) continue;
                if (x > this.width) break;
                const y = this.height - series[i] * sy + this.y0;

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }

    // bar — vertical bars from the zero line to each sample.
    _renderBar(ctx, x0, sx, sy, cwidth) {
        ctx.fillStyle = 'black';
        const zeroY = this.height - 0 * sy + this.y0;

        for (let s = 0; s < this.data.length; s++) {
            const series = this.data[s];
            for (let i = 0; i < series.length; i++) {
                const x = x0 + i * sx;
                if (x < 0) continue;
                if (x > this.width) break;
                const y = this.height - series[i] * sy + this.y0;
                const top = Math.min(y, zeroY);
                const h = Math.max(Math.abs(zeroY - y), 1);
                ctx.fillRect(x, top, cwidth, h);
            }
        }
    }

    // ------------------------------------------------------------------
    // Axes (x/y graph lines with arrows)
    // ------------------------------------------------------------------

    _drawAxes(ctx, n, sx, sy) {
        const x0 = this.x0, y0 = this.y0;
        const xAxisY = this.height + y0;   // y of the X axis line
        const yAxisX = x0;                  // x of the Y axis line

        // If data hasn't been panned, yAxisX could be 0 — use a small margin
        const yLineX = Math.max(yAxisX, 30);

        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.fillStyle  = '#888';
        ctx.lineWidth  = 1;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // ------------------------------------------------------------------
        // X axis (horizontal, at bottom)
        // ------------------------------------------------------------------
        {
            const xMin = 0;
            const xMax = Math.min(this.width, yLineX + (x0 + n * sx));
            const y    = xAxisY;

            // Axis line
            ctx.beginPath();
            ctx.moveTo(xMin, y);
            ctx.lineTo(xMax, y);
            ctx.stroke();

            // Arrow at the right end
            const arr = 6;
            ctx.beginPath();
            ctx.moveTo(xMax, y);
            ctx.lineTo(xMax - arr, y - arr);
            ctx.moveTo(xMax, y);
            ctx.lineTo(xMax - arr, y + arr);
            ctx.stroke();

            // X ticks
            const tickStep = Math.max(1, Math.floor(n / 8));
            for (let i = 0; i < n; i += tickStep) {
                const x = x0 + i * sx;
                if (x < 0) continue;
                if (x > this.width) break;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + 4);
                ctx.stroke();

                if (sx * tickStep > 12) {
                    ctx.fillText(i, x, y + 6);
                }
            }

            // "n" label near the arrow
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('n', xMax - arr - 4, y - 2);
        }

        // ------------------------------------------------------------------
        // Y axis (vertical, at left)
        // ------------------------------------------------------------------
        {
            const x  = yLineX;
            const yMin = Math.max(0, xAxisY - sy * (this.max - this.min));
            const yMax = xAxisY;

            // Axis line
            ctx.beginPath();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
            ctx.stroke();

            // Arrow at the top
            ctx.beginPath();
            ctx.moveTo(x, yMin);
            ctx.lineTo(x - arr, yMin + arr);
            ctx.moveTo(x, yMin);
            ctx.lineTo(x + arr, yMin + arr);
            ctx.stroke();

            // Y ticks (aim for ~8)
            const yRange = this.max - this.min;
            const rawStep = yRange / 8;
            // Round to a nice number
            const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
            let niceStep = mag;
            if (rawStep / niceStep > 5) niceStep *= 10;
            else if (rawStep / niceStep > 2) niceStep *= 5;
            else if (rawStep / niceStep > 1) niceStep *= 2;

            const yStart = Math.ceil(this.min / niceStep) * niceStep;
            for (let v = yStart; v <= this.max; v += niceStep) {
                const yy = this.height - v * sy + y0;
                if (yy < yMin - 5 || yy > yMax + 5) continue;

                ctx.beginPath();
                ctx.moveTo(x - 4, yy);
                ctx.lineTo(x, yy);
                ctx.stroke();

                ctx.fillText(v.toFixed(v === 0 ? 0 : Math.max(0, 1 - Math.floor(Math.log10(Math.abs(v) || 1)))), x - 6, yy);
            }

            // "y" label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('y', x - 8, yMin - 2);
        }

        ctx.restore();
    }
}
