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
        <title>AMSAL STUDIOS - CORE ENGINE</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #161b22; padding: 25px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0,242,254,0.15); }
            h1 { color: #00f2fe; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-size: 24px; }
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">PREMIUM WORKSTATION v2.0</div>

            <div class="tab-container">
                <button class="tab-btn active" id="vTab" onclick="switchMode('video')">📹 Video Engine</button>
                <button class="tab-btn" id="aTab" onclick="switchMode('audio')">🎵 Audio Engine</button>
            </div>

            <form id="mediaForm">
                <label>Target Media URL (YouTube, Insta, TikTok)</label>
                <input type="text" id="targetUrl" placeholder="Paste link here..." required>

                <div id="videoOptions">
                    <label>Select Video Quality</label>
                    <select id="videoQuality">
                        <option value="max">Best Available / Auto Quality</option>
                        <option value="1080">1080p Full HD</option>
                        <option value="720">720p HD</option>
                        <option value="480">480p Standard</option>
                        <option value="360">360p Low (Data Saver)</option>
                    </select>
                </div>

                <div id="audioOptions" style="display:none;">
                    <label>Select Audio Format / Quality</label>
                    <select id="audioQuality">
                        <option value="mp3">MP3 Format (High Quality Audio)</option>
                        <option value="best">Original Audio Stream</option>
                    </select>
                </div>

                <button type="submit" class="action-btn" id="submitBtn">FETCH VIDEO DOWNLOAD</button>
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
                document.getElementById('submitBtn').innerText = mode === 'video' ? 'FETCH VIDEO DOWNLOAD' : 'EXTRACT AUDIO TRACK';
                document.getElementById('statusBox').style.display = 'none';
            }

            document.getElementById('mediaForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('targetUrl').value;
                const quality = currentMode === 'video' ? document.getElementById('videoQuality').value : document.getElementById('audioQuality').value;
                const statusBox = document.getElementById('statusBox');

                statusBox.style.display = 'block';
                statusBox.innerHTML = "⚡ <b>[Bypassing Cloud Firewalls]:</b> Extracting high-speed direct stream...";

                try {
                    const res = await fetch('/api/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, mode: currentMode, quality })
                    });
                    const data = await res.json();

                    if (data.success) {
                        statusBox.innerHTML = "✅ <b>[Extraction Successful]:</b><br><a class='dl-link' href='" + data.url + "' target='_blank' download>⬇️ DOWNLOAD " + (currentMode.toUpperCase()) + " FILE NOW</a>";
                    } else {
                        statusBox.innerHTML = "❌ <b>[Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusBox.innerHTML = "❌ <b>[Network Timeout]:</b> Server temporarily busy, please click again.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

// Powerful Multi-Engine Pipeline
app.post('/api/process', async (req, res) => {
    const { url, mode, quality } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    // Public API Nodes list
    const nodeCluster = [
        'https://cobalt.api.redna2.xyz',
        'https://api.cobalt.tools',
        'https://co.wuk.sh',
        'https://cobalt-api.kwippy.com'
    ];

    const payload = {
        url: url,
        videoQuality: quality === 'max' ? 'max' : quality,
        isAudioOnly: mode === 'audio',
        aFormat: 'mp3'
    };

    // Attempt through Primary Nodes
    for (let instance of nodeCluster) {
        try {
            const response = await axios.post(`${instance}/`, payload, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                timeout: 8000
            });

            if (response.data && response.data.url) {
                return res.json({ success: true, url: response.data.url });
            }
        } catch (e) {
            continue; // Failover to next node instantly
        }
    }

    // Direct Invidious Fallback Proxy for YouTube Links if Cloud IPs are strictly blocked
    if (url.includes('youtu')) {
        try {
            const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/shorts\/))([^?&]+)/);
            if (videoIdMatch && videoIdMatch[1]) {
                const vid = videoIdMatch[1];
                const invidiousInstances = [
                    'https://invidious.nerdvpn.de',
                    'https://inv.tux.pizza',
                    'https://invidious.drgns.space'
                ];

                for (let inv of invidiousInstances) {
                    try {
                        const invRes = await axios.get(`${inv}/api/v1/videos/${vid}`, { timeout: 6000 });
                        if (invRes.data) {
                            if (mode === 'audio' && invRes.data.adaptiveFormats) {
                                const audioStream = invRes.data.adaptiveFormats.find(f => f.type.includes('audio'));
                                if (audioStream) return res.json({ success: true, url: audioStream.url });
                            }
                            if (invRes.data.formatStreams && invRes.data.formatStreams.length > 0) {
                                const stream = invRes.data.formatStreams.reverse()[0];
                                return res.json({ success: true, url: stream.url });
                            }
                        }
                    } catch (err) {
                        continue;
                    }
                }
            }
        } catch (err) {}
    }

    res.json({ 
        success: false, 
        message: "Render Cloud IP restricted by YouTube. Please click 'Fetch' once again to re-route via back-up proxy." 
    });
});

app.listen(PORT, () => console.log(`Engine running on ${PORT}`));
