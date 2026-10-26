"""Backend giả cho giao diện (TV1).

Giao diện (app.py) chỉ gọi hai hàm trong file này:
    start_test()          -> dict trạng thái
    answer(sid, text)     -> dict trạng thái

Khi TV2 (agent) và TV3 (database) xong, chỉ cần sửa file này để gọi
run_agent(...) thật, rồi đổi kết quả về đúng dạng dict bên dưới.
app.py không phải sửa.

Dạng dict trạng thái (hợp đồng giữa UI và agent):
    session_id : str        mã phiên
    reply      : str        lời giám khảo (câu hỏi kế tiếp hoặc lời kết)
    part       : int        1, 2 hoặc 3
    answered   : int        số câu đã trả lời
    total      : int        tổng số câu
    finished   : bool       đã hết bài thi chưa
    cue_card   : str|None   nội dung thẻ khi ở Part 2, còn lại là None
    tools      : list[str]  tool agent đã gọi ở lượt này (để hiển thị tiến trình)
    feedback   : str|None   (tuỳ chọn) nhận xét luyện tập khi kết thúc
"""

# (part, câu hỏi, cue card)
_STEPS = [
    (1, "Do you enjoy studying English?", None),
    (1, "What do you usually do in your free time?", None),
    (
        2,
        "Now I'd like you to talk about the topic on the card.",
        "Describe a skill you learned recently.\n"
        "- what it is\n"
        "- when you learned it\n"
        "- how you learned it\n"
        "- and explain why it was useful",
    ),
    (3, "Why do you think people want to learn new skills?", None),
]

# session_id -> chỉ số câu hỏi đang được hỏi
_sessions: dict[str, int] = {}


def _make(sid: str, reply: str, finished: bool) -> dict:
    idx = _sessions[sid]
    part, _, cue = _STEPS[min(idx, len(_STEPS) - 1)]
    return {
        "session_id": sid,
        "reply": reply,
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
    return _make(sid, _STEPS[0][1], False)


def answer(sid: str, text: str) -> dict:
    if sid not in _sessions:
        raise KeyError(f"Session không tồn tại: {sid}")
    if not text or not text.strip():
        raise ValueError("Câu trả lời trống")
    _sessions[sid] += 1
    idx = _sessions[sid]
    if idx >= len(_STEPS):
        return _make(sid, "Thank you. That is the end of the test.", True)
    return _make(sid, _STEPS[idx][1], False)
