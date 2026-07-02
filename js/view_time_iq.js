
class view_time_iq {
    constructor( data ) {
        this.data = data;
        this.x0 = this.y0 = 0;
        this.sx = this.sy = 1; // scale

        let t = v_minmax_amp( this.data );
        this.min = 0;//t.min;
        this.max = 1;//t.max;
        this.mouse_button = 0;  
        this.mouse_x = 0;
        this.mouse_y = 0;
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
        this.width = this.context.canvas.width;
        this.height = this.context.canvas.height;
    }

    onRender( ) {
        let ctx = this.context;
        ctx.fillStyle = 'black';
        ctx.fillRect( 0, 0, this.width, this.height );
        ctx.strokeStyle = 'white';
        let vi = this.data[0];
        let vq = this.data[1];
        let n = Math.min( vi.length, vq.length );
        let x0 = this.x0, y0 = this.y0;
        let sx = this.sx * this.width/100000;//n;
        let sy = this.sy * this.height/(this.max-this.min);

        let yd = this.height + y0;
        for( let i = 0; i < n - 1; i++ ) {
            let yv = Math.sqrt( vi[i] * vi[i] + vq[i] * vq[i] );
            let x = x0 + i * sx;
            let y = this.height - yv * sy +y0;              

            let c = Math.floor( yv*256 );
            this.context.fillStyle = 'white';//`rgb(${c},${c},${c})`;
            this.context.fillRect( x, y, sx, yd-y );
           
        }
    };

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
