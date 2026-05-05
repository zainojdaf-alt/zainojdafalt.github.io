// ─── Account Popup ────────────────────────────────────────────────────────────
// Drop-in method for GameScene.  Attach after the class definition:
//   GameScene.prototype._buildAccountPopup = _buildAccountPopup;
// Called from _buildSettingsMenu when the Account button is tapped.
// ──────────────────────────────────────────────────────────────────────────────

function _buildAccountPopup() {
    if (this._accountPopup) return;

    const sw = screenWidth, sh = screenHeight;
    const cx = sw / 2, cy = 320;
    const PW = 700, PH = 480;

    // ── helpers ───────────────────────────────────────────────────────────────
    const GD_SERVER = (window._gdProxyUrl || '').replace(/\/$/, '');
    const SECRET    = 'Wmfd2893gb7';

    const gdPost = async (endpoint, params) => {
        const body = new URLSearchParams({ secret: SECRET, ...params });
        const res  = await fetch(`${GD_SERVER}/${endpoint}`, { method: 'POST', body });
        return res.text();
    };

    const sha1 = async (str) => {
        const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // GD uses XOR-then-base64 for passwords sent to loginGJAccount
    const xorB64 = (str, key = 37526) => {
        let out = '';
        for (let i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ (key >> ((i % 4) * 4) & 0xff));
        return btoa(out);
    };

    // ── popup container ───────────────────────────────────────────────────────
    this._accountPopup = this.add.container(0, 0).setScrollFactor(0).setDepth(300);
    const popup = this._accountPopup;

    const dim = this.add.rectangle(cx, cy, sw * 2, sh * 2, 0x000000, 0.55).setInteractive();
    popup.add(dim);

    const corner = 0.325 * this.textures.get('GJ_square01').source[0].width;
    popup.add(this._drawScale9(cx, cy, PW, PH, 'GJ_square01', corner, 0xffffff, 1));

    // close button
    const closeBtn = this.add.image(cx - PW / 2 + 12, cy - PH / 2 + 12, 'GJ_WebSheet', 'GJ_closeBtn_001.png')
        .setScale(0.8).setInteractive();
    popup.add(closeBtn);
    this._makeBouncyButton(closeBtn, 0.8, () => {
        htmlCleanup();
        popup.destroy();
        this._accountPopup = null;
    });

    // ── tab state ─────────────────────────────────────────────────────────────
    const TABS = ['Login', 'Register'];
    let activeTab = 0;

    // ── title ─────────────────────────────────────────────────────────────────
    const title = this.add.bitmapText(cx, cy - PH / 2 + 42, 'bigFont', 'Account', 46).setOrigin(0.5);
    popup.add(title);

    // ── status text ───────────────────────────────────────────────────────────
    const statusTxt = this.add.bitmapText(cx, cy + PH / 2 - 52, 'bigFont', '', 22).setOrigin(0.5);
    popup.add(statusTxt);
    let statusTimer = null;
    const showStatus = (msg, color = 0xffffff, duration = 3500) => {
        statusTxt.setText(msg).setTint(color);
        clearTimeout(statusTimer);
        if (duration) statusTimer = setTimeout(() => statusTxt.setText(''), duration);
    };

    // ── logged-in state ───────────────────────────────────────────────────────
    const savedUser = () => localStorage.getItem('gd_userName') || '';
    const savedAID  = () => localStorage.getItem('gd_accountID') || '';
    const savedGJP  = () => localStorage.getItem('gd_gjp2') || '';    // stored as gjp2

    // ── HTML input factory ────────────────────────────────────────────────────
    const canvas     = this.sys.game.canvas;
    const htmlInputs = [];

    const makeHtmlInput = (x, y, w, h, placeholder, isPassword = false) => {
        // Phaser background box
        const bg = this.add.graphics().setScrollFactor(0).setDepth(301);
        bg.fillStyle(0x000000, 0.45);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        bg.lineStyle(2, 0xffffff, 0.35);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        popup.add(bg);

        // Placeholder bitmap label
        const ph = this.add.bitmapText(x, y, 'bigFont', placeholder, 19)
            .setOrigin(0.5).setTint(0x889988).setScrollFactor(0).setDepth(302);
        popup.add(ph);

        // Typed text mirror
        const mirror = this.add.bitmapText(x, y, 'bigFont', '', 19)
            .setOrigin(0.5).setTint(0xffffff).setScrollFactor(0).setDepth(302);
        popup.add(mirror);

        // Real HTML input (transparent, just for typing)
        const el = document.createElement('input');
        el.type = isPassword ? 'password' : 'text';
        el.maxLength = isPassword ? 64 : 32;
        el.autocomplete = isPassword ? 'current-password' : 'username';
        el.style.cssText = `
            position:fixed; background:transparent; border:none; outline:none;
            color:transparent; caret-color:#ffffff; z-index:9999;
            font-size:1px; text-align:center;`;
        document.body.appendChild(el);
        htmlInputs.push(el);

        const reposition = () => {
            const r = canvas.getBoundingClientRect();
            const sx = r.width / sw, sy = r.height / sh;
            el.style.left   = `${r.left + (x - w / 2) * sx}px`;
            el.style.top    = `${r.top  + (y - h / 2) * sy}px`;
            el.style.width  = `${w * sx}px`;
            el.style.height = `${h * sy}px`;
        };
        reposition();
        window.addEventListener('resize', reposition);

        el.addEventListener('input', () => {
            const val = el.value;
            ph.setVisible(val.length === 0);
            mirror.setText(isPassword ? '•'.repeat(val.length) : val);
        });

        // click on bg box focuses the real input
        const hitZone = this.add.zone(x, y, w, h).setScrollFactor(0).setDepth(303).setInteractive();
        popup.add(hitZone);
        hitZone.on('pointerdown', () => el.focus());

        const getValue = () => el.value;
        const setValue = (v) => { el.value = v; mirror.setText(isPassword ? '•'.repeat(v.length) : v); ph.setVisible(v.length === 0); };
        const clear    = () => setValue('');
        return { getValue, setValue, clear, el };
    };

    // ── HTML cleanup ──────────────────────────────────────────────────────────
    const htmlCleanup = () => htmlInputs.forEach(el => { el.remove(); });

    // ── button factory (reuses existing game style) ───────────────────────────
    const BH = 54, BW = 240;
    const btnBorder = this.textures.get('GJ_button01').source[0].width * 0.3;

    const makeBtn = (bx, by, label, action, tint = 0xffffff) => {
        const grp = this.add.container(bx, by).setScrollFactor(0).setDepth(302);
        grp.add(this._drawScale9(0, 0, BW, BH, 'GJ_button01', btnBorder, tint, 1));
        const lbl = this.add.bitmapText(0, -4, 'goldFont', label, 38).setOrigin(0.5, 0.5);
        grp.add(lbl);
        const hz = this.add.zone(0, 0, BW, BH).setInteractive();
        grp.add(hz);
        const base = 1, pressed = 1.26;
        hz.on('pointerdown', () => {
            hz._p = true;
            this.tweens.killTweensOf(grp, 'scale');
            this.tweens.add({ targets: grp, scale: pressed, duration: 300, ease: 'Bounce.Out' });
        });
        hz.on('pointerout', () => {
            if (hz._p) { hz._p = false; this.tweens.killTweensOf(grp, 'scale'); this.tweens.add({ targets: grp, scale: base, duration: 400, ease: 'Bounce.Out' }); }
        });
        hz.on('pointerup', () => {
            if (hz._p) { hz._p = false; this.tweens.killTweensOf(grp, 'scale'); this.tweens.add({ targets: grp, scale: base, duration: 400, ease: 'Bounce.Out' }); action(); }
        });
        popup.add(grp);
        return grp;
    };

    // ── tab buttons ───────────────────────────────────────────────────────────
    const TAB_W = 160, TAB_H = 44, TAB_GAP = 20;
    const tabBtns = TABS.map((name, i) => {
        const tx = cx + (i - 0.5) * (TAB_W + TAB_GAP);
        const ty = cy - PH / 2 + 100;
        const grp = this.add.container(tx, ty).setScrollFactor(0).setDepth(302);
        const isAct = i === activeTab;
        grp.add(this._drawScale9(0, 0, TAB_W, TAB_H, 'GJ_button01', btnBorder, isAct ? 0xffffff : 0x666666, 1));
        const lbl = this.add.bitmapText(0, -3, 'goldFont', name, 30).setOrigin(0.5, 0.5);
        if (!isAct) lbl.setTint(0x888888);
        grp.add(lbl);
        const hz = this.add.zone(0, 0, TAB_W, TAB_H).setInteractive();
        grp.add(hz);
        hz.on('pointerup', () => switchTab(i));
        popup.add(grp);
        return { grp, lbl };
    });

    // ── content containers ────────────────────────────────────────────────────
    const loginContainer    = this.add.container(0, 0).setScrollFactor(0).setDepth(302);
    const registerContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(302);
    const loggedContainer   = this.add.container(0, 0).setScrollFactor(0).setDepth(302);
    popup.add(loginContainer);
    popup.add(registerContainer);
    popup.add(loggedContainer);

    // ── LOGIN fields ──────────────────────────────────────────────────────────
    const fieldY1 = cy - 40, fieldY2 = cy + 30, fieldW = 340, fieldH = 42;
    const loginUser = makeHtmlInput(cx, fieldY1, fieldW, fieldH, 'Username');
    const loginPass = makeHtmlInput(cx, fieldY2, fieldW, fieldH, 'Password', true);

    const doLogin = async () => {
        const user = loginUser.getValue().trim();
        const pass = loginPass.getValue();
        if (!user || !pass) { showStatus('Fill in all fields.', 0xff9900); return; }
        if (!GD_SERVER) { showStatus('No proxy configured.', 0xff4444); return; }
        showStatus('Logging in...', 0xaaddff, 0);
        try {
            const gjp2 = await sha1(pass + 'mI29fmAnxgTs');
            const res  = await gdPost('loginGJAccount.php', {
                userName: user,
                password: pass,
                gjp2,
                udid: 'S' + Math.random().toString(36).slice(2, 12),
                sID: 76561198,
                gameVersion: 22,
                binaryVersion: 40,
            });
            if (res === '-1') { showStatus('Login failed. Check credentials.', 0xff4444); return; }
            const [accountID, playerID] = res.split(',');
            localStorage.setItem('gd_userName',  user);
            localStorage.setItem('gd_accountID', accountID);
            localStorage.setItem('gd_playerID',  playerID);
            localStorage.setItem('gd_gjp2',      gjp2);
            showStatus('Logged in!', 0x44ff88, 2500);
            setTimeout(() => { buildLoggedIn(); }, 800);
        } catch (e) {
            showStatus('Error: ' + e.message, 0xff4444);
        }
    };

    const loginBtn = makeBtn(cx, cy + 110, 'Login', doLogin);

    // ── REGISTER fields ───────────────────────────────────────────────────────
    const rY1 = cy - 55, rY2 = cy - 5, rY3 = cy + 50;
    const regUser  = makeHtmlInput(cx, rY1, fieldW, fieldH, 'Username');
    const regEmail = makeHtmlInput(cx, rY2, fieldW, fieldH, 'Email');
    const regPass  = makeHtmlInput(cx, rY3, fieldW, fieldH, 'Password', true);

    const doRegister = async () => {
        const user  = regUser.getValue().trim();
        const email = regEmail.getValue().trim();
        const pass  = regPass.getValue();
        if (!user || !email || !pass) { showStatus('Fill in all fields.', 0xff9900); return; }
        if (!/\S+@\S+\.\S+/.test(email)) { showStatus('Invalid email address.', 0xff9900); return; }
        if (pass.length < 6) { showStatus('Password must be at least 6 characters.', 0xff9900); return; }
        if (!GD_SERVER) { showStatus('No proxy configured.', 0xff4444); return; }
        showStatus('Registering...', 0xaaddff, 0);
        try {
            const res = await gdPost('registerGJAccount.php', {
                userName: user,
                password: pass,
                email,
                gameVersion: 22,
                binaryVersion: 40,
            });
            if (res === '1') {
                showStatus('Account created! You can now log in.', 0x44ff88, 4000);
                regUser.clear(); regEmail.clear(); regPass.clear();
                switchTab(0);
                loginUser.setValue(user);
            } else {
                const errors = {
                    '-1': 'Registration failed.',
                    '-2': 'Username already taken.',
                    '-3': 'Email already registered.',
                    '-4': 'Username too short (min 3 chars).',
                    '-9': 'Invalid email address.',
                };
                showStatus(errors[res] || `Error code: ${res}`, 0xff4444);
            }
        } catch (e) {
            showStatus('Error: ' + e.message, 0xff4444);
        }
    };

    const registerBtn = makeBtn(cx, cy + 110, 'Register', doRegister);

    // ── LOGGED-IN view ────────────────────────────────────────────────────────
    const buildLoggedIn = () => {
        loginContainer.setVisible(false);
        registerContainer.setVisible(false);
        tabBtns.forEach(t => t.grp.setVisible(false));
        loginBtn.setVisible(false);
        registerBtn.setVisible(false);
        loggedContainer.setVisible(true);
        loggedContainer.removeAll(true);

        const user = savedUser();
        const aid  = savedAID();

        loggedContainer.add(
            this.add.bitmapText(cx, cy - 60, 'bigFont', user, 44).setOrigin(0.5)
        );
        loggedContainer.add(
            this.add.bitmapText(cx, cy - 10, 'bigFont', `Account ID: ${aid}`, 22).setOrigin(0.5).setTint(0xaaddff)
        );

        const logoutBtn = makeBtn(cx - 130, cy + 80, 'Logout', () => {
            localStorage.removeItem('gd_userName');
            localStorage.removeItem('gd_accountID');
            localStorage.removeItem('gd_playerID');
            localStorage.removeItem('gd_gjp2');
            showStatus('Logged out.', 0xffffff, 2000);
            loggedContainer.setVisible(false);
            tabBtns.forEach(t => t.grp.setVisible(true));
            loginBtn.setVisible(true);
            registerBtn.setVisible(false);
            switchTab(0);
        }, 0xffffff);
        loggedContainer.add(logoutBtn);
    };

    // ── tab switcher ──────────────────────────────────────────────────────────
    const switchTab = (idx) => {
        activeTab = idx;
        tabBtns.forEach(({ grp, lbl }, i) => {
            const active = i === idx;
            // re-tint the 9-slice bg
            grp.getAt(0).list?.forEach(child => {
                if (child.setTint) child.setTint(active ? 0xffffff : 0x666666);
            });
            lbl.setTint(active ? 0xffffff : 0x888888);
        });
        loginContainer.setVisible(idx === 0);
        registerContainer.setVisible(idx === 1);
        loginBtn.setVisible(idx === 0);
        registerBtn.setVisible(idx === 1);
        statusTxt.setText('');
    };

    // login tab: inputs are already created outside containers so they're always accessible
    loginContainer.add(this.add.bitmapText(cx, fieldY1 - 28, 'bigFont', 'Username', 20).setOrigin(0.5).setTint(0xdddddd));
    loginContainer.add(this.add.bitmapText(cx, fieldY2 - 28, 'bigFont', 'Password', 20).setOrigin(0.5).setTint(0xdddddd));

    registerContainer.add(this.add.bitmapText(cx, rY1 - 28, 'bigFont', 'Username', 20).setOrigin(0.5).setTint(0xdddddd));
    registerContainer.add(this.add.bitmapText(cx, rY2 - 28, 'bigFont', 'Email',    20).setOrigin(0.5).setTint(0xdddddd));
    registerContainer.add(this.add.bitmapText(cx, rY3 - 28, 'bigFont', 'Password', 20).setOrigin(0.5).setTint(0xdddddd));

    // ── initial state ─────────────────────────────────────────────────────────
    loggedContainer.setVisible(false);
    if (savedUser() && savedAID() && savedGJP()) {
        buildLoggedIn();
    } else {
        switchTab(0);
    }
}

// ── Auto-attach to GameScene once it is defined ───────────────────────────────
(function attachToGameScene() {
    const attach = () => {
        if (typeof GameScene !== 'undefined') {
            GameScene.prototype._buildAccountPopup = _buildAccountPopup;
        } else {
            // GameScene is loaded with defer; retry after a tick
            setTimeout(attach, 50);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();
