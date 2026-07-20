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
        <title>AMSAL STUDIOS - DIRECT WORKSTATION</title>
        <style>
            * { box-sizing: border-box; }
            body { background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #161b22; padding: 25px; border-radius: 16px; border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0,242,254,0.15); }
            h1 { color: #00f2fe; margin-bottom: 5px; text-transform: uppercase; font-size: 22px; }
            .badge { background: #ffbc00; color: #000; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 10px; display: inline-block; margin-bottom: 15px; }
            
            label { display: block; text-align: left; font-size: 13px; font-weight: bold; color: #8b949e; margin-bottom: 6px; }
            input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; font-size: 14px; outline: none; }
            input:focus { border-color: #00f2fe; }

            button.action-btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; }
            
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 12px; text-align: left; border-radius: 4px; font-size: 13px; display: none; margin-top: 15px; word-break: break-all; }
            .dl-link { display: block; background: linear-gradient(45deg, #00ff87, #60efff); color: #000; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 10px; font-size: 15px; }
            iframe { width: 100%; height: 450px; border: none; border-radius: 10px; margin-top: 15px; display: none; background: #fff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">CLIENT ENGINE v4.0 (NO IP BLOCKS)</div>

            <form id="mediaForm">
                <label>Target Media Link (YouTube, TikTok, Insta)</label>
                <input type="text" id="targetUrl" placeholder="Paste link here..." required>
                <button type="submit" class="action-btn">FETCH MEDIA DOWNLOAD</button>
            </form>

            <div id="statusBox" class="status"></div>
            <iframe id="downloaderFrame"></iframe>
        </div>

        <script>
            document.getElementById('mediaForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                let url = document.getElementById('targetUrl').value.trim();
                const statusBox = document.getElementById('statusBox');
                const iframe = document.getElementById('downloaderFrame');

                // Clean YouTube tracking query parameters (?si=...)
                try {
                    let parsed = new URL(url);
                    parsed.searchParams.delete('si');
                    parsed.searchParams.delete('feature');
                    url = parsed.toString();
                } catch(err) {}

                statusBox.style.display = 'block';
                iframe.style.display = 'none';
                statusBox.innerHTML = "⚡ <b>[Processing Directly From Your Network]:</b> Fetching media...";

                // 1. TIKTOK DIRECT CLIENT FETCH
                if (url.includes('tiktok.com')) {
                    try {
                        let formData = new URLSearchParams();
                        formData.append('url', url);
                        formData.append('hd', '1');

                        let res = await fetch('https://www.tikwm.com/api/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: formData
                        });
                        let data = await res.json();

                        if (data && data.data) {
                            let downloadUrl = data.data.hdplay || data.data.play;
                            statusBox.innerHTML = "✅ <b>[TikTok Video Ready]:</b><br><a class='dl-link' href='" + downloadUrl + "' target='_blank' rel='noopener noreferrer' download>⬇️ DOWNLOAD TIKTOK VIDEO</a>";
                            return;
                        }
                    } catch(e) {}
                }

                // 2. YOUTUBE / INSTAGRAM DIRECT CONVERTER ENGINE (Bypasses Datacenter IP Block)
                statusBox.innerHTML = "✅ <b>[Media Engine Ready]:</b> Stream extracted below. Choose format & download directly:";
                
                let encodedUrl = encodeURIComponent(url);
                iframe.src = "https://loader.to/api/card/?url=" + encodedUrl;
                iframe.style.display = 'block';
            });
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
