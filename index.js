const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const app = express();
// Dynamic port allocation for Render deployment
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

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
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 650px; margin: 40px auto; background: #161b22; padding: 30px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0, 242, 254, 0.2); }
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
                    <input type="text" id="urlInput" placeholder="Paste Video Link (YT, Insta, TikTok, Pinterest...)" required>
                    <button type="submit" class="btn-fetch">Fetch Video Details & Qualities</button>
                </form>

                <div id="previewCard" class="preview-card">
                    <div id="videoTitle" class="preview-title">Video Title</div>
                    <img id="videoThumb" src="" alt="Thumbnail">
                    <label>Select Premium Quality</label>
                    <select id="qualityDropdown" class="quality-select"></select>
                    <button id="startDownloadBtn" class="btn-download">Download Selected Quality</button>
                </div>
            </div>

            <!-- AUDIO SECTION -->
            <div id="audio-sec" class="form-section">
                <form id="audioFetchForm">
                    <label>Target Media URL (Audio / Sound Extract)</label>
                    <input type="text" id="audioUrlInput" placeholder="Paste link to extract pure HQ Audio/Music" required>
                    <button type="submit" class="btn-audio-fetch">Fetch Audio Details & Bitrates</button>
                </form>

                <div id="audioPreviewCard" class="preview-card">
                    <div id="audioTitle" class="preview-title">Audio Title</div>
                    <img id="audioThumb" src="" alt="Thumbnail">
                    <label>Select Master Bitrate</label>
                    <select id="audioQualityDropdown" class="quality-select"></select>
                    <button id="startAudioDownloadBtn" class="btn-download" style="background: linear-gradient(45deg, #ff007f, #7f00ff); color: #fff;">Extract Selected Audio</button>
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

            // --- VIDEO ENGINE ACTIONS ---
            document.getElementById('fetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('urlInput').value;
                currentVideoUrl = url;
                const statusPanel = document.getElementById('download-status');
                const previewCard = document.getElementById('previewCard');
                
                previewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🛰️ <b>[Analyzing Stream]:</b> Fetching media meta-data and sizing...";
                
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
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Connection failed.";
                }
            });

            document.getElementById('startDownloadBtn').addEventListener('click', async () => {
                const formatId = document.getElementById('qualityDropdown').value;
                const statusPanel = document.getElementById('download-status');
                
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "💎 <b>[Processing Core]:</b> Syncing selected high-bitrate stream...";
                
                try {
                    const response = await fetch('/api/prepare-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentVideoUrl, formatId })
                    });
                    const data = await response.json();
                    if(data.success) {
                        statusPanel.innerHTML = "🔥 <b>[Master Synced]:</b> Initializing download...";
                        window.location.href = "/api/chrome-popup?file=" + encodeURIComponent(data.filename);
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Extraction Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Server error.";
                }
            });

            // --- AUDIO ENGINE ACTIONS ---
            document.getElementById('audioFetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('audioUrlInput').value;
                currentAudioUrl = url;
                const statusPanel = document.getElementById('download-status');
                const audioPreviewCard = document.getElementById('audioPreviewCard');
                
                audioPreviewCard.style.display = 'none';
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🎵 <b>[Audio Analyzer]:</b> Extracting soundtrack details and stream metadata...";
                
                try {
                    const response = await fetch('/api/fetch-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type: 'audio' })
                    });
                    const data = await response.json();
                    
                    if(data.success) {
                        statusPanel.style.display = 'none';
                        document.getElementById('audioTitle').innerHTML = "🎵 <b>Audio Title:</b> " + data.title;
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
                const quality = document.getElementById('audioQualityDropdown').value;
                const statusPanel = document.getElementById('download-status');
                
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🎛️ <b>[Master Studio Engine]:</b> Transcoding lossless audio matrix...";
                
                try {
                    const response = await fetch('/api/prepare-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentAudioUrl, quality })
                    });
                    const data = await response.json();
                    if(data.success) {
                        statusPanel.innerHTML = "🔥 <b>[Master Audio Ripped]:</b> Initializing download...";
                        window.location.href = "/api/chrome-popup?file=" + encodeURIComponent(data.filename);
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Extraction Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Pipeline Timeout]:</b> Server error.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

// --- ROUTE: METADATA FETCH ENGINE ---
app.post('/api/fetch-info', (req, res) => {
    const { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const command = `yt-dlp --dump-json "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout) => {
        if (err) return res.json({ success: false, message: "Could not parse link or unsupported site." });
        
        try {
            const meta = JSON.parse(stdout);
            const rawFormats = meta.formats || [];
            const duration = meta.duration || 0;
            
            if (type === 'audio') {
                const audioTiers = [
                    { id: "320K", label: "Studio Master (320kbps MP3)", bitrate: 320 },
                    { id: "256K", label: "High Quality (256kbps MP3)", bitrate: 256 },
                    { id: "128K", label: "Standard Quality (128kbps MP3)", bitrate: 128 }
                ];
                
                let availableAudio = [];
                audioTiers.forEach(tier => {
                    let sizeLabel = "Unknown Size";
                    if (duration > 0) {
                        const estimatedMB = ((tier.bitrate * duration) / 8 / 1024).toFixed(1);
                        sizeLabel = `~${estimatedMB} MB`;
                    } else {
                        sizeLabel = tier.id === "320K" ? "~5-12 MB" : "~2-6 MB";
                    }
                    
                    availableAudio.push({
                        id: tier.id,
                        label: `${tier.label} [${sizeLabel}]`
                    });
                });

                return res.json({
                    success: true,
                    title: meta.title || "Extracted Audio Track",
                    thumbnail: meta.thumbnail || "",
                    formats: availableAudio
                });
            }

            // Video parsing core
            const qualityTiers = [
                { maxH: 4320, minH: 2161, label: "4K UHD (2160p)", refBitrate: 25000 },
                { maxH: 2160, minH: 1441, label: "2K QuadHD (1440p)", refBitrate: 12000 },
                { maxH: 1440, minH: 1081, label: "1080p Full HD", refBitrate: 6000 },
                { maxH: 1080, minH: 721,  label: "720p HD", refBitrate: 3000 },
                { maxH: 720,  minH: 481,  label: "480p HQ", refBitrate: 1500 },
                { maxH: 480,  minH: 0,    label: "360p Standard", refBitrate: 800 }
            ];
            
            let availableOptions = [];
            let maxFoundHeight = 0;
            rawFormats.forEach(f => {
                if (f.height > maxFoundHeight) maxFoundHeight = f.height;
            });
            if (maxFoundHeight === 0 && rawFormats.length > 0) maxFoundHeight = 720;

            qualityTiers.forEach(tier => {
                const hasStream = rawFormats.some(f => f.height > tier.minH && f.height <= tier.maxH) || (tier.maxH === 720 && maxFoundHeight >= 720);
                if (hasStream && tier.maxH <= (maxFoundHeight + 100)) {
                    const validStreams = rawFormats.filter(f => f.height > tier.minH && f.height <= tier.maxH);
                    validStreams.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
                    const bestStream = validStreams[0];
                    let sizeLabel = "";
                    let bytes = bestStream ? (bestStream.filesize || bestStream.filesize_approx) : null;
                    
                    if (bytes) {
                        sizeLabel = `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                    } else if (duration > 0) {
                        sizeLabel = `~${((tier.refBitrate * duration) / 8 / 1024).toFixed(1)} MB`;
                    } else {
                        sizeLabel = tier.maxH === 1080 ? "~15-30 MB" : "~8-15 MB";
                    }

                    const formatSelector = bestStream 
                        ? `bestvideo[format_id=${bestStream.format_id}]+bestaudio/bestvideo[height<=${tier.maxH}]+bestaudio`
                        : `bestvideo[height<=${tier.maxH}]+bestaudio/best`;

                    availableOptions.push({ id: formatSelector, label: `${tier.label} [${sizeLabel}]`, disabled: false });
                } else {
                    availableOptions.push({ id: "disabled", label: `${tier.label} - [Unavailable]`, disabled: true });
                }
            });

            res.json({ success: true, title: meta.title || "External Video Stream", thumbnail: meta.thumbnail || "", formats: availableOptions });

        } catch (e) {
            res.json({ success: false, message: "Engine compilation structural error." });
        }
    });
});

