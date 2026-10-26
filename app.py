"""Giao diện Streamlit cho Speaking Practice (TV1).

Chạy: python -m streamlit run app.py

UI không gọi LLM trực tiếp. Mọi thứ đi qua ui_backend.py
(start_test, answer), giữ nguyên hợp đồng dữ liệu.
"""

import html
import time
import streamlit as st

from styles import APP_CSS, EXAMINER_SVG, render_cue_card_html
from ui_backend import answer, start_test  # sau này đổi sang gọi agent thật

DISCLAIMER = (
    "Nhận xét chỉ dùng để luyện tập, không phải điểm IELTS chính thức. "
    "Chế độ text không đánh giá phát âm."
)

PART_INFO = {
    1: "🌸 Part 1: Trả lời ngắn về bản thân và chủ đề quen thuộc (2–3 câu mỗi câu hỏi).",
    2: "🎤 Part 2: Nói độc thoại theo chủ đề - cue card. Chuẩn bị 1 phút rồi trình bày trong 1–2 phút.",
    3: "✨ Part 3: Thảo luận câu hỏi mở rộng. Hãy nêu quan điểm, giải thích lý do và đưa ví dụ.",
}

PART_INTRO_DETAILS = {
    1: {
        "badge": "Part 1 · Introduction",
        "title": "Giới thiệu & Làm quen",
        "duration": "4–5 phút gợi ý · 2 câu hỏi",
        "description": "Giám khảo sẽ đặt các câu hỏi quen thuộc về bản thân, việc học tập, sở thích và thói quen hằng ngày của bạn.",
        "tips": [
            "Trả lời ngắn gọn từ 2–3 câu cho mỗi câu hỏi, tránh chỉ trả lời Yes/No.",
            "Mở rộng câu trả lời bằng một lý do ngắn hoặc chi tiết cá nhân.",
            "Đồng hồ tính thời gian làm bài Part 1 sẽ bắt đầu ngay khi bạn bấm nút bên dưới.",
        ],
    },
    2: {
        "badge": "Part 2 · Long Turn",
        "title": "Nói độc thoại theo chủ đề - cue card",
        "duration": "1 phút chuẩn bị · 1–2 phút nói",
        "description": "Bạn sẽ nhận được một thẻ chủ đề (Cue card) kèm các gợi ý. Bạn có 1 phút chuẩn bị ý tưởng trước khi trình bày bài nói độc thoại.",
        "tips": [
            "Đọc kỹ câu chủ đề và 4 gạch đầu dòng gợi ý trên thẻ Cue card.",
            "Viết một đoạn độc thoại mạch lạc có mở đầu, nội dung chính và cảm nghĩ kết luận.",
            "Đồng hồ tính thời gian làm bài và 1 phút chuẩn bị sẽ bắt đầu khi bạn bấm nút bên dưới.",
        ],
    },
    3: {
        "badge": "Part 3 · Discussion",
        "title": "Thảo luận mở rộng",
        "duration": "4–5 phút gợi ý · Câu hỏi sâu",
        "description": "Giám khảo sẽ hỏi các câu hỏi mang tính khái quát và sâu hơn liên quan đến chủ đề bạn vừa trình bày ở Part 2.",
        "tips": [
            "Nêu rõ quan điểm, giải thích nguyên nhân (Why) và kết quả (Effect).",
            "Đưa thêm ví dụ thực tế để câu trả lời thuyết phục hơn (khoảng 3–5 câu).",
            "Đồng hồ tính thời gian làm bài Part 3 sẽ bắt đầu ngay khi bạn bấm nút bên dưới.",
        ],
    },
}

PART_TRANSITION_MSG = {
    2: "Now, let's move on to Part 2. Please read the cue card carefully.",
    3: "Now, let's move on to Part 3 and discuss some broader questions.",
}

st.set_page_config(
    page_title="Speaking Practice",
    page_icon="🎀",
    layout="centered",
)
st.markdown(APP_CSS, unsafe_allow_html=True)

