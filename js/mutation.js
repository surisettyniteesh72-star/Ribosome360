// js/mutation.js
// Mutation simulation engine: compares wild-type and mutant sequences and classifies biological impact.

let BioTranslator;
if (typeof require !== 'undefined') {
  BioTranslator = require('./translator.js');
} else {
  BioTranslator = window.translator;
}

/**
 * Compares a wild-type DNA/RNA sequence with a mutated sequence.
 * Classifies the variant effect on transcription and translation.
 * @param {string} wtSeq - Wild-type DNA/RNA sequence
 * @param {string} mutSeq - Mutated DNA/RNA sequence
 * @returns {object} Analysis result containing type, description, and sequence details
 */
function analyzeMutation(wtSeq, mutSeq) {
  const wt = wtSeq.toUpperCase().trim();
  const mut = mutSeq.toUpperCase().trim();

  // Transcribe to RNA first
  const wtRna = wt.replace(/T/g, 'U');
  const mutRna = mut.replace(/T/g, 'U');

  // Translate directly for full comparison
  const wtProtein = BioTranslator.translate(wtRna, 'direct');
  const mutProtein = BioTranslator.translate(mutRna, 'direct');

  const wtAAs = wtProtein.split('-');
  const mutAAs = mutProtein.split('-');

  let mutationType = 'none';
  let variantEffect = 'No mutation detected';
  let mutationClass = 'info'; // css style class

  if (wt === mut) {
    return {
      type: 'none',
      variantEffect,
      mutationClass,
      wtProtein,
      mutProtein,
      wtCodons: getCodons(wtRna),
      mutCodons: getCodons(mutRna),
      diffs: []
    };
  }

  // Check for length difference (insertions / deletions)
  if (wt.length !== mut.length) {
    const diffLen = Math.abs(wt.length - mut.length);
    if (diffLen % 3 !== 0) {
      mutationType = 'frameshift';
      variantEffect = `Frameshift (Insertion/Deletion of ${diffLen} bp, shifting reading frame)`;
      mutationClass = 'danger';
    } else {
      mutationType = 'missense'; // In-frame insertion/deletion acts like a missense/indel
      variantEffect = `In-frame Insertion/Deletion (Added/Removed ${diffLen / 3} codon(s))`;
      mutationClass = 'warning';
    }
  } else {
    // Point mutation (substitution)
    // Compare amino acid sequences
    let firstAAChangeIdx = -1;
    for (let i = 0; i < Math.max(wtAAs.length, mutAAs.length); i++) {
      if (wtAAs[i] !== mutAAs[i]) {
        firstAAChangeIdx = i;
        break;
      }
    }

    if (firstAAChangeIdx === -1) {
      mutationType = 'silent';
      variantEffect = 'Silent (No change in protein sequence)';
      mutationClass = 'success';
    } else {
      // Check if mutated AA is a STOP codon
      const mutAA = mutAAs[firstAAChangeIdx];
      const wtAA = wtAAs[firstAAChangeIdx];
      if (mutAA === 'Stop' || mutAA === '*') {
        mutationType = 'nonsense';
        variantEffect = `Nonsense (Early termination: codon for ${wtAA} mutated to STOP at codon position ${firstAAChangeIdx + 1})`;
        mutationClass = 'danger';
      } else {
        mutationType = 'missense';
        variantEffect = `Missense (Amino acid change: ${wtAA} -> ${mutAA} at codon position ${firstAAChangeIdx + 1})`;
        mutationClass = 'warning';
      }
    }
  }

  // Find exact single nucleotide diff indexes
  const diffs = [];
  const maxLen = Math.max(wt.length, mut.length);
  for (let i = 0; i < maxLen; i++) {
    if (wt[i] !== mut[i]) {
      diffs.push({
        position: i,
        wtBase: wt[i] || '-',
        mutBase: mut[i] || '-'
      });
    }
  }

  return {
    type: mutationType,
    variantEffect,
    mutationClass,
    wtProtein,
    mutProtein,
    wtCodons: getCodons(wtRna),
    mutCodons: getCodons(mutRna),
    diffs
  };
}

/**
 * Splits RNA sequence into an array of codons (triplets)
 * @param {string} rna - RNA sequence
 * @returns {array} Array of codons
 */
function getCodons(rna) {
  const codons = [];
  for (let i = 0; i < rna.length; i += 3) {
    codons.push(rna.substring(i, i + 3));
  }
  return codons;
}

const mutation = {
  analyzeMutation,
  getCodons
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = mutation;
} else {
  window.mutation = mutation;
}
