const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS - ZERO-RELOAD ENGINE</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #161b22; padding: 25px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0,242,254,0.15); }
            h1 { color: #00f2fe; margin-bottom: 5px; text-transform: uppercase; font-size: 22px; }
            .badge { background: #ffbc00; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 10px; display: inline-block; margin-bottom: 20px; }
            
            label { display: block; text-align: left; font-size: 13px; font-weight: bold; color: #8b949e; margin-bottom: 6px; }
            input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; font-size: 14px; outline: none; }
            input:focus { border-color: #00f2fe; }

            button.action-btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; }
            button:disabled { opacity: 0.5; cursor: not-allowed; }
            
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 12px; text-align: left; border-radius: 4px; font-size: 13px; display: none; margin-top: 15px; word-break: break-all; }
            .dl-btn { display: block; background: linear-gradient(45deg, #00ff87, #60efff); color: #000; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 10px; font-size: 14px; }
            .dl-btn-audio { background: linear-gradient(45deg, #ff9a9e, #fecfef); color: #000; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">STABLE ENGINE v6.0</div>

            <div>
                <label>Paste Link (YouTube Shorts/Video, TikTok)</label>
                <input type="text" id="targetUrl" placeholder="Paste link here...">
                <button type="button" class="action-btn" id="submitBtn" onclick="processMedia()">FETCH MEDIA DOWNLOAD</button>
            </div>

            <div id="statusBox" class="status"></div>
            <div id="resultsArea" style="margin-top: 15px;"></div>
        </div>

        <script>
            async function processMedia() {
                const rawUrlInput = document.getElementById('targetUrl');
                let rawUrl = rawUrlInput.value.trim();
                const statusBox = document.getElementById('statusBox');
                const resultsArea = document.getElementById('resultsArea');
                const submitBtn = document.getElementById('submitBtn');

                if (!rawUrl) {
                    alert("Pehle link paste karein!");
                    return;
                }

                statusBox.style.display = 'block';
                resultsArea.innerHTML = '';
                submitBtn.disabled = true;
                statusBox.innerHTML = "⚡ <b>[Extracting Stream]:</b> Please wait...";

                try {
                    // YouTube Extraction Logic
                    function getYTId(url) {
                        let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                        return match ? match[1] : null;
                    }

                    const ytId = getYTId(rawUrl);

                    if (ytId) {
                        const pipedNodes = [
                            'https://pipedapi.kavin.rocks',
                            'https://api.piped.private.coffee',
                            'https://pipedapi.mha.fi',
                            'https://pipedapi.adminforge.de'
                        ];

                        let success = false;
                        for (let node of pipedNodes) {
                            try {
                                let res = await fetch(node + '/streams/' + ytId);
                                if (!res.ok) continue;
                                let data = await res.json();

                                if (data && (data.videoStreams || data.audioStreams)) {
                                    statusBox.innerHTML = "✅ <b>Title:</b> " + (data.title || "YouTube Media Ready");
                                    let html = "";

                                    let video = data.videoStreams.find(s => s.format === 'MPEG-4' && s.quality) || data.videoStreams[0];
                                    if (video && video.url) {
                                        html += "<a class='dl-btn' href='" + video.url + "' target='_blank' rel='noopener' download>⬇️ DOWNLOAD VIDEO (" + (video.quality || 'HD') + ")</a>";
                                    }

                                    let audio = data.audioStreams && data.audioStreams[0];
                                    if (audio && audio.url) {
                                        html += "<a class='dl-btn dl-btn-audio' href='" + audio.url + "' target='_blank' rel='noopener' download>🎵 DOWNLOAD AUDIO TRACK</a>";
                                    }

                                    resultsArea.innerHTML = html;
                                    success = true;
                                    break;
                                }
                            } catch(err) {
                                continue;
                            }
                        }

                        if (!success) {
                            statusBox.innerHTML = "❌ <b>[Error]:</b> YouTube servers busy. Try clicking FETCH again.";
                        }
                        submitBtn.disabled = false;
                        return;
                    }

                    // TikTok Extraction Logic (Supports vm.tiktok.com short links)
                    if (rawUrl.includes('tiktok.com')) {
                        let res = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(rawUrl));
                        let data = await res.json();

                        if (data && data.data) {
                            statusBox.innerHTML = "✅ <b>Title:</b> " + (data.data.title || "TikTok Media Ready");
                            let dlUrl = data.data.hdplay || data.data.play;
                            let musicUrl = data.data.music;

                            let html = "<a class='dl-btn' href='" + dlUrl + "' target='_blank' rel='noopener' download>⬇️ DOWNLOAD TIKTOK VIDEO (NO WATERMARK)</a>";
                            if (musicUrl) {
                                html += "<a class='dl-btn dl-btn-audio' href='" + musicUrl + "' target='_blank' rel='noopener' download>🎵 DOWNLOAD AUDIO TRACK</a>";
                            }
                            resultsArea.innerHTML = html;
                            submitBtn.disabled = false;
                            return;
                        }
                    }

                    statusBox.innerHTML = "❌ <b>[Error]:</b> Sahi YouTube ya TikTok link paste karein.";
                } catch(err) {
                    statusBox.innerHTML = "❌ <b>[Error]:</b> Request fail ho gayi. Phir se try karein.";
                } finally {
                    submitBtn.disabled = false;
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
