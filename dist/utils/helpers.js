// -------------------------------------------------------------
// FILE: src/utils/helpers.ts
// Utility helpers for Continuum
// -------------------------------------------------------------
/**
 * Split an array into chunks of a given size.
 * @param array Array to split
 * @param size Chunk size
 * @returns Array of chunks
 */
export function chunkArray(array, size) {
    if (size <= 0)
        throw new Error("Chunk size must be greater than 0.");
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
