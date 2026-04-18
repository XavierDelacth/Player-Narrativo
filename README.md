# Player Narrativo — TP03 · ISPTC 2025

## Estrutura de ficheiros

```
/player
├── index.html        ← Abre este ficheiro no browser
├── styles.css        ← Estilos visuais
├── script.js         ← Lógica do player e legendas
├── legendas.vtt      ← Exemplo de ficheiro de legendas
├── /video            ← Coloca aqui os teus vídeos MP4
│   └── video.mp4
└── /legenda          ← Coloca aqui os teus VTT/SRT
    └── legendas.vtt
```

---

## Como executar

1. Coloca o teu vídeo em `/video/video.mp4`
2. Abre o `index.html` directamente no browser (Chrome ou Firefox)
3. Ou usa o Live Server do VS Code para evitar erros de CORS

---

## Como usar o player

| Acção              | Como fazer                        |
|--------------------|-----------------------------------|
| Play / Pause       | Botão ▶ ou tecla `Espaço` / `K`   |
| Parar              | Botão ⏹ (volta ao início)         |
| Recuar 10s         | Botão ↩ ou tecla `←`             |
| Avançar 10s        | Botão ↪ ou tecla `→`             |
| Mudo / Som         | Botão 🔊 ou tecla `M`             |
| Alternar V1/V2     | Toggle ou tecla `V`              |
| Ecrã inteiro       | Botão ⛶ ou tecla `F`             |
| Navegar            | Clica na barra de progresso       |

---

## Como adicionar o teu vídeo e legendas

### Opção A — via interface (arrasta e solta)
1. Abre o player no browser
2. Na secção "Ficheiros da narrativa", clica em cada zona
3. Selecciona o teu ficheiro de vídeo (.mp4), legendas (.vtt) e áudio (.mp3)

### Opção B — via código (vídeo já na pasta)
1. Coloca o ficheiro em `/video/video.mp4`
2. No `index.html`, linha com `<source>`, muda o `src`

---

## Como criar um ficheiro VTT

```
WEBVTT

1
00:00:01.000 --> 00:00:05.000
Texto que aparece entre o segundo 1 e 5.

2
00:00:06.000 --> 00:00:10.500
Segundo bloco de texto.
Pode ter duas linhas.
```

**Regras:**
- Começa sempre com `WEBVTT` na primeira linha
- Deixa uma linha vazia entre cada bloco
- Formato do tempo: `HH:MM:SS.mmm`
- Podes converter `.srt` para `.vtt` mudando as vírgulas por pontos nos tempos

---

## Modos de visualização

| Modo | Áudio | Legendas | Para quê              |
|------|-------|----------|-----------------------|
| V1   | ❌ Mudo | ❌ Off  | Narrativa visual pura |
| V2   | ✅ On  | ✅ On   | Narrativa enriquecida |

Alterna com o toggle **V1 / V2** ou a tecla `V`.

---

## Como sincronizar as legendas com o teu vídeo real

1. Gera o áudio no ElevenLabs e importa no CapCut
2. Exporta o vídeo final (com ou sem áudio embutido)
3. Ajusta os tempos do `legendas.vtt`:
   - Ouve o áudio e anota o segundo exacto de cada frase
   - Edita os tempos `00:00:XX.000` no ficheiro VTT
4. Carrega o vídeo e o VTT no player e testa

---

*TP03 · Autoria de Conteúdo Multimédia · ISPTC 2025*
