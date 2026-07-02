function getFieldNames(objects) {
    const fields = new Set();
    for (const obj of objects) {
      Object.keys(obj).forEach(key => fields.add(key));
    }
    return Array.from(fields);
}


function int16float( v )
{
    if (v>32767) 
        return -(65536-v)/32768;
    return v/32768;
}


function v_minmax_amp( data ) {
    let min = 1e30, max = -1e30;
    for( let k = 0; k < data.length; k++ ) {
        let v = Math.sqrt( data[0][k] * data[0][k] + data[1][k] * data[1][k] );
        if( v < min ) min = v;
        if( v > max ) max = v;
    }
    return { min: min, max: max };
}

function v_ones(len, val = 1) 
{
    return Array(len).fill(val);
}

function v_zeros(len) 
{
    return Array(len).fill(0);
}
