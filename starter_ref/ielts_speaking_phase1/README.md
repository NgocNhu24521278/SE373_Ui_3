# IELTS Speaking Mock Test — Phase 1 Starter

**Goal:** Working end-to-end demo for Phase 1 (deadline 27 October 2026).

> The speaking mock test is **TEXT ONLY**. It is not an official IELTS speaking
> test. It cannot assess spoken fluency, timing or pronunciation and it **does
> not assign an IELTS band**.

## Features

- Three Speaking parts (Part 1 → Part 2 cue card → Part 3 discussion).
- 16 original questions in 2 topic tracks; rule-based contextual follow-ups.
- Streamlit app, Python agent service, SQLite persistence.
- 3 LangChain tools: `fetch_current_question`, `save_candidate_answer`, `get_mock_progress`.
- One actual project skill: `skills/speaking_examiner/SKILL.md`, loaded as agent instructions.
- LangChain `create_agent` model → tool → model loop, with structured JSONL traces.
- **Offline demo mode**: a scripted model emits real tool calls, so there is no need for API keys to run the app and tests. This mode simulates tool decisions, **not** AI language understanding. To demo a genuine LLM agent, configure a real LLM API key and enable live mode in the app.
- 18 automated cases including actual offline LangChain tool-calling loop.
- GitHub Actions CI to run pytest on push / pull request.

## Install (Python 3.11 or 3.12 recommended)

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
python -m pip install -r requirements.txt
streamlit run app.py
```

Then open Streamlit's local URL. Choose topic → **Start new mock test** → answer one prompt at a time. Find current session ID above the progress bar and keep it to resume an existing session.

## Real LLM mode (optional but recommended for presentation)

In `.env` (copy `.env.example`):

```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Switch on **Use a real LLM agent** in the sidebar. Requires a working account and may cost tokens. The LLM is instructed to call tools; SQLite still verifies the answer/question pairing. If the agent fails to call its save tool, the UI reports an error instead of silently pretending success. **Never commit .env**.

## Run the 18 eval cases

```bash
pytest -q
mkdir reports  # PowerShell: New-Item -ItemType Directory -Force reports
pytest -v --junitxml=reports/eval.xml
```

To see logs open `logs/agent_trace.jsonl` or expand **Agent trace** in the UI. Log records identify which tools were used and when; learner answers are stored in SQLite rather than copied into log messages.

## Architecture

```text
[Streamlit app]
      │
      ▼
[LangChain create_agent] ────── [speaking_examiner/SKILL.md]
      │
      ├─ fetch_current_question() ─┐
      ├─ save_candidate_answer() ──┼──► [SQLite sessions + answers]
      └─ get_mock_progress() ──────┘
      │
      └────────────────────────────────► [JSONL trace]
```

The application is purposefully single-user-demo scale. The unguessable session ID is only a prototype access key; there is **no authentication/authorization layer**. Do not use it to store real personal data in a public deployment.

## Question origin / data policy

`data/questions.json` contains 16 *original* questions created for this prototype, across Study and Technology. They are not official IELTS exam questions and are not a gold-standard benchmark. The 18 automated tests cover tool behavior, workflow and persistence; they **do not measure IELTS assessment accuracy**. Curated evaluation data and human review should be added in later phases before claiming any assessment capabilities.

## 48-hour task split (five people)

| Owner | Scope |
|---|---|
| 1 | Streamlit UI, screenshots and demo flow |
| 2 | LangChain agent, tools and SKILL.md |
| 3 | SQLite state and question bank |
| 4 | pytest evaluation, logs, CI |
| 5 | Integration, README, slides and live demonstration |

**Scope not included:** audio capture, transcription, timed Part 2, pronunciation, official band grading, examiner moderation, teacher approval.

## Suggested five-minute demo

1. Show GitHub repo and green CI status.
2. Launch app in offline mode, start session and explain why no dataset is needed.
3. Answer a Part 1 prompt with “I learn online with my friends.” Show personalized follow-up.
4. Open **Agent trace**: `save_candidate_answer` → `fetch_current_question`.
5. Show Part 2 cue card and Part 3 prompts (can pre-create a session).
6. Restart app; load session using session ID; show answers persisted.
7. Show `pytest -v` and the 18 evaluation cases.
8. If API key is available, repeat one prompt with live LLM mode to demonstrate real LLM tool-selection.
