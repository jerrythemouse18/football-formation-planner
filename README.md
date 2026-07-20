# ⚽ Football Formation Planner

An interactive web app for planning, visualizing, and sharing football (soccer) formations. Drag players into position, draw tactical overlays, and export your formations as images.

**🔗 Live Demo:** [https://jerrythemouse18.github.io/football-formation-planner/](https://jerrythemouse18.github.io/football-formation-planner/)

---

## Features

### Core

| Feature | Description |
|---------|-------------|
| **Formation Presets** | Select from 40+ valid formations for 2-11 players |
| **Custom Formation Input** | Type any formation (e.g. `4-3-3`, `4-2-3-1`, `3-4-1-2`) and apply instantly |
| **Drag-and-Drop Positioning** | Freely reposition any player on the pitch with mouse or touch |
| **Player Count Selection** | Choose 1-11 players; presets auto-update to show valid formations |

### Player Management

| Feature | Description |
|---------|-------------|
| **Edit Player Info** | Double-click any player to set name, number, and role |
| **Auto Role Assignment** | Roles (GK, CB, WB, CM, ST, etc.) auto-assigned based on position in formation |
| **Player List** | Sidebar list of all players; click to highlight on pitch |
| **Jersey Numbers** | Customizable numbers (1-99) displayed on each player node |

### Team Customization

| Feature | Description |
|---------|-------------|
| **Jersey Color** | Pick outfield player jersey color |
| **Number Color** | Choose the number/text color for contrast |
| **GK Color** | Separate goalkeeper jersey color |
| **Team Name** | Optional team name (appears in exports) |

### Tactical Drawing Tools

| Tool | Description |
|------|-------------|
| **👆 Select** | Default mode — move players around |
| **➡️ Arrow** | Draw directional arrows for player movement/runs |
| **📏 Line** | Draw straight lines for passing lanes, marking |
| **✏️ Freehand** | Free-draw for custom shapes, zones, paths |
| **🟨 Zone** | Highlight rectangular zones (pressing areas, etc.) |

- Configurable draw color
- Clear all drawings with one click

### Save & Export

| Feature | Description |
|---------|-------------|
| **Save to Browser** | Save unlimited formations to localStorage with custom names |
| **Load Formations** | Browse and load any saved formation |
| **Delete Saves** | Remove unwanted saves |
| **Export PNG** | Download high-resolution PNG of the pitch with all players and drawings |

### Quality of Life

| Feature | Description |
|---------|-------------|
| **Undo/Redo** | Full undo/redo stack (Ctrl+Z / Ctrl+Y) for all changes |
| **Keyboard Shortcuts** | Undo, redo, escape to deselect tool |
| **Responsive Design** | Works on desktop and mobile (touch drag supported) |
| **Dark Theme** | Easy on the eyes, designed for extended use |

---

## Tech Stack

- **Pure HTML5 / CSS3 / JavaScript** — zero dependencies, no build step
- **Canvas API** — pitch rendering and tactical drawings
- **DOM** — player nodes with native drag-and-drop
- **localStorage** — client-side save/load
- **GitHub Pages** — static hosting

---

## Project Structure

```
football-formation-planner/
├── index.html              # Main app entry point
├── css/
│   └── styles.css          # All styling (dark theme, responsive)
├── js/
│   ├── app.js              # Main controller, state management, UI bindings
│   ├── formations.js       # Formation presets, parsing, position generation
│   ├── pitch.js            # Canvas pitch rendering (markings, stripes)
│   ├── players.js          # Player node management, drag-and-drop, editing
│   ├── drawing.js          # Tactical drawing tools (arrows, lines, freehand, zones)
│   └── storage.js          # localStorage save/load
└── README.md               # This file
```

---

## Usage

### Quick Start

1. Open the app (or `index.html` locally)
2. Select number of players (default: 11)
3. Pick a formation preset or type your own (e.g. `4-2-3-1`)
4. Drag players to fine-tune positions
5. Double-click a player to edit name/number/role
6. Use drawing tools for tactical annotations
7. Export as PNG or save for later

### Custom Formation Format

Type outfield players per line separated by dashes:

- `4-4-2` → 4 defenders, 4 midfielders, 2 forwards
- `4-2-3-1` → 4 defenders, 2 DMs, 3 AMs, 1 striker
- `3-4-1-2` → 3 CBs, 4 midfielders, 1 AM, 2 strikers
- `4-1-2-1-2` → diamond midfield variant

The GK is always added automatically. Total outfield players must not exceed 10.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Escape` | Switch to Select tool / close popups |

---

## Development

No build tools needed. Just serve the files:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Or just open index.html directly in a browser
```

---

## Future Features (Roadmap)

### High Priority

- **Multiple Formations View** — Compare two formations side-by-side (e.g. attacking vs defensive shape)
- **Animation / Transitions** — Animate player movement between two states (show pressing triggers, transitions)
- **Formation Templates Library** — Pre-built famous formations (Guardiola's 2-3-5 build-up, Mourinho low block, etc.)
- **Share via URL** — Encode formation state in URL params for instant sharing without accounts

### Medium Priority

- **Opposition Team** — Add a second team with different colors for matchup planning
- **Player Photos** — Upload/link player photos to display on nodes
- **Heatmap Overlay** — Show positional heatmaps per player or zone
- **Movement Paths** — Define run paths per player (curved arrows that animate)
- **Notes & Labels** — Add floating text labels anywhere on the pitch
- **Set Piece Planner** — Specialized views for corners, free kicks, throw-ins
- **Ball Position** — Draggable ball icon for set piece planning
- **Half-Pitch Mode** — Zoom into one half for detailed tactical work

### Lower Priority

- **Import from Clipboard** — Paste formation from text/image and auto-detect
- **Export to PDF** — Multi-page export with formation + player list
- **Formation Statistics** — Show defensive coverage %, midfield compactness, width
- **Real-Time Collaboration** — Multiple users editing the same formation (WebSocket/WebRTC)
- **Touch Gestures** — Pinch-to-zoom on mobile, two-finger pan
- **Pitch Variants** — Futsal court, 5-a-side, 7-a-side scaled pitches
- **3D View** — Isometric or 3D perspective of the pitch
- **AI Formation Suggestions** — Suggest formations based on player roles/attributes
- **Integration with Stats APIs** — Pull player data from football APIs (FBref, Opta)
- **Video Timeline** — Sync formation states to match video timestamps
- **Drill Designer** — Training drill planner with cones, gates, movement patterns

### Technical Improvements

- **PWA Support** — Installable as a mobile app, works offline
- **Cloud Sync** — Sync saves across devices via account/backend
- **Accessibility** — Keyboard-only navigation, screen reader support
- **i18n** — Multi-language support
- **Unit Tests** — Jest/Vitest test coverage for formation logic
- **TypeScript Migration** — Type safety for larger codebase

---

## License

MIT

---

Built by Jerry 🐭
