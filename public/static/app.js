// State management
const state = {
  pdfDoc: null,
  slides: [], // { pageNum, image, script, audioUrl, status: 'pending'|'processing'|'ready'|'error' }
  currentSlideIndex: 0,
  isPlaying: false,
  currentAudio: null,
  totalSlides: 0
};

// DOM Elements
const elements = {
  uploadSection: document.getElementById('upload-section'),
  processingSection: document.getElementById('processing-section'),
  presentationSection: document.getElementById('presentation-section'),
  fileInput: document.getElementById('file-input'),
  processingStatus: document.getElementById('processing-status'),
  processingDetail: document.getElementById('processing-detail'),
  progressBar: document.getElementById('progress-bar'),
  
  currentSlideNum: document.getElementById('current-slide-num'),
  totalSlidesNum: document.getElementById('total-slides-num'),
  currentSlideImg: document.getElementById('current-slide-img'),
  scriptDisplay: document.getElementById('script-display'),
  
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  playPauseBtn: document.getElementById('play-pause-btn'),
};

// Event Listeners
elements.fileInput.addEventListener('change', handleFileUpload);
elements.prevBtn.addEventListener('click', () => navigateSlide(-1));
elements.nextBtn.addEventListener('click', () => navigateSlide(1));
elements.playPauseBtn.addEventListener('click', togglePlay);

// --- Core Functions ---

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    alert('PDFファイルを選択してください。');
    return;
  }

  showProcessingUI();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    state.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
    state.totalSlides = state.pdfDoc.numPages;
    elements.totalSlidesNum.textContent = state.totalSlides;

    updateProcessingStatus(0, state.totalSlides, 'PDFを読み込み中...');

    // Initialize slides array
    state.slides = Array(state.totalSlides).fill().map((_, i) => ({
      pageNum: i + 1,
      image: null,
      script: null,
      audioUrl: null,
      status: 'pending'
    }));

    // Process slides sequentially
    await processSlides();
    
    showPresentationUI();
    loadSlide(0);

  } catch (err) {
    console.error(err);
    alert('PDFの読み込みに失敗しました: ' + err.message);
    resetUI();
  }
}

async function processSlides() {
  for (let i = 0; i < state.totalSlides; i++) {
    updateProcessingStatus(i, state.totalSlides, `スライド ${i + 1}/${state.totalSlides} を解析中...`);
    
    try {
      // 1. Convert PDF page to Image
      const imageUrl = await renderPageToImage(i + 1);
      state.slides[i].image = imageUrl;
      
      // 2. Generate Script (API)
      // Context: inform AI about the position (first slide, last slide, etc.)
      let context = "";
      if (i === 0) context = "これは最初のスライド（タイトルスライド）です。プレゼンの導入として挨拶を含めてください。";
      else if (i === state.totalSlides - 1) context = "これは最後のスライドです。まとめと締めの挨拶を含めてください。";
      else context = `これは ${i+1} 枚目のスライドです。`;

      const scriptRes = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl, context })
      });
      
      if (!scriptRes.ok) throw new Error('Script generation failed');
      const scriptData = await scriptRes.json();
      state.slides[i].script = scriptData.script;

      // 3. Generate Audio (API)
      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scriptData.script })
      });

      if (!audioRes.ok) throw new Error('Audio generation failed');
      const audioData = await audioRes.json();
      state.slides[i].audioUrl = audioData.audio;
      state.slides[i].status = 'ready';

    } catch (err) {
      console.error(`Error processing slide ${i+1}:`, err);
      state.slides[i].status = 'error';
      state.slides[i].script = '(エラー: 生成に失敗しました)';
    }
    
    // Update progress bar
    const progress = ((i + 1) / state.totalSlides) * 100;
    elements.progressBar.style.width = `${progress}%`;
  }
}

async function renderPageToImage(pageNum) {
  const page = await state.pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 }); // Slightly higher scale for quality
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport: viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

// --- UI & Playback Control ---

function loadSlide(index) {
  if (index < 0 || index >= state.totalSlides) return;
  
  // Stop current audio if playing
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio = null;
  }

  state.currentSlideIndex = index;
  const slide = state.slides[index];
  
  // Update UI
  elements.currentSlideNum.textContent = index + 1;
  elements.currentSlideImg.src = slide.image;
  elements.scriptDisplay.textContent = slide.script || '読み込み中...';
  
  // Button states
  elements.prevBtn.disabled = index === 0;
  elements.nextBtn.disabled = index === state.totalSlides - 1;

  // Auto-play if in playing mode
  if (state.isPlaying && slide.status === 'ready') {
    playAudio(slide.audioUrl);
  } else {
    setPlayState(false);
  }
}

function playAudio(url) {
  if (!url) return;
  
  state.currentAudio = new Audio(url);
  state.currentAudio.onended = () => {
    if (state.isPlaying) {
      if (state.currentSlideIndex < state.totalSlides - 1) {
        navigateSlide(1);
      } else {
        setPlayState(false); // Finished
      }
    }
  };
  
  state.currentAudio.play().catch(e => {
    console.error("Playback failed:", e);
    setPlayState(false);
  });
}

function togglePlay() {
  if (state.isPlaying) {
    setPlayState(false);
    if (state.currentAudio) state.currentAudio.pause();
  } else {
    setPlayState(true);
    // If we have audio for current slide, play it. Otherwise it will play when loaded.
    const slide = state.slides[state.currentSlideIndex];
    if (slide && slide.audioUrl) {
      playAudio(slide.audioUrl);
    } else if (slide && slide.status === 'error') {
        // Skip error slides or just stop? Let's stop for now.
        alert('このスライドの音声生成に失敗しているため再生できません。');
        setPlayState(false);
    }
  }
}

function setPlayState(playing) {
  state.isPlaying = playing;
  const icon = elements.playPauseBtn.querySelector('i');
  const text = elements.playPauseBtn.childNodes[1]; // Text node
  
  if (playing) {
    icon.className = 'fas fa-pause mr-2';
    text.textContent = '一時停止';
    elements.playPauseBtn.classList.replace('bg-blue-600', 'bg-yellow-500');
    elements.playPauseBtn.classList.replace('hover:bg-blue-700', 'hover:bg-yellow-600');
  } else {
    icon.className = 'fas fa-play mr-2';
    text.textContent = '再生';
    elements.playPauseBtn.classList.replace('bg-yellow-500', 'bg-blue-600');
    elements.playPauseBtn.classList.replace('hover:bg-yellow-600', 'hover:bg-blue-700');
  }
}

function navigateSlide(direction) {
  const newIndex = state.currentSlideIndex + direction;
  if (newIndex >= 0 && newIndex < state.totalSlides) {
    loadSlide(newIndex);
  }
}

// --- Helper Functions ---

function showProcessingUI() {
  elements.uploadSection.classList.add('hidden');
  elements.processingSection.classList.remove('hidden');
  elements.presentationSection.classList.add('hidden');
}

function showPresentationUI() {
  elements.uploadSection.classList.add('hidden');
  elements.processingSection.classList.add('hidden');
  elements.presentationSection.classList.remove('hidden');
}

function resetUI() {
  elements.uploadSection.classList.remove('hidden');
  elements.processingSection.classList.add('hidden');
  elements.presentationSection.classList.add('hidden');
  elements.fileInput.value = '';
}

function updateProcessingStatus(current, total, text) {
  elements.processingStatus.textContent = text;
  elements.processingDetail.textContent = `全体進捗: ${Math.round((current/total)*100)}%`;
}
