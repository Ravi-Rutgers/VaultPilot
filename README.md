# VaultPilot

> De cockpit voor je Obsidian vault — altijd weten wat er speelt, nooit meer een idee kwijt, nooit meer chaos.

VaultPilot is een alles-in-één Obsidian plugin die je helpt overzicht te houden over je vault. Eén paneel voor je dashboard, ideeën vastleggen, taken bijhouden, je vault opruimen en je notities visueel verkennen.

---

## Functies

### Dashboard
Open je vault en zie meteen wat er speelt: recente notities, openstaande taken en een overzicht van je projecten. Het dashboard opent automatisch bij het starten van Obsidian.

### Quick Capture (`Ctrl+Shift+C`)
Heb je een idee of taak die je snel wilt vastleggen? Met één sneltoets open je het capture-venster. Je notitie belandt direct in je inbox — zonder je huidige werk te onderbreken.

### Vault Cleaner
Scant je vault op problemen: kapotte links, lege notities en verweesde bestanden. Zo blijft je vault schoon en betrouwbaar.

### Kanban Board
Bekijk je taken als een visueel kanban-bord. Gebaseerd op je eigen markdown-bestanden — geen externe sync, alles blijft lokaal.

### Fast Connect
Verbindt alles wat bij elkaar hoort met een paar klikken. Twee analysemodi:

- **Regel-gebaseerd** (draait automatisch elke 30 minuten op de achtergrond) — vindt notities die elkaar bij naam noemen maar nog geen wikilink hebben
- **AI via Groq** (optioneel, gratis) — analyseert de inhoud van notities semantisch en vindt diepere verbanden

Resultaten verschijnen als suggestielijst in het Dashboard. Hoge-zekerheid items zijn vooraf aangevinkt. Jij beslist wat er wordt toegepast — de plugin schrijft nooit automatisch zonder jouw bevestiging.

Vereist een gratis Groq API-sleutel voor de AI-analyse (in te stellen via Instellingen → VaultPilot).

### Smart Graph
Verken je vault als een interactieve kaart met drie tabs:

- **Graph** — force-directed graph van alle notities en hun links. Nodes zijn kleurgecodeerd per map. Hover over een node voor de naam, klik om de notitie te openen. Versleep de resize-handle om de graph groter of kleiner te maken.
- **Verbanden** — zie voor elke notitie welke andere notities ernaar linken en waarnaar het zelf linkt.
- **Clusters** — notities gegroepeerd per map, uitklapbaar als accordion.

Het paneel heeft een inklap-knop (▼/▲) rechtsboven zodat je het snel uit de weg kunt zetten.

---

## Kleurcodes in de graph

| Kleur | Map |
|-------|-----|
| 🔵 Blauw | `projects/` |
| 🟡 Geel | `ideas/` |
| 🟣 Paars | `daily/` |
| 🟢 Groen | `research/` |
| 🟠 Oranje | `personal/` |
| ⚫ Grijs | `inbox/`, `archive/` |

Nodes met veel verbindingen zijn groter weergegeven.

---

## Installatie (handmatig)

VaultPilot staat nog niet in de officiële community plugin store. Je installeert het handmatig in een paar stappen.

### Wat je nodig hebt
- Obsidian versie 1.4.0 of nieuwer
- Je vault al aangemaakt in Obsidian

### Stap 1 — Download de bestanden

Ga naar de [Releases-pagina](../../releases) van deze repository en download de nieuwste release. Je hebt drie bestanden nodig:

- `main.js`
- `manifest.json`
- `styles.css`

### Stap 2 — Maak de plugin-map aan

Open je bestandsverkenner en navigeer naar je Obsidian vault. Ga dan naar:

```
<jouw-vault>/.obsidian/plugins/
```

Maak daarin een nieuwe map aan met de naam `vaultpilot`:

```
<jouw-vault>/.obsidian/plugins/vaultpilot/
```

> Zie je de `.obsidian`-map niet? Zet verborgen mappen zichtbaar via je bestandsverkenner (Windows: Beeld → Verborgen items).

### Stap 3 — Kopieer de bestanden

Kopieer de drie gedownloade bestanden (`main.js`, `manifest.json`, `styles.css`) naar de map die je net hebt aangemaakt:

```
<jouw-vault>/.obsidian/plugins/vaultpilot/main.js
<jouw-vault>/.obsidian/plugins/vaultpilot/manifest.json
<jouw-vault>/.obsidian/plugins/vaultpilot/styles.css
```

### Stap 4 — Activeer de plugin

1. Open Obsidian
2. Ga naar **Instellingen** (tandwiel-icoon linksonder)
3. Klik op **Community plugins**
4. Zorg dat **Beperkte modus** is uitgeschakeld
5. Klik op **Vernieuwen** onder "Geïnstalleerde plugins"
6. Zoek **VaultPilot** in de lijst en zet het aan

### Stap 5 — Klaar

Het dashboard opent automatisch. Je ziet het VaultPilot-icoon in de zijbalk.

---

## Gebruik

| Actie | Manier |
|-------|--------|
| Dashboard openen | Klik op het 📊-icoon in de zijbalk |
| Quick Capture | `Ctrl+Shift+C` |
| Smart Graph openen | Klik 🕸 in Dashboard, of `Ctrl+P` → "Open Smart Graph" |
| Vault Cleaner | Klik 🧹 in Dashboard, of `Ctrl+P` → "Scan Vault" |
| Kanban Board | Klik 📋 in Dashboard, of `Ctrl+P` → "Open Kanban Board" |
| Fast Connect starten | Klik "Analyseer nu" in het Dashboard |
| Fast Connect bekijken | Klik "Bekijk (X)" in het Dashboard |

### Smart Graph — tips
- **Navigeren**: scroll om in/uit te zoomen, sleep om te pannen
- **Hover**: beweeg over een node om de naam te zien en verbonden links te highlighten
- **Openen**: klik op een node om de notitie te openen
- **Resize**: sleep de streep onder de graph om hem groter of kleiner te maken
- **Inklappen**: gebruik de ▼-knop rechtsboven om het paneel te minimaliseren

---

## Compatibiliteit

- Obsidian 1.4.0 en hoger
- Windows, macOS en Linux
- Mobiele versie van Obsidian (basis-functies)

---

## Bijdragen

Issues en pull requests zijn welkom. Dit project is primair gebouwd voor eigen gebruik maar staat open voor anderen.

---

## Licentie

MIT
