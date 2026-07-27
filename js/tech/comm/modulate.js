function modulate_qpsk(bits) 
/**
 * Modulates a binary bit array into QPSK complex symbols (3GPP TS 38.211).
 * Maps every 2 bits into one complex number: [real, imag].
 * 
 * @param {number[]} bits - Array of bits (0 or 1), length must be even.
 * @returns {Array<[[number], [number]]>} Array of complex symbols [I, Q].
 */
{
    const symbols = [[],[]];
    const SQRT_2 = Math.sqrt(2);

    for (let i = 0; i < bits.length; i += 2) {
        // 3GPP mapping rule:
        // b(2i)==0 -> I = 1/sqrt(2),  b(2i)==1 -> I = -1/sqrt(2)
        // b(2i+1)==0 -> Q = 1/sqrt(2), b(2i+1)==1 -> Q = -1/sqrt(2)
        const i_component = bits[i] === 0 ? 1 / SQRT_2 : -1 / SQRT_2;
        const q_component = bits[i + 1] === 0 ? 1 / SQRT_2 : -1 / SQRT_2;

        symbols[0].push(i_component);
        symbols[1].push(q_component);
    }

    return symbols;
}
