// js/app.js
// Application Entry Point: Configures presets, handles browser self-tests, and bootstraps UIManager.

const PRESETS = {
  'tutorial': {
    name: 'Tutorial Gene (Short)',
    dna: 'ATGAAATTTGGGGGGTCCTAG'
  },
  'insulin': {
    name: 'Insulin Segment (Human INS)',
    dna: 'ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCCTCTGGGGACCTGACCCAGCCGCAGCCTTTGTGAACCAACACCTGTGCGGCTCACACCTGGTGGAAGCTCTCTACCTAGTGTGCGGGGAACGAGGCTTCTTCTACACACCCAAGACCCGCCGGGAGGCAGAGGACCTGCAGGGTTAG'
  },
  'gfp': {
    name: 'Green Fluorescent Protein Segment',
    dna: 'ATGGTCAGCAAAGGCGAAGAACTGTTCACCGGGGTTGTTCCGATTCTGGTTGAACTGGATGGCGACGTGAACGGCCACAAATTTAGCGTTAGCGGCGAAGGCGAAGGCGATGCGACCTACGGCAAACTGACCCTGAAATTTATTTGCACCACCGGCAAACTGCCGGTTCCGTGGCCGACCCTGGTTACCACCCTGACCTACGGCGTTCAGTGCTTTAGCCGCTACCCGGATCACATGAAACAGCACGATTTTTTTAAAAGCGCGATGCCGGAAGGCTACGTTCAGGAACGCACCATTTTTTTTAAAGATGACGGCAACTACAAAACCCGCGCGGAAGTTAAATTTGAAGGCGACACCCTGGTTTGA'
  },
  'hbb': {
    name: 'Hemoglobin Beta (HBB)',
    dna: 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA'
  }
};

class App {
  constructor() {
    this.presets = PRESETS;
    this.tSim = null;
    this.trSim = null;
    this.ui = null;
    this.quiz = null;
  }

  start() {
    // 1. Initialize logic modules
    this.tSim = new window.simulator.TranscriptionSimulator();
    this.trSim = new window.simulator.TranslationSimulator();
    this.ui = new window.ui.UIManager(this.tSim, this.trSim);
    this.quiz = new window.quiz.QuizManager();

    // 2. Populate preset options
    const select = document.getElementById('gene-preset-select');
    if (select) {
      Object.keys(this.presets).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = this.presets[key].name;
        select.appendChild(opt);
      });
    }

    // 3. Initialize UI & Quiz
    this.ui.init();
    this.quiz.init();

    // 4. Load default Tutorial preset
    if (select) {
      select.value = 'tutorial';
      const event = new Event('change');
      select.dispatchEvent(event);
    }

    // 5. Run Verification Self-Test in Browser
    this.runSelfVerification();
  }

  runSelfVerification() {
    console.log('Running browser bioinformatics validation self-test...');
    try {
      // Test transcription
      const tx1 = window.translator.transcribe('ATGCTAGC', 'coding');
      const tx2 = window.translator.transcribe('ATGCTAGC', 'template');
      if (tx1 !== 'AUGCUAGC' || tx2 !== 'UACGAUCG') {
        throw new Error('Transcription logic failed validation.');
      }

      // Test translation
      const tl1 = window.translator.translate('AUGCUAGCGUAA', 'direct');
      const tl2 = window.translator.translate('CCCAUGUUUGGGUGACCC', 'orf');
      if (tl1 !== 'Met-Leu-Ala-Stop' || tl2 !== 'Met-Phe-Gly') {
        throw new Error('Translation logic failed validation.');
      }

      // Test mutations
      const mut1 = window.mutation.analyzeMutation('ATGAAA', 'ATGAAG');
      const mut2 = window.mutation.analyzeMutation('ATGAAA', 'ATGAGA');
      const mut3 = window.mutation.analyzeMutation('ATGAAATAG', 'ATGACAAATAG');
      if (mut1.type !== 'silent' || mut2.type !== 'missense' || mut3.type !== 'frameshift') {
        throw new Error('Mutation engine failed validation.');
      }

      console.log('All browser bioinformatics self-tests passed successfully!');
      
      // Show confirmation banner
      const banner = document.getElementById('test-banner');
      if (banner) {
        banner.classList.remove('hidden');
        document.getElementById('btn-close-banner').addEventListener('click', () => {
          banner.classList.add('hidden');
        });
        
        // Auto hide after 6 seconds
        setTimeout(() => {
          banner.classList.add('hidden');
        }, 6000);
      }
    } catch (e) {
      console.error('Bioinformatics validation failed:', e);
    }
  }
}

// Bootstrap on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.start();
});
