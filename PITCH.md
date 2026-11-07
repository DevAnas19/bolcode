# BolCode: Code in your own language

**Anas Ansari** · B.Tech CSE (AI/ML), Bhagwan Mahavir University, Surat · [github.com/DevAnas19](https://github.com/DevAnas19)

## The problem
Millions of Indian students and developers think in Hindi, Gujarati or Hinglish, but every coding tool expects typed English.
Beginners from Tier 2 and Tier 3 towns lose time translating their thoughts into English commands before they can even start.

## The solution
**BolCode** is a VS Code extension where you edit code by *speaking*. Select a function, press a hotkey and say
*"is function ko async bana do aur error handling add karo"*. BolCode transcribes the Hinglish, an LLM edits only the selected
code, and you review a **diff** before accepting. It can also explain code in simple Hinglish, undo changes by voice, and
reply out loud in Hindi.

## How it uses Gnani AI
- **Prisma (speech to text):** transcribes Hindi-English mixed speech (`en-IN`), with word boosting for code terms such as *async*, *await*, *useState*.
- **Timbre (text to speech, beta):** speaks short Hindi confirmations and a one-line spoken summary of explanations.
- An OpenAI-compatible LLM performs the code edit. Nothing is applied without the user accepting the diff.

## Results (my own test)
40 Hinglish coding commands, one speaker, one laptop and microphone:
- **91.8% code-term accuracy** (56 of 61 code terms recognised)
- Average word error rate 22.2%, mostly harmless spelling variants ("iss" for "is", "mein" for "me")
- Real misses (async heard as "asinc", await as "avaidh", undo as "ando") are fixed by a small correction layer before the LLM
- This is a small sample from one voice, not a benchmark

## Who it helps
Students and junior developers who are more comfortable in Hindi, Gujarati or Hinglish; learners from smaller towns;
anyone who prefers speaking to typing. It fits Gnani's focus on Indian languages and code-mixed voice.

## What is built today
Working extension (tested on Windows), open source, packaged release v0.1.0, setup-check command, accuracy test script, public demo video.

## What is next
Validate Gujarati commands, streaming transcription with Prisma's realtime API, voice accept/reject,
and a browser version that explains DSA problems in Hinglish.

## Links
- Code and release: https://github.com/DevAnas19/bolcode
- Demo on LinkedIn: https://www.linkedin.com/feed/update/urn:li:activity:7522609014883479552/
- Demo on X: https://x.com/Anas19a07/status/2116845849057935608