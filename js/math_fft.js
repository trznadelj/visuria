var force_naive_fft = 0;

function fft([re, im], is_ifft)
// fft — dispatch: ct_fft if PoT length, else naive_fft.
{
    const N = re.length;
    if (N <= 1) return [re.slice(), im.slice()];
    // power-of-2 test
    if ((N & (N - 1)) === 0) {
        return ct_fft([re, im], is_ifft);
    } else {
        if (N==1536)
            return fft1536( [re,im], is_ifft);
        else
        {
            if (force_naive_fft)
                return naive_fft([re, im], is_ifft);
            return bluesteinFFT([re, im], is_ifft);            
        }
    }
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


// chatgpt optmized.

const FFT_TWO_PI = 2 * Math.PI;
const FFT_INV_SQRT3 = 1 / Math.sqrt(3);
const FFT_SQRT3_OVER_2 = Math.sqrt(3) / 2;

/**
 * In-place radix-2 FFT.
 *
 * re.length and im.length must be the same power of two.
 * Uses unitary normalization: 1 / sqrt(N) for both FFT and IFFT.
 */
function fftRadix2InPlace(re, im, isIFFT = false) {
    const n = re.length;

    if (n !== im.length) {
        throw new Error("Real and imaginary arrays must have equal length");
    }

    if (n <= 1) {
        return;
    }

    if ((n & (n - 1)) !== 0) {
        throw new Error("FFT length must be a power of two");
    }

    /*
     * Incremental bit-reversal permutation.
     * This avoids calling a separate bitReverse() function for every sample.
     */
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >>> 1;

        while (j & bit) {
            j ^= bit;
            bit >>>= 1;
        }

        j ^= bit;

        if (i < j) {
            let tmp = re[i];
            re[i] = re[j];
            re[j] = tmp;

            tmp = im[i];
            im[i] = im[j];
            im[j] = tmp;
        }
    }

    const direction = isIFFT ? 1 : -1;

    /*
     * Iterative radix-2 butterflies.
     *
     * Only one sin() and cos() call per FFT stage.
     */
    for (let len = 2; len <= n; len *= 2) {
        const half = len >>> 1;
        const angle = direction * FFT_TWO_PI / len;

        const stepRe = Math.cos(angle);
        const stepIm = Math.sin(angle);

        for (let base = 0; base < n; base += len) {
            let wRe = 1;
            let wIm = 0;

            for (let j = 0; j < half; j++) {
                const i0 = base + j;
                const i1 = i0 + half;

                const vRe = re[i1];
                const vIm = im[i1];

                const tRe = wRe * vRe - wIm * vIm;
                const tIm = wRe * vIm + wIm * vRe;

                const uRe = re[i0];
                const uIm = im[i0];

                re[i0] = uRe + tRe;
                im[i0] = uIm + tIm;

                re[i1] = uRe - tRe;
                im[i1] = uIm - tIm;

                // w *= step
                const nextWRe = wRe * stepRe - wIm * stepIm;
                wIm = wRe * stepIm + wIm * stepRe;
                wRe = nextWRe;
            }
        }
    }

    // Unitary normalization: preserves signal energy.
    const scale = 1 / Math.sqrt(n);

    for (let i = 0; i < n; i++) {
        re[i] *= scale;
        im[i] *= scale;
    }
}


/**
 * Radix-2 FFT with zero-padding to the next power of two.
 *
 * Input:
 *     ct_fft([realArray, imagArray], isIFFT)
 *
 * Output:
 *     [Float64Array, Float64Array]
 */
function ct_fft([re, im], isIFFT = false) {
    const inputLength = re.length;

    if (inputLength !== im.length) {
        throw new Error("Real and imaginary arrays must have equal length");
    }

    if (inputLength === 0) {
        return [new Float64Array(0), new Float64Array(0)];
    }

    let fftLength = 1;

    while (fftLength < inputLength) {
        fftLength *= 2;
    }

    const reOut = new Float64Array(fftLength);
    const imOut = new Float64Array(fftLength);

    reOut.set(re);
    imOut.set(im);

    fftRadix2InPlace(reOut, imOut, isIFFT);

    return [reOut, imOut];
}


/**
 * Optimized mixed-radix FFT for N = 1536 = 3 * 512.
 *
 * Uses:
 *     1. Three 512-point radix-2 FFTs.
 *     2. Twiddle multiplication.
 *     3. A radix-3 butterfly.
 *
 * Uses unitary normalization for both FFT and IFFT.
 */