ss = st.session_state
ss.setdefault("state", None)          # dict trạng thái mới nhất từ backend
ss.setdefault("chat", [])             # lịch sử [(role, msg), ...]
ss.setdefault("error", None)          # thông báo lỗi thân thiện
ss.setdefault("session_broken", False)# đánh dấu khi session_id không tồn tại
ss.setdefault("answer_box", "")       # nội dung ô nhập câu trả lời
ss.setdefault("short_notice", None)   # nhắc nhẹ khi câu trả lời quá ngắn (< 3 từ)
ss.setdefault("transition_msg", None) # lời chuyển Part của giám khảo
ss.setdefault("part_started", False)  # đã bấm "Bắt đầu làm bài" cho Part hiện tại chưa
ss.setdefault("part_started_at", 0.0) # mốc thời gian bắt đầu làm bài của Part hiện tại
ss.setdefault("part_elapsed", {1: 0, 2: 0, 3: 0}) # thời gian đã làm từng Part (giây)
ss.setdefault("p2_phase", None)       # 'prep' | 'speak' cho đồng hồ Part 2
ss.setdefault("p2_started_at", 0.0)   # mốc thời gian bắt đầu pha hiện tại ở Part 2
ss.setdefault("selected_mode", "full")# 'full' | 1 | 2 | 3


def count_words(text: str) -> int:
    cleaned = text.strip()
    return len(cleaned.split()) if cleaned else 0


def format_mmss(total_seconds: int) -> str:
    sec = max(0, int(total_seconds))
    mins, secs = divmod(sec, 60)
    return f"{mins:02d}:{secs:02d}"


def get_part_seconds(part_num: int) -> int:
    base = ss.part_elapsed.get(part_num, 0)
    if (
        ss.state
        and not ss.state.get("finished")
        and ss.part_started
        and ss.state.get("part") == part_num
        and ss.part_started_at > 0
    ):
        return base + max(0, int(time.time() - ss.part_started_at))
    return base


def commit_active_part_time() -> None:
    if ss.state and ss.part_started and ss.part_started_at > 0:
        cur_part = ss.state["part"]
        added = max(0, int(time.time() - ss.part_started_at))
        updated = dict(ss.part_elapsed)
        updated[cur_part] = updated.get(cur_part, 0) + added
        ss.part_elapsed = updated
        ss.part_started_at = time.time()


def start_current_part() -> None:
    """Bắt đầu tính thời gian làm bài cho Part hiện tại khi bấm nút."""
    ss.part_started = True
    ss.part_started_at = time.time()
    if ss.state and ss.state["part"] == 2:
        ss.p2_phase = "prep"
        ss.p2_started_at = time.time()


def skip_prep_time() -> None:
    """Cho phép người học bỏ qua 60s chuẩn bị để chuyển ngay sang 2 phút nói."""
    ss.p2_phase = "speak"
    ss.p2_started_at = time.time()


def start(mode="full") -> None:
    try:
        with st.spinner("Giám khảo đang chuẩn bị phòng thi..."):
            new_state = start_test()
        ss.selected_mode = mode
        if mode in (1, 2, 3):
            new_state = dict(new_state)
            new_state["part"] = mode
        ss.state = new_state
        ss.chat = [("assistant", new_state["reply"])]
        ss.error = None
        ss.session_broken = False
        ss.short_notice = None
        ss.transition_msg = None
        ss.part_started = True
        ss.part_started_at = time.time()
        ss.part_elapsed = {1: 0, 2: 0, 3: 0}
        ss.p2_phase = "prep" if new_state["part"] == 2 else None
        ss.p2_started_at = time.time() if new_state["part"] == 2 else 0.0
    except Exception:
        ss.error = "Không thể bắt đầu bài thi lúc này. Bạn vui lòng bấm thử lại nhé!"


def reset() -> None:
    ss.state = None
    ss.chat = []
    ss.error = None
    ss.session_broken = False
    ss.answer_box = ""
    ss.short_notice = None
    ss.transition_msg = None
    ss.part_started = False
    ss.part_started_at = 0.0
    ss.part_elapsed = {1: 0, 2: 0, 3: 0}
    ss.p2_phase = None


