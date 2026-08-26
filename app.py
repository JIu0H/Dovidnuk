# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify, send_from_directory


from news_feed import get_news, NEWS_SOURCES, fetch_all_news, _news_cache
from structure_data import STRUCTURE


def register_news_source(source_type, source_id, label):
    """Додати джерело новин для нової бригади (telegram | youtube)."""
    NEWS_SOURCES.append({"type": source_type, "id": source_id, "label": label})
    _news_cache["ts"] = None  # invalidate


import os

app = Flask(__name__)
app.config["SECRET_KEY"] = "zsu-test-brigade-2026"

# Категорії з тією ж ієрархією: корпус → бригада

RIGHT_CATEGORIES = [
    {"id": "flags", "name": "Бойові прапори", "anchor": "#banner"},
    {"id": "heroes", "name": "Герої України", "anchor": "#personalities"},
    {"id": "cavaliers", "name": "Кавалери державних орденів", "anchor": "#personalities"},
    {"id": "patches", "name": "Нарукавні знаки", "anchor": "#symbols"},
    {"id": "combatpath", "name": "Бойовий шлях", "anchor": "#combat-path"},
]


@app.route("/")
def index():
    return render_template(
        "index.html",
        structure=STRUCTURE,
        right_categories=RIGHT_CATEGORIES,
        news=get_news(),
    )


@app.route("/brigade/37obrmp")
def brigade_37():
    return render_template("brigade.html")


@app.route("/brigade/77oaembr")
def brigade_77():
    return render_template("brigade_77.html")


@app.route("/brigade/92oshbr")
def brigade_92():
    return render_template("brigade_92.html")



@app.route("/search")
def search():
    query = (request.args.get("q") or "").strip()
    q = query.casefold()
    results = []
    seen = set()

    def add(typ, name, url):
        key = (name, url)
        if key in seen or not name:
            return
        seen.add(key)
        results.append({"type": typ, "name": name, "url": url or "#"})

    if q:
        # short aliases
        aliases = {
            "37": "37",
            "77": "77",
            "92": "92",
            "ошбр": "штурмов",
            "обрмп": "морськ",
            "оаембр": "аеромоб",
        }
        q_extra = [q]
        for k, v in aliases.items():
            if k in q:
                q_extra.append(v)

        def match(text):
            tcf = (text or "").casefold()
            return any(x in tcf for x in q_extra)

        for cat in STRUCTURE:
            if match(cat["name"]):
                add("Вид військ", cat["name"], "/#structure")
            for corps in cat.get("corps", []):
                cname = corps.get("name", "")
                if match(cname):
                    add("Корпус", cname, "/#structure")
                for u in corps.get("units", []):
                    if isinstance(u, dict):
                        name = u.get("name", "")
                        url = u.get("url") or "/#structure"
                        if match(name):
                            add("Бригада", name, url)
                    else:
                        if match(str(u)):
                            add("Підрозділ", str(u), "/#structure")

        for cat in RIGHT_CATEGORIES:
            if match(cat.get("name", "")):
                add("Розділ", cat["name"], "/#" + cat["id"])
        if match("база знань") or match("база знаний"):
            add("Розділ", "База знань", "/#knowledge")

    return jsonify({"query": query, "results": results[:40]})



@app.route("/static/images/<path:filename>")
def serve_image(filename):
    return send_from_directory(os.path.join(app.root_path, "static", "images"), filename)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
