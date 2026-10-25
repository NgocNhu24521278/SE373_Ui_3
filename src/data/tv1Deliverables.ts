export interface CommitDeliverable {
  id: string;
  commitNumber: number;
  commitMessage: string;
  summaryTitle: string;
  description: string;
  changedHighlights: string[];
  code: string;
}

export const TV1_GIT_WORKFLOW = {
  branchName: 'feature/streamlit-ui',
  targetFile: 'app.py',
  prTitle: 'feat(ui): complete Speaking Mock Test 3-part UI, cue card layout, and validation (TV1)',
  prBody: `## Summary (TV1 — App / Frontend)
- Add 3-Part visual progression stepper (Part 1 Introduction → Part 2 Cue Card → Part 3 Discussion) and session metadata header.
- Render Part-specific guidance and a structured **Part 2 Candidate Task Card (Cue Card)** with bullet points and an optional preparation notes scratchpad.
- Enforce form & session validation (empty learner ID, empty/over-length answers, invalid session ID recovery, agent start/submit trace verification) and display a Preliminary Practice Summary with the mandatory Section 1.5.2 non-official disclaimer upon completion.

## Test Plan
- [x] \`streamlit run app.py\` starts cleanly and triggers \`run_agent(sid, 'start')\`
- [x] Part 1, Part 2 Cue Card, and Part 3 transitions render accurately
- [x] Empty answer & invalid Session ID show clear user warnings/errors
- [x] \`pytest -v\` passes all 18 evaluation cases`,
};

export const TV1_COMMITS: CommitDeliverable[] = [
  {
    id: 'commit-1',
    commitNumber: 1,
    commitMessage: 'feat(ui): improve speaking test interface and 3-part progress stepper',
    summaryTitle: 'Commit 1 — Improve Speaking UI & 3-Part Stepper',
    description:
      'Bổ sung thanh trạng thái chuyển giữa Part 1 → Part 2 → Part 3, màn hình hướng dẫn khi chưa tạo session, gọi run_agent(sid, "start") ngay khi bắt đầu bài thi để ghi log Agent đầy đủ, và hiển thị thông tin phiên làm bài rõ ràng.',
    changedHighlights: [
      'Thêm 3-Part visual stepper phân biệt phần đã xong (✓), phần đang làm (▶) và phần sắp tới (○)',
      'Gọi run_agent(sid, "start", live_llm=live) khi tạo session mới để Agent gọi tool fetch_current_question ngay từ đầu',
      'Thêm màn hình onboarding giới thiệu 3 phần Speaking khi chưa khởi tạo session',
      'Hiển thị rõ ràng Session ID, Learner ID và Topic Track cùng nhãn miễn trừ trách nhiệm (Quy định 1.5.2)',
    ],
    code: `"""Run: streamlit run app.py
TV1 Deliverable — Commit 1: Improve Speaking UI & 3-Part Stepper
"""
import json
import streamlit as st
from dotenv import load_dotenv

from src.storage import init_db, start_session, current_question, progress, transcript
from src.examiner_agent import run_agent
from src.trace import recent_logs
from src.bank import load_tracks

load_dotenv()
st.set_page_config(page_title='IELTS Speaking Agent – Phase 1', page_icon='💬', layout='centered')
init_db()

st.title('💬 IELTS Speaking Mock Test')
st.caption('Phase 1 MVP (Text-Only Prototype) · Part 1 → Part 2 Cue Card → Part 3 Discussion')
st.info(
    '**Lưu ý (Quy định 1.5.2):** Hệ thống luyện tập Speaking dạng văn bản (Text-Only). '
    'Không chấm phát âm (Pronunciation: not_assessed) và **không cấp điểm band IELTS chính thức**.'
)

with st.sidebar:
    st.subheader('Session & Agent Settings')
    live = st.checkbox('Use a real LLM agent', value=False,
                       help='Requires OPENAI_API_KEY. Offline mode uses a scripted tool-calling model.')
    learner = st.text_input('Learner ID (pseudonym only)', value='demo_student', max_chars=80)
    track = st.selectbox('Topic Track', options=list(load_tracks()), format_func=lambda t: t.capitalize())
    if st.button('Start new mock test', use_container_width=True, type='primary'):
        sid = start_session(learner_id=learner, track=track)
        run_agent(sid, 'start', live_llm=live)
        st.session_state['sid'] = sid
        st.rerun()
    st.divider()
    resume = st.text_input('Resume by session ID', placeholder='Paste a previous session ID')
    if st.button('Load saved session', use_container_width=True):
        try:
            progress(resume.strip())
            st.session_state['sid'] = resume.strip()
            st.rerun()
        except ValueError as err:
            st.error(str(err))

if 'sid' not in st.session_state:
    st.markdown('### Cấu trúc bài thi Speaking Mock Test (3 Parts)')
    c1, c2, c3 = st.columns(3)
    c1.markdown('**1. Part 1 (Introduction)**\\n\\nHỏi về học tập, sở thích, thói quen hằng ngày.')
    c2.markdown('**2. Part 2 (Cue Card)**\\n\\nTrả lời dài theo thẻ chủ đề có gợi ý.')
    c3.markdown('**3. Part 3 (Discussion)**\\n\\nThảo luận câu hỏi trừu tượng & đưa ví dụ.')
    st.info('👈 Chọn **Topic Track** và nhấn **Start new mock test** ở thanh bên trái để bắt đầu.')
    st.stop()

sid = st.session_state['sid']
try:
    state = progress(sid)
    question = current_question(sid)
except ValueError as err:
    st.error(str(err))
    st.stop()

meta_col1, meta_col2, meta_col3 = st.columns([2, 1, 1])
with meta_col1:
    st.caption('Active Session ID:')
    st.code(sid, language=None)
with meta_col2:
    st.metric('Learner', state['learner_id'])
with meta_col3:
    st.metric('Topic Track', state['track'].capitalize())

st.progress(state['completed'] / state['total'],
            text=f"Overall Progress: {state['completed']}/{state['total']} questions")

active_part = question['part'] if question is not None else 3
p_cols = st.columns(3)
for idx, (p_num, p_label) in enumerate([
    (1, 'Part 1: Introduction (Q1–Q3)'),
    (2, 'Part 2: Cue Card (Q4–Q5)'),
    (3, 'Part 3: Discussion (Q6–Q8)'),
]):
    with p_cols[idx]:
        if state['done'] or p_num < active_part:
            st.success(f'✓ {p_label}')
        elif p_num == active_part and not state['done']:
            st.info(f'▶ {p_label}')
        else:
            st.caption(f'○ {p_label}')

if question is not None:
    st.subheader(f"Part {question['part']} · Question {question['number']}/{question['total']}")
    st.markdown(question['text'])
    with st.form(key=f"answer_form_{sid}_{question['question_id']}"):
        answer = st.text_area('Your English answer', height=160, max_chars=5000,
                              placeholder='Write your answer in English...')
        send = st.form_submit_button('Submit and continue', type='primary')
    if send:
        if not answer.strip():
            st.warning('Please enter an answer.')
        else:
            with st.spinner('Agent is saving your answer and fetching the next question...'):
                result = run_agent(sid, 'submit', question_id=question['question_id'],
                                   answer=answer, live_llm=live)
            if result['progress']['completed'] != state['completed'] + 1:
                st.error('The agent did not save the answer. Try again or inspect logs.')
            else:
                st.rerun()
else:
    st.success('Mock test complete! You can review your transcript below.')

with st.expander('📃 Transcript', expanded=question is None):
    rows = transcript(sid)
    for item in rows:
        st.markdown(f"**Examiner:** {item['question_text']}")
        st.markdown(f"**You:** {item['answer_text']}")
    st.download_button('Download transcript JSON',
                       data=json.dumps(rows, ensure_ascii=False, indent=2),
                       file_name=f'{sid}_transcript.json', mime='application/json')

with st.expander('🛠 Agent trace (recent steps)'):
    st.json(recent_logs(sid))
`,
  },
  {
    id: 'commit-2',
    commitNumber: 2,
    commitMessage: 'feat(ui): add part-specific guidance and distinct Part 2 cue card layout',
    summaryTitle: 'Commit 2 — Add Part-Specific Guidance & Cue Card UI',
    description:
      'Thêm hướng dẫn chiến lược làm bài riêng cho từng Part (Part 1, Part 2, Part 3), độ dài từ khuyến nghị, và thiết kế giao diện thẻ chủ đề (Candidate Task Card / Cue Card) riêng biệt cho Part 2 kèm ô ghi chú nháp (Preparation Notes).',
    changedHighlights: [
      'Thêm từ điển PART_GUIDANCE quy định mục tiêu độ dài (target_words) và chiến lược trả lời cho từng Part',
      'Hàm parse_cue_card() tách tiêu đề đề bài, các gạch đầu dòng "You should say" và câu kết của Part 2 Cue Card',
      'Hiển thị khung Candidate Task Card nổi bật + ô Preparation Notes (Scratchpad) riêng khi question["kind"] == "cue"',
      'Hiển thị nhãn nhận diện câu hỏi đào sâu (Contextual Follow-Up Question) ở Part 1, 2, 3',
    ],
    code: `"""Run: streamlit run app.py
TV1 Deliverable — Commit 2: Add Part-specific guidance & Cue Card UI
"""
import json
import streamlit as st
from dotenv import load_dotenv

from src.storage import init_db, start_session, current_question, progress, transcript
from src.examiner_agent import run_agent
from src.trace import recent_logs
from src.bank import load_tracks

load_dotenv()
st.set_page_config(page_title='IELTS Speaking Agent – Phase 1', page_icon='💬', layout='centered')
init_db()

PART_GUIDANCE = {
    1: {
        'title': 'Part 1 · Introduction & Interview',
        'subtitle': 'Everyday topics about your studies, habits, and personal routine.',
        'target_words': '25–50 words (2–4 sentences)',
        'min_words': 15,
        'tips': 'Give a direct answer followed by one specific reason or personal example.',
    },
    2: {
        'title': 'Part 2 · Individual Long Turn (Cue Card)',
        'subtitle': 'Extended response addressing all prompts on the cue card.',
        'target_words': '110–180 words (structured long turn)',
        'min_words': 50,
        'tips': 'Cover every bullet point on the cue card in order and explain the final prompt.',
    },
    3: {
        'title': 'Part 3 · Two-Way Abstract Discussion',
        'subtitle': 'Deeper analytical questions related to the Part 2 topic.',
        'target_words': '45–90 words (3–5 analytical sentences)',
        'min_words': 25,
        'tips': 'Discuss broader societal trends, give a concrete example, and consider an opposing view.',
    },
}


def parse_cue_card(raw_text: str) -> dict:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    topic = lines[0] if lines else raw_text
    bullets = [line.lstrip('- ').strip() for line in lines[1:] if line.startswith('-')]
    closing = next(
        (line for line in lines[1:] if not line.startswith('-') and 'you should say' not in line.lower()),
        '',
    )
    return {'topic': topic, 'bullets': bullets, 'closing': closing}


st.title('💬 IELTS Speaking Mock Test')
st.caption('Phase 1 MVP (Text-Only Prototype) · Part 1 → Part 2 Cue Card → Part 3 Discussion')
st.info(
    '**Lưu ý (Quy định 1.5.2):** Hệ thống luyện tập Speaking dạng văn bản (Text-Only). '
    'Không chấm phát âm (Pronunciation: not_assessed) và **không cấp điểm band IELTS chính thức**.'
)

with st.sidebar:
    st.subheader('Session & Agent Settings')
    live = st.checkbox('Use a real LLM agent', value=False)
    learner = st.text_input('Learner ID (pseudonym only)', value='demo_student', max_chars=80)
    track = st.selectbox('Topic Track', options=list(load_tracks()), format_func=lambda t: t.capitalize())
    if st.button('Start new mock test', use_container_width=True, type='primary'):
        sid = start_session(learner_id=learner, track=track)
        run_agent(sid, 'start', live_llm=live)
        st.session_state['sid'] = sid
        st.rerun()
    st.divider()
    resume = st.text_input('Resume by session ID', placeholder='Paste a previous session ID')
    if st.button('Load saved session', use_container_width=True):
        try:
            progress(resume.strip())
            st.session_state['sid'] = resume.strip()
            st.rerun()
        except ValueError as err:
            st.error(str(err))

if 'sid' not in st.session_state:
    st.info('👈 Chọn **Topic Track** và nhấn **Start new mock test** ở thanh bên trái để bắt đầu.')
    st.stop()

sid = st.session_state['sid']
state = progress(sid)
question = current_question(sid)

st.code(sid, language=None)
st.progress(state['completed'] / state['total'],
            text=f"Overall Progress: {state['completed']}/{state['total']} questions")

if question is not None:
    part_info = PART_GUIDANCE[question['part']]
    st.subheader(f"{part_info['title']} — Question {question['number']}/{question['total']}")
    st.caption(f"{part_info['subtitle']} · Recommended length: **{part_info['target_words']}**")
    with st.expander('💡 Hướng dẫn & chiến lược trả lời cho phần này', expanded=False):
        st.write(part_info['tips'])

    if question['kind'] == 'cue':
        cue = parse_cue_card(question['text'])
        with st.container(border=True):
            st.markdown('#### 📋 IELTS Speaking Part 2 — Candidate Task Card (Cue Card)')
            st.markdown(f"**{cue['topic']}**")
            for b in cue['bullets']:
                st.markdown(f'- {b}')
            if cue['closing']:
                st.markdown(f"*{cue['closing']}*")
        st.text_area('📝 Optional Preparation Notes (Scratchpad)', height=80,
                     key=f"prep_{sid}_{question['question_id']}")
    else:
        st.markdown(question['text'])

    with st.form(key=f"answer_form_{sid}_{question['question_id']}"):
        answer = st.text_area('Your English answer', height=160, max_chars=5000)
        send = st.form_submit_button('Submit and continue', type='primary')
    if send and answer.strip():
        run_agent(sid, 'submit', question_id=question['question_id'], answer=answer, live_llm=live)
        st.rerun()
`,
  },
  {
    id: 'commit-3',
    commitNumber: 3,
    commitMessage: 'fix(ui): handle form validation, session errors, and preliminary practice summary',
    summaryTitle: 'Commit 3 (Final app.py) — Validation, Error Handling & Practice Summary',
    description:
      'Bắt lỗi toàn diện cho trường hợp chưa nhập Learner ID, chưa nhập câu trả lời, vượt quá 5.000 ký tự, lỗi Session ID không tồn tại (có nút Reset), lỗi Agent, và bổ sung bảng Nhận xét luyện tập sơ bộ (Preliminary Practice Summary) khi hoàn thành bài thi.',
    changedHighlights: [
      'Kiểm tra hợp lệ Learner ID (không rỗng, ≤ 80 ký tự) và Session ID trước khi gọi storage/agent',
      'Nút "Reset invalid session state" tự phục hồi nếu session trong bộ nhớ bị xóa khỏi SQLite',
      'Hàm build_preliminary_summary() thống kê số lượt trả lời, tổng số từ, số từ trung bình mỗi lượt và cảnh báo các câu trả lời quá ngắn (< 15 từ)',
      'Hiển thị số từ (word count) cho từng câu trả lời trong Transcript và thông báo toast sau mỗi lượt nộp bài',
    ],
    code: `"""Run: streamlit run app.py
TV1 Deliverable — IELTS Speaking Mock Test (Phase 1 Streamlit UI)
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
    page_title='IELTS Speaking Agent – Phase 1',
    page_icon='💬',
    layout='centered',
)
init_db()

PART_GUIDANCE = {
    1: {
        'title': 'Part 1 · Introduction & Interview',
        'subtitle': 'Everyday topics about your studies, habits, and personal routine.',
        'target_words': '25–50 words (2–4 sentences)',
        'min_words': 15,
        'tips': (
            'Give a direct answer followed by one specific reason or personal example. '
            'The examiner agent will ask a follow-up question based on your response.'
        ),
    },
    2: {
        'title': 'Part 2 · Individual Long Turn (Cue Card)',
        'subtitle': 'Extended response addressing all prompts on the cue card.',
        'target_words': '110–180 words (structured long turn)',
        'min_words': 50,
        'tips': (
            'Cover every bullet point on the cue card in order and explain the final prompt. '
            'Audio capture and official 1-minute/2-minute timers are not enforced in Phase 1.'
        ),
    },
    3: {
        'title': 'Part 3 · Two-Way Abstract Discussion',
        'subtitle': 'Deeper analytical questions related to the Part 2 topic.',
        'target_words': '45–90 words (3–5 analytical sentences)',
        'min_words': 25,
        'tips': (
            'Discuss broader societal trends rather than only personal stories. '
            'State your view, explain why, give a concrete example, and consider an opposing view.'
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


st.title('💬 IELTS Speaking Mock Test')
st.caption(
    'Phase 1 MVP (Text-Only Prototype) · Part 1 → Part 2 Cue Card → Part 3 Discussion · '
    'Persisted SQLite Sessions & Agent Tool Trace'
)
st.info(
    '**Lưu ý (Quy định 1.5.2):** Hệ thống luyện tập Speaking dạng văn bản (Text-Only). '
    'Không chấm phát âm (\`Pronunciation: not_assessed\`) hay độ trôi chảy âm học, và '
    '**không cấp điểm band IELTS chính thức**.'
)

with st.sidebar:
    st.subheader('Session & Agent Settings')
    live = st.checkbox(
        'Use a real LLM agent',
        value=False,
        help='Requires OPENAI_API_KEY in .env. Offline mode uses ScriptedToolModel to verify the LangChain tool loop.',
    )
    learner = st.text_input(
        'Learner ID (pseudonym only)',
        value='demo_student',
        max_chars=80,
        help='Do not enter real personal identity (Section 1.5.4 data privacy policy).',
    )
    available_tracks = list(load_tracks().keys())
    track = st.selectbox('Topic Track', options=available_tracks, format_func=lambda t: t.capitalize())

    if st.button('Start new mock test', use_container_width=True, type='primary'):
        clean_learner = learner.strip()
        if not clean_learner:
            st.error('Learner ID cannot be empty. Please enter a pseudonym (1–80 chars).')
        else:
            try:
                sid = start_session(learner_id=clean_learner, track=track)
                run_agent(sid, 'start', live_llm=live)
                st.session_state['sid'] = sid
                st.session_state['ui_notice'] = f'Started new {track.capitalize()} session.'
                st.rerun()
            except Exception as err:
                st.error(f'Could not start session: {err}')

    st.divider()
    st.subheader('Resume Saved Session')
    resume = st.text_input('Session ID', placeholder='Paste a 32-char session ID')
    if st.button('Load saved session', use_container_width=True):
        clean_sid = resume.strip()
        if not clean_sid:
            st.warning('Please paste a valid Session ID before loading.')
        else:
            try:
                progress(clean_sid)
                st.session_state['sid'] = clean_sid
                st.session_state['ui_notice'] = 'Restored saved session from SQLite.'
                st.rerun()
            except ValueError as err:
                st.error(f'Session load error: {err}')
            except Exception as err:
                st.error(f'Unexpected storage error: {err}')

if 'ui_notice' in st.session_state:
    st.toast(st.session_state.pop('ui_notice'))

if 'sid' not in st.session_state:
    st.markdown('### Hướng dẫn bắt đầu bài thi Speaking Mock Test')
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown('**1. Part 1 (Introduction)**\\n\\n3 câu hỏi về bản thân & thói quen hằng ngày, có câu hỏi đào sâu (follow-up).')
    with col2:
        st.markdown('**2. Part 2 (Cue Card)**\\n\\n1 thẻ chủ đề (Cue Card) với các gợi ý chi tiết + 1 câu hỏi làm rõ.')
    with col3:
        st.markdown('**3. Part 3 (Discussion)**\\n\\n3 câu hỏi thảo luận học thuật mở rộng và phản biện hai chiều.')
    st.info('👈 Chọn **Topic Track** (\`Study\` hoặc \`Technology\`) và nhấn **Start new mock test** ở thanh bên trái để bắt đầu.')
    st.stop()

sid = st.session_state['sid']
try:
    state = progress(sid)
    question = current_question(sid)
except ValueError as err:
    st.error(f'Session Error: {err}. Please start a new session or load a valid Session ID.')
    if st.button('Reset invalid session state'):
        del st.session_state['sid']
        st.rerun()
    st.stop()

# Session metadata & overall progress bar
meta_col1, meta_col2, meta_col3 = st.columns([2, 1, 1])
with meta_col1:
    st.caption('Active Session ID (copy to resume later):')
    st.code(sid, language=None)
with meta_col2:
    st.metric('Learner', state['learner_id'])
with meta_col3:
    st.metric('Topic Track', state['track'].capitalize())

st.progress(
    state['completed'] / state['total'],
    text=f"Overall Progress: {state['completed']}/{state['total']} questions completed",
)

# 3-Part visual stage indicator
active_part = question['part'] if question is not None else 3
p_cols = st.columns(3)
part_labels = [
    (1, 'Part 1: Introduction (Q1–Q3)'),
    (2, 'Part 2: Cue Card (Q4–Q5)'),
    (3, 'Part 3: Discussion (Q6–Q8)'),
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
    st.subheader(f"{part_info['title']} — Question {question['number']}/{question['total']}")
    st.caption(f"{part_info['subtitle']} · Recommended length: **{part_info['target_words']}**")

    with st.expander('💡 Hướng dẫn & chiến lược trả lời cho phần này', expanded=False):
        st.write(part_info['tips'])

    # Distinct UI for Part 2 Cue Card vs standard/follow-up prompts
    if question['kind'] == 'cue':
        cue = parse_cue_card(question['text'])
        with st.container(border=True):
            st.markdown('#### 📋 IELTS Speaking Part 2 — Candidate Task Card (Cue Card)')
            st.markdown(f"**{cue['topic']}**")
            if cue['bullets']:
                st.markdown('**You should say:**')
                for b in cue['bullets']:
                    st.markdown(f'- {b}')
            if cue['closing']:
                st.markdown(f"*{cue['closing']}*")
        st.text_area(
            '📝 Optional Preparation Notes (Scratchpad — not graded)',
            height=80,
            key=f"prep_notes_{sid}_{question['question_id']}",
            placeholder='Jot down keywords, structure, or vocabulary ideas before writing your full Part 2 response...',
        )
    else:
        if question['kind'] == 'followup':
            st.caption('🔍 Contextual Follow-Up Question (adapted from your previous answer)')
        with st.container(border=True):
            st.markdown(f"### Examiner Prompt\\n{question['text']}")

    with st.form(key=f"answer_form_{sid}_{question['question_id']}"):
        answer = st.text_area(
            'Your English Answer',
            height=180 if question['kind'] == 'cue' else 140,
            max_chars=5000,
            placeholder='Write your complete answer in English (max 5,000 characters)...',
        )
        submit_col1, submit_col2 = st.columns([3, 1])
        with submit_col1:
            st.caption(
                f"Minimum recommended length for Part {question['part']}: "
                f"**{part_info['min_words']}+ words**."
            )
        with submit_col2:
            send = st.form_submit_button('Submit & Continue →', type='primary', use_container_width=True)

    if send:
        clean_ans = answer.strip()
        if not clean_ans:
            st.warning('Please enter a non-empty English answer before submitting.')
        elif len(clean_ans) > 5000:
            st.error('Answer exceeds the 5,000-character limit. Please shorten your response.')
        else:
            try:
                with st.spinner('Examiner Agent is saving your response and selecting the next prompt...'):
                    result = run_agent(
                        sid,
                        'submit',
                        question_id=question['question_id'],
                        answer=clean_ans,
                        live_llm=live,
                    )
                if result['progress']['completed'] != state['completed'] + 1:
                    st.error('The agent did not save the answer via save_candidate_answer. Check Agent trace or retry.')
                else:
                    words_used = count_words(clean_ans)
                    st.session_state['ui_notice'] = f'Saved answer ({words_used} words) via Agent loop.'
                    st.rerun()
            except Exception as err:
                st.error(f'Agent execution error: {err}')
else:
    st.success('🎉 Mock Test Complete! You have finished all 3 Parts (Part 1 → Part 2 → Part 3).')
    rows_for_summary = transcript(sid)
    summary = build_preliminary_summary(rows_for_summary)

    st.subheader('📊 Nhận xét luyện tập sơ bộ (Preliminary Practice Summary)')
    s_col1, s_col2, s_col3 = st.columns(3)
    s_col1.metric('Completed Turns', f"{summary['total_turns']}/{state['total']}")
    s_col2.metric('Total Words Written', summary['total_words'])
    s_col3.metric('Avg Words / Turn', summary['avg_words'])

    if summary['short_turns'] > 0:
        st.warning(
            f"Bạn có {summary['short_turns']} câu trả lời ngắn (< 15 từ). "
            "Khi luyện tập Part 1 & Part 3, hãy mở rộng câu trả lời bằng lý do (because/since) và ví dụ cụ thể (for instance)."
        )
    else:
        st.info(
            'Độ dài câu trả lời ở cả 3 Part đều đạt mức khuyến nghị. '
            'Hãy xem lại Transcript bên dưới để tự kiểm tra từ nối (discourse markers) và cấu trúc ngữ pháp.'
        )
    st.caption(
        'Nhãn bắt buộc (Quy định 1.5.2): Nhận xét sơ bộ phục vụ luyện tập văn bản; '
        'Pronunciation = not_assessed; không thay thế điểm thi IELTS chính thức.'
    )

with st.expander('📃 Full Session Transcript', expanded=question is None):
    rows = transcript(sid)
    if not rows:
        st.write('No saved answers in this session yet.')
    else:
        for idx, item in enumerate(rows, start=1):
            wc = count_words(item['answer_text'])
            st.markdown(f"**Q{idx} (\`{item['question_id']}\`) — Examiner:** {item['question_text']}")
            st.markdown(f"**Candidate ({wc} words):** {item['answer_text']}")
            st.caption(f"Saved at: {item['saved_at']}")
            st.divider()
        st.download_button(
            '⬇ Download Transcript JSON',
            data=json.dumps(rows, ensure_ascii=False, indent=2),
            file_name=f'{sid}_transcript.json',
            mime='application/json',
        )

with st.expander('🛠 Agent Tool Trace (JSONL steps)'):
    logs = recent_logs(sid)
    if not logs:
        st.caption('No agent trace events recorded for this session yet.')
    else:
        st.json(logs)

st.caption('Questions in this prototype are original learning examples (self_written), not official IELTS materials.')`,
  },
];

export const SAMPLE_ANSWERS_BY_QUESTION_ID: Record<string, string> = {
  'st-p1-01':
    'I am currently a third-year Computer Science student in Ho Chi Minh City. My daily routine starts at 7 AM with coding classes, and in the evening I usually practice English with my friends online.',
  'st-p1-02':
    'Spending time with friends while studying keeps me motivated because we can correct each other and discuss difficult topics together rather than memorizing vocabulary alone.',
  'st-p1-03':
    'What I enjoy most about learning something new is the moment when abstract concepts finally make sense and I can apply them to solve a real-world problem.',
  'st-p2-01':
    'I would like to learn public speaking and technical presentation in English. First of all, this skill involves structuring complex ideas clearly and delivering them confidently in front of an international audience. To learn it, I plan to join a university speaking club and record weekly practice videos with my friends and teacher. The main reason I want to master this skill is that software engineers often need to explain system architecture to non-technical stakeholders. In the future, strong public speaking will help me lead engineering teams and present research at global technology conferences.',
  'st-p2-02':
    'The hardest part of regular practice for public speaking is overcoming initial nervousness when answering unexpected questions on the spot without reading from a script.',
  'st-p3-01':
    'In my view, universities and high schools should strike a careful balance, though practical skills deserve more emphasis today. While theoretical subjects build foundational thinking, practical skills such as communication, financial literacy, and teamwork prepare students directly for modern workplaces.',
  'st-p3-02':
    'For instance, in software engineering, students who practice collaborative projects online adapt much faster at companies. On the other hand, critics argue that if schools only teach practical tools, graduates may struggle when technology changes and deeper theoretical foundations are needed.',
  'st-p3-03':
    'Over the next decade, interactive AI tutors and virtual laboratories will make skill acquisition far more personalized, allowing learners to receive instant diagnostic feedback at their own pace.',
  'te-p1-01':
    'I use technology almost continuously throughout the day, primarily my laptop for university programming assignments and my smartphone for online communication with my family and friends.',
  'te-p1-02':
    'It makes a tremendous difference because I can look up academic articles instantaneously and coordinate group projects with classmates without commuting across the city.',
  'te-p1-03':
    'I generally prefer face-to-face communication when discussing complex ideas or catching up with close friends, whereas online messaging is far more convenient for quick daily updates.',
  'te-p2-01':
    'A piece of technology I find indispensable is my noise-cancelling wireless headphones, which I started using two years ago during my first year at university. I use them every day when studying in busy libraries or attending online English practice sessions. They are extraordinarily useful to me because they block out distracting background traffic noise in Ho Chi Minh City and allow me to concentrate deeply on lectures and coding tasks for hours.',
  'te-p2-02':
    'Yes, I would definitely recommend this technology to older family members, especially those who enjoy listening to the radio or making video calls with relatives, because clear audio reduces ear strain.',
  'te-p3-01':
    'Relying excessively on technology can shorten people’s attention spans and weaken face-to-face social skills. Furthermore, constant screen exposure often disrupts sleep patterns and increases stress among young learners.',
  'te-p3-02':
    'Society can address that problem by introducing digital wellbeing guidelines in schools and encouraging community sports or offline group activities where students interact without screens.',
  'te-p3-03':
    'Absolutely. Governments should invest in affordable broadband infrastructure and public digital libraries in rural areas so that every student has equal access to online education.',
};
