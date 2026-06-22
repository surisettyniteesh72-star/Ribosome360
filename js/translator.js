// js/translator.js
// Core bioinformatics logic for DNA/RNA transcription, translation, and chemical metrics.

const CODON_TABLE = {
  'UUU': { aminoAcid: 'Phe', abbreviation: 'F', name: 'Phenylalanine', class: 'hydrophobic' },
  'UUC': { aminoAcid: 'Phe', abbreviation: 'F', name: 'Phenylalanine', class: 'hydrophobic' },
  'UUA': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'UUG': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'UCU': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'UCC': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'UCA': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'UCG': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'UAU': { aminoAcid: 'Tyr', abbreviation: 'Y', name: 'Tyrosine', class: 'polar' },
  'UAC': { aminoAcid: 'Tyr', abbreviation: 'Y', name: 'Tyrosine', class: 'polar' },
  'UAA': { aminoAcid: 'Stop', abbreviation: '*', name: 'Stop Codon', class: 'special' },
  'UAG': { aminoAcid: 'Stop', abbreviation: '*', name: 'Stop Codon', class: 'special' },
  'UGU': { aminoAcid: 'Cys', abbreviation: 'C', name: 'Cysteine', class: 'polar' },
  'UGC': { aminoAcid: 'Cys', abbreviation: 'C', name: 'Cysteine', class: 'polar' },
  'UGA': { aminoAcid: 'Stop', abbreviation: '*', name: 'Stop Codon', class: 'special' },
  'UGG': { aminoAcid: 'Trp', abbreviation: 'W', name: 'Tryptophan', class: 'hydrophobic' },
  'CUU': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'CUC': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'CUA': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'CUG': { aminoAcid: 'Leu', abbreviation: 'L', name: 'Leucine', class: 'hydrophobic' },
  'CCU': { aminoAcid: 'Pro', abbreviation: 'P', name: 'Proline', class: 'special' },
  'CCC': { aminoAcid: 'Pro', abbreviation: 'P', name: 'Proline', class: 'special' },
  'CCA': { aminoAcid: 'Pro', abbreviation: 'P', name: 'Proline', class: 'special' },
  'CCG': { aminoAcid: 'Pro', abbreviation: 'P', name: 'Proline', class: 'special' },
  'CAU': { aminoAcid: 'His', abbreviation: 'H', name: 'Histidine', class: 'positive' },
  'CAC': { aminoAcid: 'His', abbreviation: 'H', name: 'Histidine', class: 'positive' },
  'CAA': { aminoAcid: 'Gln', abbreviation: 'Q', name: 'Glutamine', class: 'polar' },
  'CAG': { aminoAcid: 'Gln', abbreviation: 'Q', name: 'Glutamine', class: 'polar' },
  'CGU': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'CGC': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'CGA': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'CGG': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'AUU': { aminoAcid: 'Ile', abbreviation: 'I', name: 'Isoleucine', class: 'hydrophobic' },
  'AUC': { aminoAcid: 'Ile', abbreviation: 'I', name: 'Isoleucine', class: 'hydrophobic' },
  'AUA': { aminoAcid: 'Ile', abbreviation: 'I', name: 'Isoleucine', class: 'hydrophobic' },
  'AUG': { aminoAcid: 'Met', abbreviation: 'M', name: 'Methionine (Start)', class: 'hydrophobic' },
  'ACU': { aminoAcid: 'Thr', abbreviation: 'T', name: 'Threonine', class: 'polar' },
  'ACC': { aminoAcid: 'Thr', abbreviation: 'T', name: 'Threonine', class: 'polar' },
  'ACA': { aminoAcid: 'Thr', abbreviation: 'T', name: 'Threonine', class: 'polar' },
  'ACG': { aminoAcid: 'Thr', abbreviation: 'T', name: 'Threonine', class: 'polar' },
  'AAU': { aminoAcid: 'Asn', abbreviation: 'N', name: 'Asparagine', class: 'polar' },
  'AAC': { aminoAcid: 'Asn', abbreviation: 'N', name: 'Asparagine', class: 'polar' },
  'AAA': { aminoAcid: 'Lys', abbreviation: 'K', name: 'Lysine', class: 'positive' },
  'AAG': { aminoAcid: 'Lys', abbreviation: 'K', name: 'Lysine', class: 'positive' },
  'AGU': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'AGC': { aminoAcid: 'Ser', abbreviation: 'S', name: 'Serine', class: 'polar' },
  'AGA': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'AGG': { aminoAcid: 'Arg', abbreviation: 'R', name: 'Arginine', class: 'positive' },
  'GUU': { aminoAcid: 'Val', abbreviation: 'V', name: 'Valine', class: 'hydrophobic' },
  'GUC': { aminoAcid: 'Val', abbreviation: 'V', name: 'Valine', class: 'hydrophobic' },
  'GUA': { aminoAcid: 'Val', abbreviation: 'V', name: 'Valine', class: 'hydrophobic' },
  'GUG': { aminoAcid: 'Val', abbreviation: 'V', name: 'Valine', class: 'hydrophobic' },
  'GCU': { aminoAcid: 'Ala', abbreviation: 'A', name: 'Alanine', class: 'hydrophobic' },
  'GCC': { aminoAcid: 'Ala', abbreviation: 'A', name: 'Alanine', class: 'hydrophobic' },
  'GCA': { aminoAcid: 'Ala', abbreviation: 'A', name: 'Alanine', class: 'hydrophobic' },
  'GCG': { aminoAcid: 'Ala', abbreviation: 'A', name: 'Alanine', class: 'hydrophobic' },
  'GAU': { aminoAcid: 'Asp', abbreviation: 'D', name: 'Aspartic Acid', class: 'negative' },
  'GAC': { aminoAcid: 'Asp', abbreviation: 'D', name: 'Aspartic Acid', class: 'negative' },
  'GAA': { aminoAcid: 'Glu', abbreviation: 'E', name: 'Glutamic Acid', class: 'negative' },
  'GAG': { aminoAcid: 'Glu', abbreviation: 'E', name: 'Glutamic Acid', class: 'negative' },
  'GGU': { aminoAcid: 'Gly', abbreviation: 'G', name: 'Glycine', class: 'special' },
  'GGC': { aminoAcid: 'Gly', abbreviation: 'G', name: 'Glycine', class: 'special' },
  'GGA': { aminoAcid: 'Gly', abbreviation: 'G', name: 'Glycine', class: 'special' },
  'GGG': { aminoAcid: 'Gly', abbreviation: 'G', name: 'Glycine', class: 'special' }
};

