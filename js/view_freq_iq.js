var colmap = [ 255,255,255, // zero
               255,0,0,     // 1 - DMRS
               0,255,0,     // 2 - PDCCH / PUCCH
               0,0,255,     // 3 - PDSCH / PUSCH
               255,255,0,   // 4 - PBCH (yellow)
               0
                 ];

const colmap_names = ['?', 'DMRS', 'PDCCH', 'PDSCH', 'PBCH'];

class view_freq_iq extends view_zoom_pan {
    constructor( data ) {
        super( data );

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

        this.cache_bitmap = null; // cached bitmap for rendering
        this.cache_canvas = null; // cached canvas for rendering

        this.chan_map = v_zeros( data[0].length );
        this.flag_map = v_ones( data[0].length ); // 1:selected, 2: higlighted
        this.idx2Rgb = this.idx2RgbAmp;
        this.onRender = this.onRenderRegrid;
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
        switch( this.render_mode )
        {
	    default:
            case 0: this.idx2Rgb = this.idx2RgbAmp; break; 
            case 1: this.idx2Rgb = this.idx2RgbAngle; break;
            case 2: this.idx2Rgb = this.idx2RgbChanAmp; break;
            case 3: this.idx2Rgb = this.idx2RgbChanFull; break;
            case 4: this.idx2Rgb = this.idx2RgbChanRegrid; break;
            case 5: this.idx2Rgb = this.idx2RgbWhite; break;
        }
        this.cache_bitmap = null;
    };

    setRenderType( type ) {
        switch( type )
        {
            default:
            case 'regrid': this.onRender = this.onRenderRegrid; break;
            case 'iq': this.onRender = this.onRenderIq; break;
        }
    }

    idx2RgbWhite(  )
    {
        return [255,255,255]; //todo.
    }


    idx2RgbAngle( idx, chan )
    {
        // Implementation for converting index to color
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let angle = (Math.atan2(i,q)+3.14159)/3.14159/2*100;
        let amp = Math.sqrt(i*i + q*q)/this.max_val*100;

        let h = angle;
        let s = 100;
        let v = amp;
        
        return hsvToRgb(h,s,v);
    }


    idx2RgbChanAmp( idx, chan )
    {
        // Implementation for converting index to color
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let amp = Math.sqrt(i*i + q*q)/this.max_val;
        return [colmap[3*chan]*amp, colmap[3*chan+1]*amp, colmap[3*chan+2]*amp ];
    }

    idx2RgbChanFull( idx, chan )
    {
        // Implementation for converting index to color
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let amp = Math.sqrt(i*i + q*q)/this.max_val;
        return (amp>0)?[colmap[3*chan], colmap[3*chan+1], colmap[3*chan+2] ] : [0,0,0];
    }

    idx2RgbChanRegrid( idx, chan )
    {
        return [colmap[3*chan], colmap[3*chan+1], colmap[3*chan+2] ];
    }

    idx2RgbAmp( idx, chan )
    {
        // Implementation for converting index to color
        let i = this.data[0][idx] || 0;
        let q = this.data[1][idx] || 0;
        let amp = Math.sqrt(i*i + q*q)/this.max_val;
        let gray = amp*255;
        return [gray, gray, gray];
    }        

