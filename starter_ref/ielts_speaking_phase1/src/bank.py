"""Small, human-authored question bank; no external dataset is required."""
import json
import re
from pathlib import Path

BANK_FILE = Path(__file__).resolve().parents[1] / 'data' / 'questions.json'


def load_tracks():
    content = json.loads(BANK_FILE.read_text(encoding='utf-8'))
    tracks = content['tracks']
    for name, questions in tracks.items():
        assert questions and [q['part'] for q in questions] == sorted(q['part'] for q in questions), name
        assert len({q['id'] for q in questions}) == len(questions)
    return tracks


def topic_phrase(answer: str):
    """Offline, non-LLM follow-up personalization from safe, controlled phrases."""
    text = re.sub(r'[^a-z ]', ' ', answer.lower())
    patterns = [
        (r'\bfriends?\b', 'spending time with friends'),
        (r'\bfamil(?:y|ies)\b', 'your family'),
        (r'\bonline\b', 'learning online'),
        (r'\bteacher\b', 'your teacher'),
        (r'\bpractice\b', 'regular practice'),
        (r'\btechnology\b', 'technology'),
        (r'\bgame\b', 'playing games'),
        (r'\benglish\b', 'learning English'),
        (r'\bcomputer\b', 'computers'),
        (r'\btime\b', 'managing your time'),
    ]
    return next((label for regex, label in patterns if re.search(regex, text)), 'that point')


def render_question(track: str, index: int, previous_answer: str = ''):
    questions = load_tracks()[track]
    if index >= len(questions):
        return None
    item = questions[index]
    text = item['text'].replace('{anchor}', topic_phrase(previous_answer))
    return {'question_id': item['id'], 'index': index, 'number': index + 1,
            'total': len(questions), 'part': item['part'], 'kind': item['kind'],
            'text': text}
