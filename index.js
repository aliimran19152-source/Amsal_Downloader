const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS - UNIVERSAL MEDIA ENGINE</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #161b22; padding: 25px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0,242,254,0.15); }
            h1 { color: #00f2fe; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-size: 22px; }
            .badge { background: #ffbc00; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 10px; display: inline-block; margin-bottom: 20px; }
            
            .tab-container { display: flex; gap: 10px; margin-bottom: 20px; }
            .tab-btn { flex: 1; padding: 12px; background: #21262d; border: 1px solid #30363d; color: #8b949e; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s; }
            .tab-btn.active { background: #00f2fe; color: #000; border-color: #00f2fe; }

            label { display: block; text-align: left; font-size: 13px; font-weight: bold; color: #8b949e; margin-bottom: 6px; }
            input, select { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; font-size: 14px; outline: none; }
            input:focus, select:focus { border-color: #00f2fe; }

            button.action-btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; transition: 0.2s; }
            button.action-btn:hover { opacity: 0.9; transform: scale(0.99); }
            
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 12px; text-align: left; border-radius: 4px; font-size: 13px; display: none; margin-top: 15px; word-break: break-all; }
            .dl-link { display: block; background: linear-gradient(45deg, #00ff87, #60efff); color: #000; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 10px; font-size: 15px; }
            .platform-icons { font-size: 12px; color: #8b949e; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">UNIVERSAL DOWNLOADER v3.0</div>
            <div class="platform-icons">Supports: YouTube | TikTok | Instagram | Pinterest | X (Twitter)</div>

            <div class="tab-container">
                <button class="tab-btn active" id="vTab" onclick="switchMode('video')">📹 Video Engine</button>
                <button class="tab-btn" id="aTab" onclick="switchMode('audio')">🎵 Audio Engine</button>
            </div>

            <form id="mediaForm">
                <label>Target Media Link</label>
                <input type="text" id="targetUrl" placeholder="Paste link here..." required>

                <div id="videoOptions">
                    <label>Select Quality Preference</label>
                    <select id="videoQuality">
                        <option value="best">Best HD Quality (Auto Select)</option>
                        <option value="1080">1080p Full HD</option>
                        <option value="720">720p HD</option>
                        <option value="480">480p SD</option>
                        <option value="360">360p Low</option>
                    </select>
                </div>

                <div id="audioOptions" style="display:none;">
                    <label>Select Audio Preference</label>
                    <select id="audioQuality">
                        <option value="mp3">MP3 / Best Audio Track</option>
                    </select>
                </div>

                <button type="submit" class="action-btn" id="submitBtn">FETCH MEDIA DOWNLOAD</button>
            </form>

            <div id="statusBox" class="status"></div>
        </div>

        <script>
            let currentMode = 'video';

            function switchMode(mode) {
                currentMode = mode;
                document.getElementById('vTab').classList.toggle('active', mode === 'video');
                document.getElementById('aTab').classList.toggle('active', mode === 'audio');
                document.getElementById('videoOptions').style.display = mode === 'video' ? 'block' : 'none';
                document.getElementById('audioOptions').style.display = mode === 'audio' ? 'block' : 'none';
                document.getElementById('submitBtn').innerText = mode === 'video' ? 'FETCH MEDIA DOWNLOAD' : 'EXTRACT AUDIO TRACK';
                document.getElementById('statusBox').style.display = 'none';
            }

            document.getElementById('mediaForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('targetUrl').value;
                const quality = currentMode === 'video' ? document.getElementById('videoQuality').value : 'mp3';
                const statusBox = document.getElementById('statusBox');

                statusBox.style.display = 'block';
                statusBox.innerHTML = "⚡ <b>[Extracting Stream]:</b> Processing multi-platform route...";

                try {
                    const res = await fetch('/api/fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, mode: currentMode, quality })
                    });
                    const data = await res.json();

                    if (data.success) {
                        statusBox.innerHTML = "✅ <b>[Link Ready]:</b><br><a class='dl-link' href='" + data.downloadUrl + "' target='_blank' rel='noopener noreferrer' download>⬇️ DOWNLOAD " + (currentMode.toUpperCase()) + " FILE NOW</a>";
                    } else {
                        statusBox.innerHTML = "❌ <b>[Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusBox.innerHTML = "❌ <b>[Timeout]:</b> Connection busy, please click again.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

// MULTI-PLATFORM CONTROLLER
app.post('/api/fetch', async (req, res) => {
    const { url, mode, quality } = req.body;
    if (!url) return res.json({ success: false, message: "URL required." });

    const cleanUrl = url.trim();

    try {
        // 1. TIKTOK ROUTE
        if (cleanUrl.includes('tiktok.com')) {
            const ttRes = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({
                'url': cleanUrl,
                'hd': 1
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });

            if (ttRes.data && ttRes.data.data) {
                const dl = mode === 'audio' ? ttRes.data.data.music : (ttRes.data.data.hdplay || ttRes.data.data.play);
                return res.json({ success: true, downloadUrl: dl });
            }
        }

        // 2. YOUTUBE ROUTE (VIA PIPED API - NO IP BLOCKS)
        if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
            let videoId = "";
            if (cleanUrl.includes('youtu.be/')) {
                videoId = cleanUrl.split('youtu.be/')[1].split('?')[0];
            } else if (cleanUrl.includes('shorts/')) {
                videoId = cleanUrl.split('shorts/')[1].split('?')[0];
            } else if (cleanUrl.includes('watch?v=')) {
                videoId = cleanUrl.split('watch?v=')[1].split('&')[0];
            }

            if (videoId) {
                const pipedNodes = [
                    'https://pipedapi.kavin.rocks',
                    'https://api.piped.private.coffee',
                    'https://pipedapi.mha.fi'
                ];

                for (let node of pipedNodes) {
                    try {
                        const pRes = await axios.get(`${node}/streams/${videoId}`, { timeout: 6000 });
                        if (pRes.data) {
                            if (mode === 'audio' && pRes.data.audioStreams.length > 0) {
                                return res.json({ success: true, downloadUrl: pRes.data.audioStreams[0].url });
                            }
                            
                            const videoStreams = pRes.data.videoStreams || [];
                            if (videoStreams.length > 0) {
                                // Filter audio+video streams or take highest quality video
                                let chosen = videoStreams.find(s => s.quality === quality) || videoStreams[0];
                                return res.json({ success: true, downloadUrl: chosen.url });
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }

        // 3. INSTAGRAM / PINTEREST / X (TWITTER) UNIVERSAL ROUTE
        const globalApis = [
            `https://api.vkrdown.com/api/item?url=${encodeURIComponent(cleanUrl)}`,
            `https://downloader.freemediagenerator.com/api/get-download-link?url=${encodeURIComponent(cleanUrl)}`
        ];

        for (let gApi of globalApis) {
            try {
                const gRes = await axios.get(gApi, { timeout: 7000 });
                if (gRes.data) {
                    let dl = gRes.data.url || gRes.data.downloadUrl;
                    if (!dl && gRes.data.data && gRes.data.data.url) dl = gRes.data.data.url;
                    if (dl) return res.json({ success: true, downloadUrl: dl });
                }
            } catch (e) {
                continue;
            }
        }

        res.json({ success: false, message: "Link extract nahi ho saka. Sahi public video URL paste karein." });

    } catch (err) {
        res.json({ success: false, message: "Processing error. Try again." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
