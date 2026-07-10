function nr_psch()
{
    /* 7.4.2.2.1 of 38.211 */
    var x = [ 0,1,1,0,1,1,1 ], ret=[];

    for( var i = 0; i<120; i++)
        x[i+7] = x[i+4]^x[i];

    for( var i = 0; i<127; i++)
        ret.push( ( i+43*n_id_2 )%127 );

    return ret;
}

function gold31( c_init, len )
{
    var x1 = 1, x2 = c_init|0, ret = [], n, nx1, nx2;

    for( n=0; n<1600+len; n++)
    {
        if (n>=1600)
            ret.push( (x1 ^ x2) & 1 );

        nx1 = ( (x1>>3) ^ x1) & 1;
        nx2 = ( (x2>>3) ^ (x2>>2) ^ (x2>>1) ^ x2) & 1;
        x1  = (x1>>1) | ( nx1<<30 );
        x2  = (x2>>1) | ( nx2<<30 );
    }

    return ret;
}
