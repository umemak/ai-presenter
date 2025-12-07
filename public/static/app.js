// State management
const state = {
  pdfDoc: null,
  slides: [], // { pageNum, image, script, status: 'pending'|'processing'|'ready'|'error' }
  currentSlideIndex: 0,
  isPlaying: false,
  totalSlides: 0,
  speechSynthesis: window.speechSynthesis,
  currentUtterance: null
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
  logoutBtn: document.getElementById('logout-btn'),
  
  currentSlideNum: document.getElementById('current-slide-num'),
  totalSlidesNum: document.getElementById('total-slides-num'),
  currentSlideImg: document.getElementById('current-slide-img'),
  scriptDisplay: document.getElementById('script-display'),
  
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  playPauseBtn: document.getElementById('play-pause-btn'),
  savePresentationBtn: document.getElementById('save-presentation-btn'),
  loadPresentationsBtn: document.getElementById('load-presentations-btn'),
};

// Event Listeners
elements.fileInput.addEventListener('change', handleFileUpload);
elements.prevBtn.addEventListener('click', () => navigateSlide(-1));
elements.nextBtn.addEventListener('click', () => navigateSlide(1));
elements.playPauseBtn.addEventListener('click', togglePlay);
elements.logoutBtn.addEventListener('click', handleLogout);
if (elements.savePresentationBtn) elements.savePresentationBtn.addEventListener('click', savePresentation);
if (elements.loadPresentationsBtn) elements.loadPresentationsBtn.addEventListener('click', showPresentationsList);

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
    updateProcessingStatus(i, state.totalSlides, `スライド ${i + 1}/${state.totalSlides} を解析中... (Cloudflare AI)`);
    
    try {
      // 1. Convert PDF page to Image
      const imageUrl = await renderPageToImage(i + 1);
      state.slides[i].image = imageUrl;
      
      // 2. Generate Script (Cloudflare Workers AI)
      let context = "";
      if (i === 0) context = "これは最初のスライドです。導入を含めてください。";
      else if (i === state.totalSlides - 1) context = "これは最後のスライドです。締めを含めてください。";

      const scriptRes = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl, context })
      });
      
      if (!scriptRes.ok) throw new Error('Script generation failed');
      const scriptData = await scriptRes.json();
      state.slides[i].script = scriptData.script;
      state.slides[i].status = 'ready';

    } catch (err) {
      console.error(`Error processing slide ${i+1}:`, err);
      state.slides[i].status = 'error';
      state.slides[i].script = '(AI解析エラー: スライドの内容を読み取れませんでした)';
    }
    
    // Update progress bar
    const progress = ((i + 1) / state.totalSlides) * 100;
    elements.progressBar.style.width = `${progress}%`;
  }
}

async function renderPageToImage(pageNum) {
  const page = await state.pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 }); 
  
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
  
  // Stop current audio
  cancelSpeech();

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
    speakText(slide.script);
  } else {
    setPlayState(false);
  }
}

function speakText(text) {
  if (!text) return;
  
  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 1.0; // Speed
  utterance.pitch = 1.0;

  utterance.onend = () => {
    state.currentUtterance = null;
    if (state.isPlaying) {
      if (state.currentSlideIndex < state.totalSlides - 1) {
        navigateSlide(1); // Next slide
      } else {
        setPlayState(false); // Finished
      }
    }
  };

  utterance.onerror = (e) => {
    console.error("Speech error:", e);
    setPlayState(false);
  };

  state.currentUtterance = utterance;
  state.speechSynthesis.speak(utterance);
}

function cancelSpeech() {
  if (state.speechSynthesis.speaking) {
    state.speechSynthesis.cancel();
  }
  state.currentUtterance = null;
}

function togglePlay() {
  if (state.isPlaying) {
    setPlayState(false);
    if (state.speechSynthesis.speaking) {
      state.speechSynthesis.pause(); // or cancel() if we want to stop completely
    }
  } else {
    setPlayState(true);
    
    if (state.speechSynthesis.paused) {
       state.speechSynthesis.resume();
    } else if (!state.speechSynthesis.speaking) {
       // Start speaking current slide
       const slide = state.slides[state.currentSlideIndex];
       if (slide && slide.script) {
         speakText(slide.script);
       }
    }
  }
}

