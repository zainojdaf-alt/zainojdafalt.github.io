const express = require('express');
const cors = require('cors');

const app = express();

// ✅ homepage test
app.get('/', (req, res) => {
  res.send('Proxy is running ✅');
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ THIS is the important part (proxy)
app.post('/database/accounts/loginGJAccount.php', async (req, res) => {
  const fetch = require('node-fetch');

  try {
    const response = await fetch('https://boomlings.com/database/accounts/loginGJAccount.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      },
      body: new URLSearchParams(req.body)
    });

    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send('Proxy error');
  }
});

// ✅ start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});