function fft1536([re, im], isIFFT = false) {
    const N = 1536;
    const M = 512;

    if (re.length !== N || im.length !== N) {
        throw new Error("fft1536: real and imaginary lengths must be 1536");
    }

    /*
     * Split:
     *
     * segment 0 = x[0], x[3], x[6], ...
     * segment 1 = x[1], x[4], x[7], ...
     * segment 2 = x[2], x[5], x[8], ...
     */
    const re0 = new Float64Array(M);
    const im0 = new Float64Array(M);
    const re1 = new Float64Array(M);
    const im1 = new Float64Array(M);
    const re2 = new Float64Array(M);
    const im2 = new Float64Array(M);

    for (let m = 0, n = 0; m < M; m++, n += 3) {
        re0[m] = re[n];
        im0[m] = im[n];

        re1[m] = re[n + 1];
        im1[m] = im[n + 1];

        re2[m] = re[n + 2];
        im2[m] = im[n + 2];
    }

    fftRadix2InPlace(re0, im0, isIFFT);
    fftRadix2InPlace(re1, im1, isIFFT);
    fftRadix2InPlace(re2, im2, isIFFT);

    const reOut = new Float64Array(N);
    const imOut = new Float64Array(N);

    const direction = isIFFT ? 1 : -1;

    /*
     * W_N^k recurrence.
     *
     * twiddle1 = W_N^k
     * twiddle2 = W_N^(2k)
     */
    const stepAngle = direction * FFT_TWO_PI / N;
    const stepRe = Math.cos(stepAngle);
    const stepIm = Math.sin(stepAngle);

    let tw1Re = 1;
    let tw1Im = 0;

    for (let k = 0; k < M; k++) {
        const a0Re = re0[k];
        const a0Im = im0[k];

        // a1 = FFT(segment1)[k] * W_N^k
        const a1Re = re1[k] * tw1Re - im1[k] * tw1Im;
        const a1Im = re1[k] * tw1Im + im1[k] * tw1Re;

        // W_N^(2k) = (W_N^k)^2
        const tw2Re = tw1Re * tw1Re - tw1Im * tw1Im;
        const tw2Im = 2 * tw1Re * tw1Im;

        // a2 = FFT(segment2)[k] * W_N^(2k)
        const a2Re = re2[k] * tw2Re - im2[k] * tw2Im;
        const a2Im = re2[k] * tw2Im + im2[k] * tw2Re;

        /*
         * Three-point DFT.
         *
         * X0 = a0 + a1 + a2
         *
         * X1 and X2 use:
         * exp(±j 2π/3) = -1/2 ± j sqrt(3)/2
         */
        const sum12Re = a1Re + a2Re;
        const sum12Im = a1Im + a2Im;

        const diff12Re = a1Re - a2Re;
        const diff12Im = a1Im - a2Im;

        const commonRe = a0Re - 0.5 * sum12Re;
        const commonIm = a0Im - 0.5 * sum12Im;

        const crossRe = direction * FFT_SQRT3_OVER_2 * diff12Im;
        const crossIm = direction * FFT_SQRT3_OVER_2 * diff12Re;

        /*
         * The 512-point transforms were already scaled by 1/sqrt(512).
         * Scaling the radix-3 outputs by 1/sqrt(3) gives:
         *
         * 1 / sqrt(512 * 3) = 1 / sqrt(1536)
         */
        reOut[k] = (a0Re + sum12Re) * FFT_INV_SQRT3;
        imOut[k] = (a0Im + sum12Im) * FFT_INV_SQRT3;

        reOut[k + M] = (commonRe + crossRe) * FFT_INV_SQRT3;
        imOut[k + M] = (commonIm - crossIm) * FFT_INV_SQRT3;

        reOut[k + 2 * M] = (commonRe - crossRe) * FFT_INV_SQRT3;
        imOut[k + 2 * M] = (commonIm + crossIm) * FFT_INV_SQRT3;

        // W_N^(k+1) = W_N^k * W_N
        const nextTwRe = tw1Re * stepRe - tw1Im * stepIm;
        tw1Im = tw1Re * stepIm + tw1Im * stepRe;
        tw1Re = nextTwRe;
    }

    return [reOut, imOut];
}


/**
 * Bluestein FFT for arbitrary transform lengths.
 *
 * Uses fftRadix2InPlace() internally for convolution.
 * The radix-2 FFT is assumed to use unitary normalization:
 *
 *     scale = 1 / sqrt(n)
 *
 * Input:
 *     bluesteinFFT([realArray, imagArray], isIFFT)
 *
 * Output:
 *     [Float64Array, Float64Array]
 *
 * The output length is exactly equal to the input length.
 */
