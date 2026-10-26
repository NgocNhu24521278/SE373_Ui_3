"""Tập hợp CSS và SVG linh vật giám khảo cho giao diện Speaking Practice (TV1)."""

import html

# Linh vật Cô Thỏ Giám Khảo tự vẽ bằng SVG thuần (không bản quyền)
EXAMINER_SVG = """
<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Examiner Mascot">
  <circle cx="32" cy="34" r="26" fill="#FFE0EC" stroke="#FF6FA5" stroke-width="2.5"/>
  <!-- Tai thỏ -->
  <ellipse cx="22" cy="14" rx="5.5" ry="11" transform="rotate(-10 22 14)" fill="#FFFFFF" stroke="#FF6FA5" stroke-width="2.2"/>
  <ellipse cx="22" cy="14" rx="2.8" ry="7" transform="rotate(-10 22 14)" fill="#FFB3CE"/>
  <ellipse cx="42" cy="14" rx="5.5" ry="11" transform="rotate(10 42 14)" fill="#FFFFFF" stroke="#FF6FA5" stroke-width="2.2"/>
  <ellipse cx="42" cy="14" rx="2.8" ry="7" transform="rotate(10 42 14)" fill="#FFB3CE"/>
  <!-- Khuôn mặt -->
  <circle cx="32" cy="36" r="17" fill="#FFFFFF" stroke="#FF6FA5" stroke-width="2.2"/>
  <!-- Tai nghe giám khảo -->
  <path d="M14 35C14 25 22 19 32 19C42 19 50 25 50 35" stroke="#E04A86" stroke-width="2.8" stroke-linecap="round"/>
  <rect x="11" y="31" width="5" height="10" rx="2.5" fill="#FF6FA5"/>
  <rect x="48" y="31" width="5" height="10" rx="2.5" fill="#FF6FA5"/>
  <!-- Mắt & má hồng -->
  <circle cx="25.5" cy="35" r="2.2" fill="#5B2B3F"/>
  <circle cx="38.5" cy="35" r="2.2" fill="#5B2B3F"/>
  <ellipse cx="21.5" cy="38.5" rx="3" ry="1.8" fill="#FFB3CE"/>
  <ellipse cx="42.5" cy="38.5" rx="3" ry="1.8" fill="#FFB3CE"/>
  <!-- Mũi & miệng cười -->
  <path d="M29.5 40.5Q32 43 34.5 40.5" stroke="#5B2B3F" stroke-width="2" stroke-linecap="round"/>
</svg>
""".strip()

APP_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap');

:root {
    --bg-main: #FFF5F9;
    --pink-soft: #FFE0EC;
    --pink-primary: #FF6FA5;
    --pink-deep: #E04A86;
    --text-main: #5B2B3F;
    --text-muted: #A56A82;
    --color-success: #7ED6A7;
    --color-warning: #FFC46B;
    --color-error: #FF7A8A;
}

html, body, .stApp, [data-testid="stAppViewContainer"] {
    background-color: var(--bg-main) !important;
    color: var(--text-main) !important;
    font-family: 'Quicksand', sans-serif !important;
    font-size: 16px !important;
}

.block-container {
    max-width: 780px !important;
    padding-top: 1.5rem !important;
    padding-bottom: 3rem !important;
}

h1, h2, h3, h4, p, label, span, div {
    font-family: 'Quicksand', sans-serif;
}

/* Nhãn miễn trừ trách nhiệm luôn nổi bật, dễ đọc */
.sp-disclaimer {
    background: #FFFFFF;
    border: 1.5px solid var(--pink-soft);
    border-radius: 16px;
    padding: 10px 16px;
    color: var(--text-muted);
    font-size: 0.92rem;
    font-weight: 600;
    text-align: center;
    margin-bottom: 1.2rem;
    box-shadow: 0 4px 14px rgba(255, 111, 165, 0.08);
}

