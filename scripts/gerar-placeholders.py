"""Gera PNGs de placeholder para os veículos de demonstração.

Sem dependência externa e sem baixar imagem de lugar nenhum: são
retângulos com uma silhueta de carro, deliberadamente sintéticos para
ninguém confundir com foto real de estoque.
"""
import sys, zlib, struct, os

def png(path, w, h, base, seed):
    linhas = []
    for y in range(h):
        linha = bytearray([0])
        for x in range(w):
            t = y / h
            r = int(base[0] * (1 - t * 0.45))
            g = int(base[1] * (1 - t * 0.45))
            b = int(base[2] * (1 - t * 0.45))
            if (x + y + seed * 40) % 220 < 60:
                r, g, b = min(255, r + 12), min(255, g + 12), min(255, b + 12)
            cx, cy = w / 2, h * 0.62
            cw, ch = w * 0.62, h * 0.20
            if abs(x - cx) < cw / 2 and abs(y - cy) < ch / 2:
                r, g, b = 240, 242, 245
            if abs(x - cx) < cw * 0.32 and cy - ch / 2 - h * 0.11 < y < cy - ch / 2:
                r, g, b = 225, 229, 235
            for wx in (cx - cw * 0.29, cx + cw * 0.29):
                if (x - wx) ** 2 + (y - (cy + ch * 0.45)) ** 2 < (h * 0.045) ** 2:
                    r, g, b = 40, 44, 50
            linha += bytes([r, g, b])
        linhas.append(bytes(linha))

    def bloco(tipo, dados):
        c = tipo + dados
        return struct.pack(">I", len(dados)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(bloco(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)))
        f.write(bloco(b"IDAT", zlib.compress(b"".join(linhas), 6)))
        f.write(bloco(b"IEND", b""))

destino = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(destino, exist_ok=True)
for nome, cor, semente in [
    ("corolla-1", (96, 112, 132), 1), ("corolla-2", (78, 94, 116), 2),
    ("corolla-3", (110, 124, 142), 3), ("tcross-1", (66, 92, 110), 4),
    ("tcross-2", (88, 110, 128), 5),
]:
    png(os.path.join(destino, f"{nome}.png"), 1200, 900, cor, semente)
print(f"5 placeholders gerados em {destino}")