const AMINO_ACID_WEIGHTS = {
  'A': 89.09, 'R': 174.20, 'N': 132.12, 'D': 133.10, 'C': 121.16,
  'E': 147.13, 'Q': 146.15, 'G': 75.07,  'H': 155.16, 'I': 131.17,
  'L': 131.17, 'K': 146.19, 'M': 149.21, 'F': 165.19, 'P': 115.13,
  'S': 105.09, 'T': 119.12, 'W': 204.23, 'Y': 181.19, 'V': 117.15
};

const COMPLEMENTS = {
  'A': 'U',
  'T': 'A',
  'U': 'A',
  'C': 'G',
  'G': 'C'
};

/**
 * Transcribes DNA sequence to RNA.
 * @param {string} dna - DNA sequence
 * @param {string} mode - 'coding' (T -> U) or 'template' (complementary bases)
 * @returns {string} RNA sequence
 */
function transcribe(dna, mode = 'coding') {
  const sanitized = dna.toUpperCase().replace(/[^ATCGU]/g, '');
  if (mode === 'template') {
    // 3' to 5' template strand transcription. e.g. T -> A, A -> U, C -> G, G -> C
    return sanitized.split('').map(base => COMPLEMENTS[base] || 'U').join('');
  } else {
    // 5' to 3' coding strand transcription: simply convert T to U (and keep U if it's already RNA)
    return sanitized.replace(/T/g, 'U');
  }
}

