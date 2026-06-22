// js/quiz.js
// Quiz manager: implements questions, options selection, score tracking, and interactive feedback.

const QUIZ_QUESTIONS = [
  {
    question: "What enzyme catalyzes the transcription of DNA into pre-mRNA in eukaryotes?",
    options: [
      "DNA Polymerase I",
      "RNA Polymerase II",
      "Ribosome Large Subunit",
      "Helicase"
    ],
    answer: 1,
    explanation: "RNA Polymerase II catalyzes the formation of pre-mRNA from a DNA gene template during transcription in eukaryotic cells."
  },
  {
    question: "How do prokaryotes differ from eukaryotes regarding where translation occurs?",
    options: [
      "Prokaryotes only translate inside the nucleus",
      "Prokaryotic translation is separated from transcription by the nuclear membrane",
      "Prokaryotes perform coupled transcription-translation, meaning ribosomes attach to mRNA while transcription is still ongoing",
      "Prokaryotes do not use tRNA molecules for translation"
    ],
    answer: 2,
    explanation: "In prokaryotes, which lack a nucleus, ribosomes can attach to mRNA and translate it while it is still being transcribed from DNA. Eukaryotes spatially separate these steps (nucleus vs. cytoplasm)."
  },
  {
    question: "During elongation, where does the incoming loaded tRNA first dock in the ribosome?",
    options: [
      "A (Aminoacyl) site",
      "P (Peptidyl) site",
      "E (Exit) site",
      "Ribosome Promoter site"
    ],
    answer: 0,
    explanation: "The A (Aminoacyl) site is the docking station for incoming tRNA matching the codon. P site holds the growing peptide chain, and E site is where uncharged tRNAs exit."
  },
  {
    question: "What type of mutation occurs when a single nucleotide is substituted, changing a codon to code for a STOP codon instead of an amino acid?",
    options: [
      "Silent mutation",
      "Missense mutation",
      "Nonsense mutation",
      "Frameshift mutation"
    ],
    answer: 2,
    explanation: "A nonsense mutation is a point mutation that introduces a premature STOP codon (UAA, UAG, UGA), terminating translation early and often resulting in a non-functional, truncated protein."
  },
  {
    question: "Why does an insertion of 1 or 2 nucleotides usually have a much larger impact than an insertion of 3 nucleotides?",
    options: [
      "1 or 2 nucleotide shifts cause a frameshift, altering every single downstream codon, whereas 3 nucleotides insert one complete amino acid without shifting the rest",
      "Insertions of 3 nucleotides are always recognized and repaired by tRNA molecules",
      "Ribosomes cannot read sequences that have been lengthened by 3 bases",
      "It doesn't, 1 base changes are always completely silent"
    ],
    answer: 0,
    explanation: "Since codons are read in groups of three (triplets), adding or deleting a number of bases not divisible by three shifts the reading frame. This changes every single codon downstream (a frameshift). Adding exactly three bases simply inserts one amino acid (in-frame)."
  },
  {
    question: "Which of the following codons serves as the universal 'Start codon' to initiate translation?",
    options: [
      "UAA",
      "AUG",
      "UGA",
      "GGG"
    ],
    answer: 1,
    explanation: "AUG serves as the universal initiation codon in both prokaryotes and eukaryotes, coding for the amino acid Methionine (Met)."
  }
];

class QuizManager {
  constructor() {
    this.currentQuestionIdx = 0;
    this.score = 0;
    this.hasAnswered = false;
  }

  init() {
    this.btnStart = document.getElementById('btn-start-quiz');
    this.btnNext = document.getElementById('btn-next-question');
    this.btnRestart = document.getElementById('btn-restart-quiz');
    
    this.viewIntro = document.getElementById('quiz-intro');
    this.viewActive = document.getElementById('quiz-active');
    this.viewResults = document.getElementById('quiz-results');
    
    this.textQuestion = document.getElementById('quiz-question-text');
    this.optionsContainer = document.getElementById('quiz-options');
    this.explanationBox = document.getElementById('quiz-explanation');
    this.explanationStatus = document.getElementById('explanation-status');
    this.explanationText = document.getElementById('explanation-text');
    
    this.questionNum = document.getElementById('quiz-question-number');
    this.scoreIndicator = document.getElementById('quiz-score-indicator');
    this.progressBar = document.getElementById('quiz-progress-bar');
    this.finalScoreText = document.getElementById('quiz-final-score');
    this.finalEvalText = document.getElementById('quiz-final-evaluation');

    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.startQuiz());
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => this.nextQuestion());
    }
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => this.startQuiz());
    }
  }

  startQuiz() {
    this.currentQuestionIdx = 0;
    this.score = 0;
    this.hasAnswered = false;
    
    this.viewIntro.classList.add('hidden');
    this.viewResults.classList.add('hidden');
    this.viewActive.classList.remove('hidden');
    
    this.loadQuestion();
  }

  loadQuestion() {
    this.hasAnswered = false;
    this.explanationBox.classList.add('hidden');
    this.optionsContainer.innerHTML = '';
    
    const q = QUIZ_QUESTIONS[this.currentQuestionIdx];
    this.textQuestion.textContent = q.question;
    
    // Update Indicators
    this.questionNum.textContent = `Question ${this.currentQuestionIdx + 1} of ${QUIZ_QUESTIONS.length}`;
    this.scoreIndicator.innerHTML = `<i class="fa-solid fa-star"></i> Score: ${this.score}`;
    
    const pct = ((this.currentQuestionIdx) / QUIZ_QUESTIONS.length) * 100;
    this.progressBar.style.width = `${pct}%`;

    // Render Options
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => this.selectOption(idx));
      this.optionsContainer.appendChild(btn);
    });
  }

  selectOption(selectedIdx) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;

    const q = QUIZ_QUESTIONS[this.currentQuestionIdx];
    const buttons = this.optionsContainer.querySelectorAll('.quiz-opt-btn');
    
    // Disable all options
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.answer) {
        btn.classList.add('correct');
      } else if (idx === selectedIdx) {
        btn.classList.add('incorrect');
      }
    });

    const isCorrect = selectedIdx === q.answer;
    if (isCorrect) {
      this.score++;
      this.scoreIndicator.innerHTML = `<i class="fa-solid fa-star"></i> Score: ${this.score}`;
      this.explanationStatus.className = 'correct-txt';
      this.explanationStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Correct!`;
    } else {
      this.explanationStatus.className = 'incorrect-txt';
      this.explanationStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Incorrect`;
    }

    this.explanationText.textContent = q.explanation;
    this.explanationBox.classList.remove('hidden');
  }

  nextQuestion() {
    this.currentQuestionIdx++;
    if (this.currentQuestionIdx < QUIZ_QUESTIONS.length) {
      this.loadQuestion();
    } else {
      this.showResults();
    }
  }

  showResults() {
    this.progressBar.style.width = '100%';
    this.viewActive.classList.add('hidden');
    this.viewResults.classList.remove('hidden');
    
    this.finalScoreText.textContent = `Your Score: ${this.score} / ${QUIZ_QUESTIONS.length}`;
    
    const pct = this.score / QUIZ_QUESTIONS.length;
    let evalText = '';
    if (pct === 1) {
      evalText = "Incredible! Perfect score! You have completely mastered DNA translation, transcription, and mutation classifications. You're ready to be a molecular biologist!";
    } else if (pct >= 0.7) {
      evalText = "Great job! You have a strong grasp of how codons map to peptides and the structural roles of the ribosome. Review the article to polish up on specific sites!";
    } else {
      evalText = "Good effort! Try reading the learn article again and playing with the interactive simulations to see how codons and frames dictate protein synthesis.";
    }
    this.finalEvalText.textContent = evalText;
  }
}

// Global hook
window.quiz = {
  QuizManager
};
