# Life of Puiutu — plan de trailer

**~60 secunde · ~70 de tăieturi · text în engleză peste imagine · muzică intensă.**

Principiul: **niciun cadru static.** Fiecare shot ori panoramează (`F4`), ori are push-in
(`F9`). Singurul cadru care stă pe loc e ultimul — și tocmai de asta lovește.

Structura e un sandwich: **deschidem cu monstrul, uităm de el 45 de secunde de joc vesel și
rapid, apoi se întoarce la final.**

---

## 0. Unelte de captură (în joc, taste F)

| Tastă | Efect |
|---|---|
| `F2` | mod cinematic: ascunde HUD, butoane, chat, cursor + toate etichetele plutitoare |
| `F3` | benzi letterbox 2.35:1 |
| `F4` | dolly (panoramare constantă). `Shift+F4` = stânga. F4 din nou = stop |
| `F5` | ascunde pisica (cadre de lume goală) |
| `F6` / `F7` | dolly mai lent / mai rapid |
| `F8` | readuce etichetele (ex. mob `Lv.10 ★ LEGENDARY`) |
| `F9` | **push-in lent** (7s). `Shift+F9` = push-in rapid, agresiv (2s) — pentru tăieturile scurte. F9 din nou resetează |
| `F10` | **înregistrează canvas-ul** direct în `.webm`. F10 din nou = stop + descarcă |
| `Shift+F11` | **regizor automat**: rulează singur cele 12 cadre de lume + Dreamer-ul (~18s) |

Comenzi (Enter → comandă → Enter):
`!warp <zona>` · `!lvl 25` · `!money` · `!allcatsforone`

Zone: `garden`, `towergarden`, `library`, `beach`, `ocean1`, `ocean2`, `abyssboss`, `cave`,
`sebyboss`, `street`, `slum`, `slum2`, `ratking`, `sewerentrance`, `sewer`, `bank`, `house`.

> ⚠️ **Dă `!lvl 25` înainte de orice warp la boss.** La nivel mic mori în ~3 secunde și
> prinzi „YOU FAINTED" în cadru.

**Rețeta unui cadru:** `!warp` → `F2` → `F3` → (opțional `F5`) → `Shift+F9` → înregistrezi
3-4s → `F9` reset → următorul. Pentru cadre lungi de peisaj: `CINE.x = 0` în consolă, apoi `F4`.

**Setup:** Chrome, DevTools → device toolbar → 1920×1080, zoom 100%. OBS/`Cmd+Shift+5`, 60fps.

### Captura automată (calea rapidă)

1. Fereastră Chrome **maximizată** — canvas-ul se redimensionează după fereastră, deci
   rezoluția fișierului = rezoluția ferestrei. Fereastră mică = video mic.
2. `F10` (pornește înregistrarea) → `Shift+F11` (regizorul rulează) → `F10` (stop + descarcă)
3. Îți iese un `.webm` de ~18 secunde cu Actul I complet + Dreamer-ul, fără HUD, cu panoramări.

**Ce prinde și ce nu:** înregistrarea canvas capturează doar pixelii de joc — perfect pentru
overworld, boss-i, pisici. **Nu** prinde minijocurile (sunt DOM, nu canvas), benzile letterbox
și push-in-ul (`F9` e transform CSS). Alea le adaugi în editor sau le filmezi cu OBS.

### `.webm` → `.mov`

ffmpeg nu e instalat pe mașina asta:

```bash
brew install ffmpeg
```

Apoi, ProRes pentru montaj (fișier mare, dar editorul îl mestecă instant):

```bash
ffmpeg -i puiutu_*.webm -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le trailer.mov
```

Sau H.264 dacă vrei doar să-l trimiți cuiva:

```bash
ffmpeg -i puiutu_*.webm -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p trailer.mov
```

---

## 1. Ritm

Alege o piesă la **~150 BPM**. Atunci:
- 1 beat = **0.4s** · 1 bar = **1.6s**

