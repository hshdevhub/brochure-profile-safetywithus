# Deployment Manual — brochure.safetywithus.com

Automatic deploys of this project to the Hostinger VPS via GitHub Actions.

- **Repo:** https://github.com/hshdevhub/brochure-profile-safetywithus
- **Live URL:** https://brochure.safetywithus.com
- **VPS:** `srv1107215` · `46.202.167.121` · user `root` · SSH port `22`
- **Web root on VPS:** `/var/www/brochure.safetywithus.com/public_html`
- **Stack:** Vite (vanilla HTML/CSS/JS) → static `dist/`. `vite.config.js` uses `base: './'`, so it serves correctly at a subdomain root.

## How it works

```
git push main ─▶ GitHub Actions ─▶ npm ci + npm run build ─▶ rsync dist/ over SSH ─▶ /var/www/brochure.safetywithus.com/public_html ─▶ Nginx serves it
```

Workflow file: `.github/workflows/deploy.yml` (triggers on push to `main`, or manually via the Actions tab).

---

## One-time setup

### 1. DNS
In the Hostinger DNS zone for **safetywithus.com**, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `brochure` | `46.202.167.121` | default |

Verify: `dig brochure.safetywithus.com +short` → `46.202.167.121`.

### 2. Deploy SSH key (GitHub → VPS)

> ⚠️ **Do NOT use `ssh-copy-id` from your home/office Wi-Fi.** Failed SSH attempts make `fail2ban`
> ban your network's public IP, which blocks **every device on that Wi-Fi** from the VPS (all ports,
> including the websites). Instead, paste the public key in via the Hostinger **Browser Terminal**.

On your Mac, generate a dedicated key (no passphrase):
```bash
ssh-keygen -t ed25519 -C "github-actions-brochure" -f ~/.ssh/brochure_deploy
```

In the Hostinger **Browser Terminal** (server-side console — never gets you banned), add the **public** key:
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "PASTE_CONTENTS_OF_~/.ssh/brochure_deploy.pub_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Keep the **private** key (`cat ~/.ssh/brochure_deploy`) for the GitHub secret in step 6.

### 3. VPS directory
In the Browser Terminal:
```bash
sudo mkdir -p /var/www/brochure.safetywithus.com/{public_html,logs}
sudo chown -R $USER:$USER /var/www/brochure.safetywithus.com
sudo chmod -R 755 /var/www/brochure.safetywithus.com
```

### 4. Nginx
```bash
sudo nano /etc/nginx/sites-available/brochure.safetywithus.com
```
```nginx
server {
    listen 80;
    server_name brochure.safetywithus.com;

    root /var/www/brochure.safetywithus.com/public_html;
    index index.html;

    access_log /var/www/brochure.safetywithus.com/logs/access.log;
    error_log  /var/www/brochure.safetywithus.com/logs/error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```
Enable, test, reload:
```bash
sudo ln -s /etc/nginx/sites-available/brochure.safetywithus.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add 4:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `46.202.167.121` |
| `VPS_USERNAME` | `root` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | entire private key from `cat ~/.ssh/brochure_deploy` (incl. BEGIN/END lines) |

### 6. First deploy
GitHub → **Actions** → "Deploy brochure.safetywithus.com to VPS" → **Run workflow** (or push any commit).
Once green, `index.html` exists on the server — now do SSL.

### 7. SSL (after the first successful deploy)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d brochure.safetywithus.com   # choose: redirect HTTP → HTTPS
sudo certbot renew --dry-run                          # confirm auto-renewal
```
Visit https://brochure.safetywithus.com — padlock should be green.

---

## Routine deploys

Just push to `main`:
```bash
git add -A && git commit -m "your change" && git push origin main
```
GitHub Actions builds and rsyncs automatically. Watch progress in the **Actions** tab. No server commands needed (static files; Nginx picks them up immediately).

Manual deploy: Actions → the workflow → **Run workflow**.

---

## Verify / logs / rollback

```bash
# what's deployed
ls -la /var/www/brochure.safetywithus.com/public_html/

# nginx logs for this site
sudo tail -f /var/www/brochure.safetywithus.com/logs/error.log
sudo tail -f /var/www/brochure.safetywithus.com/logs/access.log
```
Rollback = re-run the workflow on an earlier commit (Actions → pick the commit → re-run), or `git revert` and push.

---

## fail2ban safety (important — this locked us out once)

Symptom we hit: **the site worked on mobile data but not on home Wi-Fi, for every device.** Cause: repeated
failed SSH attempts (`ssh-copy-id`) made `fail2ban` ban the Wi-Fi's public IP across all ports. It does **not**
affect normal site visitors (they never SSH) — only the network that failed SSH logins.

If it happens again, in the Browser Terminal:
```bash
sudo fail2ban-client status sshd        # see the Banned IP list
sudo fail2ban-client unban --all        # clear all bans  (or: set sshd unbanip <IP>)
```

Prevention (recommended):
1. **Whitelist your admin IP** so you can't ban yourself — edit `/etc/fail2ban/jail.local`:
   ```
   [DEFAULT]
   ignoreip = 127.0.0.1/8 ::1 YOUR_HOME_IP
   ```
   then `sudo systemctl restart fail2ban`. (Home IPs are often dynamic, so this can change.)
2. **Use key auth via the Browser Terminal** (step 2 above) instead of `ssh-copy-id` — no failed attempts, no bans.
3. **Scope SSH bans to port 22 only** so a banned IP can still load the websites. Check:
   ```bash
   grep -R "banaction\|allports" /etc/fail2ban/jail.local /etc/fail2ban/jail.d/ 2>/dev/null
   ```
   If you see `iptables-allports` or a `recidive` jail, switch the sshd jail to `banaction = iptables-multiport`
   with `port = ssh`.

---

## Troubleshooting quick table

| Symptom | Cause | Fix |
|---------|-------|-----|
| Site loads on mobile, not on your Wi-Fi (all devices) | fail2ban banned your network IP | `sudo fail2ban-client unban --all` + whitelist your IP |
| Actions deploy fails at rsync | wrong/empty secret, or public key not in VPS `authorized_keys` | recheck the 4 secrets; re-add the public key via Browser Terminal |
| 403 Forbidden | `index.html` missing / perms | confirm first deploy ran; `sudo chmod 644 .../public_html/index.html` |
| SSL not issued | ran certbot before first deploy | deploy first (so `index.html` exists), then `sudo certbot --nginx -d brochure.safetywithus.com` |
| Old content after deploy | browser cache | hard refresh (Cmd+Shift+R) |

---

## Reusing this for another project

Copy this repo's `.github/workflows/deploy.yml`, change the deploy path
(`/var/www/<other-domain>/public_html/`) and the workflow `name`, add the same 4 secrets to that repo, and
repeat steps 1, 3, 4, 7 for the new domain. The deploy SSH key (step 2) can be reused across projects on the
same VPS.
