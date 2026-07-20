const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Auto cleanup temporary downloads older than 1 hour
setInterval(() => {
    fs.readdir(TMP_DIR, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(TMP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && (now - stats.mtimeMs) > 3600000) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 1800000);

let YTDLP = 'yt-dlp';
if (fs.existsSync(path.join(__dirname, 'yt-dlp'))) {
    YTDLP = path.join(__dirname, 'yt-dlp');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// High-reliability flags to bypass YouTube datacenter blocking & extract raw streams
const ENGINE_FLAGS = '--no-check-certificate --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" --extractor-args "youtube:player_client=mweb,android,ios"';

function cleanUrl(rawUrl) {
    if (!rawUrl) return '';
    let clean = rawUrl.trim();
    if (clean.includes('youtu.be/')) {
        const id = clean.split('youtu.be/')[1].split('?')[0].split('&')[0];
        return `https://www.youtube.com/watch?v=${id}`;
    }
    if (clean.includes('youtube.com/shorts/')) {
        const id = clean.split('youtube.com/shorts/')[1].split('?')[0].split('&')[0];
        return `https://www.youtube.com/watch?v=${id}`;
    }
    return clean.split('?si=')[0].split('?is_from_webapp=')[0];
}

// --- FRONTEND ROUTE ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS - MEDIA ENGINE</title>
        <style>
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 650px; margin: 30px auto; background: #161b22; padding: 30px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0, 242, 254, 0.2); }
            h1 { color: #00f2fe; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .badge { background: #ffbc00; color: #000; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-bottom: 25px; }
            label { display: block; text-align: left; font-weight: bold; margin-bottom: 8px; color: #8b949e; font-size: 14px; text-transform: uppercase; }
            input[type="text"] { width: 100%; padding: 14px; margin-bottom: 20px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; box-sizing: border-box; font-size: 15px; }
            input[type="text"]:focus { border-color: #00f2fe; outline: none; box-shadow: 0 0 8px rgba(0, 242, 254, 0.5); }
            button { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; margin-bottom: 15px; text-transform: uppercase; }
            .btn-fetch { background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; }
            .btn-audio-fetch { background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff; }
            .btn-download { background: linear-gradient(45deg, #00ff87, #60efff); color: #000; margin-top: 10px; }
            button:hover { transform: scale(1.02); opacity: 0.9; }
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 15px; text-align: left; border-radius: 4px; font-size: 14px; display: none; margin-top: 15px; line-height: 1.5; }
            .preview-card { background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 15px; margin-top: 20px; display: none; text-align: left; }
            .preview-card img { width: 100%; border-radius: 8px; margin-bottom: 12px; border: 1px solid #444; display: block; max-height: 300px; object-fit: cover; }
            .preview-title { font-weight: bold; font-size: 16px; color: #fff; margin-bottom: 15px; line-height: 1.4; background: #21262d; padding: 10px; border-radius: 6px; border-left: 3px solid #ffbc00; }
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

            <!-- VIDEO SECTION -->
            <div id="video-sec" class="form-section active">
                <form id="fetchForm">
                    <label>Target Media URL (Video)</label>
                    <input type="text" id="urlInput" placeholder="Paste Link (YouTube, Insta, TikTok, Facebook, etc.)" required>
                    <button type="submit" class="btn-fetch">Fetch Video Qualities</button>
                </form>

                <div id="previewCard" class="preview-card">
                    <div id="videoTitle" class="preview-title">Video Title</div>
                    <img id="videoThumb" src="" alt="Thumbnail">
                    <label>Select Quality</label>
                    <select id="qualityDropdown" class="quality-select"></select>
                    <button id="startDownloadBtn" class="btn-download">Download Selected Video</button>
                </div>
            </div>

            <!-- AUDIO SECTION -->
            <div id="audio-sec" class="form-section">
                <form id="audioFetchForm">
                    <label>Target Media URL (Audio Extract)</label>
                    <input type="text" id="audioUrlInput" placeholder="Paste link to extract pure Audio" required>
                    <button type="submit" class="btn-audio-fetch">Fetch Audio Bitrates</button>
                </form>

                <div id="audioPreviewCard" class="preview-card">
                    <div id="audioTitle" class="preview-title">Audio Title</div>
                    <img id="audioThumb" src="" alt="Thumbnail">
                    <label>Select Audio Quality</label>
                    <select id="audioQualityDropdown" class="quality-select"></select>
                    <button id="startAudioDownloadBtn" class="btn-download" style="background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff;">Extract Audio</button>
                </div>
            </div>

            <div id="download-status" class="status"></div>
        </div>

        <script>
            let currentVideoUrl = "";
            let currentAudioUrl = "";

            function switchTab(sectionId, tabEl) {
                document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.getElementById(sectionId).classList.add('active');
                tabEl.classList.add('active');
                document.getElementById('download-status').style.display = 'none';
            }

            document.getElementById('fetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('urlInput').value;
                currentVideoUrl = url;
                const statusPanel = document.getElementById('download-status');
                const previewCard = document.getElementById('previewCard');
                
                previewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🛰️ <b>[Analyzing Stream]:</b> Fetching video details...";
                
                try {
                    const response = await fetch('/api/fetch-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type: 'video' })
                    });
                    const data = await response.json();
                    
                    if(data.success) {
                        statusPanel.style.display = 'none';
                        document.getElementById('videoTitle').innerHTML = "🎬 <b>Title:</b> " + data.title;
                        if(data.thumbnail) {
                            document.getElementById('videoThumb').src = data.thumbnail;
                            document.getElementById('videoThumb').style.display = 'block';
                        } else {
                            document.getElementById('videoThumb').style.display = 'none';
                        }
                        
                        const dropdown = document.getElementById('qualityDropdown');
                        dropdown.innerHTML = "";
                        
                        data.formats.forEach(f => {
                            const option = document.createElement('option');
                            option.value = f.id;
                            option.innerText = f.label;
                            if(f.disabled) option.disabled = true;
                            dropdown.appendChild(option);
                        });
                        
                        previewCard.style.display = 'block';
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Server issue or network block.";
                }
            });

            document.getElementById('startDownloadBtn').addEventListener('click', async () => {
                const formatId = document.getElementById('qualityDropdown').value;
                const statusPanel = document.getElementById('download-status');
                
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "💎 <b>[Processing]:</b> Downloading video stream...";
                
                try {
                    const response = await fetch('/api/prepare-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentVideoUrl, formatId })
                    });
                    const data = await response.json();
                    if(data.success) {
                        statusPanel.innerHTML = "🔥 <b>[Completed]:</b> Download starting...";
                        window.location.href = "/api/chrome-popup?file=" + encodeURIComponent(data.filename);
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Extraction Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Connection failed.";
                }
            });

            document.getElementById('audioFetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('audioUrlInput').value;
                currentAudioUrl = url;
                const statusPanel = document.getElementById('download-status');
                const audioPreviewCard = document.getElementById('audioPreviewCard');
                
                audioPreviewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🎵 <b>[Analyzing]:</b> Extracting audio track info...";
                
                try {
                    const response = await fetch('/api/fetch-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type: 'audio' })
                    });
                    const data = await response.json();
                    
                    if(data.success) {
                        statusPanel.style.display = 'none';
                        document.getElementById('audioTitle').innerHTML = "🎵 <b>Title:</b> " + data.title;
                        if(data.thumbnail) {
                            document.getElementById('audioThumb').src = data.thumbnail;
                            document.getElementById('audioThumb').style.display = 'block';
                        } else {
                            document.getElementById('audioThumb').style.display = 'none';
                        }
                        
                        const dropdown = document.getElementById('audioQualityDropdown');
                        dropdown.innerHTML = "";
                        
                        data.formats.forEach(f => {
                            const option = document.createElement('option');
                            option.value = f.id;
                            option.innerText = f.label;
                            dropdown.appendChild(option);
                        });
                        
                        audioPreviewCard.style.display = 'block';
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Fetch Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Connection failed.";
                }
            });

            document.getElementById('startAudioDownloadBtn').addEventListener('click', async () => {
                const statusPanel = document.getElementById('download-status');
                
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🎛️ <b>[Processing]:</b> Extracting audio file...";
                
                try {
                    const response = await fetch('/api/prepare-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentAudioUrl })
                    });
                    const data = await response.json();
                    if(data.success) {
                        statusPanel.innerHTML = "🔥 <b>[Completed]:</b> Download starting...";
                        window.location.href = "/api/chrome-popup?file=" + encodeURIComponent(data.filename);
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Extraction Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Connection error.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

// --- API ROUTE: FETCH METADATA ---
app.post('/api/fetch-info', (req, res) => {
    let { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const targetUrl = cleanUrl(url);
    const command = `${YTDLP} ${ENGINE_FLAGS} --dump-json "${targetUrl}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 30 }, (err, stdout) => {
        if (err || !stdout) {
            return res.json({ success: false, message: "Could not parse media link. Verify URL or try again." });
        }
        
        try {
            const meta = JSON.parse(stdout);
            const rawFormats = meta.formats || [];
            
            if (type === 'audio') {
                return res.json({
                    success: true,
                    title: meta.title || "Extracted Audio Track",
                    thumbnail: meta.thumbnail || "",
                    formats: [{ id: "bestaudio", label: "Best Available Audio Track (HQ)" }]
                });
            }

            // --- FLEXIBLE QUALITY PARSING ---
            let heightsFound = new Set();
            rawFormats.forEach(f => {
                if (f.height && f.height > 0) {
                    heightsFound.add(f.height);
                }
            });

            const sortedHeights = Array.from(heightsFound).sort((a, b) => b - a);
            let availableOptions = [];

            if (sortedHeights.length > 0) {
                sortedHeights.forEach(h => {
                    let label = `${h}p Quality`;
                    if (h >= 2160) label = `4K UHD (${h}p)`;
                    else if (h >= 1440) label = `2K QuadHD (${h}p)`;
                    else if (h >= 1080) label = `${h}p Full HD`;
                    else if (h >= 720) label = `${h}p HD`;

                    const selector = `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`;
                    availableOptions.push({ id: selector, label: label, disabled: false });
                });
            }

            // Always provide high-compatibility fallback options so dropdown is never empty/unavailable
            availableOptions.push({ id: "bestvideo+bestaudio/best", label: "Best Available (Highest Resolution)", disabled: false });
            availableOptions.push({ id: "worstvideo+bestaudio/worst", label: "Fast Download (Low Resolution)", disabled: false });

            res.json({
                success: true,
                title: meta.title || "External Video Stream",
                thumbnail: meta.thumbnail || "",
                formats: availableOptions
            });

        } catch (e) {
            res.json({ success: false, message: "Error compiling video stream options." });
        }
    });
});

// --- API ROUTE: PREPARE VIDEO DOWNLOAD ---
app.post('/api/prepare-video', (req, res) => {
    const { url, formatId } = req.body;
    if (!url || !formatId || formatId === "disabled") return res.json({ success: false, message: "Invalid video selection." });

    const targetUrl = cleanUrl(url);
    const outputPath = path.join(TMP_DIR, `video_${Date.now()}.mp4`);
    const cmd = `${YTDLP} ${ENGINE_FLAGS} -f "${formatId}" -o "${outputPath}" "${targetUrl}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            // High reliability Fallback
            const fallbackCmd = `${YTDLP} ${ENGINE_FLAGS} -f "best" -o "${outputPath}" "${targetUrl}"`;
            exec(fallbackCmd, (fErr) => {
                if (fErr || !fs.existsSync(outputPath)) {
                    return res.json({ success: false, message: "Download failed. Video might be restricted or unavailable." });
                }
                res.json({ success: true, filename: path.basename(outputPath) });
            });
            return;
        }
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- API ROUTE: PREPARE AUDIO DOWNLOAD ---
app.post('/api/prepare-audio', (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid URL." });

    const targetUrl = cleanUrl(url);
    const outputPath = path.join(TMP_DIR, `audio_${Date.now()}.m4a`);
    const cmd = `${YTDLP} ${ENGINE_FLAGS} -f "bestaudio/best" -o "${outputPath}" "${targetUrl}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            return res.json({ success: false, message: "Audio extraction failed." });
        }
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- API ROUTE: SERVE FILE POPUP AND CLEANUP ---
app.get('/api/chrome-popup', (req, res) => {
    const fileName = req.query.file;
    if (!fileName || fileName.includes('..')) return res.status(400).send("Bad request.");
    
    const filePath = path.join(TMP_DIR, fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            try { fs.unlinkSync(filePath); } catch(e){}
        });
    } else {
        res.status(404).send("File expired or unavailable.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AMSAL STUDIOS WORKSTATION ONLINE ON PORT: ${PORT}`);
});
