const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_FILE = './users.json';

// load users
function getUsers() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// save users
function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// REGISTER
app.post('/registerGJAccount.php', (req, res) => {
  const { username, password } = req.body;

  let users = getUsers();

  if (users.find(u => u.username === username)) {
    return res.send('-1');
  }

  users.push({ username, password });
  saveUsers(users);

  res.send('1');
});

// LOGIN
app.post('/loginGJAccount.php', (req, res) => {
  const { username, password } = req.body;

  let users = getUsers();

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) return res.send('-1');

  res.send('1');
});

// ✅ LEVEL DOWNLOAD PROXY (THIS FIXES YOUR 404)
app.post('/downloadGJLevel22.php', async (req, res) => {
  try {
    const response = await fetch('https://www.boomlings.com/database/downloadGJLevel22.php', {
      method: 'POST',
      body: new URLSearchParams(req.body)
    });

    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
});

// OPTIONAL (you’ll probably need this next for search)
app.post('/getGJLevels21.php', async (req, res) => {
  try {
    const response = await fetch('https://www.boomlings.com/database/getGJLevels21.php', {
      method: 'POST',
      body: new URLSearchParams(req.body)
    });

    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send('proxy error');
  }
});

// TEST ROUTE
app.get('/', (req, res) => {
  res.send('Backend running ✅');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
