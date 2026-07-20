# Netlify uchun yuklanadigan fayllar

Men Netlify uchun kerakli fayllarni loyiha ichiga qayta tayyorlab qo'ydim. Netlify'ga **butun papkani** yuklang, faqat `index.html`ni emas.

## Fayllar qayerda?

Loyiha papkasida quyidagi fayllar bor:

```text
index.html
package.json
netlify.toml
netlify/functions/state.mjs
```

## Netlify'ga nima yuklanadi?

Netlify'ga shu papkaning hammasini yuklaysiz:

```text
muzaffar1/
├── index.html
├── package.json
├── netlify.toml
└── netlify/
    └── functions/
        └── state.mjs
```

## Eng oson yuklash usuli

1. Shu loyiha papkasini GitHub'ga joylang.
2. Netlify saytida **Add new site** tugmasini bosing.
3. **Import from Git** ni tanlang.
4. GitHub repository'ni tanlang.
5. Netlify sozlamalarini o'zi `netlify.toml`dan oladi.
6. **Deploy** tugmasini bosing.

## Muhim eslatma

Agar faqat `index.html`ni yuklasangiz, boshqa telefon/kompyuter yoki boshqa pochtadan kirganda ma'lumotlar umumiy saqlanmaydi. Umumiy saqlash uchun `netlify/functions/state.mjs` va `package.json` ham birga bo'lishi shart.

## Tekshirish

Sayt deploy bo'lgandan keyin brauzerda quyidagi manzil ochilishi kerak:

```text
https://SIZNING-SAYTINGIZ.netlify.app/.netlify/functions/state
```

Agar JSON ko'rinsa, demak saqlash funksiyasi ishlayapti.
