# Setting up BolCode on a new laptop (for the demo)

Do this the day before filming, not on the day.

## 1. Install the tools
- [VS Code](https://code.visualstudio.com), [Node.js 18+](https://nodejs.org), [Git](https://git-scm.com)
- **ffmpeg**: download `ffmpeg-release-essentials.zip` from gyan.dev/ffmpeg/builds, extract to `C:\ffmpeg`
  (so `C:\ffmpeg\bin\ffmpeg.exe` exists). Or run `winget install Gyan.FFmpeg.Essentials`.
- A headset or any microphone that works in Windows (Settings > System > Sound > Input: the test bar must move).

## 2. Get the code
```
git clone https://github.com/DevAnas19/bolcode.git
cd bolcode
npm install
npm run compile
```
Open the `bolcode` folder in VS Code (**File > Open Folder**, the folder that contains `package.json`).

## 3. Run it
Either press **F5** (a second window opens: the Extension Development Host),
or install the packaged file: Extensions panel > `...` > **Install from VSIX...** > `bolcode-0.1.0.vsix`.

## 4. Settings
Open settings.json (**Ctrl+Shift+P** > *Open User Settings (JSON)*) and merge in `docs/settings.example.json`.
Fix the ffmpeg path if yours is different. Mind the commas.

## 5. Keys (never commit these)
Run these from the Command Palette:
1. **BolCode: Set Gnani API Key**
2. **BolCode: Set LLM API Key**

## 6. Check everything
Run **BolCode: Check Setup**. Every line in the Output panel (BolCode) should start with `OK`. Fix any line that starts with `FIX`.
Then run **BolCode: Test Voice Reply** to hear the Timbre voice.

## 7. Dry run
Create `test.js`, write a small function, select it, press **Ctrl+Alt+B**, say a command, press **Ctrl+Alt+B** again.

## Filming checklist
- Quiet room, headset mic, volume up (Timbre replies play through the speakers; use a headset to avoid echo into the mic)
- Increase VS Code font size (**Ctrl +**) so code is readable on a phone
- Close other windows and turn off notifications
- Screen record with OBS or Win+G; record the voice track clean
- Do each command once as a rehearsal, then film
- Keep the final cut to 60 seconds; the first 3 seconds should already show a spoken command changing code
