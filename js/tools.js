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
    for( let k = 0; k < data[0].length; k++ ) {
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

function v_slice(v, start, end) 
{
    if (v.length==2) // iq vector
    {
        return [ v[0].slice(start, end), v[1].slice(start, end) ];
    }
    return v.slice(start, end);
}

function hsvToRgb(h, s, v) {
  // Przeliczenie nasycenia i jasności na ułamki (0-1)
  s /= 100;
  v /= 100;

  // Główny wzór matematyczny
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));

  // Zaokrąglenie do liczb całkowitych z przedziału 0-255
  return [
    Math.round(255 * f(5)), // Czerwony (R)
    Math.round(255 * f(3)), // Zielony (G)
    Math.round(255 * f(1))  // Niebieski (B)
  ];
}