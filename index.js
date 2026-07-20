const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
}

let YTDLP = 'yt-dlp';
if (fs.existsSync(path.join(__dirname, 'yt-dlp'))) {
    YTDLP = path.join(__dirname, 'yt-dlp');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper Function: MB Formatter
function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return null;
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// --- ROUTE 1: VIDEO / AUDIO METADATA FETCH ---
app.post('/api/fetch-info', (req, res) => {
    const { url, type } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const command = `${YTDLP} --dump-json "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout) => {
        if (err) return res.json({ success: false, message: "Could not parse link or yt-dlp issue." });
        
        try {
            const meta = JSON.parse(stdout);
            const rawFormats = meta.formats || [];
            const duration = meta.duration || 180; // Default ~3 min fallback if duration missing

            if (type === 'audio') {
                // Find actual audio streams if available
                const audioFormats = rawFormats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
                
                const audioTiers = [
                    { id: "320K", label: "Studio Master (320kbps MP3)", bitrate: 320, defaultMb: 7.2 },
                    { id: "256K", label: "High Quality (256kbps MP3)", bitrate: 256, defaultMb: 5.8 },
                    { id: "128K", label: "Standard Quality (128kbps MP3)", bitrate: 128, defaultMb: 2.9 }
                ];
                
                let availableAudio = audioTiers.map(tier => {
                    let calcSize = duration > 0 ? formatBytes((tier.bitrate * 1000 * duration) / 8) : null;
                    let sizeStr = calcSize || `${tier.defaultMb} MB`;
                    return { id: tier.id, label: `${tier.label} [~${sizeStr}]` };
                });

                return res.json({
                    success: true,
                    title: meta.title || "Extracted Audio Track",
                    thumbnail: meta.thumbnail || "",
                    formats: availableAudio
                });
            }

            // --- VIDEO LOGIC ---
            const qualityTiers = [
                { maxH: 4320, minH: 2161, label: "4K UHD (2160p)", refBitrate: 25000, defaultMb: 85.0 },
                { maxH: 2160, minH: 1441, label: "2K QuadHD (1440p)", refBitrate: 12000, defaultMb: 45.0 },
                { maxH: 1440, minH: 1081, label: "1080p Full HD", refBitrate: 6000, defaultMb: 22.0 },
                { maxH: 1080, minH: 721,  label: "720p HD", refBitrate: 3000, defaultMb: 11.5 },
                { maxH: 720,  minH: 481,  label: "480p HQ", refBitrate: 1500, defaultMb: 5.8 },
                { maxH: 480,  minH: 0,    label: "360p Standard", refBitrate: 800, defaultMb: 3.2 }
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

                    let realBytes = bestStream ? (bestStream.filesize || bestStream.filesize_approx || 0) : 0;
                    let sizeStr = formatBytes(realBytes);

                    if (!sizeStr && duration > 0) {
                        sizeStr = formatBytes((tier.refBitrate * 1000 * duration) / 8);
                    }

                    if (!sizeStr) {
                        sizeStr = `${tier.defaultMb} MB`;
                    }

                    const formatSelector = bestStream 
                        ? `bestvideo[format_id=${bestStream.format_id}]+bestaudio/bestvideo[height<=${tier.maxH}]+bestaudio`
                        : `bestvideo[height<=${tier.maxH}]+bestaudio/best`;

                    availableOptions.push({ id: formatSelector, label: `${tier.label} [~${sizeStr}]`, disabled: false });
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
    const ffmpegOption = ffmpegPath ? `--ffmpeg-location "${ffmpegPath}"` : '';
    const cmd = `${YTDLP} ${ffmpegOption} -f "${formatId}" -o "${outputPath}" "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 25 }, (err) => {
        if (err) return res.json({ success: false, message: "Download failed." });
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 3: PREPARE AUDIO (FIXED WITH FFMPEG BINARY) ---
app.post('/api/prepare-audio', (req, res) => {
    const { url, quality } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid URL." });

    const outputPath = path.join(TMP_DIR, `audio_${Date.now()}.mp3`);
    const ffmpegOption = ffmpegPath ? `--ffmpeg-location "${ffmpegPath}"` : '';
    const cmd = `${YTDLP} ${ffmpegOption} -x --audio-format mp3 --audio-quality ${quality || '128K'} -o "${outputPath}" "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 25 }, (err) => {
        if (err) return res.json({ success: false, message: "Audio extraction failed." });
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 4: ACCURATE MOVIE/SERIES REAL SEARCH ---
app.get('/api/search-movie', async (req, res) => {
    const name = req.query.name;
    if (!name) return res.json({ success: false, error: "Movie/Series name is required." });
    
    try {
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/search/multi?api_key=cba322ef451e065715560a631bf37e1b&query=${encodeURIComponent(name)}`);

        if (tmdbRes.data && tmdbRes.data.results && tmdbRes.data.results.length > 0) {
            const validMedia = tmdbRes.data.results.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
            
            if (validMedia.length > 0) {
                const parsedResults = validMedia.map(m => {
                    const title = m.title || m.name || m.original_title;
                    const date = m.release_date || m.first_air_date || '';
                    const year = date ? date.split('-')[0] : 'N/A';
                    
                    return {
                        title: title,
                        year: year,
                        type: m.media_type === 'tv' ? 'Web Series' : 'Movie',
                        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                        watchUrl: `https://vidsrc.to/embed/${m.media_type}/${m.id}`,
                        downloadUrl: `https://archive.org/search.php?query=${encodeURIComponent(title)}`
                    };
                });
                return res.json({ success: true, results: parsedResults });
            }
        }

        return res.json({ success: false, error: "Yeh movie ya series database mein nahi mili. Spelling check karein!" });

    } catch (e) {
        return res.json({ success: false, error: "Search database service issue. Dobara try karein." });
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
