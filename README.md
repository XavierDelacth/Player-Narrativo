#  Xavier Player — TP03

> **Narrativa Multimédia Interativa** · ISPTEC 2025/2026  
> Trabalho Prático 03 · Multimédia

---

##  Descrição

**Xavier Player** é um media player web interativo desenvolvido para o TP03 de Multimédia. O projeto apresenta uma narrativa em **duas versões distintas**, permitindo ao utilizador experienciar a mesma história de formas diferentes — apenas pelas imagens (V1) ou com áudio e legendas enriquecidos (V2).

Inclui ainda uma secção de **Rádios de Angola em directo**, com 32 estações transmitidas ao vivo.

---

##  Estrutura do Projeto

```
player/
├── index.html          # Estrutura principal da página
├── styles.css          # Estilos e tema visual
├── script.js           # Lógica completa do player e rádio
├── video/
│   └── video.mp4       # Vídeo da narrativa
├── musica/             # Ficheiros de áudio (MP3, WAV, M4A)
├── legenda/            # Ficheiros de legendas (VTT, SRT)
└── teste/              # Pasta de testes
```

---

##  Funcionalidades

###  Player de Vídeo

| Funcionalidade | Descrição |
|---|---|
| Play / Pausa | Botão dedicado ou clique no vídeo |
| Stop | Repõe o vídeo ao início |
| Seek ±10s | Avança ou recua 10 segundos |
| Barra de progresso | Clique e drag para navegar |
| Volume | Controlo deslizante + botão mudo |
| Ecrã completo | Expande o player |
| Atalhos de teclado | Ver tabela abaixo |

###  Dois Modos de Narrativa

#### Versão 1 — Narrativa Visual
- Vídeo **sempre sem som**
- Sem legendas
- O utilizador interpreta a história apenas pelas imagens

#### Versão 2 — Narrativa Enriquecida
- O vídeo mantém-se mudo por defeito
- **Botão "Ativar Áudio"** → liga/desliga o áudio de forma independente
- **Botão "Adicionar Legendas"** → liga/desliga legendas sincronizadas de forma independente
- Cada controlo funciona de forma autónoma

###  Carregamento de Ficheiros

Os ficheiros são carregados em tempo real através de drag & drop ou seleção:

| Zona | Formatos aceites | Efeito |
|---|---|---|
|   Vídeo | MP4, MOV, WebM | Substitui o vídeo em reprodução |
|  Áudio | MP3, WAV, M4A | Áudio externo sincronizado com o vídeo |
|  Legendas | VTT, SRT | Legendas sincronizadas ao tempo do vídeo |

> **Nota:** os ficheiros SRT são convertidos automaticamente para o formato VTT internamente.

###  Cenas / Momentos Narrativos

O vídeo é dividido automaticamente em **6 actos** com pills de navegação:

- Acto 1 · Chegada
- Acto 2 · Contexto
- Acto 3 · Problema
- Acto 4 · Impacto
- Acto 5 · Pessoas
- Acto 6 · Desfecho

Clicar numa pill avança directamente para esse momento e inicia a reprodução.

###  Rádios de Angola (Em Directo)

Secção com **32 estações angolanas** transmitidas ao vivo, incluindo:

- Rádio Mais (Luanda, Benguela, Huambo, Huíla, Cabinda)
- Canal A · N'Gola Yetu · Rádio Cinco (RNA)
- Emissoras provinciais de todas as províncias
- RNA Internacional

Cada card de rádio permite ouvir, pausar e copiar o link do stream. O **player fixo** na parte inferior mostra a estação activa com visualizador animado.

---

##  Atalhos de Teclado

| Tecla | Acção |
|---|---|
| `Espaço` ou `K` | Play / Pausa |
| `→` | Avançar 10 segundos |
| `←` | Recuar 10 segundos |
| `M` | Mudo / Som |
| `V` | Alternar entre V1 e V2 |
| `A` | Ativar / Desativar Áudio *(só em V2)* |
| `L` | Ativar / Desativar Legendas *(só em V2)* |
| `F` | Ecrã completo |

---

##  Como Usar

1. Abre o ficheiro `index.html` num browser moderno (Chrome, Firefox, Edge)
2. Carrega o teu vídeo na zona **"Carregar vídeo"**
3. *(Opcional)* Carrega um ficheiro de áudio e/ou legendas
4. Escolhe o modo **V1** (só imagem) ou **V2** (áudio + legendas)
5. Usa os controlos para reproduzir e navegar na narrativa

> O player funciona directamente no browser — não é necessário servidor ou instalação.

---

##  Tecnologias

- **HTML5** — estrutura e elemento `<video>` nativo
- **CSS3** — variáveis CSS, animações, layout responsivo
- **JavaScript (ES6+)** — lógica do player, parser VTT/SRT, gestão de estado
- **Google Fonts** — Syne, Outfit, JetBrains Mono

Sem dependências externas · Sem frameworks · Sem servidor necessário

---

##  Notas Técnicas

- A sincronização do áudio externo com o vídeo é mantida via evento `timeupdate` (±0.4s de tolerância)
- As legendas são pesquisadas em tempo real em `state.subtitles[]` a cada tick do vídeo
- Ao activar legendas a meio do vídeo, a legenda correcta aparece **imediatamente**, sem aguardar o próximo tick
- Os streams de rádio são servidos via proxies HTTPS para contornar restrições CORS

---

*Ele Dmeu · Xavier Player · Dança só ma bo · 2026*
