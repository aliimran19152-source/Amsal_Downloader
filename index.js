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
        <title>AMSAL STUDIOS - NATIVE DOWNLOADER</title>
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
            
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 12px; text-align: left; border-radius: 4px; font-size: 13px; display: none; margin-top: 15px; word-break: break-all; }
            .dl-btn { display: block; background: linear-gradient(45deg, #00ff87, #60efff); color: #000; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 10px; font-size: 14px; }
            .dl-btn-audio { background: linear-gradient(45deg, #ff9a9e, #fecfef); color: #000; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">NATIVE ENGINE v5.0</div>

            <form id="mediaForm">
                <label>Paste Link (YouTube Video/Shorts, TikTok)</label>
                <input type="text" id="targetUrl" placeholder="Paste link here..." required>
                <button type="submit" class="action-btn" id="submitBtn">FETCH MEDIA DOWNLOAD</button>
            </form>

            <div id="statusBox" class="status"></div>
            <div id="resultsArea" style="margin-top: 15px;"></div>
        </div>

        <script>
            document.getElementById('mediaForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                let rawUrl = document.getElementById('targetUrl').value.trim();
                const statusBox = document.getElementById('statusBox');
                const resultsArea = document.getElementById('resultsArea');
                const submitBtn = document.getElementById('submitBtn');

                statusBox.style.display = 'block';
                resultsArea.innerHTML = '';
                submitBtn.disabled = true;
                statusBox.innerHTML = "⚡ <b>[Processing Direct Stream]:</b> Please wait...";

                // Extract YouTube Video ID
                function getYTId(url) {
                    let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                    return match ? match[1] : null;
                }

                const ytId = getYTId(rawUrl);

                // 1. YOUTUBE HANDLER (NATIVE PIPED NODES)
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
                                
                                // Direct Video Stream
                                let video = data.videoStreams.find(s => s.format === 'MPEG-4' && s.quality) || data.videoStreams[0];
                                if (video && video.url) {
                                    html += "<a class='dl-btn' href='" + video.url + "' target='_blank' rel='noopener' download>⬇️ DOWNLOAD VIDEO (" + (video.quality || 'HD') + ")</a>";
                                }

                                // Direct Audio Stream
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

                    submitBtn.disabled = false;
                    if (!success) {
                        statusBox.innerHTML = "❌ <b>[Error]:</b> YouTube stream response delayed. Please click 'FETCH' again.";
                    }
                    return;
                }

                // 2. TIKTOK HANDLER (TIKWM NATIVE)
                if (rawUrl.includes('tiktok.com')) {
                    try {
                        let formData = new URLSearchParams();
                        formData.append('url', rawUrl);
                        formData.append('hd', '1');

                        let res = await fetch('https://www.tikwm.com/api/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: formData
                        });
                        let data = await res.json();

                        submitBtn.disabled = false;
                        if (data && data.data) {
                            statusBox.innerHTML = "✅ <b>Title:</b> " + (data.data.title || "TikTok Video Ready");
                            let dlUrl = data.data.hdplay || data.data.play;
                            let musicUrl = data.data.music;

                            let html = "<a class='dl-btn' href='" + dlUrl + "' target='_blank' rel='noopener' download>⬇️ DOWNLOAD TIKTOK VIDEO (NO WATERMARK)</a>";
                            if (musicUrl) {
                                html += "<a class='dl-btn dl-btn-audio' href='" + musicUrl + "' target='_blank' rel='noopener' download>🎵 DOWNLOAD AUDIO TRACK</a>";
                            }
                            resultsArea.innerHTML = html;
                            return;
                        }
                    } catch(e) {}
                }

                submitBtn.disabled = false;
                statusBox.innerHTML = "❌ <b>[Error]:</b> Sahi YouTube ya TikTok link paste karein.";
            });
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
