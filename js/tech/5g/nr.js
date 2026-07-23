function nr_framing( out, u, is_ecp, sampling_rate )
{
    /* Sanity checks */
    if (u>5) throw "Bad u = "+u;

    let ratio         = sampling_rate/122880000;
    let scale         =   64/(1<<u);
    let cp_ext        =   32*scale;
    let cp            =    9*scale;

    out.u             = u;
    out.sym_in_slot   = 14-2*is_ecp;
    out.is_ecp        = is_ecp;
    out.sc_spacing    = 15000<<u; /* 38.211 4.2 */
    out.sampling_rate = sampling_rate;
    out.fft_size      = Math.round( 128*scale*ratio );
    out.n_dl_rb       = [ 270, 273, 135, 66, 33, 0 ][u]; // maximum number.
    out.num_sc        = out.n_dl_rb*12;

    if (is_ecp)
    {
        out.cp_map      = v_ones( 6<<u, cp_ext * ratio );
    }
    else
    {
        out.cp_map      = v_ones( 7<<u, cp * ratio );
        out.cp_map[ 0 ]+= 2 * scale * ratio;
    }    

    return out;
}


function nr_config()
{
    return [ ['skip_bytes','num_sc','fft_size','NR_u','cp_map','ant_interleaved'], 
             [0,600,1024,1,[80,72,72,72,72,72,72],1] ]
}