// --- ROUTE: VIDEO DOWNLOAD ENGINE ---
app.post('/api/prepare-video', (req, res) => {
    const { url, formatId } = req.body;
    if (!url || !formatId || formatId === "disabled") {
        return res.json({ success: false, message: "Invalid URL or quality choice." });
    }

    const outputFilename = `video_${Date.now()}.mp4`;
    const outputPath = path.join(TMP_DIR, outputFilename);
    const command = `yt-dlp -f "${formatId}" --recode-video mp4 "${url}" -o "${outputPath}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
            return res.json({ success: false, message: "Video processing failed on server." });
        }
        res.json({ success: true, filename: outputFilename });
    });
});

// --- ROUTE: AUDIO DOWNLOAD ENGINE ---
app.post('/api/prepare-audio', (req, res) => {
    const { url, quality } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid Audio URL." });

    const bitrate = quality ? quality.replace('K', 'k') : '320k';
    const outputFilename = `audio_${Date.now()}.mp3`;
    const outputPath = path.join(TMP_DIR, outputFilename);
    const command = `yt-dlp -x --audio-format mp3 --audio-quality ${bitrate} "${url}" -o "${outputPath}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
            return res.json({ success: false, message: "Audio processing failed on server." });
        }
        res.json({ success: true, filename: outputFilename });
    });
});

// --- ROUTE: FILE DISPATCH ENGINE ---
app.get('/api/chrome-popup', (req, res) => {
    const filename = req.query.file;
    if (!filename) return res.status(400).send("File missing.");

    const safeFilename = path.basename(filename);
    const filePath = path.join(TMP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, safeFilename, () => {
            fs.unlink(filePath, () => {});
        });
    } else {
        res.status(404).send("File not found or expired.");
    }
});

app.listen(PORT, () => {
    console.log(chalk.cyan(`Server running on port ${PORT}`));
});