/* Khung tiêu đề màn hình chào */
.sp-hero {
    background: linear-gradient(135deg, #FFFFFF 0%, #FFE0EC 100%);
    border: 2px solid var(--pink-soft);
    border-radius: 24px;
    padding: 24px;
    text-align: center;
    margin-bottom: 1.2rem;
    box-shadow: 0 8px 24px rgba(224, 74, 134, 0.08);
}
.sp-hero h1 {
    color: var(--text-main);
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 6px 0;
}
.sp-hero p {
    color: var(--text-muted);
    font-size: 1.02rem;
    font-weight: 600;
    margin: 0;
}

/* 3 thẻ giới thiệu Part 1, 2, 3 */
.sp-part-card {
    background: #FFFFFF;
    border: 2px solid var(--pink-soft);
    border-radius: 20px;
    padding: 16px;
    height: 100%;
    box-shadow: 0 4px 12px rgba(255, 111, 165, 0.06);
}
.sp-part-badge {
    display: inline-block;
    background: var(--pink-soft);
    color: var(--pink-deep);
    font-weight: 700;
    font-size: 0.85rem;
    padding: 4px 12px;
    border-radius: 999px;
    margin-bottom: 8px;
}
.sp-part-title {
    color: var(--text-main);
    font-weight: 700;
    font-size: 1.05rem;
    margin-bottom: 4px;
}
.sp-part-meta {
    color: var(--text-muted);
    font-size: 0.92rem;
    font-weight: 600;
}

/* Checklist lưu ý phòng thi */
.sp-checklist {
    background: #FFFFFF;
    border: 2px solid var(--pink-soft);
    border-radius: 20px;
    padding: 18px 22px;
    margin: 1.2rem 0;
}
.sp-checklist-title {
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 8px;
    font-size: 1.02rem;
}
.sp-checklist-item {
    color: var(--text-main);
    font-size: 0.98rem;
    margin: 6px 0;
    font-weight: 600;
}

/* Stepper 3 bước Part 1 - Part 2 - Part 3 */
.sp-stepper {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
}
.sp-step {
    flex: 1;
    text-align: center;
    padding: 10px 8px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.95rem;
    border: 2px solid var(--pink-soft);
    background: #FFFFFF;
    color: var(--text-muted);
}
.sp-step.active {
    background: var(--pink-deep);
    border-color: var(--pink-deep);
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(224, 74, 134, 0.25);
}
.sp-step.done {
    background: #E8FBF0;
    border-color: var(--color-success);
    color: #287D4E;
}

/* Khu giám khảo hỏi */
.sp-examiner-box {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: #FFFFFF;
    border: 2px solid var(--pink-soft);
    border-radius: 22px;
    padding: 18px 20px;
    margin: 12px 0;
    box-shadow: 0 6px 18px rgba(255, 111, 165, 0.1);
}
.sp-examiner-role {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--pink-deep);
    margin-bottom: 4px;
}
.sp-examiner-question {
    font-size: 1.18rem;
    font-weight: 700;
    color: var(--text-main);
    line-height: 1.5;
}
.sp-transition-banner {
    background: var(--pink-soft);
    color: var(--pink-deep);
    font-weight: 700;
    font-size: 0.92rem;
    padding: 6px 12px;
    border-radius: 12px;
    margin-bottom: 8px;
    display: inline-block;
}

/* Thẻ Cue Card Part 2 như tấm thẻ giấy */
.sp-cue-card {
    background: #FFFDF9;
    border: 2.5px solid var(--pink-deep);
    border-radius: 22px;
    padding: 20px 24px;
    margin: 14px 0;
    box-shadow: 0 8px 20px rgba(224, 74, 134, 0.12);
}
.sp-cue-header {
    display: inline-block;
    background: var(--pink-deep);
    color: #FFFFFF;
    font-weight: 700;
    font-size: 0.88rem;
    padding: 4px 14px;
    border-radius: 999px;
    margin-bottom: 10px;
}
.sp-cue-topic {
    font-size: 1.18rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 10px;
}
.sp-cue-sub {
    font-weight: 700;
    color: var(--text-muted);
    font-size: 0.95rem;
    margin-bottom: 6px;
}
.sp-cue-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-main);
    font-weight: 600;
    line-height: 1.65;
}

/* Đồng hồ Part 2 */
.sp-timer {
    border-radius: 18px;
    padding: 12px 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 10px 0;
}
.sp-timer.prep {
    background: #FFF8E7;
    border: 2px solid var(--color-warning);
    color: #8A5300;
}
.sp-timer.speak {
    background: #E8FBF0;
    border: 2px solid var(--color-success);
    color: #216E43;
}
.sp-timer.overtime {
    background: #FFE8EC;
    border: 2px solid var(--color-error);
    color: var(--pink-deep);
}

