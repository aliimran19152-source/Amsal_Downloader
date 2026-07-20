const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve index.html directly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ROUTE: COMMON METADATA FETCH & SIZING ENGINE ---
app.post('/api/fetch-info', (req, res) => {
    const { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const command = `yt-dlp --dump-json "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout, stderr) => {
        if (err) return res.json({ success: false, message: "Could not parse link or yt-dlp not installed on server." });
        
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
    if (!url || !formatId || formatId === "disabled") return res.json({ success: false, message: "Invalid parameters." });

    const outputPath = path.join(TMP_DIR, `video_${Date.now()}.mp4`);
    const cmd = `yt-dlp -f "${formatId}" -o "${outputPath}" "${url}"`;

    exec(cmd, (err) => {
        if (err) return res.json({ success: false, message: "Download execution failed." });
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE: AUDIO DOWNLOAD ENGINE ---
app.post('/api/prepare-audio', (req, res) => {
    const { url, quality } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid URL." });

    const outputPath = path.join(TMP_DIR, `audio_${Date.now()}.mp3`);
    const cmd = `yt-dlp -x --audio-format mp3 --audio-quality ${quality} -o "${outputPath}" "${url}"`;

    exec(cmd, (err) => {
        if (err) return res.json({ success: false, message: "Audio extraction failed." });
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE: MOVIE SEARCH ROUTE ---
app.get('/api/search-movie', (req, res) => {
    const movieName = req.query.name;
    if(!movieName) return res.json({ success: false, error: "Movie name is required." });
    
    res.json({
        success: true,
        title: movieName.toUpperCase(),
        downloadUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    });
});

// --- ROUTE: FILE DOWNLOAD POPUP ---
app.get('/api/chrome-popup', (req, res) => {
    const fileName = req.query.file;
    const filePath = path.join(TMP_DIR, fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });
    } else {
        res.status(404).send("File expired or not found.");
    }
});

app.listen(PORT, () => {
    console.log(chalk.green(`🚀 AMSAL STUDIOS WORKSTATION RUNNING ON PORT: ${PORT}`));
});
