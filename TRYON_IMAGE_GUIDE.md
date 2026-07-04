# AR Try-On Image Guide

Manufacturer ke liye: transparent PNG kaise banaye jo AR try-on mein sahi kaam kare.

---

## Quick Summary

| Requirement | Value |
|-------------|-------|
| Format | PNG (transparent background) |
| Recommended size | 1000×1000 px minimum |
| Background | 100% transparent (alpha=0) |
| Jewellery position | Centered, touching edges is fine |
| File size | Under 3 MB |
| Color mode | RGBA (not RGB) |

---

## Jewellery Type aur Position

Har jewellery type ke liye alag PNG chahiye. Upload karte waqt `jewellery_type` select karo:

| Type | Body Part | PNG mein position |
|------|-----------|-------------------|
| `necklace` | Neck / chest | Top-center — clasp ya string ka top transparent hona chahiye |
| `earring_left` | Left ear | Right-center aligned (screen left = wearer's left) |
| `earring_right` | Right ear | Left-center aligned |
| `ring_index` | Index finger | Center of image |
| `ring_middle` | Middle finger | Center of image |
| `bangle` | Wrist | Center of image |

---

## Step-by-Step: Transparent PNG Kaise Banaye

### Option 1: Canva (Easiest)
1. Canva.com open karo
2. Custom size: 1000×1000 px
3. **Background transparent rakho** (Background color → None)
4. Jewellery ki photo paste karo
5. Background remove karo (Edit Image → BG Remover)
6. Download → PNG → **"Transparent background" tick karo**

### Option 2: Remove.bg (Fastest)
1. remove.bg par photo upload karo
2. Background automatically remove ho jaata hai
3. Download → PNG
4. Result ko Photoshop/GIMP mein open karke center karo

### Option 3: Photoshop (Best Quality)
1. Jewellery ki high-res photo open karo
2. Quick Selection Tool se jewellery select karo
3. Select → Inverse → Delete (background hatao)
4. Canvas size 1000×1000 set karo, jewellery center karo
5. File → Export → Export As → PNG
6. **"Transparency" option ON rakho**

### Option 4: GIMP (Free, Advanced)
1. GIMP mein photo open karo
2. Image → Flatten Image (agar layers hain)
3. Image → Mode → RGB (agar CMYK hai)
4. Fuzzy Select Tool se background select karo
5. Edit → Clear (background transparent ho jaayega)
6. Image → Canvas Size → 1000×1000, Center jewellery
7. File → Export As → `.png`

---

## Do's ✅

- **White ya plain background pe photo lo** — background remove karna aasaan hoga
- **Jewellery ko clearly lit karo** — harsh shadows avoid karo
- **Pure transparent background** — koi white border nahi, koi haze nahi
- **Real product photo use karo** — illustration ya sketch nahi
- **Multiple types ke liye alag alag PNG** — ek necklace + ek earring pair alag alag upload karo
- **Earring pair ke liye:** Left earring aur Right earring — do alag PNG

---

## Don'ts ❌

- **JPEG mat use karo** — JPEG transparent background support nahi karta
- **White background mat chodna** — AR overlay mein white box dikhega
- **Watermark mat daalna** — AR try-on mein dikhega
- **Shadow mat chodna** — floating shadow awkward lagti hai try-on mein
- **Blurry image mat use karna** — kam se kam 800×800 px chahiye

---

## Common Mistakes aur Fix

### Problem: White box dikh raha hai try-on mein
**Fix:** PNG mein transparency nahi hai. Re-export karo with "Transparent Background" checked. Check: Photoshop mein open karo — grey checkered pattern dikhna chahiye background pe, white nahi.

### Problem: Jewellery off-center lag rahi hai
**Fix:** PNG crop karo so jewellery is roughly centered. Canvas size adjust karo.

### Problem: Edges rough/jagged hain
**Fix:** Photoshop: Refine Edge tool use karo. GIMP: Fuzzy Select → Grow by 2px → Feather by 1px → Delete.

### Problem: Try-on mein jewellery bahut badi/choti dikh rahi hai
**Fix:** AR engine `scale_multiplier` calibration karta hai. Image mein hi jewellery ko visible size mein rakho — padding kam karo.

---

## Quick Test Karo

Upload karne ke baad:
1. Manufacturer portal mein product open karo
2. Try-On section mein "AR Preview" check karo
3. Agar image transparent dikh rahi hai (checkered background) → correct hai
4. Customer kiosk se try-on karo aur position check karo

---

## Tools

| Tool | Cost | Best For |
|------|------|----------|
| [remove.bg](https://remove.bg) | Free (5/month) / Paid | Fastest background removal |
| [Canva](https://canva.com) | Free plan available | Non-designers ke liye |
| Adobe Photoshop | Paid | Best quality |
| GIMP | Free | Advanced, open-source |
| [Cleanup.pictures](https://cleanup.pictures) | Free | Detail touch-up |

---

## Image Naming Convention (Optional but Helpful)

Upload karte waqt naam se type clear rakho:

```
AT-Jewellers_necklace_gold-choker_v1.png
AT-Jewellers_earring-left_jhumka-ruby_v1.png
AT-Jewellers_bangle_kundan-set_v1.png
```

---

## Summary Checklist

Upload se pehle check karo:

- [ ] Format: `.png`
- [ ] Background: transparent (not white)
- [ ] Size: minimum 800×800 px
- [ ] Jewellery type sahi select kiya
- [ ] File size: under 3 MB
- [ ] No watermark
- [ ] Clear, well-lit jewellery

---

*Powered by Botivate · LuxMatch Platform*
