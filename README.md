# VaultPilot

> De cockpit voor je Obsidian vault — altijd weten wat er speelt, nooit meer een idee kwijt, nooit meer chaos.

VaultPilot is een alles-in-één Obsidian plugin die je helpt overzicht te houden over je vault. Dashboard, taken, ideeën vastleggen, vault opruimen, visuele graph, AI-verbanden en dagelijkse briefing — allemaal in één paneel.

---

## Functies

### Dashboard
Open je vault en zie meteen wat er speelt: recente notities, openstaande taken en een overzicht van je projecten. Het dashboard opent automatisch bij het starten van Obsidian.

Bovenaan het dashboard staan navigatieknoppen naar Graph, Kanban en Cleaner. Wanneer je bent ingelogd op VaultPilot Pro zie je ook een **Analytics-blok** met je activiteit van de afgelopen 7 dagen.

### Quick Capture (`Ctrl+Shift+C`)
Heb je een idee of taak die je snel wilt vastleggen? Met één sneltoets open je het capture-venster. Je notitie belandt direct in je inbox — zonder je huidige werk te onderbreken.

### Vault Cleaner (`Ctrl+Shift+V`)
Scant je vault op problemen: kapotte links, lege notities en verweesde bestanden. Zo blijft je vault schoon en betrouwbaar.

### Kanban Board (`Ctrl+Shift+K`)
Trello-stijl kanban direct in Obsidian, gebaseerd op je eigen markdown-bestanden:

- **Sidebar** — navigeer snel tussen projecten of bekijk alle taken tegelijk
- **Drag & drop** — sleep kaarten tussen kolommen met een visuele insert-indicator
- **Kaart-modal** — klik op een kaart om te bewerken, verwijderen of de notitie te openen
- **Labels** — voeg `#hoog`, `#midden` of `#laag` toe aan een taaknaam voor een kleur-badge
- **Due dates** — voeg `#2026-07-20` toe aan een taaknaam voor een datumbadge (rood = verlopen, amber = vandaag, geel = binnen 3 dagen)
- **Taak toevoegen** — inline "+ Taak toevoegen" knop onderaan elke kolom

Alles wordt opgeslagen in je eigen markdown-bestanden. Geen externe sync, geen database.

### Smart Graph (`Ctrl+Shift+G`)
Verken je vault als een interactieve kaart met drie tabs:

- **Graph** — force-directed graph van alle notities en hun links, kleurgecodeerd per map
- **Verbanden** — zie per notitie welke andere notities ernaar linken en waarnaar het zelf linkt
- **Clusters** — notities gegroepeerd per map, uitklapbaar als accordion

### Fast Connect (`Ctrl+Shift+F`)
Verbindt alles wat bij elkaar hoort. Twee analysemodi:

- **Regel-gebaseerd** — vindt notities die elkaar bij naam noemen maar nog geen wikilink hebben (draait elke 30 min op de achtergrond)
- **AI via Groq** — analyseert inhoud semantisch voor diepere verbanden (optioneel, gratis Groq-sleutel vereist)

Resultaten verschijnen als suggestielijst. Hoge-zekerheid items zijn vooraf aangevinkt. Jij beslist wat er wordt toegepast. De minimale betrouwbaarheidsdrempel is instelbaar via Instellingen.

### Dagelijkse Briefing (`Ctrl+Shift+B`)
Opent een overzicht van je dag:

- Automatisch de top-3 meest actieve projecten gedetecteerd
- Per project: de openstaande taken op een rij
- Direct doorklikken naar het project
- Optioneel: laat Groq een beknopte AI-samenvatting genereren van wat er vandaag belangrijk is

### AI Quick Actions (`Ctrl+Shift+A`)
Drie AI-acties op de actieve notitie, via Groq:

- **Samenvatten** — beknopte samenvatting, kopieerbaar naar klembord
- **Tags suggereren** — relevante tags voorgesteld, met één klik in je frontmatter ingevoegd
- **Herschrijven** — helderder en bondiger, vervangt de notitie-inhoud direct

Vereist een gratis Groq API-sleutel (in te stellen via Instellingen → VaultPilot).

### Vault Analytics (Pro)
Wanneer je bent ingelogd op VaultPilot Pro wordt je activiteit bijgehouden:

- Unieke notities gewijzigd deze week
- Aantal actieve dagen
- Meest actieve map
- Weekgrafiek met dagelijkse activiteit

Events worden automatisch op de achtergrond gestuurd. Nooit zichtbaar als je niet bent ingelogd.

---

## Sneltoetsenoverzicht

| Actie | Sneltoets |
|-------|-----------|
| Dashboard | `Ctrl+Shift+D` |
| Quick Capture | `Ctrl+Shift+C` |
| Fast Connect analyseren | `Ctrl+Shift+F` |
| Smart Graph | `Ctrl+Shift+G` |
| Kanban Board | `Ctrl+Shift+K` |
| Vault Cleaner | `Ctrl+Shift+V` |
| Dagelijkse Briefing | `Ctrl+Shift+B` |
| AI Quick Actions | `Ctrl+Shift+A` |

---

## Installatie (handmatig)

VaultPilot staat nog niet in de officiële community plugin store. Installeer het handmatig via de Releases-pagina.

### Wat je nodig hebt
- Obsidian versie 1.4.0 of nieuwer

### Stap 1 — Download

Ga naar de [Releases-pagina](../../releases) en download de nieuwste release. Je hebt drie bestanden nodig:

```
main.js
manifest.json
styles.css
```

### Stap 2 — Plugin-map aanmaken

Navigeer naar je vault en maak de map aan:

```
<jouw-vault>/.obsidian/plugins/vaultpilot/
```

> Zie je de `.obsidian`-map niet? Zet verborgen mappen zichtbaar (Windows: Beeld → Verborgen items).

### Stap 3 — Bestanden kopiëren

Zet de drie bestanden in de nieuwe map.

### Stap 4 — Plugin activeren

1. Open Obsidian → **Instellingen** → **Community plugins**
2. Zorg dat **Beperkte modus** uit staat
3. Klik **Vernieuwen** en zet VaultPilot aan

Het dashboard opent automatisch.

---

## Instellingen

| Instelling | Standaard | Beschrijving |
|-----------|-----------|--------------|
| Projecten map | `projects/` | Map met je actieve projecten |
| Inbox map | `inbox/` | Bestemming voor Quick Capture |
| Ideeën map | `ideas/` | Bestemming voor ideeën |
| Orphan drempel | 30 dagen | Inbox-items ouder dan dit worden gemarkeerd |
| Fast Connect drempel | 0.6 | Minimale betrouwbaarheid voor suggesties (0.5–0.95) |
| Groq API-sleutel | — | Voor AI Quick Actions en Fast Connect AI-analyse |

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

---

## Compatibiliteit

- Obsidian 1.4.0 en hoger
- Windows, macOS en Linux

---

## Licentie

MIT