    idx2Color( idx, chan )
    {
       
        let x = this.idx2Rgb( idx, chan);
        return 'rgb(' + Math.floor(x[0]) + ',' + Math.floor(x[1]) + ',' + Math.floor(x[2]) + ')';
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
                    let idx = sym * this.num_sc + sc;
                    let color = this.idx2Rgb(idx, this.chan_map[idx]);
                    let offset = (sym + sc * this.num_symbols) * 4;
                    this.cache_bitmap[offset]     = color[0];     // R
                    this.cache_bitmap[offset + 1] = color[1];     // G
                    this.cache_bitmap[offset + 2] = color[2];     // B
                    this.cache_bitmap[offset + 3] = 255;          // A
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
    

    onRenderRegrid( ) {
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

        let w_x = Math.floor( sx + 0.999 );
        if (w_x>30) w_x=Math.floor( w_x*0.96 );
        let w_y = Math.floor( sy + 0.999 );
        if (w_y>30) w_y=Math.floor( w_y*0.96 );

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
                    if (y > this.height) break;
                    if (y < -sy) continue;
                    let idx = sym * this.num_sc + sc;
                    if (!this.flag_map[idx]) continue;
                    let color = this.idx2Color( idx, this.chan_map[idx] );

                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, w_x, w_y);

                    if ((sx > 50) && (sy > 50) && (this.onRenderBox))
                        this.onRenderBox(x, y, w_x, w_y, idx);
                }
            }
        }
        this.drawRulers();
        ctx.strokeStyle = 'yellow';
        ctx.fillStyle = 'green';
       
    }

    
    onRenderIq() 
    {
        if (!this.context || !this.width) return;      
        if( this.num_symbols <= 0 || this.num_sc <= 0 ) return;
        let ctx = this.context;

        // Exit early if config not ready yet.
        let vi    = Array.isArray(this.data) ? (this.data[0]||[]) : [];
        let vq    = Array.isArray(this.data) ? (this.data[1]||[]) : [];

        const x0 = this.x0+this.width/2, y0 = this.y0+this.height/2;
        const sx = this.sx * this.width/2/this.max_val;//n;
        const sy = this.sy * this.height/2/this.max_val;
        const w_x= 2; 
        const w_y= 2;

        // Clear background — "only clean data for now"
        ctx.fillStyle   = 'black';
        ctx.fillRect     ( 0, 0, this.width , this.height );


        for (let sym = 0; sym < this.num_symbols; sym++) {
            for (let sc = 0; sc < this.num_sc; sc++) {
                let idx = sym * this.num_sc + sc;

                let x = vi[idx] * sx + x0;
                let y = vq[idx] * sy + y0;
                
                if (!this.flag_map[idx]) continue;

                let color = this.idx2Color( idx, this.chan_map[idx] );
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w_x, w_y);                
            }
        }
        
    }


    drawRulers() 
    {
        let ctx = this.context;
        const sx = this.sx * this.width/this.num_symbols;        
        const sy = this.sy * this.height/this.num_sc;
        const xpos = this.x0>50?this.x0-50:0;
        let   ypos = this.sy * this.height + this.y0;
        if (ypos>this.height-30) ypos = this.height-30;
        // Draw frequency ruler on the left side
        // transulcent dark overlay
        ctx.fillStyle = 'rgba(0.2,0.2,0.2,0.5)';
        ctx.fillRect( xpos, 0, 50, this.height );
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        let rb = 0;
        for( let sc=0; sc < this.num_sc; sc+=12 ) {
            let y0 = (sc) * sy + this.y0;
            let y = (sc+6) * sy + this.y0;
            if (y < 0) continue;
            if (y > this.height) break;
            rb = sc/12;
            ctx.fillText( 'rb: ' + rb, xpos+4, y );
            
            ctx.beginPath();
            ctx.moveTo( xpos, y0 );
            ctx.lineTo( xpos+30, y0 );
            ctx.stroke();
        }

        if (xpos>20)
        {
            drawArrow( ctx, xpos-25, this.y0+this.sy*this.height, xpos-25, this.y0, "Frequency: " + this.num_sc +" subcarriers"  );
        }
 
        // Draw time ruler on the bottom
     
        ctx.fillStyle = 'rgba(0.2,0.2,0.2,0.5)';
        ctx.fillRect( 0, ypos, this.width, 30 );
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        for( let sym=0; sym < this.num_symbols; sym++ ) {
            let x0 = (sym) * sx + this.x0;
            let x = (sym+1) * sx + this.x0;
            if (x < 0) continue;
            if (x > this.width) break;
            if ((sx<10) && (sym%14)) continue;
            ctx.fillText( sym%14, (x0+x)/2, ypos+28 );
            if (!(sym%14))
                ctx.fillText( sym/14, (x0+x)/2, ypos+12 );
        }

        if (this.height-ypos>30)
            drawArrow( ctx, this.x0, ypos+50, this.sx * this.width+this.x0, ypos+50, " Time:" + this.num_symbols +" symbols" )
    }


    onRenderBox( x, y, sx, sy, idx )
    {
        let ctx = this.context;
        // transulcent dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect( x+4, y+4, sx-12, sy-12);

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
        ctx.fillText(  colmap_names[ this.chan_map[idx] ], x+8,y+14);
        ctx.fillText( (idx%this.num_sc) + ' ' + angle_deg + '°', x+8,y+24);
        ctx.fillText( 'i: '+(this.data[0][idx].toFixed(4)), x+8,y+34);
        ctx.fillText( 'q: '+(this.data[1][idx].toFixed(4)), x+8,y+44);
    }

};
