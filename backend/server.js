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
app.post('/accounts/register.php', (req, res) => {
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
app.post('/accounts/loginGJAccount.php', (req, res) => {
  const { username, password } = req.body;

  let users = getUsers();

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) return res.send('-1');

  res.send('1');
});

app.get('/', (req, res) => {
  res.send('Backend running ✅');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
