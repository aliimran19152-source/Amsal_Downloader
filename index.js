const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ROUTE 1: VIDEO / AUDIO METADATA FETCH ---
app.post('/api/fetch-info', (req, res) => {
    const { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const command = `yt-dlp --dump-json "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout) => {
        if (err) return res.json({ success: false, message: "Could not parse link or yt-dlp issue." });
        
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
                
                let availableAudio = audioTiers.map(tier => {
                    let sizeLabel = duration > 0 ? `~${((tier.bitrate * duration) / 8 / 1024).toFixed(1)} MB` : "~5 MB";
                    return { id: tier.id, label: `${tier.label} [${sizeLabel}]` };
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
            rawFormats.forEach(f => { if (f.height > maxFoundHeight) maxFoundHeight = f.height; });

            qualityTiers.forEach(tier => {
                const hasStream = rawFormats.some(f => f.height > tier.minH && f.height <= tier.maxH) || (tier.maxH === 720 && maxFoundHeight >= 720);
                if (hasStream && tier.maxH <= (maxFoundHeight + 100)) {
                    const validStreams = rawFormats.filter(f => f.height > tier.minH && f.height <= tier.maxH);
                    validStreams.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
                    const bestStream = validStreams[0];
                    let sizeLabel = duration > 0 ? `~${((tier.refBitrate * duration) / 8 / 1024).toFixed(1)} MB` : "~15 MB";

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
            res.json({ success: false, message: "Metadata error." });
        }
    });
});

// --- ROUTE 2: PREPARE VIDEO ---
app.post('/api/prepare-video', (req, res) => {
    const { url, formatId } = req.body;
    if (!url || !formatId || formatId === "disabled") return res.json({ success: false, message: "Invalid parameters." });

    const outputPath = path.join(TMP_DIR, `video_${Date.now()}.mp4`);
    const cmd = `yt-dlp -f "${formatId}" -o "${outputPath}" "${url}"`;

    exec(cmd, (err) => {
        if (err) return res.json({ success: false, message: "Download failed." });
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 3: PREPARE AUDIO ---
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

// --- ROUTE 4: REAL MOVIE & SERIES API SEARCH ---
app.get('/api/search-movie', async (req, res) => {
    const name = req.query.name;
    if (!name) return res.json({ success: false, error: "Movie/Series name is required." });
    
    try {
        const response = await axios.get(`https://www.omdbapi.com/?s=${encodeURIComponent(name)}&apikey=trilogy`);
        if (response.data.Response === "True") {
            const movies = response.data.Search.map(m => ({
                title: m.Title,
                year: m.Year,
                type: m.Type,
                poster: m.Poster !== "N/A" ? m.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
                imdbID: m.imdbID,
                watchUrl: `https://vidsrc.to/embed/${m.Type}/${m.imdbID}`,
                downloadUrl: `https://archive.org/search.php?query=${encodeURIComponent(m.Title)}`
            }));
            return res.json({ success: true, results: movies });
        } else {
            return res.json({ success: false, error: "Koi Movie ya Series nahi mili!" });
        }
    } catch (e) {
        return res.json({ success: false, error: "Search server issue." });
    }
});

// --- ROUTE 5: FILE DOWNLOAD POPUP ---
app.get('/api/chrome-popup', (req, res) => {
    const fileName = req.query.file;
    const filePath = path.join(TMP_DIR, fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, () => {
            try { fs.unlinkSync(filePath); } catch(e){}
        });
    } else {
        res.status(404).send("File expired or not found.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AMSAL STUDIOS WORKSTATION RUNNING ON PORT: ${PORT}`);
});
