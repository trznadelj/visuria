function nr_pdsch_dmrs_cinit(slot, l, n_id, scid) 
/**
 * Calculates c_init for 5G NR PDSCH DMRS (3GPP TS 38.211).
 * 
 * @param {number} slot - Current slot number in the frame (n_sf_mu)
 * @param {number} l - OFDM symbol index within the slot (0 to 13)
 * @param {number} n_id - Scrambling identity (N_ID_n_SCID, defaults to Cell ID)
 * @param {number} scid - Data scrambling identity selector (n_SCID, 0 or 1)
 */
{
    const term1 = (1 << 17) * (slot * 14 + l + 1) * (2 * n_id + 1);
    return (term1 + 2 * n_id + scid) >>> 0; // Cleans up bits and forces positive 32-bit uint
}