| Secțiune | Tăietură la |
|---|---|
| Blast de lume | 2 beats (0.8s) |
| Acțiune | 1.5 beats (0.6s) |
| Minijocuri | **1 beat (0.4s)** — mitralieră |
| Boss-i | 2-3 beats (0.8–1.2s), încetinind spre final |
| Dreamer | fără tăieturi. 6 secunde dintr-o bucată. |

Contrastul ăsta — mitralieră, apoi oprire totală — e tot ce trebuie ca să pară montat de un om.

---

## 2. Shot list

### COLD OPEN — monstrul (0:00–0:04) · *fără muzică, doar un rumble jos*

| # | sec | Setup | Cadru |
|---|---|---|---|
| 1 | 0:00–0:02.5 | `!lvl 25` → `!warp abyssboss`, F2+F3 | Întuneric. Ochii roșii se aprind în beznă. |
| 2 | 0:02.5–0:04 | — | **Tăiere la negru.** Un beat de tăcere. |

> **Text:** `Something is waking up.` — apare la 0:01, dispare cu tăierea la negru.

### ACT I — BLAST DE LUME (0:04–0:16) · *muzica intră brutal pe 0:04*

12 cadre × 0.8s. Fiecare cu `Shift+F9` (push-in agresiv) sau dolly rapid (`F7` de 2 ori).
Smash cut din negru direct în soare — contrastul cu abisul e tot rostul deschiderii.

| # | Zonă | Notă |
|---|---|---|
| 3 | `garden` | Soare, flori. **Aici cade titlul.** |
| 4 | `towergarden` | Porumbei ridicându-se |
| 5 | `library` | Lumină caldă printre rafturi |
| 6 | `street` | Orașul la apus |
| 7 | `slum2` | Murdar, strâmt |
| 8 | `sewer` | Verde-toxic |
| 9 | `beach` | Deschidere, valuri |
| 10 | `ocean1` | Lumină filtrată prin apă |
| 11 | `ocean2` | Mai adânc, mai albastru |
| 12 | `cave` | Glow violet |
| 13 | `sebyboss` | Cristale |
| 14 | `bank` | Sir Oink — o notă comică între două cadre grave |

> **Text:** `LIFE OF PUIUTU` smash pe cadrul 3 (0:04, pe primul beat al muzicii).
> `A whole world.` pe cadrul 8 (0:09).

### ACT II — ACȚIUNE (0:16–0:24) · *tăieturi de 0.6s*

| # | Cadru |
|---|---|
| 15-16 | Luptă: alegi mută → hit → mob-ul cade |
| 17 | Pescuit: momentul în care mușcă (nu tot minijocul — doar smucitura) |
| 18 | Sewer chase, viteză |
| 19 | Minecart, schimbare de bandă în ultima clipă |
| 20 | Sări peste un gol, aterizare |
| 21 | Telefonul: graficul bursei urcând |

> **Text:** `Fight it.` (0:16) · `Fish it.` (0:19) · `Get rich. Or don't.` (0:22, peste bursă)

### ACT III — MITRALIERĂ DE MINIJOCURI (0:24–0:32) · *tăieturi de 0.4s, pe beat*

20 de flash-uri, câte 2 din fiecare minijoc — doar **momentul de satisfacție**, niciodată setup-ul:
fruit merge (fuziunea) · color sort (turnarea) · circuit (se aprinde) · fossil dig (fosila apare) ·
portal seal (runele) · lights-out (ultimul cristal) · gacha (capsula crapă) · minecart (evitare la limită).

> **Text:** `Dig it. Sort it. Solve it.` (0:26) · `Then do it again.` (0:30)

### ACT IV — BOSS-I (0:32–0:44) · *muzica la maxim, tăieturi încetinind*

| # | sec | Zonă | Cadru |
|---|---|---|---|
| 42 | 0:32–0:33 | `ratking` | Intrare în cameră |
| 43 | 0:33–0:35 | `house` | Evil Coon, lovitură |
| 44 | 0:35–0:37 | `sebyboss` | Bariera de cristal se sparge |
| 45 | 0:37–0:40 | `sebyboss` | Queen Seby, atac mare |
| 46 | 0:40–0:44 | `abyssboss` | **Tentacul care izbește** — primul semn că abisul din intro e real |