function bluesteinFFT([re, im], isIFFT = false) {
    const N = re.length;

    if (N !== im.length) {
        throw new Error(
            "bluesteinFFT: real and imaginary arrays must have equal length"
        );
    }

    if (N === 0) {
        return [
            new Float64Array(0),
            new Float64Array(0)
        ];
    }

    if (N === 1) {
        return [
            new Float64Array([re[0]]),
            new Float64Array([im[0]])
        ];
    }

    /*
     * Bluestein converts the N-point DFT into a convolution.
     *
     * The linear convolution length is:
     *
     *     2*N - 1
     *
     * Choose the next power-of-two length for the radix-2 FFT.
     */
    let M = 1;

    while (M < 2 * N - 1) {
        M *= 2;
    }

    const aRe = new Float64Array(M);
    const aIm = new Float64Array(M);
    const bRe = new Float64Array(M);
    const bIm = new Float64Array(M);

    /*
     * Forward FFT:
     *
     *     X[k] = sum x[n] exp(-i*2*pi*n*k/N)
     *
     * Inverse FFT:
     *
     *     X[k] = sum x[n] exp(+i*2*pi*n*k/N)
     *
     * Both transforms use unitary normalization.
     */
    const direction = isIFFT ? 1 : -1;

    /*
     * Bluestein identity:
     *
     * exp(direction*i*2*pi*n*k/N)
     *
     * = exp(direction*i*pi*n^2/N)
     *   exp(direction*i*pi*k^2/N)
     *   exp(-direction*i*pi*(k-n)^2/N)
     *
     * Therefore:
     *
     * a[n] = x[n] exp(direction*i*pi*n^2/N)
     * b[n] =      exp(-direction*i*pi*n^2/N)
     */
    for (let n = 0; n < N; n++) {
        /*
         * Reduce n^2 modulo 2*N because:
         *
         *     exp(i*pi*(n^2 + 2*N)/N)
         *       = exp(i*pi*n^2/N)
         *
         * This also avoids unnecessarily large angles.
         *
         * Number arithmetic is exact here while n^2 remains below
         * Number.MAX_SAFE_INTEGER, which covers practical FFT sizes.
         */
        const n2mod = (n * n) % (2 * N);
        const angle = direction * Math.PI * n2mod / N;

        const chirpRe = Math.cos(angle);
        const chirpIm = Math.sin(angle);

        const xRe = re[n];
        const xIm = im[n];

        // a[n] = x[n] * chirp[n]
        aRe[n] = xRe * chirpRe - xIm * chirpIm;
        aIm[n] = xRe * chirpIm + xIm * chirpRe;

        /*
         * b[n] = conjugate(chirp[n])
         *
         * Positive and negative indices must both be present for
         * the circular convolution to represent linear convolution:
         *
         *     b[-n] = b[M - n]
         */
        const kernelRe = chirpRe;
        const kernelIm = -chirpIm;

        bRe[n] = kernelRe;
        bIm[n] = kernelIm;

        if (n !== 0) {
            bRe[M - n] = kernelRe;
            bIm[M - n] = kernelIm;
        }
    }

    /*
     * Transform both convolution operands.
     */
    fftRadix2InPlace(aRe, aIm, false);
    fftRadix2InPlace(bRe, bIm, false);

    /*
     * Pointwise complex multiplication.
     */
    for (let i = 0; i < M; i++) {
        const ar = aRe[i];
        const ai = aIm[i];
        const br = bRe[i];
        const bi = bIm[i];

        aRe[i] = ar * br - ai * bi;
        aIm[i] = ar * bi + ai * br;
    }

    /*
     * Convert back to the time domain.
     *
     * Because fftRadix2InPlace() is unitary-normalized, convolution
     * requires an extra factor sqrt(M):
     *
     *     convolution = sqrt(M) * IFFT(FFT(a) * FFT(b))
     */
    fftRadix2InPlace(aRe, aIm, true);

    const convolutionScale = Math.sqrt(M);
    const outputScale = 1 / Math.sqrt(N);
    const totalScale = convolutionScale * outputScale;

    const reOut = new Float64Array(N);
    const imOut = new Float64Array(N);

    /*
     * Apply the final chirp:
     *
     * result[k] =
     *     chirp[k] * convolution[k] / sqrt(N)
     */
    for (let k = 0; k < N; k++) {
        const k2mod = (k * k) % (2 * N);
        const angle = direction * Math.PI * k2mod / N;

        const chirpRe = Math.cos(angle);
        const chirpIm = Math.sin(angle);

        const valueRe = aRe[k];
        const valueIm = aIm[k];

        reOut[k] =
            (valueRe * chirpRe - valueIm * chirpIm) *
            totalScale;

        imOut[k] =
            (valueRe * chirpIm + valueIm * chirpRe) *
            totalScale;
    }

    return [reOut, imOut];
}

