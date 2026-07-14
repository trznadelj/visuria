
class view_time_iq extends view_zoom_pan {
    constructor(data) {
        super(data);

        let t = v_minmax_amp(this.data);
        this.min = 0;//t.min;
        this.max = 1;//t.max;
        this.cp_map = null;
        this.fft_size = 512;
        this.sym_starts = [];
    };

    setConfig(config) {
        if (!config) return;
        if (config.fft_size) this.fft_size = config.fft_size;
        if (config.cp_map) this.cp_map = config.cp_map;

        let sample = 0;
        let idx = 0;
        this.sym_starts = [];
        while (1) {
            this.sym_starts.push(sample);
            sample += config.cp_map[idx];
            if (sample >= this.data[0].length) break;
            this.sym_starts.push(sample);
            sample += this.fft_size;
            if (++idx >= config.cp_map.length) idx = 0;
        }
    }

    onRender() {
        let ctx = this.context;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.strokeStyle = 'white';
        let vi = this.data[0];
        let vq = this.data[1];
        const n = Math.min(vi.length, vq.length);
        let x0 = this.x0, y0 = this.y0;
        const sx = this.sx * this.width / this.data[0].length;//n;
        const sy = this.sy * this.height / (this.max - this.min);

        let yd = this.height + y0;
        let cwidth = (sx < 1) ? 1 : (sx | 0);

        ctx.fillStyle = 'white';//`rgb(${c},${c},${c})`;

        if (sx < 0.2) {
            let cx = x0 |0, h = 0;
            for (let i = 0; i < n - 1; i++) {
                let x = ( x0 + i * sx )|0;
                if (x < 0) continue;
                if (x > this.width) break;
                if (cx!=x) {
                    let y = this.height - h * sy + y0;
                    ctx.fillRect(cx, y, 1, yd - y);
                    cx = x;
                    h = 0;
                }
                let yv = Math.sqrt(vi[i] * vi[i] + vq[i] * vq[i]);
                if (yv>h) h = yv;
            }
        }
        else 
        {
            for (let i = 0; i < n - 1; i++) {
                let x = x0 + i * sx;
                if (x < 0) continue;
                if (x > this.width) break;
                let yv = Math.sqrt(vi[i] * vi[i] + vq[i] * vq[i]);

                let y = this.height - yv * sy + y0;
                let c = Math.floor(yv * 256);

                ctx.fillRect(x, y, cwidth, yd - y);
                if (sx > 30) {
                    ctx.fillText(i, x, this.height - 5);
                    ctx.fillText(vi[i].toFixed(5), x, y - 5);
                    ctx.fillText(vq[i].toFixed(5), x, y - 15);
                }
            }
        }

        this.drawRulers();
    };

    drawRulers() {
        let ctx = this.context;
        const sx = this.sx * this.width / this.data[0].length;//n;
        const sy = this.sy * this.height / (this.max - this.min);
        const y0 = this.y0;
        let y = this.height + y0;
        if (y > this.height - 30) y = this.height - 30;

        // Draw time ruler on the bottom
        ctx.fillStyle = 'rgba(0.2,0.2,0.2,0.5)';
        ctx.fillRect(0, y, this.width, 30);
        ctx.fillStyle = 'rgba(0, 148, 0, 0.2)';
        ctx.strokeStyle = 'white';

        if (sx>0.001)
        for (let i = 0; i < this.sym_starts.length; i++) {
            const sample = this.sym_starts[i];
            const x = this.x0 + sample * sx;

            if (x < 0) continue;
            if (x > this.width) break;

            if ((i & 1) == 0) {
                let cp_width = this.x0 + this.sym_starts[i + 1] * sx - x;
                ctx.fillStyle = 'rgba(0, 148, 0, 0.2)';
                ctx.fillRect(x, 0, this.x0 + this.sym_starts[i + 1] * sx - x, y);
                if (cp_width>80)
                {
                    
                    ctx.fillStyle = 'rgb(40,255,40)';
                    ctx.fillText( "cyclic prefix", x+15, 15  );
                    ctx.fillText( "no: "+(i/2), x+15, 25  );
                    ctx.fillText( "sample: "+this.sym_starts[i], x+15, 35  );
                    ctx.fillText( "length: "+( this.sym_starts[i+1] - this.sym_starts[i] ), x+15, 45  );
                }
            }
            ctx.beginPath();
            ctx.moveTo(x, 30 + y - (i & 1 ? 15 : 30));
            ctx.lineTo(x, 30 + y);
            ctx.stroke();
            if (sx > 1)
                ctx.fillText(sample, x + 5, y + 15);
        }

        drawArrow( ctx, this.x0, y+50, this.sx * this.width+this.x0, y+50, " Time:" + this.data[0].length +" samples" );
        drawArrow( ctx, this.x0-35, y, this.x0-35, y -this.sy *this.height , " Amplitude: 0..." + this.max );
    };

};
