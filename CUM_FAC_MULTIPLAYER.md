# 🐾 Life of Puiutu — Multiplayer (vezi-ți prietenii + chat)

Jocul are deja codul de multiplayer. Ca să-l joace prietenii tăi pe un **link public**,
trebuie urcat pe un server gratuit. Mai jos, cea mai simplă cale (fără terminal, fără programare).

Fișierul **`puiutu_multiplayer.zip`** conține tot ce ai nevoie:
- `life_of_puiutu_game.html` — jocul
- `server.js` — serverul (servește jocul + ține legătura între jucători)
- `package.json` — lista de dependențe
- `sprite_*.png` — pisicile
- `garden.jpeg` — fundalul (adaugă și `street.jpeg`/`house.jpeg` când le faci)

---

## ✅ Varianta cea mai ușoară: Replit (în browser, gratuit)

1. Intră pe **https://replit.com** și fă-ți cont gratuit (Google login merge).
2. Apasă **Create Repl** → alege template **Node.js** → **Create Repl**.
3. În stânga (lista de fișiere), apasă pe cele 3 puncte **⋮** → **Upload file** și
   urcă TOATE fișierele din zip (sau dezarhivează zip-ul pe calculator și urcă fișierele).
   - Important: când te întreabă să suprascrie `package.json`, spune **DA** (al meu e cel bun).
   - Dacă există deja un `index.js`, îl poți șterge — folosim `server.js`.
4. Apasă butonul mare verde **Run** (sus). Replit instalează singur dependențele și pornește serverul.
5. Se deschide un mic webview cu jocul. Apasă pe iconița **🔗 / "Open in new tab"** ca să iei
   **link-ul public** (arată cam așa: `https://life-of-puiutu.numele-tau.repl.co`).
6. **Trimite link-ul prietenilor!** Cine îl deschide își alege un nume și intrați toți pe aceeași hartă.

> Pe Replit gratuit, repl-ul „adoarme" când nu e folosit — prima deschidere poate dura câteva secunde.

---

## 🟢 Alternativă mai stabilă: Render (link care nu adoarme)

Necesită un cont GitHub (gratuit).
1. Pune fișierele într-un repo GitHub (poți face upload din browser pe github.com → New repository → Upload files).
2. Intră pe **https://render.com** → cont gratuit → **New +** → **Web Service** → conectează repo-ul.
3. Setări: Environment **Node**, Build Command `npm install`, Start Command `npm start`. Apasă **Create Web Service**.
4. După build îți dă un link `https://....onrender.com` — ăla e link-ul de trimis prietenilor.

---

## Cum se joacă în multiplayer
- Deschizi link-ul → scrii un **nume** → **Play Game**.
- Sus apare **👥 N** = câți sunteți online.
- Vă vedeți pisicile mișcându-se în timp real pe aceeași zonă (Grădina/Strada/Casa).
- **Chat:** apasă tasta **Enter** (sau butonul **💬** pe telefon), scrii, **Enter** ca să trimiți.
  Mesajul apare ca bulă deasupra pisicii tale și în colțul din stânga.

## Note
- Local (dublu-click pe fișier) jocul rămâne **single-player** — multiplayer pornește doar când e găzduit online.
- Toți jucătorii apar deocamdată ca Puiutu (tabby maro), diferențiați prin nume și pălărie.
  Dacă vrei ca fiecare să-și aleagă altă pisică (Tomy/Lucian/NomNom), spune-mi și adaug selecția de skin.
- Monedele/scorul sunt deocamdată individuale (fiecare cu progresul lui). Dacă vrei pești comuni /
  competiție „cine adună mai mulți" ca în Transformice, ăsta e următorul pas.
