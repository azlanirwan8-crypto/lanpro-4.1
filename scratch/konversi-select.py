# -*- coding: utf-8 -*-
"""
Mengganti satu blok <select> dengan StyledDropdown, dengan penjagaan.

Blok dibatasi dari `<select` TERDEKAT SEBELUM identifier penanda sampai
`</select>` terdekat sesudahnya — bukan regex rakus, yang sempat menelan 311
baris JSX di FlowchartContainer.
"""
import io, sys

def ganti_select(path, penanda, pengganti, batas=1200):
    s = io.open(path, encoding="utf-8").read()
    i = s.index(penanda)
    awal = s.rindex("<select", 0, i)
    akhir = s.index("</select>", i) + len("</select>")
    lama = s[awal:akhir]
    assert lama.count("<select") == 1, "blok memuat %d <select>" % lama.count("<select")
    assert len(lama) < batas, "blok terlalu panjang: %d" % len(lama)
    s = s[:awal] + pengganti + s[akhir:]
    io.open(path, "w", encoding="utf-8").write(s)
    return len(lama)