/* Bong bóng lịch sử hội thoại trái/phải */
.sp-chat-row {
    display: flex;
    margin: 8px 0;
}
.sp-chat-row.assistant {
    justify-content: flex-start;
}
.sp-chat-row.user {
    justify-content: flex-end;
}
.sp-bubble {
    max-width: 82%;
    padding: 11px 16px;
    border-radius: 18px;
    font-size: 0.98rem;
    line-height: 1.5;
    font-weight: 600;
}
.sp-bubble.assistant {
    background: #FFFFFF;
    border: 1.5px solid var(--pink-soft);
    color: var(--text-main);
    border-bottom-left-radius: 6px;
}
.sp-bubble.user {
    background: var(--pink-soft);
    border: 1.5px solid #FFB8D2;
    color: var(--text-main);
    border-bottom-right-radius: 6px;
}

/* Tuỳ chỉnh nút dạng viên thuốc, thanh tiến độ và ô nhập của Streamlit */
.stButton > button, .stDownloadButton > button, [data-testid="stFormSubmitButton"] > button {
    border-radius: 999px !important;
    font-weight: 700 !important;
    font-size: 1rem !important;
    padding: 0.55rem 1.5rem !important;
    transition: all 0.18s ease !important;
}
.stButton > button[kind="primary"], [data-testid="stFormSubmitButton"] > button[kind="primary"] {
    background-color: var(--pink-primary) !important;
    border-color: var(--pink-primary) !important;
    color: #FFFFFF !important;
    box-shadow: 0 4px 14px rgba(255, 111, 165, 0.35) !important;
}
.stButton > button[kind="primary"]:hover, [data-testid="stFormSubmitButton"] > button[kind="primary"]:hover {
    background-color: var(--pink-deep) !important;
    border-color: var(--pink-deep) !important;
}
.stButton > button[kind="secondary"], .stDownloadButton > button {
    background-color: #FFFFFF !important;
    border: 2px solid var(--pink-soft) !important;
    color: var(--text-main) !important;
}
.stButton > button[kind="secondary"]:hover, .stDownloadButton > button:hover {
    border-color: var(--pink-primary) !important;
    background-color: var(--pink-soft) !important;
}

/* Thanh progress bar màu gradient hồng */
[data-testid="stProgress"] > div > div > div > div {
    background: linear-gradient(90deg, #FF9EC4 0%, #FF6FA5 50%, #E04A86 100%) !important;
}

/* Ô nhập văn bản bo tròn */
.stTextArea textarea {
    background-color: #FFFFFF !important;
    border: 2px solid var(--pink-soft) !important;
    border-radius: 18px !important;
    color: var(--text-main) !important;
    font-size: 1rem !important;
    padding: 12px 14px !important;
}
.stTextArea textarea:focus {
    border-color: var(--pink-primary) !important;
    box-shadow: 0 0 0 3px rgba(255, 111, 165, 0.2) !important;
}

/* Bo tròn st.info / st.warning / st.error / st.success */
[data-testid="stAlert"] {
    border-radius: 18px !important;
}

@media (max-width: 640px) {
    .sp-stepper {
        flex-direction: column;
        gap: 6px;
    }
    .sp-examiner-box {
        flex-direction: column;
    }
    .sp-bubble {
        max-width: 94%;
    }
}
</style>
"""


def render_cue_card_html(cue_text: str) -> str:
    """Tách chủ đề và danh sách gợi ý của Cue Card Part 2 thành thẻ giấy dễ nhìn."""
    lines = [line.strip() for line in cue_text.splitlines() if line.strip()]
    topic = html.escape(lines[0]) if lines else ""
    bullets = [
        html.escape(line.lstrip("- ").strip())
        for line in lines[1:]
        if line.startswith("-")
    ]
    bullet_items = "".join(f"<li>{b}</li>" for b in bullets)
    return f"""
    <div class="sp-cue-card">
      <div class="sp-cue-header">🎀 Cue card</div>
      <div class="sp-cue-topic">{topic}</div>
      <div class="sp-cue-sub">You should say:</div>
      <ul class="sp-cue-list">{bullet_items}</ul>
    </div>
    """
