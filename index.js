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

// Helper Function: Format Bytes
function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return null;
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// YT-DLP Universal Options (Bypasses YouTube 403 Bot Detection & Age Gates)
const YT_ARGS = '--extractor-args "youtube:player_client=android,web" --no-warnings --no-check-certificate';

// --- ROUTE 1: FETCH METADATA (YOUTUBE, INSTA, TIKTOK, PINTEREST, ETC.) ---
app.post('/api/fetch-info', (req, res) => {
    const { url, type, engine } = req.body;
    if (!url) return res.json({ success: false, message: "URL is empty." });

    const isAudioEngine = (type === 'audio' || engine === 'audio');
    const command = `${YTDLP} ${YT_ARGS} --dump-json "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 30 }, (err, stdout) => {
        if (err || !stdout) {
            return res.json({ success: false, message: "Could not fetch media. Check if link is valid or public." });
        }
        
        try {
            const meta = JSON.parse(stdout);
            const rawFormats = meta.formats || [];
            const duration = meta.duration || 180;

            // --- AUDIO ENGINE METADATA ---
            if (isAudioEngine) {
                const audioTiers = [
                    { id: "320K", label: "Studio Master (320kbps MP3)", bitrate: 320, fallbackMb: 5.5 },
                    { id: "256K", label: "High Quality (256kbps MP3)", bitrate: 256, fallbackMb: 4.2 },
                    { id: "128K", label: "Standard Quality (128kbps MP3)", bitrate: 128, fallbackMb: 2.1 }
                ];

                let audioFormats = audioTiers.map(tier => {
                    let calcSize = (duration > 0) ? formatBytes((tier.bitrate * 1000 * duration) / 8) : null;
                    let sizeStr = calcSize || `${tier.fallbackMb} MB`;
                    return { id: tier.id, label: `${tier.label} [~${sizeStr}]` };
                });

                return res.json({
                    success: true,
                    title: meta.title || "Audio Track",
                    thumbnail: meta.thumbnail || (meta.thumbnails && meta.thumbnails.length ? meta.thumbnails[meta.thumbnails.length - 1].url : ""),
                    formats: audioFormats
                });
            }

            // --- VIDEO ENGINE METADATA ---
            const qualityTiers = [
                { maxH: 4320, minH: 2161, label: "4K UHD (2160p)", defaultMb: 45.0 },
                { maxH: 2160, minH: 1441, label: "2K QuadHD (1440p)", defaultMb: 25.0 },
                { maxH: 1440, minH: 1081, label: "1080p Full HD", defaultMb: 16.5 },
                { maxH: 1080, minH: 721,  label: "720p HD", defaultMb: 10.7 },
                { maxH: 720,  minH: 481,  label: "480p HQ", defaultMb: 5.2 },
                { maxH: 480,  minH: 0,    label: "360p Standard", defaultMb: 2.8 }
            ];
            
            let availableOptions = [];
            let maxFoundHeight = 0;
            
            rawFormats.forEach(f => { 
                if (f.height && f.height > maxFoundHeight) maxFoundHeight = f.height; 
            });

            if (maxFoundHeight === 0) {
                maxFoundHeight = meta.height || 720;
            }

            qualityTiers.forEach(tier => {
                const isAvailable = (tier.maxH <= (maxFoundHeight + 100));
                
                if (isAvailable) {
                    const matchingStreams = rawFormats.filter(f => f.height && f.height > tier.minH && f.height <= tier.maxH);
                    matchingStreams.sort((a, b) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0));
                    const bestStream = matchingStreams[0];

                    let realBytes = bestStream ? (bestStream.filesize || bestStream.filesize_approx || 0) : (meta.filesize || meta.filesize_approx || 0);
                    let sizeStr = formatBytes(realBytes);

                    if (!sizeStr && duration > 0) {
                        let estimateBitrate = tier.maxH >= 1080 ? 3500 : (tier.maxH >= 720 ? 1800 : 800);
                        sizeStr = formatBytes((estimateBitrate * 1000 * duration) / 8);
                    }

                    if (!sizeStr) {
                        sizeStr = `${tier.defaultMb} MB`;
                    }

                    // Format selector string with Android client compatibility
                    const formatSelector = bestStream 
                        ? `bestvideo[height<=${tier.maxH}]+bestaudio/best[height<=${tier.maxH}]/best`
                        : `bestvideo[height<=${tier.maxH}]+bestaudio/best`;

                    availableOptions.push({ id: formatSelector, label: `${tier.label} [~${sizeStr}]`, disabled: false });
                } else {
                    availableOptions.push({ id: "disabled", label: `${tier.label} - [Unavailable]`, disabled: true });
                }
            });

            return res.json({ 
                success: true, 
                title: meta.title || "Target Media Stream", 
                thumbnail: meta.thumbnail || (meta.thumbnails && meta.thumbnails.length ? meta.thumbnails[meta.thumbnails.length - 1].url : ""), 
                formats: availableOptions 
            });

        } catch (e) {
            return res.json({ success: false, message: "Metadata parsing error." });
        }
    });
});

// --- ROUTE 2: PREPARE VIDEO (FIXED FOR YOUTUBE & ALL SITES) ---
app.post('/api/prepare-video', (req, res) => {
    const { url, formatId } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid parameters." });

    const outputPath = path.join(TMP_DIR, `video_${Date.now()}.mp4`);
    const targetFormat = (formatId && formatId !== 'disabled') ? formatId : 'bestvideo+bestaudio/best';
    
    // Command using YouTube bypass flags
    const cmd = `${YTDLP} ${YT_ARGS} --no-playlist -f "${targetFormat}" --recode-video mp4 -o "${outputPath}" "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            // Direct Fallback if complex stream merging fails
            const fallbackCmd = `${YTDLP} ${YT_ARGS} --no-playlist -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`;
            exec(fallbackCmd, (fErr) => {
                if (fErr || !fs.existsSync(outputPath)) {
                    return res.json({ success: false, message: "Video extraction failed." });
                }
                res.json({ success: true, filename: path.basename(outputPath) });
            });
            return;
        }
        res.json({ success: true, filename: path.basename(outputPath) });
    });
});

// --- ROUTE 3: PREPARE AUDIO (FIXED: DOWNLOADS DIRECT M4A/MP3 AUDIO STREAM) ---
app.post('/api/prepare-audio', (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: "Invalid URL." });

    const outputPath = path.join(TMP_DIR, `audio_${Date.now()}.m4a`);
    
    // Direct Audio Stream Extraction (Works 100% on YouTube without needing FFmpeg conversion)
    const cmd = `${YTDLP} ${YT_ARGS} --no-playlist -f "ba/ba*/bestaudio/best" -o "${outputPath}" "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err || !fs.existsSync(outputPath)) {
            // Secondary Audio Fallback
            const altPath = path.join(TMP_DIR, `audio_${Date.now()}.mp3`);
            const altCmd = `${YTDLP} ${YT_ARGS} --no-playlist -f "b" -o "${altPath}" "${url}"`;
            
            exec(altCmd, (altErr) => {
                if (altErr || !fs.existsSync(altPath)) {
                    return res.json({ success: false, message: "Audio extraction failed." });
                }
                return res.json({ success: true, filename: path.basename(altPath) });
            });
            return;
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

        return res.json({ success: false, error: "Yeh movie ya series database mein nahi mili. Spelling check karein!" });

    } catch (e) {
        return res.json({ success: false, error: "Search database service issue. Dobara try karein." });
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
