
class view_time_iq extends view_zoom_pan {
    constructor( data ) {
        super( data );

        let t = v_minmax_amp( this.data );
        this.min = 0;//t.min;
        this.max = 1;//t.max;
    };



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

};
