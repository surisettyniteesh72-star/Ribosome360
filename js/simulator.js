// js/simulator.js
// Simulation controller: manages play/pause, speeds, timers, and sequence coordinates.

class TranscriptionSimulator {
  constructor() {
    this.sequence = '';
    this.mode = 'coding'; // 'coding' or 'template'
    this.currentIndex = 0; // base index
    this.isPlaying = false;
    this.speed = 3; // bases per second
    this.timer = null;
    
    // Callbacks
    this.onStep = null;
    this.onComplete = null;
  }

  setSequence(seq, mode) {
    this.sequence = seq.toUpperCase().replace(/[^ATCGU]/g, '');
    this.mode = mode;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.clearTimer();
  }

  setSpeed(speed) {
    this.speed = parseInt(speed);
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.clearTimer();
    this.timer = setInterval(() => {
      this.step();
    }, 1000 / this.speed);
  }

  pause() {
    this.isPlaying = false;
    this.clearTimer();
  }

  step() {
    if (this.currentIndex >= this.sequence.length) {
      this.pause();
      if (this.onComplete) this.onComplete();
      return;
    }

    this.currentIndex++;
    if (this.onStep) {
      this.onStep(this.currentIndex, this.sequence.charAt(this.currentIndex - 1));
    }

    if (this.currentIndex >= this.sequence.length) {
      this.pause();
      if (this.onComplete) this.onComplete();
    }
  }

  reset() {
    this.currentIndex = 0;
    this.isPlaying = false;
    this.clearTimer();
    if (this.onStep) this.onStep(0, '');
  }
}

class TranslationSimulator {
  constructor() {
    this.mrna = '';
    this.currentIndex = 0; // codon index (0, 1, 2...)
    this.isPlaying = false;
    this.speed = 2; // codons per second
    this.timer = null;
    this.isCoupled = false; // Prokaryotic coupled simulation
    this.polypeptide = [];
    
    // Coupled transcription variables
    this.dnaSource = '';
    this.coupledTransIndex = 0;

    // Callbacks
    this.onStep = null;
    this.onComplete = null;
  }

  setSequence(mrna, isCoupled = false, dnaSource = '') {
    this.mrna = mrna.toUpperCase().replace(/[^AUCG]/g, '');
    this.isCoupled = isCoupled;
    this.dnaSource = dnaSource;
    this.currentIndex = 0;
    this.coupledTransIndex = 0;
    this.polypeptide = [];
    this.isPlaying = false;
    this.clearTimer();
  }

  setSpeed(speed) {
    this.speed = parseInt(speed);
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.clearTimer();
    this.timer = setInterval(() => {
      this.step();
    }, 1000 / this.speed);
  }

  pause() {
    this.isPlaying = false;
    this.clearTimer();
  }

  step() {
    const totalCodons = Math.floor(this.mrna.length / 3);

    // If coupled mode, we advance transcription, and translation trails behind
    if (this.isCoupled) {
      const maxTransBases = this.dnaSource.length;
      
      // Advance transcription by 3 bases per step if not done
      if (this.coupledTransIndex < maxTransBases) {
        this.coupledTransIndex = Math.min(this.coupledTransIndex + 3, maxTransBases);
      }

      // Translate 1 codon if transcription is far enough ahead (at least 9 bases transcribed, i.e. 3 codons)
      const transCodonCap = Math.floor(this.coupledTransIndex / 3);
      const canTranslate = transCodonCap > 2; // translation starts after ribosome binding site & initial codons

      if (canTranslate && this.currentIndex < totalCodons) {
        this.translateCodonStep();
      }

      // Check for completion in coupled mode
      const transcriptionDone = this.coupledTransIndex >= maxTransBases;
      const translationDone = this.currentIndex >= totalCodons;

      if (this.onStep) {
        this.onStep({
          currentIndex: this.currentIndex,
          coupledTransIndex: this.coupledTransIndex,
          polypeptide: this.polypeptide,
          isComplete: transcriptionDone && translationDone
        });
      }

      if (transcriptionDone && translationDone) {
        this.pause();
        if (this.onComplete) this.onComplete();
      }
    } else {
      // Normal eukaryotic decoupled translation
      if (this.currentIndex >= totalCodons) {
        this.pause();
        if (this.onComplete) this.onComplete();
        return;
      }

      this.translateCodonStep();

      if (this.onStep) {
        this.onStep({
          currentIndex: this.currentIndex,
          polypeptide: this.polypeptide,
          isComplete: this.currentIndex >= totalCodons
        });
      }

      if (this.currentIndex >= totalCodons) {
        this.pause();
        if (this.onComplete) this.onComplete();
      }
    }
  }

  translateCodonStep() {
    const startIdx = this.currentIndex * 3;
    const codon = this.mrna.substring(startIdx, startIdx + 3);
    const aaObj = window.translator.CODON_TABLE[codon];
    
    if (aaObj) {
      this.polypeptide.push({
        codon,
        aminoAcid: aaObj.aminoAcid,
        abbreviation: aaObj.abbreviation,
        name: aaObj.name,
        class: aaObj.class
      });
    } else {
      this.polypeptide.push({
        codon,
        aminoAcid: '?',
        abbreviation: '?',
        name: 'Unknown',
        class: 'special'
      });
    }

    this.currentIndex++;
  }

  reset() {
    this.currentIndex = 0;
    this.coupledTransIndex = 0;
    this.polypeptide = [];
    this.isPlaying = false;
    this.clearTimer();
    
    if (this.onStep) {
      this.onStep({
        currentIndex: 0,
        coupledTransIndex: 0,
        polypeptide: [],
        isComplete: false
      });
    }
  }
}

// Global hooks
window.simulator = {
  TranscriptionSimulator,
  TranslationSimulator
};
