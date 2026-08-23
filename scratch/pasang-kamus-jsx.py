# -*- coding: utf-8 -*-
"""Menyisipkan blok `jsx` ke kedua kamus, lalu menulis peta teks -> kunci."""
import io
import json
import re

K = json.load(io.open("scratch/kamus-jsx.json", encoding="utf-8"))


def kutip(nilai: str) -> str:
    return nilai.replace("\\", "\\\\").replace('"', '\\"')


for path, idx in [("src/i18n/locales/id.ts", 1), ("src/i18n/locales/en.ts", 2)]:
    s = io.open(path, encoding="utf-8").read()
    baris = "".join('    %s: "%s",\n' % (v[0], kutip(v[idx])) for v in K.values())
    blok = "  jsx: {\n" + baris + "  },\n"
    m = re.search(r"^(export const \w+ = \{\n)", s, re.M)
    assert m, path
    io.open(path, "w", encoding="utf-8").write(s[: m.end(1)] + blok + s[m.end(1) :])

print("blok jsx:", len(K), "kunci")

peta = {teks: "jsx." + v[0] for teks, v in K.items()}
json.dump(peta, io.open("scratch/peta-jsx.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("peta ditulis:", len(peta))
