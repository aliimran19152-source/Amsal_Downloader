const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

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

function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return null;
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// URL Cleaner to fix youtu.be & tracking parameters (?si=...)
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
    return clean.split('?si=')[0];
}

// Anti-bot flags for Cloud Servers (Render)
const YT_FLAGS = '--extractor-args "youtube:player_client=ios,mweb,android" --no-check-certificate --no-warnings --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15"';

// --- ROUTE 1: FETCH METADATA ---
app.post('/api/fetch-info', (req, res) => {
    let { url, type, engine } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const targetUrl = cleanUrl(url);
    const isAudio = (type === 'audio' || engine === 'audio');
    const command = `${YTDLP} ${YT_FLAGS} --dump-json "${targetUrl}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 35 }, (err, stdout) => {
        if (err || !stdout) {
            // Direct Stream Retry for Strict Links
            const retryCmd = `${YTDLP} --no-check-certificate --dump-json "${targetUrl}"`;
            exec(retryCmd, { maxBuffer: 1024 * 1024 * 35 }, (rErr, rStdout) => {
                if (rErr || !rStdout) {
                    return res.json({ success: false, message: "Link parse nahi ho saka. Link public aur valid hona chahiye." });
                }
                processMetadata(rStdout, isAudio, res);
            });
            return;
        }
        processMetadata(stdout, isAudio, res);
    });
});

function processMetadata(stdout, isAudio, res) {
    try {
        const meta = JSON.parse(stdout);
        const rawFormats = meta.formats || [];
        const duration = meta.duration || 180;

        if (isAudio) {
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
                title: meta.title || "Audio Track",
                thumbnail: meta.thumbnail || (meta.thumbnails && meta.thumbnails.length ? meta.thumbnails[meta.thumbnails.length - 1].url : ""),
                formats: availableAudio
            });
        }

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

        if (maxFoundHeight === 0) {
            maxFoundHeight = meta.height || 720;
        }

        qualityTiers.forEach(tier => {
            const hasStream = (tier.maxH <= (maxFoundHeight + 100));
            
            if (hasStream) {
                const validStreams = rawFormats.filter(f => f.height > tier.minH && f.height <= tier.maxH);
                validStreams.sort((a, b) => (b.tbr || b.filesize || 0) - (a.tbr || a.filesize || 0));
                const bestStream = validStreams[0];

                let realBytes = bestStream ? (bestStream.filesize || bestStream.filesize_approx || 0) : (meta.filesize || meta.filesize_approx || 0);
                let sizeStr = formatBytes(realBytes);

                if (!sizeStr && duration > 0) {
                    sizeStr = formatBytes((tier.refBitrate * 1000 * duration) / 8);
                }

                if (!sizeStr) {
                    sizeStr = `${tier.defaultMb} MB`;
                }

                const formatSelector = bestStream 
                    ? `bestvideo[format_id=${bestStream.format_id}]+bestaudio/bestvideo[height<=${tier.maxH}]+bestaudio/best`
                    : `bestvideo[height<=${tier.maxH}]+bestaudio/best`;

                availableOptions.push({ id: formatSelector, label: `${tier.label} [~${sizeStr}]`, disabled: false });
            } else {
                availableOptions.push({ id: "disabled", label: `${tier.label} - [Unavailable]`, disabled: true });
            }
        });

        res.json({ 
            success: true, 
            title: meta.title || "External Media Stream", 
            thumbnail: meta.thumbnail || (meta.thumbnails && meta.thumbnails.length ? meta.thumbnails[meta.thumbnails.length - 1].url : ""), 
            formats: availableOptions 
        });

    } catch (e) {
        res.json({ success: false, message: "Metadata error." });
    }
}

// --- ROUTE 2: PREPARE VIDEO ---
app.post('/api/prepare-video', (req, res) => {
    let { url, formatId } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid parameters." });

    const targetUrl = cleanUrl(url);
    const outputPath = path.join(TMP_DIR, `video_${Date.now()}.mp4`);
    const selectedFormat = (formatId && formatId !== "disabled") ? formatId : "bestvideo+bestaudio/best";
    
    const cmd = `${YTDLP} ${YT_FLAGS} -f "${selectedFormat}" -o "${outputPath}" "${targetUrl}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            const fallbackCmd = `${YTDLP} ${YT_FLAGS} -f "best" -o "${outputPath}" "${targetUrl}"`;
            exec(fallbackCmd, (fErr) => {
                if (fErr || !fs.existsSync(outputPath)) {
                    return res.json({ success: false, message: "Download failed." });
                }
                res.json({ success: true, filename: path.basename(outputPath) });
            });
            return;
        }
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 3: PREPARE AUDIO ---
app.post('/api/prepare-audio', (req, res) => {
    let { url } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid URL." });

    const targetUrl = cleanUrl(url);
    const outputPath = path.join(TMP_DIR, `audio_${Date.now()}.m4a`);
    const cmd = `${YTDLP} ${YT_FLAGS} -f "bestaudio/ba/best" -o "${outputPath}" "${targetUrl}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            return res.json({ success: false, message: "Audio extraction failed." });
        }
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 4: MOVIE SEARCH ---
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

        return res.json({ success: false, error: "Yeh movie ya series database mein nahi mili." });

    } catch (e) {
        return res.json({ success: false, error: "Search database service issue." });
    }
});

// --- ROUTE 5: CHROME DOWNLOAD POPUP ---
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
