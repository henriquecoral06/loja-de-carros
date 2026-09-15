"""Gera banners de placeholder 1920x800 para o carrossel de demonstração.

Sem dependência externa e sem baixar nada: faixas de gradiente com uma
silhueta de carro, deliberadamente sintéticas. Quem remixa troca pelas
imagens da própria loja.
"""
import os, struct, sys, zlib

def banner(path, w, h, base, seed):
    linhas = []
    for y in range(h):
        linha = bytearray([0])
        ty = y / h
        for x in range(w):
            tx = x / w
            # gradiente diagonal
            m = 1 - (ty * 0.55 + tx * 0.18)
            r, g, b = int(base[0] * m), int(base[1] * m), int(base[2] * m)
            if (x + y * 2 + seed * 130) % 460 < 110:
                r, g, b = min(255, r + 10), min(255, g + 10), min(255, b + 10)
            # silhueta à direita, área segura à esquerda
            cx, cy = w * 0.68, h * 0.62
            cw, ch = w * 0.34, h * 0.24
            if abs(x - cx) < cw / 2 and abs(y - cy) < ch / 2:
                r, g, b = 238, 240, 243
            if abs(x - cx) < cw * 0.34 and cy - ch / 2 - h * 0.13 < y < cy - ch / 2:
                r, g, b = 222, 226, 232
            for wx in (cx - cw * 0.3, cx + cw * 0.3):
                if (x - wx) ** 2 + (y - (cy + ch * 0.46)) ** 2 < (h * 0.055) ** 2:
                    r, g, b = 34, 38, 44
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
    ("banner-1", (24, 58, 68), 1),
    ("banner-2", (38, 46, 56), 2),
    ("banner-3", (30, 66, 62), 3),
]:
    banner(os.path.join(destino, f"{nome}.png"), 1600, 667, cor, semente)
print(f"3 banners gerados em {destino}")