function setPlayState(playing) {
  state.isPlaying = playing;
  const icon = elements.playPauseBtn.querySelector('i');
  const text = elements.playPauseBtn.childNodes[1];
  
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
  cancelSpeech();
}

function updateProcessingStatus(current, total, text) {
  elements.processingStatus.textContent = text;
  elements.processingDetail.textContent = `全体進捗: ${Math.round((current/total)*100)}%`;
}

// --- Logout Function ---
async function handleLogout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('ログアウトに失敗しました');
  }
}

// --- Save & Load Functions ---
async function savePresentation() {
  if (!state.slides || state.slides.length === 0) {
    alert('保存するプレゼンテーションがありません');
    return;
  }

  const filename = prompt('プレゼンテーション名を入力してください:', 'プレゼンテーション_' + new Date().toLocaleDateString());
  if (!filename) return;

  try {
    const response = await fetch('/api/save-presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        slides: state.slides.map(s => ({
          pageNum: s.pageNum,
          image: s.image,
          script: s.script
        }))
      })
    });

    if (response.ok) {
      alert('保存しました！');
    } else {
      const data = await response.json();
      alert('保存に失敗しました: ' + (data.error || ''));
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('保存中にエラーが発生しました');
  }
}

async function showPresentationsList() {
  try {
    const response = await fetch('/api/presentations');
    const data = await response.json();

    if (!data.presentations || data.presentations.length === 0) {
      alert('保存されたプレゼンテーションはありません');
      return;
    }

    let listHTML = '<div style="max-height: 400px; overflow-y: auto;"><ul>';
    data.presentations.forEach(p => {
      const date = new Date(p.created_at).toLocaleString('ja-JP');
      listHTML += `<li style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer;" onclick="loadPresentation(${p.id})">
        <strong>${p.filename}</strong> (${p.total_slides}スライド)<br>
        <small style="color: #666;">${date}</small>
        <button onclick="event.stopPropagation(); deletePresentation(${p.id})" style="float: right; padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">削除</button>
      </li>`;
    });
    listHTML += '</ul></div>';

    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 10px; max-width: 600px; width: 90%;">
        <h2 style="margin-top: 0;">保存済みプレゼンテーション</h2>
        ${listHTML}
        <button onclick="this.closest('div[style*=\\'fixed\\']').remove()" style="margin-top: 10px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">閉じる</button>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Load error:', error);
    alert('読み込み中にエラーが発生しました');
  }
}

async function loadPresentation(id) {
  try {
    const response = await fetch(`/api/presentations/${id}`);
    const data = await response.json();

    if (!data.slides || data.slides.length === 0) {
      alert('スライドデータがありません');
      return;
    }

    // Load data into state
    state.slides = data.slides.map((s, i) => ({
      pageNum: s.slide_number,
      image: s.image_data,
      script: s.script,
      status: 'ready'
    }));
    state.totalSlides = state.slides.length;
    elements.totalSlidesNum.textContent = state.totalSlides;

    // Close modal
    document.querySelectorAll('div[style*="fixed"]').forEach(el => el.remove());

    // Show presentation
    showPresentationUI();
    loadSlide(0);
  } catch (error) {
    console.error('Load presentation error:', error);
    alert('プレゼンテーションの読み込みに失敗しました');
  }
}

async function deletePresentation(id) {
  if (!confirm('このプレゼンテーションを削除しますか？')) return;

  try {
    const response = await fetch(`/api/presentations/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('削除しました');
      // Reload list
      document.querySelectorAll('div[style*="fixed"]').forEach(el => el.remove());
      showPresentationsList();
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('削除中にエラーが発生しました');
  }
}

// Make functions globally accessible
window.loadPresentation = loadPresentation;
window.deletePresentation = deletePresentation;