/**
 * Translates RNA sequence to Protein.
 * @param {string} rna - RNA sequence
 * @param {string} mode - 'direct' (every 3 bases) or 'orf' (from AUG to Stop)
 * @returns {string} Amino Acid sequence separated by '-' (e.g. 'Met-Lys-Gly-Stop')
 */
function translate(rna, mode = 'direct') {
  const sanitized = rna.toUpperCase().replace(/[^AUCG]/g, '');
  let startIdx = 0;
  let useOrf = mode === 'orf';

  if (useOrf) {
    startIdx = sanitized.indexOf('AUG');
    if (startIdx === -1) {
      return ''; // No start codon found
    }
  }

  const aas = [];
  for (let i = startIdx; i <= sanitized.length - 3; i += 3) {
    const codon = sanitized.substring(i, i + 3);
    const aminoObj = CODON_TABLE[codon];
    
    if (aminoObj) {
      if (useOrf && aminoObj.aminoAcid === 'Stop') {
        // If ORF mode, stop translating when STOP is encountered
        break;
      }
      aas.push(aminoObj.aminoAcid);
      if (!useOrf && aminoObj.aminoAcid === 'Stop') {
        // Direct mode: push stop and keep going (usually user stops, but standard can continue)
        // Let's break just to align with standard peptide termination or keep going.
        // The test verify_bio.js expects 'Met-Leu-Ala-Stop' for 'AUGCUAGCGUAA' in direct mode.
        // So we just push it and can keep going, or stop. Let's keep going if there is more,
        // but for the test 'AUGCUAGCGUAA' it stops at 'Stop'. Let's check:
      }
    } else {
      aas.push('?');
    }
  }

  return aas.join('-');
}

/**
 * Calculates GC Content percentage.
 * @param {string} seq - DNA or RNA sequence
 * @returns {number} GC percentage
 */
function calculateGC(seq) {
  const sanitized = seq.toUpperCase();
  if (sanitized.length === 0) return 0;
  let gc = 0;
  for (const base of sanitized) {
    if (base === 'G' || base === 'C') {
      gc++;
    }
  }
  return (gc / sanitized.length) * 100;
}

/**
 * Calculates Molecular Weight of a protein sequence.
 * Formula: Sum of amino acids - (water lost * number of peptide bonds)
 * @param {string} peptide - Protein sequence (e.g. 'Met-Ala' or single letter 'MA')
 * @returns {number} Molecular weight in Daltons (Da)
 */
function calculateMW(peptide) {
  // Can accept 'Met-Ala' or 'MA'
  let letters = [];
  if (peptide.includes('-')) {
    // Convert 3-letter to 1-letter
    const parts = peptide.split('-');
    for (const part of parts) {
      if (part === 'Stop' || part === '*') continue;
      // Search abbreviation
      const found = Object.values(CODON_TABLE).find(v => v.aminoAcid === part);
      if (found) {
        letters.push(found.abbreviation);
      } else {
        // Default to a guess if it's 1-letter
        const clean = part.trim();
        if (clean.length === 1 && AMINO_ACID_WEIGHTS[clean]) {
          letters.push(clean);
        }
      }
    }
  } else {
    letters = peptide.toUpperCase().replace(/[^A-Z]/g, '').split('');
  }

  if (letters.length === 0) return 0;

  let total = 0;
  for (const aa of letters) {
    if (AMINO_ACID_WEIGHTS[aa]) {
      total += AMINO_ACID_WEIGHTS[aa];
    }
  }

  // Dehydration synthesis: lose 18.015 g/mol H2O per peptide bond
  const bonds = letters.length - 1;
  total -= bonds * 18.015;

  return parseFloat(total.toFixed(2));
}

const translator = {
  transcribe,
  translate,
  calculateGC,
  calculateMW,
  CODON_TABLE,
  AMINO_ACID_WEIGHTS
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = translator;
} else {
  window.translator = translator;
}
