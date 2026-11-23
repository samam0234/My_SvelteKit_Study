from pathlib import Path
import json, re
root=Path(__file__).resolve().parents[1]
names=[f'study{i}.md' for i in range(19)]+['studyMidpoint.md','studyFinal.md']
assert len(names)==21
for name in names:
    text=(root/name).read_text(encoding='utf-8')
    assert all(f'## {s}' in text for s in ['①','②','③','④','⑤','⑥','⑦','⑧']), name
    assert '```' in text and '줄별 설명' in text and '- [ ]' in text, name
    exercises=text.split('## ⑥')[1].split('## ⑦')[0]
    assert 2 <= len(re.findall(r'^\d+\. ',exercises,re.M)) <= 3, name
requirements=json.loads((root/'docs/notion-requirements.json').read_text(encoding='utf-8'))
for item in requirements['sveltekit']+requirements['transition']:
    plain=re.sub(r'^- \[[ x]\]','- [ ]',item)
    assert any(plain in (root/n).read_text(encoding='utf-8') for n in names), item
print('21 documents, 8 sections each, 2~3 exercises each, 18 original Notion requirements: passed')
print('study markdown bytes:',sum((root/n).stat().st_size for n in names))
