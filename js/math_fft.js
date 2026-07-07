function fft([re, im], is_ifft)
// fft — dispatch: ct_fft if PoT length, else naive_fft.
{
    const N = re.length;
    if (N <= 1) return [re.slice(), im.slice()];
    // power-of-2 test
    if ((N & (N - 1)) === 0) {
        return ct_fft([re, im], is_ifft);
    } else {
        return naive_fft([re, im], is_ifft);
    }
}

function ct_fft([re, im], is_ifft)
// ct_fft — Cooley-Tukey radix-2 FFT/IFFT. Zero-pads to next power of 2.
{
    const N = re.length;
    if (N <= 1) return [re.slice(), im.slice()];

    const M = Math.pow(2, Math.ceil(Math.log2(N)));
    const reOut = new Array(M).fill(0);
    const imOut = new Array(M).fill(0);

    // bit-reversal permutation
    const bits = Math.log2(M);
    for (let i = 0; i < N; i++) {
        const j = bitReverse(i, bits);
        reOut[j] = re[i];
        imOut[j] = im[i];
    }

    // iterative butterfly
    for (let len = 2; len <= M; len <<= 1) {
        const half = len >>> 1;
        const angle = (is_ifft ? 1 : -1) * 2 * Math.PI / len;

        for (let i = 0; i < M; i += len) {
            for (let j = 0; j < half; j++) {
                const wRe = Math.cos(angle * j);
                const wIm = Math.sin(angle * j);

                const idx  = i + j;
                const idx2 = idx + half;

                const uRe = reOut[idx];
                const uIm = imOut[idx];
                const vRe = reOut[idx2];
                const vIm = imOut[idx2];

                const tRe = wRe * vRe - wIm * vIm;
                const tIm = wRe * vIm + wIm * vRe;

                reOut[idx]  = uRe + tRe;
                imOut[idx]  = uIm + tIm;
                reOut[idx2] = uRe - tRe;
                imOut[idx2] = uIm - tIm;
            }
        }
    }

    // Constant power
//    if (is_ifft) {
        const invN = 1 / Math.sqrt(M);
        for (let i = 0; i < M; i++) {
            reOut[i] *= invN;
            imOut[i] *= invN;
        }
  //  }

    return [reOut, imOut];
}

function naive_fft([re, im], is_ifft)
// naive_fft — O(N²) DFT/IDFT straight from definition.
{
    const N = re.length;
    if (N <= 1) return [re.slice(), im.slice()];

    const reOut = new Array(N).fill(0);
    const imOut = new Array(N).fill(0);
    const sign = is_ifft ? 1 : -1;

    for (let k = 0; k < N; k++) {
        for (let n = 0; n < N; n++) {
            const angle = sign * 2 * Math.PI * k * n / N;
            const wRe = Math.cos(angle);
            const wIm = Math.sin(angle);
            reOut[k] += re[n] * wRe - im[n] * wIm;
            imOut[k] += re[n] * wIm + im[n] * wRe;
        }
    }

    if (is_ifft) {
        const invN = 1 / N;
        for (let i = 0; i < N; i++) {
            reOut[i] *= invN;
            imOut[i] *= invN;
        }
    }

    return [reOut, imOut];
}

function bitReverse(x, log2N)
// bitReverse — bit-reverse x over log2N bits.
{
    let r = 0;
    for (let i = 0; i < log2N; i++) {
        r = (r << 1) | (x & 1);
        x >>>= 1;
    }
    return r;
}
