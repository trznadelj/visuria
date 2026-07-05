class view_freq_iq {
    constructor( data ) {
        this.data = data;
        this.x0 = 0;       // horizontal offset (pixels)
        this.y0 = 0;       // vertical offset (inverted canvas Y)

        this.sx = 1.0;     // horizontal zoom scale factor
        this.sy = 1.0;     // vertical zoom scale factor

        let t = v_minmax_amp( data );
        this.min_val = t.min;      // amplitude min (unused for now)
        this.max_val = t.max;       // used as clamp ceiling
        this.render_mode = 2;    // 0=ALL_BLACK, 1=FULL_WHITE, 2=AMPLITUDE, 3=FULL_CHANNEL, 4=AMPLITUDE_CHANNEL

        this.num_sc = 0;      // number of subcarriers (rows) — set by setConfig
        this.num_symbols = 0; // computed symbols per row

        this.ruler_top    = 0; // reserved top pixels for ruler UI
        this.ruler_bottom = 0; // reserved bottom pixels
        this.ruler_left   = 0; // reserved left pixels
        this.ruler_right  = 0; // reserved right pixels

        this.mouse_button = 0;  
        this.mouse_x      = 0;
        this.mouse_y      = 0;
        this.cache_bitmap = null; // cached bitmap for rendering
        this.cache_canvas = null; // cached canvas for rendering
    };

    setConfig( config ) {
        if (!config) return;
        this.num_sc         = config.num_sc || 1;
        // data is flat [I, I... , Q, Q ...] array (one pair per subcarrier+symbol? Or interleaved?)
        // user's formula: number of horizontal columns shall be floor( length(data) / num_sc )
        this.num_symbols = Math.max(0, Math.floor(this.data[ 0 ].length / this.num_sc));
    };

    setColorMode( mode ) {
        this.render_mode = mode;
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

    idx2Rgb( idx )
    {
        // Implementation for converting index to color
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let amp = Math.sqrt(i*i + q*q)/this.max_val;
        let gray = amp*255;
        return [gray, gray, gray];
    }

    idx2Color( idx )
    {
       
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let amp = Math.sqrt(i*i + q*q)/this.max_val;
        let gray = Math.floor(amp*255);
        return 'rgb(' + gray + ',' + gray + ',' + gray + ')';
    }

    onRenderBitmap( )
    {
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

        if (!this.cache_bitmap)
        {
            // create 32-bit array
            this.cache_bitmap = new Uint8ClampedArray( this.num_symbols * this.num_sc * 4 );
            for( let sym = 0; sym < this.num_symbols; sym++ ) {
                for( let sc = 0; sc < this.num_sc; sc++ ) {
                    let color = this.idx2Rgb(sym * this.num_sc + sc);
                    let offset = (sym + sc * this.num_symbols) * 4;
                    this.cache_bitmap[offset]     = color[0];     // R
                    this.cache_bitmap[offset + 1] = color[1];     // G
                    this.cache_bitmap[offset + 2] = color[2];     // B
                    this.cache_bitmap[offset + 3] = 255;     // A
                }
            }
            this.cache_canvas        = document.createElement('canvas');
            this.cache_canvas.width  = this.num_symbols;
            this.cache_canvas.height = this.num_sc;
            this.cache_canvas.getContext('2d').putImageData(new ImageData(this.cache_bitmap, this.num_symbols, this.num_sc), 0, 0);
        }

        // Draw the image data to the canvas, scaling it to fit the current view
        this.context.drawImage(this.cache_canvas,  Math.round(x0), Math.round(y0), Math.round(this.num_symbols * sx), Math.round(this.num_sc * sy));
    }

    

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

        if (sx*sy <20)
        {
            this.onRenderBitmap();            
        }
        else
        {
            for (let sym = 0; sym < this.num_symbols; sym++) {
                let x = sym * sx + x0;
                if (x > this.width) continue;
                if (x < -sx) continue;
                for (let sc = 0; sc < this.num_sc; sc++) {
                    let y = sc * sy + y0;
                    if (y > this.height) continue;
                    if (y < -sy) continue;

                    let idx = sym * this.num_sc + sc;
                    let color = this.idx2Color( idx );

                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, sx, sy);

                    if ((sx > 50) && (sy > 50) && (this.onRenderBox))
                        this.onRenderBox(x, y, sx, sy, idx);
                }
            }
        }
        this.drawRulers();
    }

    drawRulers() 
    {
        let ctx = this.context;
        const sx = this.sx * this.width/this.num_symbols;        
        const sy = this.sy * this.height/this.num_sc;
        
        // Draw frequency ruler on the left side
        // transulcent dark overlay
        ctx.fillStyle = 'rgba(0.2,0.2,0.2,0.5)';
        ctx.fillRect( 0, 0, 50, this.height );
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        let rb = 0;
        for( let sc=0; sc < this.num_sc; sc+=12 ) {
            let y0 = (sc) * sy + this.y0;
            let y = (sc+6) * sy + this.y0;
            if (y < 0) continue;
            if (y > this.height) break;
            rb = sc/12;
            ctx.fillText( 'rb: ' + rb, 4, y );
            
            ctx.beginPath();
            ctx.moveTo( 0, y0 );
            ctx.lineTo( 30, y0 );
            ctx.stroke();
        }

        // Draw time ruler on the bottom
     
        ctx.fillStyle = 'rgba(0.2,0.2,0.2,0.5)';
        ctx.fillRect( 0, this.height-30, this.width, 30 );
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        for( let sym=0; sym < this.num_symbols; sym++ ) {
            let x0 = (sym) * sx + this.x0;
            let x = (sym+1) * sx + this.x0;
            if (x < 0) continue;
            if (x > this.width) break;
            ctx.fillText( sym%14, (x0+x)/2, this.height-12 );
        }
    }

    onRenderBox( x, y, sx, sy, idx )
    {
        let ctx = this.context;
        // transulcent dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect( x+4, y+4, sx-8, sy-8);

        // draw graph arrows in the center of the box
        let cx = x + sx/2;
        let cy = y + sy/2;

        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo( x+6, cy);
        ctx.lineTo( x+sx-12, cy);
        ctx.stroke();
        ctx.moveTo( cx, y+6);
        ctx.lineTo( cx, y+sy-12);
        ctx.stroke();


        // draw pixel in i/q position, assuming i/q are normalized to [-1,1]*this.max_val  
        let px = x + (1 + this.data[0][idx]/this.max_val) * sx/2;
        let py = y + (1 - this.data[1][idx]/this.max_val) * sy/2;
        ctx.fillStyle='white';
        ctx.fillRect( px-2, py-2, 4, 4);

        if ((sx<100)||(sy<100)) return;

        // text
        
        let angle_deg = Math.round( Math.atan2(this.data[1][idx], this.data[0][idx]) * 180 / Math.PI );
        ctx.fillText( (idx%this.num_sc) + ' ' + angle_deg + '°', x+8,y+24);
        ctx.fillText( 'i: '+(this.data[0][idx].toFixed(4)), x+8,y+34);
        ctx.fillText( 'q: '+(this.data[1][idx].toFixed(4)), x+8,y+44);

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
