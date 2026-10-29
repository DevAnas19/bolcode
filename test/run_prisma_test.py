"""
Day-1 accuracy test for Gnani Prisma on Hinglish coding commands.

1. Record each line of commands.txt as audio/01.wav, audio/02.wav, ... (speak it naturally, Hinglish).
2. export GNANI_API_KEY=your-key   (Windows PowerShell: $env:GNANI_API_KEY="your-key")
3. pip install requests
4. python run_prisma_test.py --lang en-IN
   python run_prisma_test.py --lang hi-IN --bias    # compare, with word boosting

Each clip costs credits, so run it deliberately.
"""
import argparse, json, os, re, sys, requests

URL = "https://api.vachana.ai/stt/v3"
TERMS = [
    "async", "await", "function", "arrow", "const", "variable", "array", "loop", "map", "filter",
    "promise", "callback", "error", "handling", "catch", "try", "console", "log", "null", "default",
    "export", "import", "class", "constructor", "route", "query", "limit", "validation", "optimize",
    "recursive", "timeout", "sorting", "ascending", "uppercase", "usestate", "onclick", "component",
    "bug", "type", "hints", "test", "undo", "userid", "object", "string", "key", "comments", "logging",
]


def words(s):
    return re.sub(r"[^\w\s]", "", s.lower()).split()


def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    if not r:
        return 0.0
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev = cur
    return d[len(h)] / len(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en-IN")
    ap.add_argument("--audio-dir", default="audio")
    ap.add_argument("--commands", default="commands.txt")
    ap.add_argument("--bias", action="store_true", help="enable word boosting with TERMS")
    args = ap.parse_args()

    key = os.environ.get("GNANI_API_KEY")
    if not key:
        sys.exit("Set GNANI_API_KEY first.")

    lines = [l.strip() for l in open(args.commands, encoding="utf-8") if l.strip()]
    results, wers, term_hit, term_total = [], [], 0, 0

    for i, expected in enumerate(lines, 1):
        path = os.path.join(args.audio_dir, f"{i:02d}.wav")
        if not os.path.exists(path):
            continue
        data = {"language_code": args.lang, "format": "verbatim"}
        if args.bias:
            data["bias_list"] = json.dumps([t for t in TERMS if t.isalpha()])
            data["bias_score"] = "1.0"
        with open(path, "rb") as f:
            r = requests.post(URL, headers={"X-API-Key-ID": key}, files={"audio_file": f}, data=data, timeout=60)
        try:
            got = r.json().get("transcript", "") if r.ok else f"<error {r.status_code}>"
        except Exception:
            got = f"<bad response {r.status_code}>"

        w = wer(expected, got)
        wers.append(w)
        exp_words, got_words = set(words(expected)), set(words(got))
        for t in TERMS:
            if t in exp_words:
                term_total += 1
                term_hit += t in got_words
        results.append({"id": i, "expected": expected, "got": got, "wer": round(w, 3)})
        print(f"{i:02d}  WER {w:.2f}  | {expected}\n      -> {got}")

    if not wers:
        sys.exit("No audio files found. Record audio/01.wav, audio/02.wav, ... first.")

    print("\n=== Summary ===")
    print(f"Language: {args.lang}   Boosting: {args.bias}   Clips: {len(wers)}")
    print(f"Average WER: {sum(wers) / len(wers):.1%}")
    if term_total:
        print(f"Code-term accuracy: {term_hit}/{term_total} = {term_hit / term_total:.1%}")
    json.dump(results, open("results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("Saved results.json")


if __name__ == "__main__":
    main()
