const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 1. FRONTEND: PREMIUM UI (HTML/CSS/JS)
// ==========================================
const frontendHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMSAL STUDIOS - WORKSTATION</title>
    <style>
        :root {
            --bg-main: #090c10;
            --bg-card: #161b22;
            --accent: #00f2fe;
            --accent-audio: #ff007f;
            --text-main: #c9d1d9;
            --text-muted: #8b949e;
            --border: #30363d;
        }
        * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
        body { background: var(--bg-main); color: var(--text-main); margin: 0; padding: 20px; display: flex; justify-content: center; min-height: 100vh; }
        
        .app-container { width: 100%; max-width: 600px; background: var(--bg-card); padding: 30px; border-radius: 16px; border: 1px solid var(--accent); box-shadow: 0 10px 30px rgba(0, 242, 254, 0.1); align-self: flex-start; margin-top: 20px; }
        
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: var(--accent); margin: 0 0 5px 0; font-size: 26px; letter-spacing: 2px; text-transform: uppercase; }
        .badge { background: #ffbc00; color: #000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; }

        .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 25px; }
        .tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; color: var(--text-muted); font-weight: 600; transition: 0.3s; }
        .tab.active { color: var(--accent); border-bottom: 2px solid var(--accent); }
        .tab[data-target="audio"].active { color: var(--accent-audio); border-bottom-color: var(--accent-audio); }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .form-group input { width: 100%; padding: 15px; background: var(--bg-main); border: 1px solid var(--border); color: #fff; border-radius: 8px; font-size: 15px; outline: none; transition: 0.3s; }
        .form-group input:focus { border-color: var(--accent); }

        .btn { width: 100%; padding: 16px; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; text-transform: uppercase; transition: transform 0.2s, opacity 0.2s; color: #000; }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-video { background: linear-gradient(135deg, #00f2fe, #4facfe); }
        .btn-audio { background: linear-gradient(135deg, #ff007f, #7f00ff); color: #fff; }
        .btn-download { display: block; text-align: center; text-decoration: none; margin-top: 15px; background: linear-gradient(135deg, #00b09b, #96c93d); }

        .section { display: none; }
        .section.active { display: block; animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        /* Status & Loader */
        .status-box { margin-top: 20px; padding: 15px; border-radius: 8px; background: #21262d; border-left: 4px solid var(--accent); font-size: 14px; display: none; }
        .status-box.error { border-color: #ff4444; }
        .spinner { display: inline-block; width: 16px; height: 16px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Result Card */
        .result-card { background: var(--bg-main); border: 1px solid var(--border); border-radius: 12px; padding: 15px; margin-top: 25px; display: none; }
        .result-card img { width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333; }
        .result-title { font-size: 15px; font-weight: 600; line-height: 1.4; margin-bottom: 15px; padding: 10px; background: #21262d; border-radius: 6px; }
    </style>
</head>
<body>

    <div class="app-container">
        <div class="header">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">PRO CORE ENGINE</div>
        </div>

        <div class="tabs">
            <div class="tab active" data-target="video" onclick="switchTab('video')">Video Engine</div>
            <div class="tab" data-target="audio" onclick="switchTab('audio')">Audio Engine</div>
        </div>

        <!-- VIDEO ENGINE -->
        <div id="video-section" class="section active">
            <div class="form-group">
                <label>Media Link (YouTube, TikTok, Insta)</label>
                <input type="text" id="video-url" placeholder="Paste link here...">
            </div>
            <button class="btn btn-video" id="btn-video" onclick="processMedia('video')">Extract Video</button>
        </div>

        <!-- AUDIO ENGINE -->
        <div id="audio-section" class="section">
            <div class="form-group">
                <label>Media Link (Extract Sound)</label>
                <input type="text" id="audio-url" placeholder="Paste link here...">
            </div>
            <button class="btn btn-audio" id="btn-audio" onclick="processMedia('audio')">Extract Audio Track</button>
        </div>

        <!-- STATUS MESSAGE -->
        <div id="status" class="status-box"></div>

        <!-- RESULT CARD -->
        <div id="result" class="result-card">
            <div id="result-title" class="result-title"></div>
            <img id="result-thumb" src="" alt="Thumbnail" style="display: none;">
            <a id="result-btn" class="btn btn-download" href="#" target="_blank" rel="noopener">⬇️ Download File</a>
        </div>
    </div>

    <script>
        let currentMode = 'video';

        function switchTab(mode) {
            currentMode = mode;
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-target') === mode);
            });
            document.querySelectorAll('.section').forEach(s => {
                s.classList.toggle('active', s.id === mode + '-section');
            });
            hideStatus();
            hideResult();
        }

        function showStatus(html, isError = false) {
            const el = document.getElementById('status');
            el.innerHTML = html;
            el.className = 'status-box' + (isError ? ' error' : '');
            el.style.display = 'block';
        }
        function hideStatus() { document.getElementById('status').style.display = 'none'; }
        
        function showResult(title, thumbUrl, downloadUrl) {
            document.getElementById('result-title').innerText = title;
            const thumbEl = document.getElementById('result-thumb');
            if(thumbUrl) { thumbEl.src = thumbUrl; thumbEl.style.display = 'block'; } 
            else { thumbEl.style.display = 'none'; }
            
            const btn = document.getElementById('result-btn');
            btn.href = downloadUrl;
            
            // Adapt button color based on mode
            if(currentMode === 'audio') {
                btn.style.background = 'linear-gradient(135deg, #ff007f, #7f00ff)';
                btn.innerText = '🎵 Download Audio';
            } else {
                btn.style.background = 'linear-gradient(135deg, #00b09b, #96c93d)';
                btn.innerText = '⬇️ Download Video';
            }

            document.getElementById('result').style.display = 'block';
        }
        function hideResult() { document.getElementById('result').style.display = 'none'; }

        async function processMedia(mode) {
            const inputId = mode === 'video' ? 'video-url' : 'audio-url';
            const btnId = mode === 'video' ? 'btn-video' : 'btn-audio';
            const url = document.getElementById(inputId).value.trim();
            const btn = document.getElementById(btnId);

            if(!url) return showStatus('⚠️ Please paste a link first!', true);

            hideResult();
            btn.disabled = true;
            showStatus('<div class="spinner"></div> Initiating core extraction engine...');

            try {
                const res = await fetch('/api/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, mode })
                });
                
                const data = await res.json();
                btn.disabled = false;

                if(data.success) {
                    hideStatus();
                    showResult(data.title, data.thumbnail, data.downloadUrl);
                } else {
                    showStatus('❌ ' + (data.message || 'Extraction failed. The link might be private or unsupported.'), true);
                }
            } catch (err) {
                btn.disabled = false;
                showStatus('❌ Network error. Please try again.', true);
            }
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(frontendHTML));

// ==========================================
// 2. BACKEND: ROBUST EXTRACTION ENGINE
// ==========================================
app.post('/api/extract', async (req, res) => {
    const { url, mode } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty" });

    const isAudio = mode === 'audio';

    // ENGINE A: TIKTOK DEDICATED (TikWM)
    if (url.includes('tiktok.com')) {
        try {
            const tkRes = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url));
            const tkData = await tkRes.json();
            if (tkData?.data) {
                return res.json({
                    success: true,
                    title: tkData.data.title || "TikTok Media",
                    thumbnail: tkData.data.cover || "",
                    downloadUrl: isAudio ? (tkData.data.music || tkData.data.play) : (tkData.data.hdplay || tkData.data.play)
                });
            }
        } catch (e) {
            console.log("TikWM Failed:", e.message);
        }
    }

    // ENGINE B: COBALT API (MULTI-INSTANCE FALLBACK)
    // List of public Cobalt APIs to avoid rate limits
    const cobaltInstances = [
        'https://api.cobalt.tools',
        'https://co.wuk.sh',
        'https://cobalt.q-n-d.de',
        'https://cobalt-api.kwiatektu.com'
    ];

    for (let instance of cobaltInstances) {
        try {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            
            // Payload based on Cobalt v10 standard
            const payload = {
                url: url,
                downloadMode: isAudio ? 'audio' : 'auto',
                videoQuality: '1080'
            };

            const cbRes = await fetch(instance, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!cbRes.ok) continue; // Skip to next instance if blocked

            const cbData = await cbRes.json();
            
            let dlUrl = cbData.url;
            if (!dlUrl && cbData.picker && cbData.picker.length > 0) {
                dlUrl = cbData.picker[0].url; // For posts with multiple media (like Insta carousel)
            }

            if (dlUrl) {
                return res.json({
                    success: true,
                    title: cbData.filename || "Extracted Media File",
                    thumbnail: "", 
                    downloadUrl: dlUrl
                });
            }
        } catch (e) {
            console.log(`Cobalt Instance ${instance} failed`);
        }
    }

    // ENGINE C: PIPED YOUTUBE FALLBACK (Only for YT links)
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch) {
        const ytId = ytMatch[1];
        const pipedNodes = ['https://pipedapi.kavin.rocks', 'https://api.piped.private.coffee'];
        
        for (let node of pipedNodes) {
            try {
                const pRes = await fetch(`${node}/streams/${ytId}`);
                if(!pRes.ok) continue;
                const pData = await pRes.json();

                if (isAudio && pData.audioStreams?.length > 0) {
                    return res.json({
                        success: true,
                        title: pData.title || "YouTube Audio",
                        thumbnail: pData.thumbnailUrl,
                        downloadUrl: pData.audioStreams[0].url
                    });
                }
                
                if (!isAudio && pData.videoStreams?.length > 0) {
                    // Try to find MP4 format, otherwise fallback to first available
                    const stream = pData.videoStreams.find(s => s.format === 'MPEG-4') || pData.videoStreams[0];
                    return res.json({
                        success: true,
                        title: pData.title || "YouTube Video",
                        thumbnail: pData.thumbnailUrl,
                        downloadUrl: stream.url
                    });
                }
            } catch (e) {
                console.log(`Piped Node ${node} failed`);
            }
        }
    }

    // IF ALL ENGINES FAIL
    return res.json({ 
        success: false, 
        message: "All extraction engines failed. The link might be private, region-locked, or unsupported." 
    });
});

app.listen(PORT, () => console.log(`🚀 AMSAL STUDIOS Core Engine running on port ${PORT}`));
