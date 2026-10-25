"""Run: streamlit run app.py
TV1 Deliverable — CozySpeak IELTS Speaking Mock Test (Cute Pastel UI)
Branch: feature/streamlit-ui
"""
import json
import streamlit as st
from dotenv import load_dotenv

from src.storage import (
    init_db,
    start_session,
    current_question,
    progress,
    transcript,
)
from src.examiner_agent import run_agent
from src.trace import recent_logs
from src.bank import load_tracks

load_dotenv()
st.set_page_config(
    page_title='CozySpeak IELTS – Speaking Mock Test',
    page_icon='🍓',
    layout='centered',
)
init_db()

# Cute Pastel Stationery Theme CSS for Streamlit
st.markdown(
    """
    <style>
    .stApp {
        background-color: #FFF8FA;
        color: #3B1D38;
    }
    [data-testid="stSidebar"] {
        background-color: #FFF0F5;
        border-right: 1px solid #FBCFE8;
    }
    .stButton > button[kind="primary"] {
        background-color: #EC4899;
        border-color: #EC4899;
        color: white;
        border-radius: 12px;
        font-weight: 700;
    }
    .stButton > button[kind="primary"]:hover {
        background-color: #DB2777;
        border-color: #DB2777;
    }
    .stTextArea textarea, .stTextInput input {
        background-color: #FFFFFF !important;
        border: 1px solid #FBCFE8 !important;
        border-radius: 12px !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

PART_GUIDANCE = {
    1: {
        'title': '🌸 Part 1 · Làm Quen & Phỏng Vấn Nhẹ Nhàng',
        'subtitle': 'Chủ đề quen thuộc hằng ngày về việc học, sở thích và thói quen của bạn.',
        'target_words': '25–50 từ (2–4 câu)',
        'min_words': 15,
        'tips': (
            'Hãy trả lời trực tiếp kèm theo 1 lý do hoặc ví dụ nhỏ của bản thân nhé! '
            'Cô Thỏ Examiner sẽ dựa vào câu trả lời của bạn để hỏi đào sâu thêm ở câu tiếp theo.'
        ),
    },
    2: {
        'title': '🍰 Part 2 · Bài Nói Dài Theo Thẻ Chủ Đề (Cue Card)',
        'subtitle': 'Trình bày một đoạn hoàn chỉnh bao gồm tất cả các gợi ý trên thẻ Cue Card.',
        'target_words': '110–180 từ (đoạn văn có bố cục)',
        'min_words': 50,
        'tips': (
            'Hãy trả lời lần lượt từng gạch đầu dòng trên thẻ Cue Card và giải thích rõ ý cuối cùng nhé! '
            'Bản Phase 1 nhập văn bản nên bạn cứ thoải mái trình bày ý tưởng.'
        ),
    },
    3: {
        'title': '✨ Part 3 · Thảo Luận Chuyên Sâu Hai Chiều',
        'subtitle': 'Các câu hỏi mở rộng, mang tính khái quát và phản biện xã hội.',
        'target_words': '45–90 từ (3–5 câu phân tích)',
        'min_words': 25,
        'tips': (
            'Hãy mở rộng góc nhìn ra xã hội nói chung, nêu quan điểm, giải thích lý do, '
            'đưa ví dụ thực tế và thử nhìn nhận thêm một góc nhìn trái chiều nhé!'
        ),
    },
}


def count_words(text: str) -> int:
    cleaned = text.strip()
    return len(cleaned.split()) if cleaned else 0


def parse_cue_card(raw_text: str) -> dict:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    topic = lines[0] if lines else raw_text
    bullets = [line.lstrip('- ').strip() for line in lines[1:] if line.startswith('-')]
    closing = next(
        (line for line in lines[1:] if not line.startswith('-') and 'you should say' not in line.lower()),
        '',
    )
    return {'topic': topic, 'bullets': bullets, 'closing': closing}


def build_preliminary_summary(rows: list[dict]) -> dict:
    total_turns = len(rows)
    word_counts = [count_words(r.get('answer_text', '')) for r in rows]
    total_words = sum(word_counts)
    avg_words = round(total_words / total_turns) if total_turns else 0
    short_turns = sum(1 for w in word_counts if w < 15)
    return {
        'total_turns': total_turns,
        'total_words': total_words,
        'avg_words': avg_words,
        'short_turns': short_turns,
    }


st.title('🍓 CozySpeak IELTS Mock Test')
st.caption(
    'Phòng luyện Speaking dễ thương (Text-Only Prototype) · '
    '🌸 Part 1 → 🍰 Part 2 Cue Card → ✨ Part 3 Discussion'
)
st.info(
    '🌸 **Lưu ý nhỏ (Quy định 1.5.2):** Phòng luyện tập Speaking dạng văn bản (Text-Only). '
    'Hệ thống không chấm phát âm (`Pronunciation: not_assessed`) và **không cấp điểm band IELTS chính thức**.'
)

with st.sidebar:
    st.subheader('🧸 Góc Cài Đặt Phòng Thi')
    live = st.checkbox(
        'Bật Live LLM Agent',
        value=False,
        help='Cần OPENAI_API_KEY trong .env. Mặc định chạy ScriptedToolModel không cần API key.',
    )
    learner = st.text_input(
        'Biệt danh của bạn (Learner ID)',
        value='minh_anh_cute',
        max_chars=80,
        help='Vui lòng dùng biệt danh, không nhập thông tin cá nhân thật (Quy định 1.5.4).',
    )
    available_tracks = list(load_tracks().keys())
    track = st.selectbox(
        'Chủ đề luyện nói (Topic Track)',
        options=available_tracks,
        format_func=lambda t: '📚 Study (Học tập)' if t == 'study' else '💻 Technology (Công nghệ)',
    )

    if st.button('🌸 Bắt đầu bài thi mới', use_container_width=True, type='primary'):
        clean_learner = learner.strip()
        if not clean_learner:
            st.error('Bạn ơi, vui lòng nhập biệt danh học viên (1–80 ký tự) trước khi bắt đầu nhé!')
        else:
            try:
                sid = start_session(learner_id=clean_learner, track=track)
                run_agent(sid, 'start', live_llm=live)
                st.session_state['sid'] = sid
                st.session_state['ui_notice'] = f'🍓 Đã mở phòng thi chủ đề {track.capitalize()}!'
                st.rerun()
            except Exception as err:
                st.error(f'Không thể tạo phiên mới: {err}')

    st.divider()
    st.subheader('🎀 Mở lại bài làm đã lưu')
    resume = st.text_input('Mã Session ID', placeholder='Dán mã Session ID 32 ký tự...')
    if st.button('Mở lại bài làm cũ', use_container_width=True):
        clean_sid = resume.strip()
        if not clean_sid:
            st.warning('Bạn hãy dán mã Session ID vào ô trên trước nhé!')
        else:
            try:
                progress(clean_sid)
                st.session_state['sid'] = clean_sid
                st.session_state['ui_notice'] = '✨ Đã khôi phục phiên làm bài của bạn!'
                st.rerun()
            except ValueError as err:
                st.error(f'Không tìm thấy phiên làm bài: {err}')
            except Exception as err:
                st.error(f'Lỗi đọc dữ liệu: {err}')

if 'ui_notice' in st.session_state:
    st.toast(st.session_state.pop('ui_notice'))

if 'sid' not in st.session_state:
    st.markdown('### 🌷 Chào mừng bạn đến với phòng luyện nói CozySpeak!')
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown('**🌸 1. Part 1 (Warm-up)**\n\n3 câu hỏi làm quen nhẹ nhàng kèm câu hỏi đào sâu.')
    with col2:
        st.markdown('**🍰 2. Part 2 (Cue Card)**\n\n1 thẻ chủ đề có gợi ý chi tiết + sổ nháp ý tưởng.')
    with col3:
        st.markdown('**✨ 3. Part 3 (Discussion)**\n\n3 câu hỏi thảo luận mở rộng và phản biện.')
    st.info('👈 Hãy chọn **Chủ đề luyện nói** và bấm **🌸 Bắt đầu bài thi mới** ở thanh bên trái nha!')
    st.stop()

sid = st.session_state['sid']
try:
    state = progress(sid)
    question = current_question(sid)
except ValueError as err:
    st.error(f'Lỗi phiên làm bài: {err}. Vui lòng tạo bài thi mới hoặc nhập lại Session ID hợp lệ.')
    if st.button('Đặt lại trạng thái phòng thi'):
        del st.session_state['sid']
        st.rerun()
    st.stop()

meta_col1, meta_col2, meta_col3 = st.columns([2, 1, 1])
with meta_col1:
    st.caption('Mã phiên làm bài (lưu lại để mở tiếp sau này):')
    st.code(sid, language=None)
with meta_col2:
    st.metric('Học viên', state['learner_id'])
with meta_col3:
    st.metric('Chủ đề', state['track'].capitalize())

st.progress(
    state['completed'] / state['total'],
    text=f"🌱 Tiến độ hoàn thành: {state['completed']}/{state['total']} câu hỏi",
)

active_part = question['part'] if question is not None else 3
p_cols = st.columns(3)
part_labels = [
    (1, '🌸 Part 1: Làm quen (C1–C3)'),
    (2, '🍰 Part 2: Cue Card (C4–C5)'),
    (3, '✨ Part 3: Thảo luận (C6–C8)'),
]
for idx, (p_num, p_label) in enumerate(part_labels):
    with p_cols[idx]:
        if state['done'] or p_num < active_part:
            st.success(f'✓ {p_label}')
        elif p_num == active_part and not state['done']:
            st.info(f'▶ {p_label}')
        else:
            st.caption(f'○ {p_label}')

st.divider()

if question is not None:
    part_info = PART_GUIDANCE[question['part']]
    st.subheader(f"{part_info['title']} — Câu {question['number']}/{question['total']}")
    st.caption(f"{part_info['subtitle']} · Độ dài khuyến nghị: **{part_info['target_words']}**")

    with st.expander('💡 Mẹo nhỏ từ Cô Thỏ Examiner cho phần này', expanded=False):
        st.write(part_info['tips'])

    if question['kind'] == 'cue':
        cue = parse_cue_card(question['text'])
        with st.container(border=True):
            st.markdown('#### 🍰 Thẻ Chủ Đề Part 2 — Candidate Task Card (Cue Card)')
            st.markdown(f"**{cue['topic']}**")
            if cue['bullets']:
                st.markdown('**You should say:**')
                for b in cue['bullets']:
                    st.markdown(f'- {b}')
            if cue['closing']:
                st.markdown(f"*{cue['closing']}*")
        st.text_area(
            '📝 Sổ tay nháp ý tưởng Part 2 (Doodle Pad — không tính điểm)',
            height=80,
            key=f"prep_notes_{sid}_{question['question_id']}",
            placeholder='Gạch đầu dòng nhanh từ khóa, kỷ niệm hoặc cấu trúc câu trước khi viết bài nói dài...',
        )
    else:
        if question['kind'] == 'followup':
            st.caption('🐰 Câu hỏi đào sâu (Cô Thỏ Examiner hỏi tiếp dựa trên câu trả lời vừa rồi của bạn)')
        with st.container(border=True):
            st.markdown(f"### 🐰 Cô Thỏ Examiner hỏi:\n{question['text']}")

    with st.form(key=f"answer_form_{sid}_{question['question_id']}"):
        answer = st.text_area(
            '✍️ Câu trả lời tiếng Anh của bạn',
            height=180 if question['kind'] == 'cue' else 140,
            max_chars=5000,
            placeholder='Gõ câu trả lời tiếng Anh của bạn vào đây nhé (tối đa 5.000 ký tự)...',
        )
        submit_col1, submit_col2 = st.columns([3, 1])
        with submit_col1:
            st.caption(
                f"Mục tiêu tối thiểu cho Part {question['part']}: "
                f"**{part_info['min_words']}+ từ**."
            )
        with submit_col2:
            send = st.form_submit_button('Gửi & Tiếp tục →', type='primary', use_container_width=True)

    if send:
        clean_ans = answer.strip()
        if not clean_ans:
            st.warning('Bạn chưa nhập câu trả lời kìa! Hãy gõ câu trả lời tiếng Anh trước khi gửi nhé 💌')
        elif len(clean_ans) > 5000:
            st.error('Câu trả lời vượt quá giới hạn 5.000 ký tự. Bạn rút gọn lại một chút nhé!')
        else:
            try:
                with st.spinner('🐰 Cô Thỏ Examiner đang lưu câu trả lời và chuẩn bị câu hỏi tiếp theo...'):
                    result = run_agent(
                        sid,
                        'submit',
                        question_id=question['question_id'],
                        answer=clean_ans,
                        live_llm=live,
                    )
                if result['progress']['completed'] != state['completed'] + 1:
                    st.error('Agent chưa lưu được câu trả lời. Bạn vui lòng thử lại hoặc kiểm tra log nhé.')
                else:
                    words_used = count_words(clean_ans)
                    st.session_state['ui_notice'] = f'🍓 Đã lưu câu trả lời ({words_used} từ)!'
                    st.rerun()
            except Exception as err:
                st.error(f'Lỗi Agent: {err}')
else:
    st.success('🎉 Chúc mừng bạn đã hoàn thành xuất sắc cả 3 Part (Part 1 → Part 2 → Part 3)!')
    rows_for_summary = transcript(sid)
    summary = build_preliminary_summary(rows_for_summary)

    st.subheader('🍓 Tổng Kết & Nhận Xét Luyện Tập Sơ Bộ')
    s_col1, s_col2, s_col3 = st.columns(3)
    s_col1.metric('Số câu hoàn thành', f"{summary['total_turns']}/{state['total']}")
    s_col2.metric('Tổng số từ đã viết', summary['total_words'])
    s_col3.metric('Trung bình từ / câu', summary['avg_words'])

    if summary['short_turns'] > 0:
        st.warning(
            f"🌱 Bạn có {summary['short_turns']} câu trả lời hơi ngắn (< 15 từ). "
            "Khi luyện tập Part 1 & Part 3, hãy mở rộng thêm bằng lý do (because/since) và ví dụ cụ thể (for instance) nhé!"
        )
    else:
        st.info(
            '🌸 Tuyệt vời! Độ dài câu trả lời ở cả 3 Part đều đạt mức khuyến nghị. '
            'Hãy xem lại Nhật ký bài nói bên dưới để tự kiểm tra từ nối và cấu trúc câu nhé!'
        )
    st.caption(
        'Nhãn bắt buộc (Quy định 1.5.2): Nhận xét sơ bộ phục vụ luyện tập văn bản; '
        'Pronunciation = not_assessed; không thay thế điểm thi IELTS chính thức.'
    )

with st.expander('📃 Nhật Ký Bài Nói (Full Session Transcript)', expanded=question is None):
    rows = transcript(sid)
    if not rows:
        st.write('Chưa có câu trả lời nào được lưu trong phiên này.')
    else:
        for idx, item in enumerate(rows, start=1):
            wc = count_words(item['answer_text'])
            st.markdown(f"**Câu {idx} (`{item['question_id']}`) — 🐰 Examiner:** {item['question_text']}")
            st.markdown(f"**🍓 Bạn ({wc} từ):** {item['answer_text']}")
            st.caption(f"Đã lưu lúc: {item['saved_at']}")
            st.divider()
        st.download_button(
            '⬇ Tải Transcript JSON',
            data=json.dumps(rows, ensure_ascii=False, indent=2),
            file_name=f'{sid}_transcript.json',
            mime='application/json',
        )

with st.expander('🛠 Bước chạy của Agent (Agent Tool Trace)'):
    logs = recent_logs(sid)
    if not logs:
        st.caption('Chưa có sự kiện trace nào.')
    else:
        st.json(logs)

st.caption('🍓 CozySpeak IELTS · Bộ câu hỏi tự biên soạn phục vụ luyện tập, không phải đề thi IELTS chính thức.')
