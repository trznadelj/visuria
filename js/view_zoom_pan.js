// Parent class for zoom/pan mouse handling shared by IQ views.
class view_zoom_pan {
    constructor( data ) {
        this.data = data;
        this.x0 = 0;       // horizontal offset (pixels)
        this.y0 = 0;       // vertical offset (inverted canvas Y)

        this.sx = 1.0;     // horizontal zoom scale factor
        this.sy = 1.0;     // vertical zoom scale factor

        this.mouse_button = 0;
        this.mouse_x      = 0;
        this.mouse_y      = 0;
    };

    setContext( context ) {
        this.context = context;
        this.onResize();
    };

    onResize() {
        if (!this.context || !this.context.canvas) return;
        this.width  = this.context.canvas.width;
        this.height = this.context.canvas.height;
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
        this.mouse_x = event.offsetX;
        this.mouse_y = event.offsetY;
    };

    onMouseButtonUp( event ) {
        this.mouse_button = 0;
    };

    onMouseWheel( event ) {
        let delta = event.deltaY;
        let zoomFactor = 1.1;

        // shift: constrain zoom to Y axis only
        // alt:   constrain zoom to X axis only
        let shiftPressed = event.shiftKey;
        let altPressed   = event.altKey;
        let zoomFactorY  = shiftPressed ? 1 : zoomFactor;
        let zoomFactorX  = altPressed   ? 1 : zoomFactor;

        let old_sx = this.sx;
        let old_sy = this.sy;

        // zoom around mouse position
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
        // y is inverted (0 at top, height at bottom)
        this.y0 = mouseY - (mouseY - this.y0) * (this.sy / old_sy);

        this.onRender();
    };

    onRightClick( event ) {
        var floating  =document.getElementById('floating_dialog');
        var ex = event.offsetX;
        var ey = event.offsetY;
        floating.style.top = ex;
        floating.style.left= ey;
        $('#floating_dialog').dialog('open');
    };

    cancelZoom() {
        this.sx=this.sy=1;
        this.x0=this.y0=0;
    }
};
