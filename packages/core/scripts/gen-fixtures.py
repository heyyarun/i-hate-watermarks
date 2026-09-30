"""Generate test/fixtures/parity.json by running the reference Python engine.

The TS port must produce identical output for every case. Needs a checkout of
https://github.com/guillaumemeyer/watermarks-remover:

    uv run --python 3.13 packages/core/scripts/gen-fixtures.py /path/to/watermarks-remover
"""

from __future__ import annotations

import json
import random
import sys
import unicodedata
from pathlib import Path

ref = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/wm-ref")
sys.path.insert(0, str(ref / "service" / "scripts"))
import text_unicode as tu  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "test" / "fixtures" / "parity.json"

# Every input used by the reference tests/test_clean_text.py, plus a few more.
CORPUS = [
    "Hello​World­!", "a b　c", "x​y", "hi\U000e0041there",
    "ab‮ef", "السعر ⁦123 USD⁩‏", "English ‫العربية‬ end",
    "abc‮def‬", "abc‬", "abc‫def", "Normal ASCII and café — fine.",
    "pаy", "Balance returns. ⚖️", "Move ↔️",
    *(f"note {b}️ end" for b in ("‼", "⁉", "ℹ", "⤴", "⤵")),
    "ℹ️‍\U0001f4a1", "‼️ ⁉️ ℹ️",
    "葛\U000e0100", "葛\U000e0100\U000e0101", "ᠠ᠋",
    "Family time: \U0001f468‍\U0001f469‍\U0001f467", "❤️‍\U0001f525",
    "a‍b️", "⚖️", "می‌روم", "क्‍ष",
    "\U0001f3f4\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f",
    "\U0001f3f4\U000e0067\U000e0062", "葛‌A", "x؀y۝z",
    "a‍b", "a‌b", "ab‌", "می‌ر", "x؀y",
    "Ａ", "ＡＢ ﬃ", "Å Å", "ᠠ᠋ᠡ", "ᠠ᠌ᠡ",
    "ᠠ᠍ᠡ", "ᠠ᠋᠌ᠡ", "ᠠ᠏ᠡ",
    *("word" + chr(cp) + "word" for cp in (0x180F, 0x3164, 0xFFA0, 0x2064, 0xFFF9, 0xE0001, 0xE0100)),
    *("word" + chr(cp) + "word" for cp in
      [0x2065, 0xE0000, *range(0xFFF0, 0xFFF9), 0xE0080, 0xE00FF, 0xE01F0, 0xE0FFF]),
    "ក឴ខ", "ក឵ខ", "ᄀᅟᅡ", "ᄀᅠᅡ",
    "ㄱㅤㅏ", "ﾡﾠￂ", "aㅤb", "aﾠb", "ㅤ", "ﾠ",
    "a᠋b", "a឴b", "aᅟb", "᠋", "ᅠ",
    "ab\U000f0000c\U0010fffd",
    "ᠠ᠋ᠡក឴ខᄀᅟᅡ",
    "Le doute : il reste entier. Et un vrai porteur​ ici.\n",
    "\U00013000\U00013430\U00013001", "a\U00013430b", "\U0001d15f\U0001d173\U0001d160",
    "a﷐b￿c\U0001fffe", "", "​", "plain text only",
    "Ｈｅｌｌｏ Ｗｏｒｌｄ", "ⅰ ① ｶ ㎏",
]

POOL = sorted({
    *range(0x20, 0x7F), 0xE9, 0xA0, 0xAD, 0x34F, 0x61C, 0x600, 0x6DD, 0x70F, 0x8E2,
    0x645, 0x6CC, 0x631, 0x915, 0x94D, 0x937, 0x1780, 0x1781, 0x17B4, 0x17B5,
    0x1820, 0x1821, 0x180B, 0x180C, 0x180D, 0x180E, 0x180F, 0x1100, 0x1161, 0x115F, 0x1160,
    0x3131, 0x3164, 0x314F, 0xFFA0, 0xFFA1, 0xFFC2, 0x845B, 0x4E00,
    *range(0x2000, 0x2010), *range(0x2028, 0x2030), *range(0x205F, 0x2070),
    0x203C, 0x2049, 0x2139, 0x2194, 0x2696, 0x2764, 0x2934, 0x3000, 0x3030,
    0xFE00, 0xFE0D, 0xFE0E, 0xFE0F, 0xFEFF, 0xFFF9, 0xFFFB, 0xFFF0, 0xFDD0, 0xFFFE,
    0x410, 0x430, 0x435, 0x43E, 0x456, 0xFF21, 0xFF41, 0xFB03, 0x30A, 0x301, 0xC5,
    0xE000, 0xF0000, 0x10FFFD, 0x1F3F4, 0x1F468, 0x1F469, 0x1F525, 0x1F600,
    0xE0001, 0xE0020, 0xE0041, 0xE0067, 0xE0062, 0xE007F, 0xE0080, 0xE0100, 0xE01EF,
    0x13000, 0x13430, 0x1BC00, 0x1BCA0, 0x1D100, 0x1D173, 0x110BD, 0x1D400,
})


def fuzz(n: int) -> list[str]:
    rng = random.Random(1234)
    cases = []
    for _ in range(n):
        length = rng.randint(1, 14)
        cases.append("".join(chr(rng.choice(POOL)) for _ in range(length)))
    return cases


CLEAN_OPTIONS = [
    {},
    {"nfkc": True},
    {"aggressive_homoglyphs": True},
    {"normalize_spaces": False},
    {"strip_emoji_glue": True},
    {"strip_bidi": True},
    {"nfkc": True, "aggressive_homoglyphs": True, "strip_emoji_glue": True, "strip_bidi": True},
]
INSPECT_OPTIONS = [{}, {"aggressive": True}, {"strip_emoji_glue": True}]


def main() -> None:
    cases = []
    for text in CORPUS + fuzz(400):
        clean = []
        for opts in CLEAN_OPTIONS:
            out, stats = tu.clean_text(text, **opts)
            clean.append({"options": opts, "text": out, "stats": stats})
        inspect = []
        for opts in INSPECT_OPTIONS:
            report = tu.inspect_text(text, **opts).to_dict()
            # Notes are constant text; keep only how many there are.
            report["notes"] = len(report["notes"])
            inspect.append({"options": opts, "report": report})
        cases.append({"input": text, "clean": clean, "inspect": inspect})
    OUT.write_text(json.dumps({
        "unicode": unicodedata.unidata_version,
        "cases": cases,
    }, ensure_ascii=True, indent=None))
    print(f"wrote {len(cases)} cases to {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
