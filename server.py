import os
import re
import math
import asyncio
from typing import Optional, Tuple
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="3D Generator")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

API_KEY = os.getenv("SKETCHFAB_API_KEY", "")
BASE    = "https://api.sketchfab.com/v3"

# ─── Language detection & translation ────────────────────────────────────────

# Romanian-specific diacritics and very common Romanian words
RO_CHARS    = set("ăâîșțĂÂÎȘȚ")
RO_WORDS    = {
    # function words
    "un","o","cu","și","sau","de","la","în","pe","cel","cea","ale","ai",
    "al","este","sunt","are","care","din","spre","după","între","fără",
    "si","cu","pe","din","pentru","despre","langa","intre","dupa","spre",
    # verbs / actions
    "genereaza","generează","vreau","arata","arată","faci","face",
    "pune","creeaza","creează","cauta","caută","fă","fa","da","fii",
    # common nouns (with and without diacritics)
    "masina","mașina","mașină","masină",
    "avion","nava","navă","barca","barcă","tren","camion",
    "castel","turn","cetate","palat","ruine","pod","casa","casă",
    "dragon","zmeu","balaur","monstru","razboinic","războinic",
    "sabie","scut","arc","arma","armă","pistol","pusca","pușcă",
    "copac","padure","pădure","munte","piatra","piatră","cristal","floare",
    "robot","nava","racheta","rachetă","spaceship",
    "animal","caine","câine","pisica","pisică","cal","lup","vulpe","urs",
    "om","femeie","barbat","bărbat","copil","razboinic",
    "scaun","masa","masă","lampa","lampă","canapea","pat",
    "rosu","roșu","albastru","verde","galben","negru","alb","violet",
    "mare","mic","vechi","nou","modern","medieval","antic","futurist",
    "lemn","metal","piatră","piatra","aur","argint","fier","otel","oțel",
    "low","poly","stilizat","realist","cartoon","sci-fi",
    "obiect","model","lucru","forma","formă",
}

def is_romanian(text: str) -> bool:
    """Return True if text looks like Romanian."""
    # Check for Romanian-specific diacritics
    if any(c in RO_CHARS for c in text):
        return True
    # Check for common Romanian function words
    words = set(re.sub(r"[^\w\s]", " ", text.lower()).split())
    return len(words & RO_WORDS) >= 1


async def translate_to_english(text: str) -> Tuple[str, bool]:
    """
    Translate Romanian text to English using the free MyMemory API.
    Returns (translated_text, was_translated).
    Falls back to original text on any error.
    """
    if not is_romanian(text):
        return text, False

    try:
        url = "https://api.mymemory.translated.net/get"
        params = {"q": text, "langpair": "ro|en", "de": "isaacai@app.ro"}
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params=params)
        if r.status_code == 200:
            data = r.json()
            translated = data.get("responseData", {}).get("translatedText", "")
            if translated and translated.upper() != text.upper():
                return translated, True
    except Exception:
        pass  # silently fall back to original

    return text, False




STOPWORDS = {
    "a","an","the","of","in","on","at","to","for","with","and","or","is","are",
    "was","be","by","it","its","this","that","from","as","up","into","make",
    "made","create","show","me","give","find","get","some","very","really","just",
    "good","looking","model","models","object","thing","something","render","3d",
    "generate","please","want","need","like","would",
}

CATEGORY_MAP = {
    "animal":"animals-pets","dog":"animals-pets","cat":"animals-pets",
    "bird":"animals-pets","fish":"animals-pets","horse":"animals-pets",
    "wolf":"animals-pets","dragon":"animals-pets","lion":"animals-pets",
    "tiger":"animals-pets","bear":"animals-pets","shark":"animals-pets",
    "dinosaur":"animals-pets","dino":"animals-pets","snake":"animals-pets",
    "rabbit":"animals-pets","deer":"animals-pets","fox":"animals-pets",
    "eagle":"animals-pets","owl":"animals-pets","whale":"animals-pets",
    "building":"architecture","house":"architecture","castle":"architecture",
    "tower":"architecture","bridge":"architecture","church":"architecture",
    "temple":"architecture","skyscraper":"architecture","room":"architecture",
    "interior":"architecture","palace":"architecture","ruins":"architecture",
    "dungeon":"architecture","fortress":"architecture","cabin":"architecture",
    "car":"cars-vehicles","truck":"cars-vehicles","tank":"cars-vehicles",
    "plane":"cars-vehicles","aircraft":"cars-vehicles","ship":"cars-vehicles",
    "boat":"cars-vehicles","helicopter":"cars-vehicles","motorcycle":"cars-vehicles",
    "bike":"cars-vehicles","train":"cars-vehicles","spaceship":"cars-vehicles",
    "rocket":"cars-vehicles","submarine":"cars-vehicles","vehicle":"cars-vehicles",
    "character":"characters-creatures","person":"characters-creatures",
    "human":"characters-creatures","warrior":"characters-creatures",
    "soldier":"characters-creatures","knight":"characters-creatures",
    "robot":"characters-creatures","zombie":"characters-creatures",
    "alien":"characters-creatures","monster":"characters-creatures",
    "creature":"characters-creatures","hero":"characters-creatures",
    "samurai":"characters-creatures","ninja":"characters-creatures",
    "sword":"weapons-military","gun":"weapons-military","weapon":"weapons-military",
    "rifle":"weapons-military","pistol":"weapons-military","bow":"weapons-military",
    "axe":"weapons-military","shield":"weapons-military","armor":"weapons-military",
    "tree":"nature-plants","plant":"nature-plants","flower":"nature-plants",
    "rock":"nature-plants","mountain":"nature-plants","forest":"nature-plants",
    "grass":"nature-plants","mushroom":"nature-plants","crystal":"nature-plants",
    "food":"food-drink","fruit":"food-drink","cake":"food-drink",
    "chair":"furniture-home","table":"furniture-home","sofa":"furniture-home",
    "desk":"furniture-home","lamp":"furniture-home","furniture":"furniture-home",
    "phone":"electronics-gadgets","laptop":"electronics-gadgets","drone":"science-technology",
    "statue":"art-abstract","sculpture":"art-abstract","abstract":"art-abstract",
    "man":"people","woman":"people","head":"people","face":"people",
}


def extract_keywords(query: str) -> list:
    words = re.sub(r"[^\w\s]", " ", query.lower()).split()
    seen, out = set(), []
    for w in words:
        if w not in STOPWORDS and len(w) > 1 and w not in seen:
            seen.add(w)
            out.append(w)
    return out


def detect_category(keywords: list) -> Optional[str]:
    for kw in keywords:
        if kw in CATEGORY_MAP:
            return CATEGORY_MAP[kw]
    return None


def build_query(raw: str) -> tuple:
    kw = extract_keywords(raw)
    cat = detect_category(kw)
    clean = " ".join(kw) if kw else raw.strip()
    return clean, cat, kw


# ─── Scoring ─────────────────────────────────────────────────────────────────

def keyword_match_score(name: str, keywords: list) -> float:
    """How many prompt keywords appear in the model name (0.0 – 1.0)."""
    if not keywords:
        return 0.0
    name_lower = name.lower()
    hits = sum(1 for kw in keywords if kw in name_lower)
    return hits / len(keywords)


def score_model(m: dict, keywords: list, max_likes: int, max_views: int) -> float:
    name = m.get("name", "")

    # 1. Keyword match in model name — most important signal
    km = keyword_match_score(name, keywords)
    kw_score = km * 55.0   # 0–55 pts

    # 2. Popularity (log-normalized)
    likes = m.get("likeCount", 0) or 0
    views = m.get("viewCount", 0) or 0
    like_score = (math.log10(likes + 1) / math.log10(max(max_likes, 1) + 2)) * 28.0
    view_score = (math.log10(views + 1) / math.log10(max(max_views, 1) + 2)) * 8.0

    # 3. Quality signals
    faces = m.get("faceCount", 0) or 0
    face_score  = 6.0 if 1_000 < faces < 600_000 else (2.0 if faces > 0 else 0.0)
    dl_bonus    = 3.0 if m.get("downloadable") else 0.0

    return kw_score + like_score + view_score + face_score + dl_bonus


def format_model(m: dict) -> dict:
    thumbnails = m.get("thumbnails", {}).get("images", [])
    thumb = next(
        (t["url"] for t in thumbnails if t.get("width", 0) >= 300),
        thumbnails[0]["url"] if thumbnails else "",
    )
    return {
        "uid":         m["uid"],
        "name":        m.get("name", "Untitled"),
        "author":      m.get("user", {}).get("displayName", "Unknown"),
        "thumbnail":   thumb,
        "viewerUrl":   f"https://sketchfab.com/models/{m['uid']}/embed",
        "pageUrl":     m.get("viewerUrl", f"https://sketchfab.com/3d-models/{m['uid']}"),
        "likeCount":   m.get("likeCount", 0),
        "viewCount":   m.get("viewCount", 0),
        "faceCount":   m.get("faceCount", 0),
        "animated":    m.get("isAnimated", False),
        "downloadable":m.get("isDownloadable", False),
        "rigged":      m.get("isRigged", False),
        "license":     (m.get("license") or {}).get("label", ""),
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/best")
async def get_best(q: str = Query(...)):
    if not API_KEY:
        raise HTTPException(500, "SKETCHFAB_API_KEY not configured")

    # Translate Romanian → English before keyword extraction
    english_q, was_translated = await translate_to_english(q)

    clean_q, category, keywords = build_query(english_q)
    headers = {"Authorization": f"Token {API_KEY}"}

    # Tags-based search works reliably with -likeCount sort.
    # Fire one search per keyword (up to 3), then merge candidates.
    search_kws = keywords[:3] if keywords else [clean_q]

    async def fetch_tag(tag: str):
        params = {"tags": tag, "type": "models", "count": "20", "sort_by": "-likeCount"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{BASE}/models", params=params, headers=headers)
        return r.json().get("results", []) if r.status_code == 200 else []

    results_per_tag = await asyncio.gather(*[fetch_tag(kw) for kw in search_kws])

    seen, raw_results = set(), []
    for batch in results_per_tag:
        for m in batch:
            if m["uid"] not in seen:
                seen.add(m["uid"])
                raw_results.append(m)

    if not raw_results:
        raise HTTPException(404, "No models found for this prompt. Try different keywords.")

    max_likes = max((r.get("likeCount", 0) or 0 for r in raw_results), default=1)
    max_views = max((r.get("viewCount", 0) or 0 for r in raw_results), default=1)

    scored = []
    for m in raw_results:
        fm = format_model(m)
        s  = score_model(m, keywords, max_likes, max_views)
        scored.append((s, fm))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best = scored[0]

    candidates = [
        {"name": fm["name"], "score": round(s, 1)}
        for s, fm in scored[:6]
    ]

    return {
        "model":          best,
        "score":          round(best_score, 1),
        "candidates":     candidates,
        "total":          len(raw_results),
        "query":          clean_q,
        "category":       category or "",
        "keywords":       keywords,
        "translated":     was_translated,
        "translated_q":   english_q if was_translated else "",
    }


app.mount("/", StaticFiles(directory=".", html=True), name="static")

@app.get("/")
async def root():
    return FileResponse("index.html")
