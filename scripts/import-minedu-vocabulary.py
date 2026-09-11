import json, re, unicodedata, pathlib
from collections import Counter

# Run from the repo root:
#   pip install pypdf
#   python scripts/import-minedu-vocabulary.py docs/sources/minedu-2021-vocabulario-pedagogico-ashaninka.pdf
#   pnpm format && pnpm dictionary:check
#
# The formatting step matters only for the diff: the script writes expanded
# JSON arrays and Prettier collapses the short ones. Content is unchanged.
#
# Idempotent: the same PDF always yields the same src/data/dictionary/ashaninka.json.
import sys
PDF = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "docs/sources/minedu-2021-vocabulario-pedagogico-ashaninka.pdf")
SP = pathlib.Path(".")
import pypdf
pages = [page.extract_text() or "" for page in pypdf.PdfReader(str(PDF)).pages]

ALPHABET = ["a","b","ch","e","i","j","k","m","n","ñ","o","p","r","s","sh","t","ts","ty","y"]
BY_LEN = sorted(ALPHABET, key=len, reverse=True)
NOISE = re.compile(r"^(Comunicación|Matemática|Personal social y Ciencia y tecnología|vocabulario|Parte [IV]+ - Ashaninka|\d+)\s*$")

def tokenize(word):
    t, out, at = word.lower(), [], 0
    while at < len(t):
        m = next((l for l in BY_LEN if t.startswith(l, at)), None)
        out.append(m or t[at]); at += len(m) if m else 1
    return out

def in_alphabet(word):
    return bool(word) and all(l in ALPHABET for l in tokenize(word.replace(" ", "")))

# Reflow Part I into one stream: entry headers wrap across lines in the PDF.
chunks = []
for i in range(23, 73):
    for line in (pages[i] or "").split("\n"):
        line = line.strip()
        if line and not NOISE.match(line):
            chunks.append(line)
# Drop consecutive duplicates (the PDF repeats a text layer on some spreads).
deduped = [c for j, c in enumerate(chunks) if j == 0 or chunks[j-1] != c]
stream = re.sub(r"\s+", " ", " ".join(deduped))

# An entry header is: alphabet word(s), the POS abbreviation, a short Spanish
# gloss, and a period. Requiring the word to be alphabet-valid keeps this from
# firing inside example sentences.
HEADER = re.compile(r"(?:^|(?<=[.’'\s]))([a-zñ]+(?: [a-zñ]+)?) (b\.|a\.) ?([^.‘’]{2,70}?)\.")
POS_MAP = {"b.": "noun", "a.": "verb"}
QUOTED = re.compile(r"[‘'']([^’'']+)[’'']")

found = [m for m in HEADER.finditer(stream) if in_alphabet(m.group(1))]
raw = []
for k, m in enumerate(found):
    body = stream[m.end() : found[k + 1].start() if k + 1 < len(found) else len(stream)]
    word = m.group(1).strip()
    # Strip a stray section marker: the PDF prints the section letter right
    # before the first entry of that section ("ts tsapaye" -> "tsapaye").
    parts = word.split()
    if len(parts) == 2 and parts[0] in ALPHABET and parts[1].startswith(parts[0]):
        word = parts[1]
    raw.append({"word": word, "pos": m.group(2), "gloss": m.group(3).strip(), "body": body})

def examples(body):
    out, pos = [], 0
    for m in QUOTED.finditer(body):
        sentence = body[pos:m.start()].strip().lstrip(".,;").strip().rstrip(".").strip()
        translation = m.group(1).strip().rstrip(".").strip()
        pos = m.end()
        letters_only = re.sub(r"[^a-zñ ]", "", sentence.lower())
        if sentence and translation and in_alphabet(letters_only):
            out.append({"sentence": sentence, "translation": translation})
    return out

entries, rejected = [], []
for r in raw:
    gloss = re.sub(r"\s+(?:%s)$" % "|".join(BY_LEN), "", r["gloss"]).strip()
    if not gloss:
        rejected.append((r["word"], "glosa vacía")); continue
    entries.append({
        "word": r["word"], "partOfSpeech": POS_MAP[r["pos"]],
        "translations": [g.strip() for g in gloss.split(",") if g.strip()],
        "examples": examples(r["body"]),
    })

best = {}
for e in entries:
    prev = best.get(e["word"])
    if prev is None or len(e["examples"]) > len(prev["examples"]):
        best[e["word"]] = e
order = lambda e: [ALPHABET.index(l) if l in ALPHABET else 99 for l in tokenize(e["word"])]
entries = sorted(best.values(), key=order)

contaminated = [e["word"] for e in entries for x in e["examples"] if re.search(r"\s(b|a)\.\s", x["sentence"])]
print(f"aceptadas: {len(entries)}  con ejemplo: {sum(1 for e in entries if e['examples'])}")
print(f"rechazadas: {len(rejected)}  contaminadas: {len(contaminated)} {contaminated[:5]}")
print("¿apiapitachari ñantsi?", any(e["word"] == "apiapitachari ñantsi" for e in entries))
print("¿otsapakire sampitantsi?", any(e["word"] == "otsapakire sampitantsi" for e in entries))
print("multi-palabra:", sum(1 for e in entries if " " in e["word"]))
print("marcadores pegados restantes:", [e["word"] for e in entries if e["word"].split()[0] in ALPHABET and " " in e["word"]])
# Emit the dictionary file directly, with attribution on every entry.
SOURCE = "minedu-2021-vocabulario-pedagogico"

def slugify(word):
    text = unicodedata.normalize("NFD", word.strip().lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")

out, seen = [], set()
for x in entries:
    slug = slugify(x["word"])
    if slug in seen:
        continue
    seen.add(slug)
    out.append({
        "id": slug,
        "word": x["word"],
        "translations": x["translations"],
        "partOfSpeech": x["partOfSpeech"],
        "examples": [{**ex, "sourceId": SOURCE} for ex in x["examples"]],
        "sourceId": SOURCE,
    })

target = pathlib.Path("src/data/dictionary/ashaninka.json")
target.write_text(json.dumps({"language": "ashaninka", "entries": out}, ensure_ascii=False, indent=2) + "\n")
print(f"escritas {len(out)} entradas en {target}")
