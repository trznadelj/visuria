class view_freq_iq {
    constructor( data ) {
        this.data = data;
        this.x0 = 0;       // horizontal offset (pixels)
        this.y0 = 0;       // vertical offset (inverted canvas Y)

        this.sx = 1.0;     // horizontal zoom scale factor
        this.sy = 1.0;     // vertical zoom scale factor

        let t = v_minmax_amp( data );
        this.min_val = 0;//t.min;      // amplitude min (unused for now)
        this.max_val = 1;//t.max;       // used as clamp ceiling
        this.renderMode = 2;    // 0=ALL_BLACK, 1=FULL_WHITE, 2=AMPLITUDE, 3=FULL_CHANNEL, 4=AMPLITUDE_CHANNEL

        this.num_sc = 0;      // number of subcarriers (rows) — set by setConfig
        this.num_symbols = 0; // computed symbols per row

        this.ruler_top    = 0; // reserved top pixels for ruler UI
        this.ruler_bottom = 0; // reserved bottom pixels
        this.ruler_left   = 0; // reserved left pixels
        this.ruler_right  = 0; // reserved right pixels

        this.mouse_button = 0;  
        this.mouse_x      = 0;
        this.mouse_y      = 0;
    };

    setConfig( config ) {
        if (!config) return;
        this.num_sc         = config.num_sc || 1;
        // data is flat [I, I... , Q, Q ...] array (one pair per subcarrier+symbol? Or interleaved?)
        // user's formula: number of horizontal columns shall be floor( length(data) / num_sc )
        this.num_symbols = Math.max(0, Math.floor(this.data[ 0 ].length / this.num_sc));

    };

    setContext( context ) {
        this.context = context;
        this.onResize();
        this.context.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.context.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.onRightClick();
        });
        this.context.canvas.addEventListener('mousedown', (event) => this.onMouseButtonDown(event));
        this.context.canvas.addEventListener('wheel', (event) => this.onMouseWheel(event));
        this.context.canvas.addEventListener('mouseup', (event) => this.onMouseButtonUp(event));  
    };

    onResize() {
        if (!this.context || !this.context.canvas) return;
        this.width  = this.context.canvas.width;
        this.height = this.context.canvas.height;
    };


    onRender( ) {
        if (!this.context || !this.width) return;      
        if( this.num_symbols <= 0 || this.num_sc <= 0 ) return;
        let ctx = this.context;

        // Exit early if config not ready yet.
        let vi    = Array.isArray(this.data) ? (this.data[0]||[]) : [];
        let vq    = Array.isArray(this.data) ? (this.data[1]||[]) : [];

        // Ruler-inset plotting area. Currently rulers are zero, but we reserve space anyway.
        const rx_l   = Math.max(  0 , this.ruler_left);   
        const rx_r   = Math.min( this.width - 240 , this.width + (this.ruler_right||0)); // leave room for frequency axis on right (~150 px)
        const ry_t   = Math.max(  0 , this.ruler_top );  
        const ry_b   = Math.min( this.height    , (this.height - 240 ) + (this.ruler_bottom||0)); // leave room for time/label row at bottom (~150 px)

        const plot_w     = rx_r - rx_l;
        const plot_h     = ry_b - ry_t;

        const x0 = this.x0, y0 = this.y0;
        const sx = this.sx * this.width/this.num_symbols;//n;
        const sy = this.sy * this.height/this.num_sc;

        // Clear background — "only clean data for now"
        ctx.fillStyle   = 'black';
        ctx.fillRect     ( 0, 0, this.width , this.height );

        for( let sym = 0; sym < this.num_symbols; sym++ ) {
            let x = sym * sx + x0;
            if (x>this.width) continue;
            if (x<-sx) continue;
            for( let sc = 0; sc < this.num_sc; sc++ ) {
                let y = sc * sy + y0;
                if (y>this.height) continue;
                if (y<-sy) continue;

                let idx = sym * this.num_sc + sc;
                let i = vi[idx] || 0;
                let q = vq[idx] || 0;
                let amp = Math.sqrt(i*i + q*q)/this.max_val; // normalize to [0,1] based on max_val
                let gray = Math.floor(amp*255);

                let color = 'rgb('+gray+','+gray+','+gray+')';
                ctx.fillStyle = color;
                ctx.fillRect(x, y, sx, sy);

                if ((sx>50) && (sy>50) && (this.onRenderBox))
                    this.onRenderBox( x, y, sx, sy, idx);
            }
        }
    }

    onRenderBox( x, y, sx, sy, idx )
    {
        let ctx = this.context;
        ctx.fillStyle='white';
        ctx.fillText( 'sc: '+(idx%this.num_sc), x+5,y+10);
        ctx.fillText( 'i: '+(this.data[0][idx]), x+5,y+20);
        ctx.fillText( 'q: '+(this.data[1][idx]), x+5,y+30);
    }


    onMouseMove( event ) {
        let old_mouse_x = this.mouse_x;
        let old_mouse_y = this.mouse_y;
        this.mouse_x = event.offsetX;
        this.mouse_y = event.offsetY;
        if (this.mouse_button == 1) {
            let dx = this.mouse_x - old_mouse_x;
            let dy = this.mouse_y - old_mouse_y;
            this.x0 += dx;
            this.y0 += dy;
            this.onRender();
        }
    };

    onMouseButtonDown( event ) {
        this.mouse_button = 1;
    };

    onMouseButtonUp( event ) {
        this.mouse_button = 0;
    };


    onMouseWheel( event ) {
        let delta = event.deltaY;
        let zoomFactor = 1.1;

        // check if shift key is pressed, if so - no x zoom, only y zoom
        let shiftPressed = event.shiftKey;
        let altPressed = event.altKey;
        let zoomFactorX = shiftPressed ? 1 : zoomFactor;
        let zoomFactorY = altPressed ? 1 : zoomFactor;
        
        let old_sx = this.sx;
        let old_sy = this.sy;

        // correct the x0 and y0 to zoom around the mouse position
        let mouseX = event.offsetX;
        let mouseY = event.offsetY;        

        if (delta < 0) {
            this.sx *= zoomFactorX;
            this.sy *= zoomFactorY;
        } else {
            this.sx /= zoomFactorX;
            this.sy /= zoomFactorY;
        }

        this.x0 = mouseX - (mouseX - this.x0) * (this.sx / old_sx);
        // for y take into account that y is inverted (0 at top, height at bottom)  
        this.y0 = mouseY - (mouseY - this.y0) * (this.sy / old_sy);

        this.onRender();
    };

    

    onRightClick() {
    };

};


