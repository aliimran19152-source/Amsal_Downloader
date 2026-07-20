const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HTML FRONTEND INTERFACE ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS WORKSTATION</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 650px; margin: 20px auto; background: #161b22; padding: 30px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0, 242, 254, 0.2); }
            h1 { color: #00f2fe; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-size: 24px; }
            .badge { background: #ffbc00; color: #000; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-bottom: 25px; }
            label { display: block; text-align: left; font-weight: bold; margin-bottom: 8px; color: #8b949e; font-size: 13px; text-transform: uppercase; }
            input[type="text"] { width: 100%; padding: 14px; margin-bottom: 20px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; font-size: 15px; outline: none; }
            input[type="text"]:focus { border-color: #00f2fe; box-shadow: 0 0 8px rgba(0, 242, 254, 0.5); }
            
            button { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; transition: 0.3s; margin-bottom: 15px; text-transform: uppercase; }
            .btn-fetch { background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; }
            .btn-audio-fetch { background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff; }
            .btn-download { display: block; width: 100%; text-decoration: none; text-align: center; padding: 15px; border-radius: 8px; font-size: 15px; font-weight: bold; background: linear-gradient(45deg, #00ff87, #60efff); color: #000; margin-top: 10px; }
            button:hover, .btn-download:hover { transform: scale(1.02); opacity: 0.9; }
            button:disabled { opacity: 0.5; cursor: not-allowed; }
            
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 15px; text-align: left; border-radius: 4px; font-size: 14px; display: none; margin-top: 15px; line-height: 1.5; word-break: break-all; }
            
            .preview-card { background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 15px; margin-top: 20px; display: none; text-align: left; }
            .preview-card img { width: 100%; border-radius: 8px; margin-bottom: 12px; border: 1px solid #444; display: block; max-height: 300px; object-fit: cover; }
            .preview-title { font-weight: bold; font-size: 15px; color: #fff; margin-bottom: 15px; line-height: 1.4; background: #21262d; padding: 10px; border-radius: 6px; border-left: 3px solid #ffbc00; }
            
            .tabs { display: flex; justify-content: space-around; margin-bottom: 20px; border-bottom: 1px solid #30363d; }
            .tab { padding: 10px 20px; cursor: pointer; color: #8b949e; font-weight: bold; }
            .tab.active { color: #00f2fe; border-bottom: 2px solid #00f2fe; }
            .form-section { display: none; }
            .form-section.active { display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">PREMIUM CORE WORKSTATION</div>
            
            <div class="tabs">
                <div class="tab active" onclick="switchTab('video-sec', this)">Video Engine</div>
                <div class="tab" onclick="switchTab('audio-sec', this)">Audio Engine</div>
            </div>

            <!-- VIDEO SECTION -->
            <div id="video-sec" class="form-section active">
                <div>
                    <label>Target Media URL (Video)</label>
                    <input type="text" id="urlInput" placeholder="Paste Video Link (YT Shorts/Video, TikTok, Insta...)">
                    <button type="button" class="btn-fetch" id="btnVideoFetch" onclick="processMedia('video')">Fetch Video Details</button>
                </div>

                <div id="previewCard" class="preview-card">
                    <div id="videoTitle" class="preview-title">Video Title</div>
                    <img id="videoThumb" src="" alt="Thumbnail">
                    <a id="startDownloadBtn" class="btn-download" href="#" target="_blank" rel="noopener">⬇️ DOWNLOAD VIDEO FILE</a>
                </div>
            </div>

            <!-- AUDIO SECTION -->
            <div id="audio-sec" class="form-section">
                <div>
                    <label>Target Media URL (Audio / Sound Extract)</label>
                    <input type="text" id="audioUrlInput" placeholder="Paste link to extract pure HQ Audio/Music">
                    <button type="button" class="btn-audio-fetch" id="btnAudioFetch" onclick="processMedia('audio')">Fetch Audio Details</button>
                </div>

                <div id="audioPreviewCard" class="preview-card">
                    <div id="audioTitle" class="preview-title">Audio Title</div>
                    <img id="audioThumb" src="" alt="Thumbnail">
                    <a id="startAudioDownloadBtn" class="btn-download" style="background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff;" href="#" target="_blank" rel="noopener">🎵 EXTRACT AUDIO TRACK</a>
                </div>
            </div>

            <div id="download-status" class="status"></div>
        </div>

        <script>
            function switchTab(sectionId, tabEl) {
                document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.getElementById(sectionId).classList.add('active');
                tabEl.classList.add('active');
                document.getElementById('download-status').style.display = 'none';
            }

            async function processMedia(type) {
                const isAudio = type === 'audio';
                const inputId = isAudio ? 'audioUrlInput' : 'urlInput';
                const btnId = isAudio ? 'btnAudioFetch' : 'btnVideoFetch';
                const cardId = isAudio ? 'audioPreviewCard' : 'previewCard';
                const titleId = isAudio ? 'audioTitle' : 'videoTitle';
                const thumbId = isAudio ? 'audioThumb' : 'videoThumb';
                const dlBtnId = isAudio ? 'startAudioDownloadBtn' : 'startDownloadBtn';

                const urlInput = document.getElementById(inputId);
                const url = urlInput.value.trim();
                const statusPanel = document.getElementById('download-status');
                const card = document.getElementById(cardId);
                const btn = document.getElementById(btnId);

                if (!url) {
                    statusPanel.style.display = 'block';
                    statusPanel.innerHTML = "⚠️ <b>[Error]:</b> Pehle link paste karein!";
                    return;
                }

                card.style.display = 'none';
                statusPanel.style.display = 'block';
                btn.disabled = true;
                statusPanel.innerHTML = "🛰️ <b>[Analyzing Stream]:</b> Express Server extraction in progress...";

                try {
                    const response = await fetch('/api/fetch-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type })
                    });
                    const data = await response.json();

                    btn.disabled = false;

                    if (data.success) {
                        statusPanel.style.display = 'none';
                        document.getElementById(titleId).innerHTML = (isAudio ? "🎵 " : "🎬 ") + "<b>Title:</b> " + data.title;
                        
                        const thumbEl = document.getElementById(thumbId);
                        if (data.thumbnail) {
                            thumbEl.src = data.thumbnail;
                            thumbEl.style.display = 'block';
                        } else {
                            thumbEl.style.display = 'none';
                        }

                        const dlBtn = document.getElementById(dlBtnId);
                        dlBtn.href = data.downloadUrl;
                        card.style.display = 'block';
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Extraction Error]:</b> " + (data.message || "Media fetch nahi ho saka.");
                    }
                } catch (err) {
                    btn.disabled = false;
                    statusPanel.innerHTML = "❌ <b>[Server Error]:</b> Connection reset. Dobara try karein.";
                }
            }
        </script>
    </body>
    </html>
    `);
});

// --- BACKEND ROUTE ---
app.post('/api/fetch-info', async (req, res) => {
    const { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL empty hai." });

    console.log(`[PROCESS] URL: ${url} | Type: ${type}`);

    try {
        // 1. TikTok Handler (TikWM)
        if (url.includes('tiktok.com')) {
            try {
                const tikRes = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url));
                const tikData = await tikRes.json();
                if (tikData && tikData.data) {
                    const isAudio = type === 'audio';
                    return res.json({
                        success: true,
                        title: tikData.data.title || "TikTok Media",
                        thumbnail: tikData.data.cover || "",
                        downloadUrl: isAudio ? (tikData.data.music || tikData.data.play) : (tikData.data.hdplay || tikData.data.play)
                    });
                }
            } catch(e) { console.error("TikWM Error:", e.message); }
        }

        // 2. Cobalt API Engine
        try {
            const cobaltRes = await fetch('https://api.cobalt.tools/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                body: JSON.stringify({
                    url: url,
                    downloadMode: type === 'audio' ? 'audio' : 'auto',
                    videoQuality: '1080'
                })
            });

            const cobaltData = await cobaltRes.json();
            console.log("[COBALT RESPONSE]:", cobaltData);

            if (cobaltData) {
                let dlUrl = cobaltData.url;
                if (!dlUrl && cobaltData.picker && cobaltData.picker.length > 0) {
                    dlUrl = cobaltData.picker[0].url;
                }
                
                if (dlUrl) {
                    return res.json({
                        success: true,
                        title: cobaltData.filename || "Extracted Stream",
                        thumbnail: "",
                        downloadUrl: dlUrl
                    });
                }
            }
        } catch(e) { console.error("Cobalt Error:", e.message); }

        // 3. YouTube Fallback Engine (Piped Nodes)
        const getYTId = (u) => {
            let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
            return m ? m[1] : null;
        };

        const ytId = getYTId(url);
        if (ytId) {
            const pipedNodes = [
                'https://pipedapi.kavin.rocks',
                'https://api.piped.private.coffee',
                'https://pipedapi.mha.fi',
                'https://pipedapi.adminforge.de',
                'https://piped-api.garudalinux.org'
            ];

            for (let node of pipedNodes) {
                try {
                    const pRes = await fetch(`${node}/streams/${ytId}`);
                    if (!pRes.ok) continue;
                    const pData = await pRes.json();

                    if (type === 'audio' && pData.audioStreams && pData.audioStreams.length > 0) {
                        return res.json({
                            success: true,
                            title: pData.title || "YouTube Audio",
                            thumbnail: pData.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                            downloadUrl: pData.audioStreams[0].url
                        });
                    }

                    if (pData.videoStreams && pData.videoStreams.length > 0) {
                        const stream = pData.videoStreams.find(s => s.format === 'MPEG-4' && s.quality) || pData.videoStreams[0];
                        return res.json({
                            success: true,
                            title: pData.title || "YouTube Video",
                            thumbnail: pData.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                            downloadUrl: stream.url
                        });
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        return res.json({ success: false, message: "Is link ki stream extract nahi ho saki. Dusri video ka link try karein." });

    } catch (err) {
        return res.json({ success: false, message: "Backend error: " + err.message });
    }
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