> **Text:** `Some things fight back.` (0:34)

### ACT V — PISICILE (0:44–0:50) · *`!allcatsforone` întâi, tăieturi de 0.5s*

Aceeași pisică, alte rase, alte zone — 12 cadre rapide: Maine Coon în grădină, Sphynx în
canal, Angora pe plajă, Bengal în peșteră, Ragdoll în bibliotecă, Russian Blue în oraș…

> **Text:** `Be any cat you want.` (0:46)

### ACT VI — THE DREAMER (0:50–0:56) · *muzica se OPREȘTE. Doar sub-bass.*

| # | sec | Cadru |
|---|---|---|
| 58 | 0:50–0:56 | `!warp abyssboss` — secvența de intro, **fără tăieturi**: întunericul se adâncește, ochii roșii se aprind și pulsează, textul din joc `Something stirs in the deep…` apare, flash alb. |

Secvența durează exact 5.2s și e deja scrisă în joc — o filmezi o dată, întreagă, și e gata.
Nu pune text peste: jocul are deja replica lui.

> **Sunet:** tăcere totală de la 0:50. Un singur boom de sub-bass pe flash-ul alb (0:55).

### FINAL (0:56–1:00)

Logo pe negru + `Play free in your browser` + link. Ultimul ecou de bass se stinge.

---

## 3. Tot textul, la un loc (engleză)

```
0:01  Something is waking up.
0:04  LIFE OF PUIUTU
0:09  A whole world.
0:16  Fight it.
0:19  Fish it.
0:22  Get rich. Or don't.
0:26  Dig it. Sort it. Solve it.
0:30  Then do it again.
0:34  Some things fight back.
0:46  Be any cat you want.
0:57  Play free in your browser  ·  [link]
```

**Stil:** sans-serif gros, alb, centrat jos sau la 1/3 sus. Intră **tăiat**, nu fade —
fade-urile omoară ritmul. Fiecare stă 1.2-1.6s.

---

## 4. Muzică

Nu există fișiere de muzică în joc (SFX-urile sunt procedurale), deci muzica intră la montaj.

Caută: **~150 BPM, hybrid trailer / electronic, cu chiptune peste.** Structura de care ai nevoie:

| Moment | Ce trebuie să facă muzica |
|---|---|
| 0:00–0:04 | nimic — doar un rumble jos |
| **0:04** | **intrare brutală, pe primul beat** |
| 0:04–0:32 | energie constantă, groove |
| 0:30–0:32 | riser |
| **0:32** | drop, secțiunea cea mai grea |
| **0:50** | **stop total** |
| 0:55 | un singur boom de sub-bass |

Surse: Uppbeat, Epidemic Sound, Artlist. Ține SFX-urile din joc (coin, level-up, victorie)
la volum mic peste muzică — dau senzația de joc real.

---

## 5. Ordinea de lucru

1. **Filmează întâi Actul VI** (Dreamer) și **Actul I** (blast de lume). Astea două decid
   dacă trailerul funcționează. ~30 min.
2. Alege muzica pe baza lor.
3. Restul cadrelor — sunt scurte, se filmează repede.
4. Montaj v1: doar ordine + ritm, fără text.
5. Montaj v2: text, gradare de culoare.
6. Export 1080p60 + versiune verticală 9:16 de 30s (cold open → mitralieră → Dreamer → logo).

## 6. Capcane

- Dacă o hartă e mai îngustă decât ecranul, dolly-ul n-are pe unde să meargă — folosește `Shift+F9`.
- La tăieturi de 0.4s, **filmează 3-4s din fiecare** și alege cea mai bună jumătate de secundă.
- Nu lăsa „YOU FAINTED" în cadru: `!lvl 25`.
- Rezistă tentației de a lungi cadrele frumoase. Trailerul ăsta trăiește din viteză; galeria
  de arte frumoase o faci separat, în screenshot-uri.
