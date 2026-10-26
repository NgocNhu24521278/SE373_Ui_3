"""Backend giả cho giao diện (TV1).

Giao diện (app.py) chỉ gọi hai hàm trong file này:
    start_test()          -> dict trạng thái
    answer(sid, text)     -> dict trạng thái
"""

import re

# (part, câu hỏi, cue card)
_STEPS = [
    # Part 1: 4–6 câu hỏi (5 câu) về bản thân và chủ đề quen thuộc
    (1, "Are you a student or do you work? Tell me a little about what you do.", None),
    (1, "What does your typical daily routine look like?", None),
    (1, "Do you enjoy studying English, and how do you usually practice it?", None),
    (1, "What do you usually do in your free time to relax?", None),
    (1, "Do you prefer spending your free time alone or with friends? Why?", None),
    # Part 2: Đưa cue card, cho 1 phút chuẩn bị, người học trả lời một lượt dài
    (
        2,
        "Now I'd like you to talk about the topic on the card. You have 1 minute to prepare, and then you should speak for 1 to 2 minutes.",
        "Describe a skill you learned recently.\n"
        "- what the skill is\n"
        "- when and how you learned it\n"
        "- what challenges you faced while learning it\n"
        "- and explain why this skill was useful to you",
    ),
    # Part 3: 4–6 câu hỏi (5 câu) thảo luận, có câu hỏi đào sâu dựa trên câu trả lời trước
    (3, "Why do you think people today want to learn new skills throughout their lives?", None),
    (
        3,
        "In your previous answer, you mentioned {anchor}. Why do you think that plays such an important role when people learn a new skill?",
        None,
    ),
    (
        3,
        "Do you think schools and universities should focus more on practical life skills than traditional academic subjects? Why?",
        None,
    ),
    (
        3,
        "Building on what you said about {anchor}, can you give a concrete real-life example and consider an opposing point of view?",
        None,
    ),
    (
        3,
        "How might artificial intelligence and digital technology change the way people learn new skills in the next ten years?",
        None,
    ),
]

# session_id -> chỉ số câu hỏi đang được hỏi
_sessions: dict[str, int] = {}
# session_id -> câu trả lời gần nhất của người học
_last_answers: dict[str, str] = {}


def _extract_anchor(answer_text: str) -> str:
    cleaned = (answer_text or "").strip()
    if not cleaned:
        return "that point"
    lower = re.sub(r"[^a-z0-9\s]", " ", cleaned.lower())
    patterns = [
        (r"\b(?:job|jobs|career|work|employ|promotion)\b", "career and job opportunities"),
        (r"\b(?:friend|friends|social)\b", "learning and socializing with friends"),
        (r"\b(?:famil(?:y|ies)|parent|parents)\b", "support from family"),
        (r"\b(?:online|internet|video|youtube|app|apps)\b", "learning online"),
        (r"\b(?:teacher|teachers|mentor|instructor)\b", "guidance from teachers"),
        (r"\b(?:practice|practising|practicing|habit)\b", "regular practice"),
        (r"\b(?:tech|technology|ai|computer|digital)\b", "modern technology"),
        (r"\b(?:confident|confidence)\b", "building personal confidence"),
        (r"\b(?:time|schedule|busy)\b", "managing time effectively"),
        (r"\b(?:money|salary|income|financial)\b", "financial benefits"),
        (r"\b(?:practical|real)\b", "practical real-life skills"),
        (r"\b(?:academic|theory|exam|exams)\b", "academic knowledge"),
        (r"\b(?:school|university|college|education)\b", "formal education at school"),
    ]
    for regex, label in patterns:
        if re.search(regex, lower):
            return label
    words = cleaned.split()
    if len(words) >= 2:
        snippet = " ".join(words[:6])
        return f'"{snippet}..."' if len(words) > 6 else f'"{snippet}"'
    return "that point"


def _make(sid: str, reply: str, finished: bool) -> dict:
    idx = _sessions[sid]
    part, _, cue = _STEPS[min(idx, len(_STEPS) - 1)]
    resolved_reply = reply.replace("{anchor}", _extract_anchor(_last_answers.get(sid, "")))
    return {
        "session_id": sid,
        "reply": resolved_reply,
        "part": part,
        "answered": idx,
        "total": len(_STEPS),
        "finished": finished,
        "cue_card": None if finished else cue,
        "tools": ["save_answer", "get_question"],
        "feedback": (
            "Bạn đã trả lời đủ 3 phần. Đây là bản demo, chưa có nhận xét chi tiết."
            if finished
            else None
        ),
    }


def start_test() -> dict:
    sid = str(len(_sessions) + 1)
    _sessions[sid] = 0
    _last_answers[sid] = ""
    return _make(sid, _STEPS[0][1], False)


def answer(sid: str, text: str) -> dict:
    if sid not in _sessions:
        raise KeyError(f"Session không tồn tại: {sid}")
    if not text or not text.strip():
        raise ValueError("Câu trả lời trống")
    _last_answers[sid] = text.strip()
    _sessions[sid] += 1
    idx = _sessions[sid]
    if idx >= len(_STEPS):
        return _make(sid, "Thank you. That is the end of the test.", True)
    return _make(sid, _STEPS[idx][1], False)
