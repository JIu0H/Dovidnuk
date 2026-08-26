# -*- coding: utf-8 -*-
"""News from Telegram (primary) and Facebook (fallback)."""
import re
import html as html_lib
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen

NEWS_SOURCES = [
    {"type": "telegram", "id": "OBRMP37", "label": "37 ОБрМП", "brigade": "37"},
    {"type": "telegram", "id": "brigada92_war", "label": "92 ОШБр", "brigade": "92"},
    {"type": "facebook", "id": "37obrmp", "label": "37 ОБрМП", "brigade": "37"},
    {"type": "facebook", "id": "77oaembr", "label": "77 ОАеМБр", "brigade": "77"},
    {"type": "facebook", "id": "92ndSAB", "label": "92 ОШБр", "brigade": "92"},
]

_news_cache = {"ts": None, "items": [], "days": None}
_NEWS_CACHE_SEC = 300


def _first_sentence(text, max_len=140):
    text = (text or "").strip()
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?…])\s+", text, maxsplit=1)
    s = parts[0].strip() if parts else text
    s = re.sub(r"\s+", " ", s)
    if len(s) > max_len:
        s = s[: max_len - 1].rsplit(" ", 1)[0] + "…"
    return s


def _parse_tg_html(html, label):
    items = []
    parts = html.split("tgme_widget_message_wrap")
    for part in parts[1:]:
        post = re.search(r'data-post="([^"]+)"', part)
        dt_m = re.search(r'datetime="([^"]+)"', part)
        text_m = re.search(r"tgme_widget_message_text[^>]*>(.*?)</div>", part, re.S)
        if not post or not dt_m:
            continue
        text = ""
        if text_m:
            raw = text_m.group(1)
            raw = re.sub(r"<br\s*/?>", " ", raw, flags=re.I)
            raw = re.sub(r"<[^>]+>", "", raw)
            text = html_lib.unescape(raw)
            text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        try:
            pub = datetime.fromisoformat(dt_m.group(1).replace("Z", "+00:00"))
            if pub.tzinfo:
                pub = pub.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            continue
        items.append({
            "title": _first_sentence(text) or text[:120],
            "date": label,
            "link": "https://t.me/" + post.group(1),
            "published": pub,
            "source": "telegram",
        })
    return items


def _fetch_telegram(channel_id, label):
    url = "https://t.me/s/" + channel_id
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; ZSUNewsBot/1.0)",
        "Accept-Language": "uk,en;q=0.8",
    })
    with urlopen(req, timeout=12) as resp:
        page = resp.read().decode("utf-8", errors="ignore")
    return _parse_tg_html(page, label)


def _fetch_facebook(page_id, label):
    items = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
        "Accept-Language": "uk,en;q=0.8",
    }
    for url in [
        "https://mbasic.facebook.com/" + page_id,
        "https://www.facebook.com/" + page_id,
    ]:
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=12) as resp:
                page = resp.read().decode("utf-8", errors="ignore")
            texts = re.findall(
                r'<div class="[^"]*story_body_container[^"]*"[^>]*>(.*?)</div>',
                page, re.S
            )
            for block in texts[:5]:
                raw = re.sub(r"<[^>]+>", " ", block)
                raw = html_lib.unescape(re.sub(r"\s+", " ", raw)).strip()
                if len(raw) < 25:
                    continue
                title = _first_sentence(raw) or raw[:120]
                items.append({
                    "title": title,
                    "date": label,
                    "link": "https://www.facebook.com/" + page_id,
                    "published": datetime.utcnow(),
                    "source": "facebook",
                })
            if items:
                break
            og = re.search(r'property="og:description"\s+content="([^"]+)"', page)
            if og:
                desc = html_lib.unescape(og.group(1)).strip()
                items.append({
                    "title": _first_sentence(desc) or desc[:120] or ("Новини — " + label),
                    "date": label,
                    "link": "https://www.facebook.com/" + page_id,
                    "published": datetime.utcnow(),
                    "source": "facebook",
                })
                break
        except Exception:
            continue
    if not items:
        items.append({
            "title": "Останні новини — " + label,
            "date": label,
            "link": "https://www.facebook.com/" + page_id,
            "published": datetime.utcnow(),
            "source": "facebook",
        })
    return items[:3]


def fetch_all_news(days=1):
    now = datetime.utcnow()
    if (
        _news_cache["ts"]
        and _news_cache.get("days") == days
        and (now - _news_cache["ts"]).total_seconds() < _NEWS_CACHE_SEC
    ):
        return _news_cache["items"]
    cutoff = now - timedelta(days=days)

    tg_fresh_by_brigade = {}
    primary = []

    for src in NEWS_SOURCES:
        if src["type"] != "telegram":
            continue
        try:
            posts = _fetch_telegram(src["id"], src["label"])
        except Exception:
            posts = []
        fresh = [i for i in posts if i["published"] >= cutoff]
        tg_fresh_by_brigade[src["brigade"]] = fresh
        primary.extend(fresh)

    for src in NEWS_SOURCES:
        if src["type"] != "facebook":
            continue
        if tg_fresh_by_brigade.get(src["brigade"]):
            continue
        try:
            primary.extend(_fetch_facebook(src["id"], src["label"]))
        except Exception:
            primary.append({
                "title": "Останні новини — " + src["label"],
                "date": src["label"],
                "link": "https://www.facebook.com/" + src["id"],
                "published": now,
                "source": "facebook",
            })

    primary.sort(key=lambda x: x["published"], reverse=True)
    out = []
    for i in primary:
        pub = i.get("published")
        if pub:
            try:
                time_str = pub.strftime("%d.%m.%Y %H:%M")
            except Exception:
                time_str = ""
        else:
            time_str = ""
        label = i["date"]
        if time_str:
            label = f"{i['date']} · {time_str}"
        out.append({"title": i["title"], "date": label, "link": i["link"], "time": time_str})
    _news_cache["ts"] = now
    _news_cache["items"] = out
    _news_cache["days"] = days
    return out


def get_news():
    return fetch_all_news(1)
