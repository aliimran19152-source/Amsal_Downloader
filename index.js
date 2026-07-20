const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMSAL STUDIOS - MEDIA ENGINE</title>
        <style>
            body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; text-align: center; padding: 20px; }
            .container { max-width: 600px; margin: 30px auto; background: #161b22; padding: 30px; border-radius: 16px; border: 2px solid #00f2fe; }
            h1 { color: #00f2fe; }
            .badge { background: #ffbc00; color: #000; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 12px; display: inline-block; margin-bottom: 25px; }
            input[type="text"] { width: 100%; padding: 14px; margin-bottom: 20px; border: 1px solid #30363d; background: #0d1117; color: #fff; border-radius: 8px; box-sizing: border-box; }
            button { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; background: linear-gradient(45deg, #00f2fe, #4facfe); color: #000; }
            .status { background: #21262d; border-left: 4px solid #00f2fe; padding: 15px; text-align: left; border-radius: 4px; font-size: 14px; display: none; margin-top: 15px; }
            .btn-dl { background: linear-gradient(45deg, #00ff87, #60efff); color: #000; text-decoration: none; display: block; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight: bold; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AMSAL STUDIOS</h1>
            <div class="badge">PREMIUM CORE WORKSTATION</div>
            <form id="fetchForm">
                <input type="text" id="urlInput" placeholder="Paste YouTube / Insta / TikTok URL" required>
                <button type="submit">DOWNLOAD MEDIA</button>
            </form>
            <div id="download-status" class="status"></div>
        </div>

        <script>
            document.getElementById('fetchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('urlInput').value;
                const statusPanel = document.getElementById('download-status');
                
                statusPanel.style.display = 'block';
                statusPanel.innerHTML = "🛰️ <b>[Bypassing Cloud Blocks]:</b> Extracting media link...";
                
                try {
                    const response = await fetch('/api/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url })
                    });
                    const data = await response.json();
                    
                    if(data.success) {
                        statusPanel.innerHTML = "🔥 <b>[Link Generated]:</b><br><br><a class='btn-dl' href='" + data.url + "' target='_blank' download>CLICK HERE TO DOWNLOAD FILE</a>";
                    } else {
                        statusPanel.innerHTML = "❌ <b>[Error]:</b> " + data.message;
                    }
                } catch(err) {
                    statusPanel.innerHTML = "❌ <b>[Error]:</b> Server timeout or restricted URL.";
                }
            });
        </script>
    </body>
    </html>
    `);
});

app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: "URL is required" });

    // Public Cobalt Proxy Instances array to bypass IP blocks
    const instances = [
        'https://cobalt.api.redna2.xyz',
        'https://api.cobalt.tools',
        'https://co.wuk.sh'
    ];

    for (let instance of instances) {
        try {
            const response = await axios.post(`${instance}/`, {
                url: url,
                videoQuality: '720'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data && response.data.url) {
                return res.json({ success: true, url: response.data.url });
            }
        } catch (e) {
            continue; // Try next fallback instance if blocked
        }
    }

    res.json({ success: false, message: "YouTube Cloud Restriction Active. Try again in a few moments." });
});

app.listen(PORT, () => {
    console.log(`Server online on port ${PORT}`);
});
