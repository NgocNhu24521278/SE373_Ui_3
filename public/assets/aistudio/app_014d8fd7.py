"""Giao diện Streamlit cho Speaking Mock Test (TV1).

Chạy: streamlit run app.py

UI không gọi LLM trực tiếp. Mọi thứ đi qua ui_backend.py
(start_test, answer), xem hợp đồng dữ liệu ở đầu file đó.
"""

import streamlit as st

from ui_backend import answer, start_test  # sau này đổi sang gọi agent thật

DISCLAIMER = (
    "Nhận xét chỉ dùng để luyện tập, không phải điểm IELTS chính thức. "
    "Chế độ text không đánh giá phát âm."
)

PART_INFO = {
    1: "Part 1: trả lời ngắn về bản thân và chủ đề quen thuộc (2–3 câu mỗi câu hỏi).",
    2: "Part 2: nói dài theo thẻ. Chuẩn bị khoảng 1 phút rồi trả lời trong 1–2 phút.",
    3: "Part 3: thảo luận chủ đề trừu tượng. Hãy giải thích lý do và đưa ví dụ.",
}

st.set_page_config(page_title="Speaking Mock Test", page_icon="🎤")
st.title("IELTS Speaking Mock Test")
st.caption(DISCLAIMER)

ss = st.session_state
ss.setdefault("state", None)   # kết quả mới nhất từ backend
ss.setdefault("chat", [])      # danh sách (vai trò, nội dung)
ss.setdefault("error", None)   # thông báo lỗi đang hiển thị


def start() -> None:
    try:
        ss.state = start_test()
        ss.chat = [("assistant", ss.state["reply"])]
        ss.error = None
    except Exception:
        ss.error = "Không thể bắt đầu bài thi. Vui lòng thử lại."


def on_submit() -> None:
    text = (ss.answer_box or "").strip()
    if not text:
        ss.error = "Vui lòng nhập câu trả lời trước khi gửi."
        return
    try:
        new_state = answer(ss.state["session_id"], text)
    except Exception:
        # Không xoá ô nhập để người học không mất câu trả lời.
        ss.error = "Có lỗi khi xử lý. Câu trả lời của bạn vẫn được giữ, hãy gửi lại."
        return
    ss.error = None
    ss.chat += [("user", text), ("assistant", new_state["reply"])]
    ss.state = new_state
    ss.answer_box = ""


def reset() -> None:
    ss.state, ss.chat, ss.error = None, [], None


def transcript_text() -> str:
    names = {"assistant": "Examiner", "user": "Candidate"}
    return "\n\n".join(f"{names[role]}: {msg}" for role, msg in ss.chat)


# ---------- Màn hình bắt đầu ----------
if ss.state is None:
    st.write(
        "Bài thi gồm 3 phần theo cấu trúc IELTS Speaking: giới thiệu (Part 1), "
        "nói dài theo thẻ (Part 2) và thảo luận (Part 3). Bạn trả lời bằng văn bản."
    )
    st.button("Bắt đầu", on_click=start, type="primary")
    if ss.error:
        st.error(ss.error)
    st.stop()

state = ss.state

# ---------- Tiến độ và hướng dẫn từng Part ----------
shown = min(state["answered"] + 1, state["total"])
st.progress(
    min(state["answered"] / state["total"], 1.0),
    text=f"Câu {shown}/{state['total']}",
)
st.subheader(f"Part {state['part']}")
st.info(PART_INFO.get(state["part"], ""))

# ---------- Hội thoại ----------
for role, msg in ss.chat:
    with st.chat_message(role):
        st.write(msg)

# ---------- Màn hình kết thúc ----------
if state["finished"]:
    st.success("Bạn đã hoàn thành bài thi.")
    if state.get("feedback"):
        st.write(state["feedback"])
    st.download_button(
        "Tải transcript",
        data=transcript_text(),
        file_name="speaking_transcript.txt",
        mime="text/plain",
    )
    st.button("Làm bài mới", on_click=reset)
    st.stop()

# ---------- Cue card (Part 2) ----------
if state.get("cue_card"):
    with st.container(border=True):
        st.markdown("**Cue card**")
        st.markdown(state["cue_card"])

# ---------- Ô nhập câu trả lời ----------
with st.form("answer_form"):
    st.text_area(
        "Câu trả lời của bạn",
        key="answer_box",
        height=220 if state["part"] == 2 else 100,
    )
    st.form_submit_button("Gửi", on_click=on_submit)

if ss.error:
    st.error(ss.error)

with st.expander("Chi tiết agent (tool đã gọi)"):
    st.write(state.get("tools", []))
