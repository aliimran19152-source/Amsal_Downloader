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
            
            .quality-select { width: 100%; padding: 12px; background: #161b22; color: #fff; border: 1px solid #00f2fe; border-radius: 8px; font-size: 15px; margin-bottom: 10px; outline: none; }
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

            <!-- VIDEO SECTION (FORM REMOVED TO PREVENT PAGE RELOAD) -->
            <div id="video-sec" class="form-section active">
                <div>
                    <label>Target Media URL (Video)</label>
                    <input type="text" id="urlInput" placeholder="Paste Video Link (YT Shorts/Video, TikTok...)">
                    <button type="button" class="btn-fetch" id="btnVideoFetch" onclick="fetchVideoDetails()">Fetch Video Details & Qualities</button>
                </div>

                <div id="previewCard" class="preview-card">
                    <div id="videoTitle" class="preview-title">Video Title</div>
                    <img id="videoThumb" src="" alt="Thumbnail">
                    <label>Select Quality</label>
                    <select id="qualityDropdown" class="quality-select"></select>
                    <a id="startDownloadBtn" class="btn-download" href="#" target="_blank" rel="noopener">Download Selected Quality</a>
                </div>
            </div>

            <!-- AUDIO SECTION (FORM REMOVED TO PREVENT PAGE RELOAD) -->
            <div id="audio-sec" class="form-section">
                <div>
                    <label>Target Media URL (Audio / Sound Extract)</label>
                    <input type="text" id="audioUrlInput" placeholder="Paste link to extract pure HQ Audio/Music">
                    <button type="button" class="btn-audio-fetch" id="btnAudioFetch" onclick="fetchAudioDetails()">Fetch Audio Details & Bitrates</button>
                </div>

                <div id="audioPreviewCard" class="preview-card">
                    <div id="audioTitle" class="preview-title">Audio Title</div>
                    <img id="audioThumb" src="" alt="Thumbnail">
                    <label>Select Master Bitrate</label>
                    <select id="audioQualityDropdown" class="quality-select"></select>
                    <a id="startAudioDownloadBtn" class="btn-download" style="background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff;" href="#" target="_blank" rel="noopener">Extract Selected Audio</a>
                </div>
            </div>

            <div id="download-status" class="status"></div>
        </div>

        <script>
            let videoStreamsMap = {};
            let audioStreamsMap = {};

            function switchTab(sectionId, tabEl) {
                document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.getElementById(sectionId).classList.add('active');
                tabEl.classList.add('active');
                document.getElementById('download-status').style.display = 'none';
            }

            function getYTId(url) {
                let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                return match ? match[1] : null;
            }

            // --- VIDEO ENGINE ACTIONS ---
            async function fetchVideoDetails() {
                const urlInput = document.getElementById('urlInput');
                const url = urlInput.value.trim();
                const statusPanel = document.getElementById('download-status');
                const previewCard = document.getElementById('previewCard');
                const btn = document.getElementById('btnVideoFetch');
                
                if(!url) {
                    statusPanel.style.display = 'block';
                    statusPanel.innerHTML = "⚠️ <b>[Input Error]:</b> Pehle link paste karein!";
                    return;
                }

                previewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                btn.disabled = true;
                statusPanel.innerHTML = "🛰️ <b>[Analyzing Stream]:</b> Fetching media meta-data and sizing...";

                const ytId = getYTId(url);

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

                            if (data && data.videoStreams && data.videoStreams.length > 0) {
                                statusPanel.style.display = 'none';
                                document.getElementById('videoTitle').innerHTML = "🎬 <b>Title:</b> " + (data.title || "YouTube Video");
                                document.getElementById('videoThumb').src = data.thumbnailUrl || ("https://img.youtube.com/vi/" + ytId + "/hqdefault.jpg");
                                document.getElementById('videoThumb').style.display = 'block';

                                const dropdown = document.getElementById('qualityDropdown');
                                dropdown.innerHTML = "";
                                videoStreamsMap = {};

                                data.videoStreams.forEach((stream, idx) => {
                                    if(stream.url && stream.quality) {
                                        videoStreamsMap[idx] = stream.url;
                                        const option = document.createElement('option');
                                        option.value = idx;
                                        option.innerText = stream.quality + " (" + (stream.format || "MP4") + ")";
                                        dropdown.appendChild(option);
                                    }
                                });

                                document.getElementById('startDownloadBtn').href = videoStreamsMap[0] || "#";
                                previewCard.style.display = 'block';
                                success = true;
                                break;
                            }
                        } catch(err) { continue; }
                    }

                    btn.disabled = false;
                    if (!success) {
                        statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> Stream processing delayed. Click FETCH again.";
                    }
                    return;
                }

                // TikTok Handler
                if (url.includes('tiktok.com')) {
                    try {
                        let res = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url));
                        let data = await res.json();
                        btn.disabled = false;

                        if (data && data.data) {
                            statusPanel.style.display = 'none';
                            document.getElementById('videoTitle').innerHTML = "🎬 <b>Title:</b> " + (data.data.title || "TikTok Video");
                            document.getElementById('videoThumb').src = data.data.cover || "";
                            document.getElementById('videoThumb').style.display = data.data.cover ? 'block' : 'none';

                            const dropdown = document.getElementById('qualityDropdown');
                            dropdown.innerHTML = "<option value='hd'>HD Video (No Watermark)</option>";
                            
                            videoStreamsMap = { 'hd': data.data.hdplay || data.data.play };
                            document.getElementById('startDownloadBtn').href = videoStreamsMap['hd'];
                            previewCard.style.display = 'block';
                            return;
                        }
                    } catch(e) {}
                }

                btn.disabled = false;
                statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> Invalid or unsupported link.";
            }

            document.getElementById('qualityDropdown').addEventListener('change', (e) => {
                const selectedUrl = videoStreamsMap[e.target.value];
                if(selectedUrl) document.getElementById('startDownloadBtn').href = selectedUrl;
            });

            // --- AUDIO ENGINE ACTIONS ---
            async function fetchAudioDetails() {
                const audioUrlInput = document.getElementById('audioUrlInput');
                const url = audioUrlInput.value.trim();
                const statusPanel = document.getElementById('download-status');
                const audioPreviewCard = document.getElementById('audioPreviewCard');
                const btn = document.getElementById('btnAudioFetch');
                
                if(!url) {
                    statusPanel.style.display = 'block';
                    statusPanel.innerHTML = "⚠️ <b>[Input Error]:</b> Pehle audio link paste karein!";
                    return;
                }

                audioPreviewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                btn.disabled = true;
                statusPanel.innerHTML = "🎵 <b>[Audio Analyzer]:</b> Extracting soundtrack details and stream metadata...";

                const ytId = getYTId(url);

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

                            if (data && data.audioStreams && data.audioStreams.length > 0) {
                                statusPanel.style.display = 'none';
                                document.getElementById('audioTitle').innerHTML = "🎵 <b>Audio Title:</b> " + (data.title || "Extracted Audio Track");
                                document.getElementById('audioThumb').src = data.thumbnailUrl || ("https://img.youtube.com/vi/" + ytId + "/hqdefault.jpg");
                                document.getElementById('audioThumb').style.display = 'block';

                                const dropdown = document.getElementById('audioQualityDropdown');
                                dropdown.innerHTML = "";
                                audioStreamsMap = {};

                                data.audioStreams.forEach((stream, idx) => {
                                    if(stream.url) {
                                        audioStreamsMap[idx] = stream.url;
                                        const option = document.createElement('option');
                                        option.value = idx;
                                        option.innerText = "HQ Audio Track (" + (stream.mimeType || "Audio") + " - " + (stream.quality || "HQ") + ")";
                                        dropdown.appendChild(option);
                                    }
                                });

                                document.getElementById('startAudioDownloadBtn').href = audioStreamsMap[0] || "#";
                                audioPreviewCard.style.display = 'block';
                                success = true;
                                break;
                            }
                        } catch(err) { continue; }
                    }

                    btn.disabled = false;
                    if (!success) {
                        statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> Unable to extract audio track.";
                    }
                    return;
                }

                // TikTok Audio
                if (url.includes('tiktok.com')) {
                    try {
                        let res = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url));
                        let data = await res.json();
                        btn.disabled = false;

                        if (data && data.data && data.data.music) {
                            statusPanel.style.display = 'none';
                            document.getElementById('audioTitle').innerHTML = "🎵 <b>Audio Title:</b> " + (data.data.music_info?.title || "TikTok Audio");
                            document.getElementById('audioThumb').src = data.data.cover || "";
                            document.getElementById('audioThumb').style.display = data.data.cover ? 'block' : 'none';

                            const dropdown = document.getElementById('audioQualityDropdown');
                            dropdown.innerHTML = "<option value='music'>HQ Audio Track (MP3)</option>";
                            
                            audioStreamsMap = { 'music': data.data.music };
                            document.getElementById('startAudioDownloadBtn').href = audioStreamsMap['music'];
                            audioPreviewCard.style.display = 'block';
                            return;
                        }
                    } catch(e) {}
                }

                btn.disabled = false;
                statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> Invalid or unsupported audio link.";
            }

            document.getElementById('audioQualityDropdown').addEventListener('change', (e) => {
                const selectedUrl = audioStreamsMap[e.target.value];
                if(selectedUrl) document.getElementById('startAudioDownloadBtn').href = selectedUrl;
            });
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
