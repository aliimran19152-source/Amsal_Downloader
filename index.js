const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Front-End Interface
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS - UNIVERSAL WORKSTATION</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #161b22; padding: 25px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0,242,254,0.15); }
            h1 { color: #00f2fe; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-size: 22px; }
            .badge { background: #ffbc00; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 10px; display: inline-block; margin-bottom: 15px; }
            
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
            <div class="badge">PRO ENGINE v3.5</div>
            <div class="platform-icons">YouTube | TikTok | Instagram | Pinterest | X</div>

            <div class="tab-container">
                <button class="tab-btn active" id="vTab" onclick="switchMode('video')">📹 Video Engine</button>
                <button class="tab-btn" id="aTab" onclick="switchMode('audio')">🎵 Audio Engine</button>
            </div>

            <form id="mediaForm">
                <label>Target Media Link</label>
                <input type="text" id="targetUrl" placeholder="Paste link here..." required>

                <div id="videoOptions">
                    <label>Select Video Quality Preference</label>
                    <select id="videoQuality">
                        <option value="max">Best Quality Available (Auto / HD)</option>
                        <option value="1080">1080p Full HD</option>
                        <option value="720">720p HD</option>
                        <option value="480">480p SD</option>
                    </select>
                </div>

                <div id="audioOptions" style="display:none;">
                    <label>Audio Export Format</label>
                    <select id="audioQuality">
                        <option value="mp3">MP3 Format (High Bitrate)</option>
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
                statusBox.innerHTML = "⚡ <b>[Processing Stream]:</b> Cleaning URL & Extracting Media Link...";

                try {
                    const res = await fetch('/api/fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, mode: currentMode, quality })
                    });
                    const data = await res.json();

                    if (data.success) {
                        statusBox.innerHTML = "✅ <b>[Success]:</b><br><a class='dl-link' href='" + data.downloadUrl + "' target='_blank' rel='noopener noreferrer' download>⬇️ DOWNLOAD " + (currentMode.toUpperCase()) + " NOW</a>";
                    } else {
                        statusBox.innerHTML = "❌ <b>[Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusBox.innerHTML = "❌ <b>[Timeout]:</b> Connection lost. Try again.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

// Production Backend Router
app.post('/api/fetch', async (req, res) => {
    let { url, mode, quality } = req.body;
    if (!url) return res.json({ success: false, message: "URL is required" });

    // 1. Clean tracking parameters from URL
    try {
        let parsed = new URL(url.trim());
        parsed.searchParams.delete('si');
        parsed.searchParams.delete('feature');
        url = parsed.toString();
    } catch(e) {}

    // 2. Dedicated Engine for TikTok
    if (url.includes('tiktok.com')) {
        try {
            const ttRes = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({ 'url': url, 'hd': 1 }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
            });
            if (ttRes.data && ttRes.data.data) {
                const dl = mode === 'audio' ? ttRes.data.data.music : (ttRes.data.data.hdplay || ttRes.data.data.play);
                return res.json({ success: true, downloadUrl: dl });
            }
        } catch(err) {}
    }

    // 3. Robust Multi-Cluster API Fallback (Works for YouTube, IG, Pinterest, X)
    const instances = [
        'https://api.cobalt.tools',
        'https://cobalt-api.kwippy.com',
        'https://co.wuk.sh',
        'https://cobalt.api.redna2.xyz'
    ];

    const bodyData = {
        url: url,
        videoQuality: quality === 'max' ? 'max' : quality,
        isAudioOnly: mode === 'audio',
        aFormat: 'mp3'
    };

    for (let instance of instances) {
        try {
            const response = await axios.post(`${instance}/`, bodyData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 8000
            });

            if (response.data && response.data.url) {
                return res.json({ success: true, downloadUrl: response.data.url });
            }
        } catch (e) {
            continue; // Failover to next instance
        }
    }

    // 4. Secondary Backup Scraper (Vkdown)
    try {
        const vkRes = await axios.get(`https://api.vkrdown.com/api/item?url=${encodeURIComponent(url)}`, { timeout: 7000 });
        if (vkRes.data && (vkRes.data.url || (vkRes.data.data && vkRes.data.data.url))) {
            const dl = vkRes.data.url || vkRes.data.data.url;
            return res.json({ success: true, downloadUrl: dl });
        }
    } catch(err) {}

    return res.json({ 
        success: false, 
        message: "Server instances busy right now. Please hit 'FETCH' once more to retry." 
    });
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
