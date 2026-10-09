#!/usr/bin/env python3
"""Builds the Android launcher icons, splash screens and a clean web logo from public/assets/logo.png.
The source file has a grey square and a glow around the round F&F mark, so the circle is cut out first.
Run from the frontend folder:  python3 scripts/make-brand-assets.py"""
import glob
import os
from PIL import Image, ImageDraw

SRC = 'public/assets/logo.png'
RES = 'android/app/src/main/res'
CX, CY, R = 508, 502, 364          # circle in the 1024px source
BG = (244, 246, 251, 255)          # same colour as the in-app loading screen

def circle_mark(size):
    """The round mark alone, transparent outside the circle, antialiased."""
    src = Image.open(SRC).convert('RGBA').crop((CX - R, CY - R, CX + R, CY + R))
    big = 4
    mask = Image.new('L', (src.width * big, src.height * big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, mask.width - 1, mask.height - 1), fill=255)
    mask = mask.resize(src.size, Image.LANCZOS)
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)

def on_canvas(canvas, fraction, background):
    d = max(1, round(canvas * fraction))
    img = Image.new('RGBA', (canvas, canvas), background)
    mark = circle_mark(d)
    img.alpha_composite(mark, ((canvas - d) // 2, (canvas - d) // 2))
    return img

# web: a clean copy of the mark, used by the terminal's loading and sign-in screens
circle_mark(512).save('public/assets/logo-mark.png', optimize=True)

# launcher icons (legacy square/round) and the adaptive-icon foreground
legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for dpi, px in legacy.items():
    on_canvas(px, 0.96, (0, 0, 0, 0)).save(f'{RES}/mipmap-{dpi}/ic_launcher.png')
    on_canvas(px, 0.96, (0, 0, 0, 0)).save(f'{RES}/mipmap-{dpi}/ic_launcher_round.png')
    fg = px * 108 // 48
    on_canvas(fg, 0.60, (0, 0, 0, 0)).save(f'{RES}/mipmap-{dpi}/ic_launcher_foreground.png')

# splash screen: a solid colour with the mark centred (drawable/splash.xml). A full-screen picture gets stretched to
# whatever window the phone gives the app, which squashes the logo, so only the small mark is a bitmap.
for path in glob.glob(f'{RES}/drawable*/splash.png'):
    os.remove(path)
os.makedirs(f'{RES}/drawable-nodpi', exist_ok=True)
circle_mark(288).save(f'{RES}/drawable-nodpi/splash_logo.png')
with open(f'{RES}/drawable/splash.xml', 'w') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><color android:color="#F4F6FB" /></item>
    <item>
        <bitmap android:src="@drawable/splash_logo" android:gravity="center" />
    </item>
</layer-list>
''')
print('brand assets written')
