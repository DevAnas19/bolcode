# BolCode

**Bolo, code ho jayega.** Edit your code by speaking in Hinglish. Built on Gnani Prisma speech-to-text.

Press a hotkey, say *"is function ko async bana do aur error handling add karo"*, review the diff, accept.

## How it works

```
hotkey -> ffmpeg records mic -> Gnani Prisma (STT) -> Hinglish transcript
  -> intent (edit / explain / undo) -> LLM edits the selected code
  -> diff view -> Accept / Reject
```

## Setup

1. Install [Node.js 18+](https://nodejs.org), VS Code, and **ffmpeg**
   (Windows: `winget install Gyan.FFmpeg`, macOS: `brew install ffmpeg`, Linux: `apt install ffmpeg`).
2. `npm install`, then `npm run compile`.
3. Open this folder in VS Code and press **F5**. A new window opens with the extension loaded.
4. In that window, run **BolCode: Select Microphone** from the Command Palette (required on Windows).
5. Open Settings and set `bolcode.llm.baseUrl` and `bolcode.llm.model` (any OpenAI-compatible endpoint).
6. Select some code, press **Ctrl+Alt+B** (Cmd+Alt+B on macOS), speak, press it again to stop.
   You will be asked for your Gnani API key (and LLM key) the first time. They are stored in VS Code's secret storage.

## Voice commands

| Say | Does |
|---|---|
| "isko async bana do" / "error handling add karo" | Edits the selected code (shows a diff first) |
| "ye code samjhao" | Explains the selection in Hinglish (Output panel: BolCode) |
| "wapas karo" / "undo" | Undoes the last change |

## Spoken replies (Gnani Timbre, beta)

Set `bolcode.voice.enabled` to `true`. BolCode then says short Hindi replies ("हो गया", "बदलाव तैयार है") and reads a one-line summary after "samjhao". Run **BolCode: Test Voice Reply** to check it. Model, voice and language are in `bolcode.voice.*` settings.

## Settings worth tuning

- `bolcode.language`: try `en-IN` (accepts Hindi-English mixed audio, Latin-script output) and `hi-IN` (Devanagari output). Pick whichever transcribes your commands better.
- `src/vocab.ts`: word-boost list for technical terms Prisma misses.
- `bolcode.substitutions`: up to 10 find-and-replace rules applied to the transcript.

## Accuracy test (do this first)

See `test/run_prisma_test.py`. Record the 40 commands in `test/commands.txt`, run the script, and put the numbers in your demo post.

## Troubleshooting

- *"Could not start ffmpeg"*: install ffmpeg or set `bolcode.ffmpegPath`.
- *"No microphone selected"*: run **BolCode: Select Microphone**.
- *Silent or empty transcript*: check the mic in Windows sound settings; speak for at least 2 seconds.
- *403 from Prisma*: check the API key and remaining credits.

## Roadmap

- Timbre spoken replies in Hinglish
- Realtime streaming transcription (Prisma WebSocket)
- Voice accept / reject
- Whole-project context

Built for the Great Indian AI Internship Challenge with Gnani AI. #GnaniAI #GreatIndianAIInternshipChallenge