def handle_submit() -> None:
    """Xử lý gửi câu trả lời; giữ nguyên ô nhập nếu rỗng hoặc khi backend lỗi."""
    text = (ss.get("answer_box") or "").strip()
    if not text:
        ss.error = "Bạn chưa nhập câu trả lời kìa! Hãy gõ vài câu tiếng Anh trước khi gửi nhé."
        return

    words = count_words(text)
    ss.short_notice = (
        "Hãy thử nói dài hơn một chút nhé (từ 2–3 câu sẽ giúp luyện phản xạ tốt hơn)!"
        if words < 3
        else None
    )

    old_part = ss.state["part"]
    try:
        with st.spinner("Giám khảo đang suy nghĩ..."):
            new_state = answer(ss.state["session_id"], text)
    except KeyError:
        ss.session_broken = True
        ss.error = "Phiên làm bài không tồn tại hoặc đã hết hạn. Bạn hãy bắt đầu bài mới nhé!"
        return
    except Exception:
        # Không xoá ss.answer_box để người học không bị mất bài đã gõ
        ss.error = "Có lỗi nhỏ khi kết nối giám khảo. Câu trả lời của bạn vẫn được giữ nguyên, hãy bấm gửi lại nhé!"
        return

    commit_active_part_time()
    ss.error = None
    ss.session_broken = False
    ss.chat += [("user", text), ("assistant", new_state["reply"])]
    if new_state["part"] != old_part and not new_state["finished"]:
        ss.transition_msg = PART_TRANSITION_MSG.get(new_state["part"])
        # Hiển thị màn hình giới thiệu của Part mới trước khi bắt đầu tính giờ
        ss.part_started = False
        ss.part_started_at = 0.0
        ss.p2_phase = None
    else:
        ss.transition_msg = None
        if new_state["finished"]:
            ss.part_started = False
            ss.part_started_at = 0.0
            ss.p2_phase = None

    ss.state = new_state
    ss.answer_box = ""


def transcript_text() -> str:
    names = {"assistant": "Examiner", "user": "Candidate"}
    return "\n\n".join(f"{names[role]}: {msg}" for role, msg in ss.chat)


def render_disclaimer() -> None:
    st.markdown(f'<div class="sp-disclaimer">🌸 {DISCLAIMER}</div>', unsafe_allow_html=True)


@st.fragment(run_every=1)
def render_active_part_timer(current_part: int) -> None:
    """Hiển thị đồng hồ tính thời gian làm bài của Part hiện tại và tổng thời gian."""
    p_sec = get_part_seconds(current_part)
    total_sec = sum(get_part_seconds(p) for p in (1, 2, 3))
    st.markdown(
        f'<div class="sp-timer speak" style="background:#FFFFFF;border-color:#FFE0EC;color:#5B2B3F;">'
        f'<span style="color:#E04A86;">⏱️ Thời gian làm bài Part {current_part}: <strong>{format_mmss(p_sec)}</strong></span>'
        f'<span>🌸 Tổng thời gian: <strong>{format_mmss(total_sec)}</strong></span>'
        f'</div>',
        unsafe_allow_html=True,
    )


