// js/ui.js
// UI Manager: Handles tab switches, renders dynamic SVGs for transcription, translation, codon wheel, and Chart.js stats.

class UIManager {
  constructor(transcribeSim, translateSim) {
    this.tSim = transcribeSim;
    this.trSim = translateSim;
    this.chart = null;

    // Base colors
    this.baseColors = {
      'A': '#22d3ee',
      'T': '#f59e0b',
      'U': '#ff7e5f',
      'C': '#3b82f6',
      'G': '#a855f7'
    };

    this.classColors = {
      'hydrophobic': '#f59e0b',
      'polar': '#3b82f6',
      'positive': '#10b981',
      'negative': '#f43f5e',
      'special': '#6b7280'
    };
  }

  init() {
    this.setupTabs();
    this.setupPresetListener();
    this.setupTranscribeUI();
    this.setupTranslationUI();
    this.setupMutationUI();
    this.renderCodonWheel();
    this.initChart();
  }

  // ================= TABS SWITCHER =================
  setupTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(target).classList.remove('hidden');
        document.getElementById(target).classList.add('active');
        
        // Custom resize trigger for charts
        if (target === 'codon-tab' && this.chart) {
          this.chart.resize();
        }
      });
    });
  }

  // ================= PRESET SELECTOR =================
  setupPresetListener() {
    const selector = document.getElementById('gene-preset-select');
    selector.addEventListener('change', (e) => {
      const preset = window.app.presets[e.target.value];
      if (preset) {
        // Load into UI
        document.getElementById('dna-input-field').value = preset.dna;
        document.getElementById('mrna-input-field').value = window.translator.transcribe(preset.dna);
        document.getElementById('mut-wt-input').value = preset.dna;
        document.getElementById('mut-mut-input').value = preset.dna;
        
        // Reset Simulators
        this.tSim.setSequence(preset.dna, document.getElementById('transcribe-mode-select').value);
        this.trSim.setSequence(
          window.translator.transcribe(preset.dna),
          document.getElementById('translate-mode-select').value === 'coupled',
          preset.dna
        );
        
        this.tSim.reset();
        this.trSim.reset();
        
        // Update live stats & sandbox
        this.updateStats(preset.dna);
        this.runMutationSandbox();
      }
    });
  }

  // ================= TRANSCRIPTION RENDERER =================
  setupTranscribeUI() {
    const playBtn = document.getElementById('btn-transcribe-play');
    const pauseBtn = document.getElementById('btn-transcribe-pause');
    const stepBtn = document.getElementById('btn-transcribe-step');
    const resetBtn = document.getElementById('btn-transcribe-reset');
    const inputField = document.getElementById('dna-input-field');
    const modeSelect = document.getElementById('transcribe-mode-select');
    const speedSlider = document.getElementById('transcribe-speed-slider');
    const speedVal = document.getElementById('transcribe-speed-val');
    const statusText = document.getElementById('transcribe-status-text');
    const progressBar = document.getElementById('transcribe-progress-bar');

    inputField.addEventListener('input', () => {
      this.tSim.setSequence(inputField.value, modeSelect.value);
      this.tSim.reset();
      this.updateStats(inputField.value);
    });

    modeSelect.addEventListener('change', () => {
      this.tSim.setSequence(inputField.value, modeSelect.value);
      this.tSim.reset();
    });

    speedSlider.addEventListener('input', (e) => {
      speedVal.textContent = e.target.value;
      this.tSim.setSpeed(e.target.value);
    });

    playBtn.addEventListener('click', () => {
      this.tSim.setSequence(inputField.value, modeSelect.value);
      this.tSim.play();
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      statusText.innerHTML = '<span class="text-rna"><i class="fa-solid fa-spinner fa-spin"></i> Transcribing DNA...</span>';
    });

    pauseBtn.addEventListener('click', () => {
      this.tSim.pause();
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      statusText.textContent = 'Paused';
    });

    stepBtn.addEventListener('click', () => {
      this.tSim.step();
    });

    resetBtn.addEventListener('click', () => {
      this.tSim.reset();
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      statusText.textContent = 'Ready to transcribe';
      progressBar.style.width = '0%';
    });

    // Handle Sim step callback
    this.tSim.onStep = (index, base) => {
      this.drawTranscriptionSVG(index);
      const total = this.tSim.sequence.length;
      progressBar.style.width = total > 0 ? `${(index / total) * 100}%` : '0%';
      if (index > 0) {
        statusText.innerHTML = `Transcribing: base <strong>${index}</strong> of ${total} (${base})`;
      } else {
        statusText.textContent = 'Ready to transcribe';
      }
    };

    this.tSim.onComplete = () => {
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      statusText.innerHTML = '✨ Transcription Completed! mRNA strand synthesized.';
      
      // Auto transfer synthesized mRNA to the translation field
      const rna = window.translator.transcribe(inputField.value, modeSelect.value);
      document.getElementById('mrna-input-field').value = rna;
      this.trSim.setSequence(rna, document.getElementById('translate-mode-select').value === 'coupled', inputField.value);
      this.trSim.reset();
    };

    // Initial draw
    this.drawTranscriptionSVG(0);
  }

  drawTranscriptionSVG(index) {
    const svg = document.getElementById('transcribe-svg');
    svg.innerHTML = '';

    const width = 800;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;

    const sequence = this.tSim.sequence || 'ATGCCCGGGAAATTT';
    const basesCount = 13; // number of bases to display in viewport
    const stepSize = 50;

    // Draw grid lines
    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    backgroundRect.setAttribute('width', '100%');
    backgroundRect.setAttribute('height', '100%');
    backgroundRect.setAttribute('fill', '#05080f');
    svg.appendChild(backgroundRect);

    // Draw RNA Polymerase bubble
    // Animates sliding with index
    const polyX = cx + (index - sequence.length / 2) * 5; // slow scroll shift
    
    // Draw Polymerase (large green oval)
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    poly.setAttribute('cx', cx);
    poly.setAttribute('cy', cy);
    poly.setAttribute('rx', '150');
    poly.setAttribute('ry', '80');
    poly.setAttribute('fill', 'rgba(16, 185, 129, 0.15)');
    poly.setAttribute('stroke', '#10b981');
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('stroke-dasharray', '5 5');
    svg.appendChild(poly);

    const polyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    polyLabel.setAttribute('x', cx);
    polyLabel.setAttribute('y', cy - 50);
    polyLabel.setAttribute('fill', '#34d399');
    polyLabel.setAttribute('font-size', '11');
    polyLabel.setAttribute('font-weight', '700');
    polyLabel.setAttribute('text-anchor', 'middle');
    polyLabel.textContent = 'RNA POLYMERASE II';
    svg.appendChild(polyLabel);

    // Draw DNA strands (Coding top, template bottom)
    const midIdx = Math.max(0, index - 6); // viewport center codon

    for (let offset = -6; offset <= 6; offset++) {
      const charIdx = midIdx + offset;
      if (charIdx < 0 || charIdx >= sequence.length) continue;

      const base = sequence.charAt(charIdx);
      const isTranscribing = charIdx === index - 1;

      // Base coordinate mapping
      let x = cx + offset * stepSize;
      let yCoding = cy - 40;
      let yTemplate = cy + 40;

      // Unwind DNA inside bubble
      if (offset >= -3 && offset <= 3) {
        yCoding -= 20;
        yTemplate += 20;
      }

      // Draw connection lines outside bubble
      if (!(offset >= -3 && offset <= 3)) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', yCoding);
        line.setAttribute('x2', x);
        line.setAttribute('y2', yTemplate);
        line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }

      // Draw coding base (top)
      this.drawBaseNode(svg, x, yCoding, base, 'coding');

      // Draw template base (bottom)
      const templateBase = this.getComplement(base);
      this.drawBaseNode(svg, x, yTemplate, templateBase, 'template');

      // Draw growing mRNA base (floating/emerging)
      if (charIdx < index) {
        let mrnaY = cy + 10;
        let mrnaX = x;
        const rnaBase = this.tSim.mode === 'template' ? this.getComplement(templateBase) : base;
        const finalRnaBase = rnaBase === 'T' ? 'U' : rnaBase;

        // Floating animation for current base
        if (isTranscribing) {
          mrnaY = cy + 30; // slide up from template
        }

        this.drawBaseNode(svg, mrnaX, mrnaY, finalRnaBase, 'rna');

        // Draw mRNA strand line connecting previous mRNA bases
        if (offset > -6) {
          const prevX = x - stepSize;
          let prevY = cy + 10;
          
          const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          connector.setAttribute('x1', prevX);
          connector.setAttribute('y1', prevY);
          connector.setAttribute('x2', mrnaX);
          connector.setAttribute('y2', mrnaY);
          connector.setAttribute('stroke', '#06b6d4');
          connector.setAttribute('stroke-width', '3');
          svg.appendChild(connector);
        }
      }
    }
  }

  drawBaseNode(svg, x, y, label, type) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Circle base
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '14');
    
    // Color mapping
    const baseColor = this.baseColors[label] || '#9ca3af';
    circle.setAttribute('fill', '#111827');
    circle.setAttribute('stroke', baseColor);
    circle.setAttribute('stroke-width', type === 'rna' ? '2.5' : '1.5');
    
    if (type === 'rna') {
      circle.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
    }

    g.appendChild(circle);

    // Text letter
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x);
    txt.setAttribute('y', y + 4);
    txt.setAttribute('fill', baseColor);
    txt.setAttribute('font-family', 'Fira Code, monospace');
    txt.setAttribute('font-size', '12');
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('text-anchor', 'middle');
    txt.textContent = label;
    g.appendChild(txt);

    svg.appendChild(g);
  }

  getComplement(base) {
    const comp = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'U': 'A' };
    return comp[base] || 'N';
  }

  // ================= TRANSLATION RENDERER =================
  setupTranslationUI() {
    const playBtn = document.getElementById('btn-translate-play');
    const pauseBtn = document.getElementById('btn-translate-pause');
    const stepBtn = document.getElementById('btn-translate-step');
    const resetBtn = document.getElementById('btn-translate-reset');
    const inputField = document.getElementById('mrna-input-field');
    const modeSelect = document.getElementById('translate-mode-select');
    const speedSlider = document.getElementById('translate-speed-slider');
    const speedVal = document.getElementById('translate-speed-val');
    const statusText = document.getElementById('translate-status-text');
    const progressBar = document.getElementById('translate-progress-bar');
    const polypeptideList = document.getElementById('polypeptide-display-list');

    inputField.addEventListener('input', () => {
      this.trSim.setSequence(inputField.value, modeSelect.value === 'coupled', document.getElementById('dna-input-field').value);
      this.trSim.reset();
    });

    modeSelect.addEventListener('change', () => {
      this.trSim.setSequence(inputField.value, modeSelect.value === 'coupled', document.getElementById('dna-input-field').value);
      this.trSim.reset();
    });

    speedSlider.addEventListener('input', (e) => {
      speedVal.textContent = e.target.value;
      this.trSim.setSpeed(e.target.value);
    });

    playBtn.addEventListener('click', () => {
      this.trSim.setSequence(inputField.value, modeSelect.value === 'coupled', document.getElementById('dna-input-field').value);
      this.trSim.play();
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      statusText.innerHTML = '<span class="text-protein"><i class="fa-solid fa-spinner fa-spin"></i> Translating mRNA...</span>';
    });

    pauseBtn.addEventListener('click', () => {
      this.trSim.pause();
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      statusText.textContent = 'Paused';
    });

    stepBtn.addEventListener('click', () => {
      this.trSim.step();
    });

    resetBtn.addEventListener('click', () => {
      this.trSim.reset();
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      statusText.textContent = 'Ready to translate';
      progressBar.style.width = '0%';
      polypeptideList.innerHTML = '<span class="pep-empty">No amino acids synthesized yet. Click Play to start.</span>';
    });

    // Handle steps
    this.trSim.onStep = (data) => {
      this.drawTranslationSVG(data);
      this.renderPolypeptideChain(data.polypeptide);
      
      const totalCodons = Math.floor(this.trSim.mrna.length / 3);
      progressBar.style.width = totalCodons > 0 ? `${(data.currentIndex / totalCodons) * 100}%` : '0%';
      
      if (data.isComplete) {
        statusText.innerHTML = '✨ Polypeptide synthesis completed!';
        playBtn.disabled = false;
        pauseBtn.disabled = true;
      } else {
        statusText.innerHTML = `Translating: Codon <strong>${data.currentIndex}</strong> of ${totalCodons} (${data.polypeptide[data.currentIndex-1]?.codon || ''} &rarr; ${data.polypeptide[data.currentIndex-1]?.aminoAcid || ''})`;
      }
    };

    // Draw initial empty ribosome
    this.drawTranslationSVG({ currentIndex: 0, polypeptide: [], isComplete: false });
  }

  drawTranslationSVG(data) {
    const svg = document.getElementById('translate-svg');
    svg.innerHTML = '';

    const width = 800;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;

    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    backgroundRect.setAttribute('width', '100%');
    backgroundRect.setAttribute('height', '100%');
    backgroundRect.setAttribute('fill', '#05080f');
    svg.appendChild(backgroundRect);

    // Ribosome subunits
    // Small subunit (40S) at bottom
    const smallSub = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    smallSub.setAttribute('x', cx - 220);
    smallSub.setAttribute('y', cy + 15);
    smallSub.setAttribute('width', '440');
    smallSub.setAttribute('height', '60');
    smallSub.setAttribute('rx', '15');
    smallSub.setAttribute('fill', 'rgba(156, 163, 175, 0.08)');
    smallSub.setAttribute('stroke', '#4b5563');
    smallSub.setAttribute('stroke-width', '1.5');
    svg.appendChild(smallSub);

    const smallSubLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    smallSubLbl.setAttribute('x', cx);
    smallSubLbl.setAttribute('y', cy + 50);
    smallSubLbl.setAttribute('fill', '#9ca3af');
    smallSubLbl.setAttribute('font-size', '10');
    smallSubLbl.setAttribute('font-weight', '700');
    smallSubLbl.setAttribute('text-anchor', 'middle');
    smallSubLbl.textContent = 'SMALL RIBOSOMAL SUBUNIT (30S/40S)';
    svg.appendChild(smallSubLbl);

    // Large subunit (60S) at top
    const largeSub = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Draw a dome shape for large subunit
    largeSub.setAttribute('d', `M ${cx - 240} ${cy + 5} A 240 200 0 0 1 ${cx + 240} ${cy + 5} Z`);
    largeSub.setAttribute('fill', 'rgba(99, 102, 241, 0.04)');
    largeSub.setAttribute('stroke', '#4b5563');
    largeSub.setAttribute('stroke-width', '1.5');
    svg.appendChild(largeSub);

    const largeSubLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    largeSubLbl.setAttribute('x', cx);
    largeSubLbl.setAttribute('y', cy - 110);
    largeSubLbl.setAttribute('fill', '#9ca3af');
    largeSubLbl.setAttribute('font-size', '10');
    largeSubLbl.setAttribute('font-weight', '700');
    largeSubLbl.setAttribute('text-anchor', 'middle');
    largeSubLbl.textContent = 'LARGE RIBOSOMAL SUBUNIT (50S/60S)';
    svg.appendChild(largeSubLbl);

    // Active Sites Labels (E, P, A)
    const sites = [
      { name: 'E', desc: 'Exit', x: cx - 110 },
      { name: 'P', desc: 'Peptidyl', x: cx },
      { name: 'A', desc: 'Aminoacyl', x: cx + 110 }
    ];

    sites.forEach(site => {
      // Draw vertical slot lines
      const border = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      border.setAttribute('x1', site.x - 50);
      border.setAttribute('y1', cy - 90);
      border.setAttribute('x2', site.x - 50);
      border.setAttribute('y2', cy + 5);
      border.setAttribute('stroke', 'rgba(255,255,255,0.03)');
      border.setAttribute('stroke-dasharray', '2 2');
      svg.appendChild(border);

      const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      name.setAttribute('x', site.x);
      name.setAttribute('y', cy - 80);
      name.setAttribute('fill', 'rgba(255,255,255,0.15)');
      name.setAttribute('font-size', '20');
      name.setAttribute('font-weight', '800');
      name.setAttribute('text-anchor', 'middle');
      name.textContent = site.name;
      svg.appendChild(name);

      const desc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      desc.setAttribute('x', site.x);
      desc.setAttribute('y', cy - 65);
      desc.setAttribute('fill', 'rgba(255,255,255,0.08)');
      desc.setAttribute('font-size', '8');
      desc.setAttribute('font-weight', '700');
      desc.setAttribute('text-anchor', 'middle');
      desc.textContent = site.desc.toUpperCase();
      svg.appendChild(desc);
    });

    // Draw mRNA strand threading through the middle
    const mrna = this.trSim.mrna;
    const codonIdx = data.currentIndex;
    const totalCodons = Math.floor(mrna.length / 3);
    const stepX = 110; // width of A/P/E slots

    // Scroll shift factor
    const scrollOffset = -codonIdx * stepX;

    // Draw mRNA backbone
    const mrnaLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mrnaLine.setAttribute('x1', '0');
    mrnaLine.setAttribute('y1', cy + 10);
    mrnaLine.setAttribute('x2', '800');
    mrnaLine.setAttribute('y2', cy + 10);
    mrnaLine.setAttribute('stroke', '#06b6d4');
    mrnaLine.setAttribute('stroke-width', '4');
    svg.appendChild(mrnaLine);

    // Draw individual nucleotides of mRNA
    for (let c = 0; c < totalCodons; c++) {
      const codonStr = mrna.substring(c * 3, c * 3 + 3);
      
      // Calculate relative position based on sliding view centered on site P (current index - 1)
      const slotOffset = c - (codonIdx - 1);
      const codonX = cx + slotOffset * stepX;

      if (codonX < 20 || codonX > 780) continue; // Out of bounds

      // Draw codon boundary box
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('x', codonX - 50);
      box.setAttribute('y', cy + 2);
      box.setAttribute('width', '100');
      box.setAttribute('height', '18');
      box.setAttribute('rx', '4');
      box.setAttribute('fill', 'rgba(6, 182, 212, 0.03)');
      box.setAttribute('stroke', c === codonIdx ? '#06b6d4' : 'rgba(255,255,255,0.06)');
      box.setAttribute('stroke-width', c === codonIdx ? '1.5' : '1');
      svg.appendChild(box);

      // Draw base letters (codon triplet)
      for (let b = 0; b < 3; b++) {
        const base = codonStr.charAt(b);
        const baseX = codonX - 30 + b * 30;
        
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', baseX);
        txt.setAttribute('y', cy + 15);
        txt.setAttribute('fill', this.baseColors[base] || '#9ca3af');
        txt.setAttribute('font-family', 'Fira Code, monospace');
        txt.setAttribute('font-size', '12');
        txt.setAttribute('font-weight', '700');
        txt.setAttribute('text-anchor', 'middle');
        txt.textContent = base;
        svg.appendChild(txt);
      }

      // Draw tRNAs docking into E, P, A slots
      // A slot represents index `codonIdx`
      // P slot represents index `codonIdx - 1`
      // E slot represents index `codonIdx - 2`
      const isASlot = c === codonIdx;
      const isPSlot = c === codonIdx - 1;
      const isESlot = c === codonIdx - 2;

      if (isASlot || isPSlot || isESlot) {
        let labelSite = isASlot ? 'A' : (isPSlot ? 'P' : 'E');
        this.drawTRNA(svg, codonX, cy - 2, codonStr, labelSite, data.polypeptide, c);
      }
    }
  }

  drawTRNA(svg, x, y, codon, slot, polypeptide, codonIndex) {
    const aaObj = window.translator.CODON_TABLE[codon];
    if (!aaObj) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'trna-node');
    
    // Draw anticodon base pairing matching letters at y - 15
    const anticodon = this.getAnticodon(codon);
    for (let b = 0; b < 3; b++) {
      const antBase = anticodon.charAt(b);
      const antX = x - 25 + b * 25;
      
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', antX);
      txt.setAttribute('y', y - 10);
      txt.setAttribute('fill', '#a5b4fc');
      txt.setAttribute('font-family', 'Fira Code, monospace');
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = antBase;
      g.appendChild(txt);
      
      // Draw weak hydrogen bonding dots connecting codon/anticodon
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', antX);
      dot.setAttribute('cy', y - 4);
      dot.setAttribute('r', '1.5');
      dot.setAttribute('fill', 'rgba(255,255,255,0.2)');
      g.appendChild(dot);
    }

    // tRNA vertical carrier structure (simple hairpin block)
    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stem.setAttribute('d', `M ${x - 15} ${y - 20} L ${x - 15} ${y - 45} L ${x - 5} ${y - 45} L ${x - 5} ${y - 35} L ${x + 5} ${y - 35} L ${x + 5} ${y - 45} L ${x + 15} ${y - 45} L ${x + 15} ${y - 20} Z`);
    stem.setAttribute('fill', 'rgba(99, 102, 241, 0.15)');
    stem.setAttribute('stroke', '#6366f1');
    stem.setAttribute('stroke-width', '1.5');
    g.appendChild(stem);

    // If not exit site (E), draw amino acid circle at top
    if (slot !== 'E' && aaObj.aminoAcid !== 'Stop') {
      const aaColor = this.classColors[aaObj.class] || '#9ca3af';
      
      const aminoCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      aminoCircle.setAttribute('cx', x);
      aminoCircle.setAttribute('cy', y - 55);
      aminoCircle.setAttribute('r', '10');
      aminoCircle.setAttribute('fill', aaColor);
      aminoCircle.setAttribute('stroke', '#fff');
      aminoCircle.setAttribute('stroke-width', '1');
      g.appendChild(aminoCircle);

      const aminoTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      aminoTxt.setAttribute('x', x);
      aminoTxt.setAttribute('y', y - 51);
      aminoTxt.setAttribute('fill', '#fff');
      aminoTxt.setAttribute('font-size', '9');
      aminoTxt.setAttribute('font-weight', '800');
      aminoTxt.setAttribute('text-anchor', 'middle');
      aminoTxt.textContent = aaObj.abbreviation;
      g.appendChild(aminoTxt);

      // If Peptidyl site (P), render the growing polypeptide tail floating upwards
      if (slot === 'P' && codonIndex > 0) {
        let tailY = y - 65;
        // Loop backwards through prior residues to draw connected tail circles
        for (let i = codonIndex - 1; i >= 0; i--) {
          const priorAA = polypeptide[i];
          if (!priorAA || priorAA.aminoAcid === 'Stop') break;

          const linkLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          linkLine.setAttribute('x1', x);
          linkLine.setAttribute('y1', tailY);
          linkLine.setAttribute('x2', x);
          linkLine.setAttribute('y2', tailY - 10);
          linkLine.setAttribute('stroke', 'rgba(255,255,255,0.3)');
          linkLine.setAttribute('stroke-width', '1.5');
          g.appendChild(linkLine);

          tailY -= 15;

          const tailCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          tailCircle.setAttribute('cx', x);
          tailCircle.setAttribute('cy', tailY);
          tailCircle.setAttribute('r', '8');
          tailCircle.setAttribute('fill', this.classColors[priorAA.class] || '#9ca3af');
          tailCircle.setAttribute('stroke', 'rgba(255,255,255,0.4)');
          tailCircle.setAttribute('stroke-width', '0.5');
          g.appendChild(tailCircle);

          const tailTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tailTxt.setAttribute('x', x);
          tailTxt.setAttribute('y', tailY + 3);
          tailTxt.setAttribute('fill', '#fff');
          tailTxt.setAttribute('font-size', '7.5');
          tailTxt.setAttribute('font-weight', '700');
          tailTxt.setAttribute('text-anchor', 'middle');
          tailTxt.textContent = priorAA.abbreviation;
          g.appendChild(tailTxt);
        }
      }
    }

    svg.appendChild(g);
  }

  getAnticodon(codon) {
    const comp = { 'A': 'U', 'U': 'A', 'C': 'G', 'G': 'C' };
    return codon.split('').map(b => comp[b] || 'N').join('');
  }

  renderPolypeptideChain(polypeptide) {
    const parent = document.getElementById('polypeptide-display-list');
    parent.innerHTML = '';
    
    if (polypeptide.length === 0) {
      parent.innerHTML = '<span class="pep-empty">No amino acids synthesized yet. Click Play to start.</span>';
      return;
    }

    polypeptide.forEach((aa, idx) => {
      if (idx > 0) {
        const link = document.createElement('span');
        link.className = 'pep-link';
        link.innerHTML = '<i class="fa-solid fa-link"></i>';
        parent.appendChild(link);
      }

      const bead = document.createElement('span');
      bead.className = `pep-bead`;
      const aaColor = this.classColors[aa.class] || '#9ca3af';
      bead.style.borderColor = aaColor;
      bead.style.color = aaColor;
      bead.style.background = `rgba(${this.hexToRgb(aaColor)}, 0.1)`;
      
      bead.innerHTML = `<i class="fa-solid fa-circle"></i> ${aa.aminoAcid}`;
      parent.appendChild(bead);
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  }

  // ================= MUTATION SANDBOX =================
  setupMutationUI() {
    const wtField = document.getElementById('mut-wt-input');
    const mutField = document.getElementById('mut-mut-input');
    const syncBtn = document.getElementById('btn-sync-wt');

    wtField.addEventListener('input', () => {
      document.getElementById('wt-input-count').textContent = `Length: ${wtField.value.trim().length} bp`;
      this.runMutationSandbox();
    });

    mutField.addEventListener('input', () => {
      document.getElementById('mut-input-count').textContent = `Length: ${mutField.value.trim().length} bp`;
      this.runMutationSandbox();
    });

    syncBtn.addEventListener('click', () => {
      mutField.value = wtField.value;
      document.getElementById('mut-input-count').textContent = `Length: ${mutField.value.trim().length} bp`;
      this.runMutationSandbox();
    });
  }

  runMutationSandbox() {
    const wt = document.getElementById('mut-wt-input').value;
    const mut = document.getElementById('mut-mut-input').value;

    const analysis = window.mutation.analyzeMutation(wt, mut);

    // Update badge and class styling
    const badge = document.getElementById('mutation-badge-type');
    badge.className = `mutation-badge ${analysis.mutationClass}`;
    badge.textContent = analysis.type.toUpperCase();

    document.getElementById('mutation-effect-desc').textContent = analysis.variantEffect;

    // Render Side-by-Side Codon comparisons
    const wtAlignContainer = document.getElementById('alignment-wt-codons');
    const mutAlignContainer = document.getElementById('alignment-mut-codons');
    const wtProteinContainer = document.getElementById('alignment-wt-protein');
    const mutProteinContainer = document.getElementById('alignment-mut-protein');

    wtAlignContainer.innerHTML = '';
    mutAlignContainer.innerHTML = '';
    wtProteinContainer.innerHTML = '';
    mutProteinContainer.innerHTML = '';

    // Render Codons
    analysis.wtCodons.forEach((codon, idx) => {
      const isShifted = analysis.type === 'frameshift' && analysis.diffs.length > 0 && (idx * 3) >= analysis.diffs[0].position;
      const isDifferent = codon !== analysis.mutCodons[idx];

      const wtCell = document.createElement('span');
      wtCell.className = `codon-cell`;
      wtCell.textContent = codon;
      wtAlignContainer.appendChild(wtCell);

      const mutCell = document.createElement('span');
      mutCell.className = `codon-cell`;
      mutCell.textContent = analysis.mutCodons[idx] || '---';
      if (isDifferent) {
        mutCell.classList.add(isShifted ? 'codon-shifted' : 'codon-diff');
      }
      mutAlignContainer.appendChild(mutCell);
    });

    // Render Proteins
    const wtAAs = analysis.wtProtein.split('-');
    const mutAAs = analysis.mutProtein.split('-');

    wtAAs.forEach((aa, idx) => {
      if (!aa) return;
      const isDifferent = aa !== mutAAs[idx];
      const isShifted = analysis.type === 'frameshift' && analysis.diffs.length > 0 && (idx * 3) >= analysis.diffs[0].position;

      const wtCell = document.createElement('span');
      wtCell.className = 'pep-cell';
      wtCell.textContent = aa;
      wtProteinContainer.appendChild(wtCell);

      const mutCell = document.createElement('span');
      mutCell.className = 'pep-cell';
      mutCell.textContent = mutAAs[idx] || '---';
      if (isDifferent) {
        mutCell.classList.add(isShifted ? 'codon-shifted' : 'pep-diff');
      }
      mutProteinContainer.appendChild(mutCell);
    });
  }

  // ================= CODON WHEEL =================
  renderCodonWheel() {
    const parent = document.getElementById('codon-wheel-svg-parent');
    parent.innerHTML = '';

    const width = 320;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 320 320');

    // Concentric Ring Radii
    const r1 = 30;  // Center hole
    const r2 = 65;  // 1st base ring
    const r3 = 100; // 2nd base ring
    const r4 = 135; // 3rd base ring / Amino Acid

    // Bases lists
    const bases = ['U', 'C', 'A', 'G'];

    // Math function to draw arc segment
    const getArc = (rInner, rOuter, startAng, endAng) => {
      const startRad = (startAng - 90) * Math.PI / 180;
      const endRad = (endAng - 90) * Math.PI / 180;
      
      const x1 = cx + rInner * Math.cos(startRad);
      const y1 = cy + rInner * Math.sin(startRad);
      const x2 = cx + rInner * Math.cos(endRad);
      const y2 = cy + rInner * Math.sin(endRad);
      
      const x3 = cx + rOuter * Math.cos(startRad);
      const y3 = cy + rOuter * Math.sin(startRad);
      const x4 = cx + rOuter * Math.cos(endRad);
      const y4 = cy + rOuter * Math.sin(endRad);
      
      return `M ${x1} ${y1} L ${x3} ${y3} A ${rOuter} ${rOuter} 0 0 1 ${x4} ${y4} L ${x2} ${y2} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;
    };

    // 1. Render First Ring (1st Base: 4 divisions, 90 deg each)
    bases.forEach((b1, i) => {
      const start = i * 90;
      const end = start + 90;
      const d = getArc(r1, r2, start, end);
      const fill = this.baseColors[b1];

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', fill);
      path.setAttribute('fill-opacity', '0.2');
      path.setAttribute('class', 'wheel-slice');
      
      // Events
      path.addEventListener('mouseover', () => this.updateWheelTooltip(b1, '', ''));
      svg.appendChild(path);

      // Label
      const midRad = (start + 45 - 90) * Math.PI / 180;
      const lx = cx + ((r1 + r2) / 2) * Math.cos(midRad);
      const ly = cy + ((r1 + r2) / 2) * Math.sin(midRad) + 3;

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly);
      txt.setAttribute('class', 'wheel-text');
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = b1;
      svg.appendChild(txt);

      // 2. Render Second Ring (2nd Base: 16 divisions, 22.5 deg each)
      bases.forEach((b2, j) => {
        const start2 = start + j * 22.5;
        const end2 = start2 + 22.5;
        const d2 = getArc(r2, r3, start2, end2);
        const fill2 = this.baseColors[b2];

        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', d2);
        path2.setAttribute('fill', fill2);
        path2.setAttribute('fill-opacity', '0.15');
        path2.setAttribute('class', 'wheel-slice');
        
        path2.addEventListener('mouseover', () => this.updateWheelTooltip(b1 + b2, '', ''));
        svg.appendChild(path2);

        const midRad2 = (start2 + 11.25 - 90) * Math.PI / 180;
        const lx2 = cx + ((r2 + r3) / 2) * Math.cos(midRad2);
        const ly2 = cy + ((r2 + r3) / 2) * Math.sin(midRad2) + 3;

        const txt2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt2.setAttribute('x', lx2);
        txt2.setAttribute('y', ly2);
        txt2.setAttribute('class', 'wheel-text');
        txt2.setAttribute('text-anchor', 'middle');
        txt2.setAttribute('font-size', '7');
        txt2.textContent = b2;
        svg.appendChild(txt2);

        // 3. Render Third Ring (3rd Base / Amino Acid: 64 divisions, 5.625 deg each)
        bases.forEach((b3, k) => {
          const start3 = start2 + k * 5.625;
          const end3 = start3 + 5.625;
          const d3 = getArc(r3, r4, start3, end3);
          
          const codon = b1 + b2 + b3;
          const aa = window.translator.CODON_TABLE[codon];
          const fill3 = aa ? this.classColors[aa.class] : '#9ca3af';

          const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path3.setAttribute('d', d3);
          path3.setAttribute('fill', fill3);
          path3.setAttribute('fill-opacity', '0.4');
          path3.setAttribute('class', 'wheel-slice');
          
          path3.addEventListener('mouseover', () => this.updateWheelTooltip(codon, aa.aminoAcid, aa.name + ' (' + aa.class + ')'));
          path3.addEventListener('click', () => {
            // Auto fill codon in translation sandbox or fields
            document.getElementById('tip-codon').textContent = codon;
          });
          svg.appendChild(path3);

          const midRad3 = (start3 + 2.8 - 90) * Math.PI / 180;
          const lx3 = cx + ((r3 + r4 - 8) / 2) * Math.cos(midRad3);
          const ly3 = cy + ((r3 + r4 - 8) / 2) * Math.sin(midRad3) + 2.5;

          // Only draw letters if they fit nicely
          if (k % 2 === 0) { // skip alternating labels for space
            const txt3 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt3.setAttribute('x', lx3);
            txt3.setAttribute('y', ly3);
            txt3.setAttribute('class', 'wheel-text');
            txt3.setAttribute('text-anchor', 'middle');
            txt3.setAttribute('font-size', '5.5');
            txt3.textContent = aa ? aa.abbreviation : '?';
            svg.appendChild(txt3);
          }
        });
      });
    });

    // Center Core (labeling)
    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('cx', cx);
    core.setAttribute('cy', cy);
    core.setAttribute('r', r1);
    core.setAttribute('fill', '#111827');
    core.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    core.setAttribute('stroke-width', '1');
    svg.appendChild(core);

    const coreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    coreText.setAttribute('x', cx);
    coreText.setAttribute('y', cy + 4);
    coreText.setAttribute('fill', '#9ca3af');
    coreText.setAttribute('font-family', 'Outfit');
    coreText.setAttribute('font-size', '9');
    coreText.setAttribute('font-weight', '700');
    coreText.setAttribute('text-anchor', 'middle');
    coreText.textContent = "5' &rarr; 3'";
    svg.appendChild(coreText);

    parent.appendChild(svg);
  }

  updateWheelTooltip(codon, amino, properties) {
    document.getElementById('tip-codon').textContent = codon;
    document.getElementById('tip-aa').textContent = amino || '---';
    document.getElementById('tip-prop').textContent = properties || '---';
  }

  // ================= STATISTICS & CHARTING =================
  updateStats(dna) {
    const rna = window.translator.transcribe(dna);
    const protein = window.translator.translate(rna, 'direct');
    
    const gc = window.translator.calculateGC(dna);
    const mw = window.translator.calculateMW(protein);
    const protLen = protein.split('-').filter(a => a && a !== 'Stop').length;

    // Mini stats widgets
    document.getElementById('mini-stat-dna-len').textContent = `${dna.length} bp`;
    document.getElementById('mini-stat-gc').textContent = `${gc.toFixed(1)}%`;
    document.getElementById('mini-stat-mw').textContent = `${mw.toLocaleString()} Da`;
    document.getElementById('mini-stat-pep-len').textContent = `${protLen} aa`;

    // Dashboard stats
    document.getElementById('stat-gc-pct').textContent = `${gc.toFixed(1)}%`;
    document.getElementById('stat-mol-wt').textContent = `${mw.toLocaleString()} Da`;
    document.getElementById('stat-prot-len').textContent = `${protLen} residues`;

    this.updateChartData(protein);
  }

  initChart() {
    const ctx = document.getElementById('amino-acid-chart').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Hydrophobic', 'Polar', 'Positive', 'Negative', 'Special'],
        datasets: [{
          label: 'Residue Count',
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            'rgba(245, 158, 11, 0.45)', // Amber
            'rgba(59, 130, 246, 0.45)',  // Blue
            'rgba(16, 185, 129, 0.45)',  // Green
            'rgba(244, 63, 94, 0.45)',   // Red
            'rgba(107, 114, 128, 0.45)'  // Gray
          ],
          borderColor: [
            '#f59e0b',
            '#3b82f6',
            '#10b981',
            '#f43f5e',
            '#6b7280'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#9ca3af', font: { family: 'Inter' } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#9ca3af', font: { family: 'Inter' }, precision: 0 },
            min: 0
          }
        }
      }
    });
  }

  updateChartData(protein) {
    if (!this.chart) return;
    
    // Count frequencies of classes
    const classes = {
      'hydrophobic': 0,
      'polar': 0,
      'positive': 0,
      'negative': 0,
      'special': 0
    };

    const parts = protein.split('-');
    parts.forEach(aaName => {
      // Find class in genetic code
      const match = Object.values(window.translator.CODON_TABLE).find(v => v.aminoAcid === aaName);
      if (match && classes[match.class] !== undefined) {
        classes[match.class]++;
      }
    });

    this.chart.data.datasets[0].data = [
      classes['hydrophobic'],
      classes['polar'],
      classes['positive'],
      classes['negative'],
      classes['special']
    ];
    this.chart.update();
  }
}

window.ui = {
  UIManager
};
