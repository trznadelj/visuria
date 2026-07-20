function v_minmax_amp(data) {
    let min = 1e30, max = -1e30;
    for (let k = 0; k < data[0].length; k++) {
        let v = Math.sqrt(data[0][k] * data[0][k] + data[1][k] * data[1][k]);
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min: min, max: max };
}

function v_ones(len, val = 1) {
    return Array(len).fill(val);
}

function v_zeros(len) {
    return Array(len).fill(0);
}

function v_slice(v, start, end) {
    if (v.length == 2) // iq vector
    {
        return [v[0].slice(start, end), v[1].slice(start, end)];
    }
    return v.slice(start, end);
}

function v_diff(v) {
    for (let i = 0; i < v.length - 1; i++)
        v[i] = v[i + 1] - v[i];
    v[v.length - 1] = 0;
    return v;
}

function v_sort(v) {
    return v.sort((a, b) => a - b);
}

function v_uniq(v) {
    var r = [];
    for (var i = 0; i < v.length - 1; i++)
        if (v[i] != v[i + 1]) r.push(v[i]);
    return r;
}

function v_set(v, value, start, end)
// set values inside v[start...end-1] = v;
{
    v.fill(value, start, end);

    return v;
}

function v_conjdiff(v)
// get vector (array size 2 x num_elements)
// returns v[n] * conj(v[n-1])
{
    const re = v[0];
    const im = v[1];
    const N = re.length;

    const outRe = new Float32Array(N);
    const outIm = new Float32Array(N);

    outRe[0] = 0;
    outIm[0] = 0;

    for (let i = 1; i < N; i++) {
        const ar = re[i];
        const ai = im[i];
        const br = re[i - 1];
        const bi = im[i - 1];

        // (ar+jai) * (br-jbi)
        outRe[i] = ar * br + ai * bi;
        outIm[i] = ai * br - ar * bi;
    }

    return [outRe, outIm];
}


function v_angle(v)
// get vector (array size 2 x num_elements)
// return atan2(im,re) for each element
{
    const re = v[0];
    const im = v[1];
    const N = re.length;

    const out = new Float32Array(N);

    for (let i = 0; i < N; i++) {
        out[i] = Math.atan2(im[i], re[i]);
    }

    return out;
}