@st.fragment(run_every=1)
def render_part2_timer() -> None:
    """Đồng hồ Part 2 tự cập nhật mỗi giây: 60s chuẩn bị -> 120s trình bày."""
    if ss.get("p2_phase") is None:
        return
    elapsed = int(time.time() - ss.p2_started_at)

    # Tự động chuyển từ 60s chuẩn bị sang đồng hồ nói 2 phút
    if ss.p2_phase == "prep" and elapsed >= 60:
        ss.p2_phase = "speak"
        ss.p2_started_at = time.time()
        elapsed = 0

    if ss.p2_phase == "prep":
        remain = max(0, 60 - elapsed)
        mins, secs = divmod(remain, 60)
        col_timer, col_skip = st.columns([3, 2])
        with col_timer:
            st.markdown(
                f'<div class="sp-timer prep">'
                f'<span>⏰ Thời gian chuẩn bị ý tưởng</span>'
                f'<span>{mins:02d}:{secs:02d} / 01:00</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with col_skip:
            st.button(
                "Bỏ qua thời gian chuẩn bị",
                on_click=skip_prep_time,
                use_container_width=True,
            )
    else:
        remain = 120 - elapsed
        if remain >= 0:
            mins, secs = divmod(remain, 60)
            st.markdown(
                f'<div class="sp-timer speak">'
                f'<span>🎤 Thời gian trình bày gợi ý (tối đa 2 phút)</span>'
                f'<span>Còn {mins:02d}:{secs:02d}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            over = abs(remain)
            mins, secs = divmod(over, 60)
            st.markdown(
                f'<div class="sp-timer overtime">'
                f'<span>⏰ Đã hết 2 phút gợi ý (+{mins:02d}:{secs:02d}) — Bạn cứ hoàn thiện câu rồi bấm gửi nhé!</span>'
                f'</div>',
                unsafe_allow_html=True,
            )


# Luôn hiển thị nhãn miễn trừ trách nhiệm ở mọi màn hình
render_disclaimer()

# ==================== 1) MÀN HÌNH CHÀO (TRƯỚC KHI THI) ====================
if ss.state is None:
    st.markdown(
        """
        <div class="sp-hero">
          <h1>🎀 Speaking Practice</h1>
          <p>Chọn hình thức luyện tập để vào ngay phòng thi tương ứng</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    row1_c1, row1_c2 = st.columns(2)
    row2_c1, row2_c2 = st.columns(2)

    options_cfg = [
        (row1_c1, "full", "🌸 Full Test", "Full Test (Đầy đủ 3 Part)", "11–14 phút gợi ý · 6 câu hỏi (Part 1, 2, 3)", "🎤 Bắt đầu làm bài"),
        (row1_c2, 1, "💬 Part 1", "Part 1 (Giới thiệu & Làm quen)", "4–5 phút gợi ý · 2 câu hỏi", "🎤 Bắt đầu làm bài"),
        (row2_c1, 2, "🗂️ Part 2", "Part 2 (Nói độc thoại theo chủ đề - cue card)", "1 phút chuẩn bị · 1–2 phút nói", "🎤 Bắt đầu làm bài"),
        (row2_c2, 3, "✨ Part 3", "Part 3 (Thảo luận mở rộng)", "4–5 phút gợi ý · 3 câu hỏi sâu", "🎤 Bắt đầu làm bài"),
    ]

    for col, mode_val, badge, title, meta, btn_label in options_cfg:
        with col:
            st.markdown(
                f"""
                <div class="sp-part-card">
                  <div class="sp-part-badge">{badge}</div>
                  <div class="sp-part-title">{title}</div>
                  <div class="sp-part-meta">{meta}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button(btn_label, key=f"start_opt_{mode_val}", type="primary", use_container_width=True):
                start(mode_val)
                st.rerun()

    st.markdown(
        """
        <div class="sp-checklist">
          <div class="sp-checklist-title">✨ Lưu ý nhỏ trước khi vào phòng thi:</div>
          <div class="sp-checklist-item">✅ Trả lời hoàn toàn bằng văn bản tiếng Anh (không cần thu âm).</div>
          <div class="sp-checklist-item">✅ Chế độ văn bản giúp rèn ý tưởng & từ vựng, không chấm phát âm.</div>
          <div class="sp-checklist-item">✅ Nên ngồi nơi yên tĩnh hoặc đeo tai nghe để tập trung như thi thật.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if ss.error:
        st.error(ss.error)

    st.stop()

state = ss.state

# ==================== 2) THANH STEPPER & TIẾN ĐỘ ====================
current_part = state["part"]
steps_html = []
for p_num, p_name in [(1, "Part 1 · Giới thiệu"), (2, "Part 2 · Cue card"), (3, "Part 3 · Thảo luận")]:
    if state["finished"] or p_num < current_part:
        cls, prefix = "done", '<span style="font-family:sans-serif;">&#10003;</span> '
    elif p_num == current_part:
        cls, prefix = "active", "🌸 "
    else:
        cls, prefix = "", ""
    steps_html.append(f'<div class="sp-step {cls}">{prefix}{p_name}</div>')

st.markdown(f'<div class="sp-stepper">{"".join(steps_html)}</div>', unsafe_allow_html=True)

shown = min(state["answered"] + 1, state["total"])
progress_ratio = 1.0 if state["finished"] else min(state["answered"] / state["total"], 1.0)
st.progress(
    progress_ratio,
    text=f"Hoàn thành {state['answered']}/{state['total']} câu" if state["finished"] else f"Câu {shown}/{state['total']}",
)

# ==================== 3) MÀN HÌNH KẾT THÚC ====================
if state["finished"]:
    total_sec = sum(ss.part_elapsed.get(p, 0) for p in (1, 2, 3))
    st.markdown(
        f"""
        <div class="sp-hero">
          <h1>✨ Chúc mừng bạn đã hoàn thành bài luyện tập!</h1>
          <p>Bạn đã trả lời trọn vẹn <strong>{state['answered']}/{state['total']}</strong> câu hỏi qua cả 3 Part.</p>
          <p style="margin-top:8px;color:#E04A86;">
            ⏱️ Tổng thời gian làm bài: <strong>{format_mmss(total_sec)}</strong>
            (Part 1: {format_mmss(ss.part_elapsed.get(1, 0))} ·
             Part 2: {format_mmss(ss.part_elapsed.get(2, 0))} ·
             Part 3: {format_mmss(ss.part_elapsed.get(3, 0))})
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    feedback_text = state.get("feedback") or "Nhận xét chi tiết sẽ có khi kết nối agent"
    st.info(f"🎀 **Nhận xét luyện tập:** {feedback_text}")

    with st.expander("💬 Xem lại toàn bộ hội thoại của bạn", expanded=True):
        for role, msg in ss.chat:
            who = "Giám khảo" if role == "assistant" else "Bạn"
            escaped = html.escape(msg)
            st.markdown(
                f'<div class="sp-chat-row {role}">'
                f'<div class="sp-bubble {role}"><strong>{who}:</strong> {escaped}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    col_dl, col_new = st.columns(2)
    with col_dl:
        st.download_button(
            "📥 Tải transcript (.txt)",
            data=transcript_text(),
            file_name="speaking_transcript.txt",
            mime="text/plain",
            use_container_width=True,
        )
    with col_new:
        if st.button("🌸 Làm bài mới", type="primary", use_container_width=True):
            reset()
            st.rerun()
    st.stop()

# ==================== 4) MÀN HÌNH GIỚI THIỆU TỪNG PART TRƯỚC KHI LÀM BÀI ====================
if not ss.part_started:
    intro = PART_INTRO_DETAILS.get(current_part, PART_INTRO_DETAILS[1])
    tips_html = "".join(
        f'<div class="sp-checklist-item">✅ {html.escape(tip)}</div>' for tip in intro["tips"]
    )
    st.markdown(
        f"""
        <div class="sp-hero" style="text-align:left;">
          <div class="sp-part-badge">🌸 {html.escape(intro['badge'])} · ⏱️ {html.escape(intro['duration'])}</div>
          <h1 style="font-size:1.65rem;margin-top:4px;">{html.escape(intro['title'])}</h1>
          <p style="color:#5B2B3F;margin-top:6px;">{html.escape(intro['description'])}</p>
        </div>
        <div class="sp-checklist">
          <div class="sp-checklist-title">✨ Hướng dẫn trước khi bắt đầu Part {current_part}:</div>
          {tips_html}
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button(f"🎤 Bắt đầu làm bài Part {current_part}", on_click=start_current_part, type="primary", use_container_width=True):
        st.rerun()
    st.stop()

# ==================== 5) MÀN HÌNH LÀM BÀI 2 CỘT (TƯƠNG TỰ GIAO DIỆN MẪU) ====================
col_header_title, col_header_exit = st.columns([5, 1])
with col_header_title:
    st.markdown("<h3 style='margin:0;color:#5B2B3F;'>Speaking Practice Test 1</h3>", unsafe_allow_html=True)
with col_header_exit:
    if st.button("Thoát", on_click=reset, use_container_width=True):
        st.rerun()

col_main, col_side = st.columns([3.1, 1.15], gap="medium")

with col_main:
    st.toggle("Highlight nội dung", value=True, key="highlight_toggle")
    q_num = min(state["answered"] + 1, state["total"])
    st.markdown(
        f'<div class="sp-part-badge">Part {current_part} · Question {q_num}/{state["total"]}</div>',
        unsafe_allow_html=True,
    )

    col_ctx, col_q = st.columns([1.15, 1.85], gap="medium")
    with col_ctx:
        if state.get("cue_card"):
            st.markdown(render_cue_card_html(state["cue_card"]), unsafe_allow_html=True)
            render_part2_timer()
        else:
            st.markdown(
                f"""
                <div class="sp-checklist" style="margin-top:0;background:#FFF7FA;">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    {EXAMINER_SVG}
                    <div>
                      <div class="sp-examiner-role">Part {current_part}</div>
                      <div style="font-weight:700;color:#5B2B3F;">Examiner Ms. Lily</div>
                    </div>
                  </div>
                  <div style="font-size:0.95rem;font-weight:600;color:#5B2B3F;line-height:1.55;">
                    {html.escape(PART_INFO.get(current_part, ""))}
                  </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    with col_q:
        st.markdown(
            f"""
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:999px;background:#FFE8F2;border:1.5px solid #FFB8D2;color:#E04A86;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                {q_num}
              </div>
              <div class="sp-examiner-question" style="font-size:1.08rem;">
                {html.escape(state['reply'])}
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        with st.expander("📝 Viết ghi chú / dàn ý"):
            st.text_area(
                "Ghi chú / dàn ý:",
                key=f"note_q_{q_num}",
                height=80,
                placeholder="Ghi chú nhanh từ vựng hoặc dàn ý cho câu hỏi này...",
            )

        placeholder_text = (
            "Trình bày bài nói Part 2 của bạn theo các gợi ý trên Cue card..."
            if current_part == 2
            else "Nhập câu trả lời tiếng Anh của bạn tại đây (khoảng 2–4 câu)..."
        )
        st.text_area(
            "✍️ Câu trả lời của bạn",
            key="answer_box",
            height=200 if current_part == 2 else 100,
            placeholder=placeholder_text,
        )

        current_words = count_words(ss.get("answer_box", ""))
        if 0 < current_words < 3:
            st.caption(f"📝 Số từ hiện tại: **{current_words} từ** — *Hãy thử nói dài hơn một chút nhé!*")
        else:
            st.caption(f"📝 Số từ hiện tại: **{current_words} từ**")

        if ss.error:
            st.error(ss.error)

        if st.button("🎤 LƯU & GỬI CÂU TRẢ LỜI", on_click=handle_submit, type="primary", use_container_width=True):
            st.rerun()

with col_side:
    render_active_part_timer(current_part)
    if st.button("NỘP BÀI", on_click=handle_submit, use_container_width=True):
        st.rerun()
    st.markdown(
        """
        <div style="font-size:0.82rem;font-weight:700;font-style:italic;color:#E04A86;margin:6px 0;">
          Khôi phục/lưu bài làm ▸
        </div>
        <div style="font-size:0.8rem;font-weight:700;font-style:italic;color:#D97706;line-height:1.45;margin-bottom:10px;">
          Chú ý: bạn có thể click vào số thứ tự câu hỏi trong bài để đánh dấu review
        </div>
        """,
        unsafe_allow_html=True,
    )
    palette_html = []
    for idx in range(1, state["total"] + 1):
        bg = "#FF6FA5;color:#FFF;" if idx <= state["answered"] else ("#FFF0F6;color:#E04A86;border-color:#E04A86;" if idx == q_num else "#FFF;color:#5B2B3F;")
        palette_html.append(
            f'<span style="display:inline-flex;width:30px;height:30px;border:1.5px solid #FFB8D2;border-radius:6px;align-items:center;justify-content:center;font-weight:700;font-size:0.82rem;margin-right:5px;background:{bg}">{idx}</span>'
        )
    st.markdown(
        f'<div class="sp-checklist" style="padding:12px;">'
        f'<div style="font-size:0.82rem;font-weight:700;margin-bottom:6px;">Questions 1-{state["total"]}</div>'
        f'<div>{"".join(palette_html)}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )



