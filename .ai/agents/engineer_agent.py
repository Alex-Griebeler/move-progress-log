import os
import json
import pathlib
import anthropic

print('AI Engineer Agent started')

issue_title = os.getenv('ISSUE_TITLE', '')
issue_body = os.getenv('ISSUE_BODY', '')

print('Issue title:', issue_title)
print('Issue body:', issue_body)

# --- Planning layer ---
print('Running planning layer...')

client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

prompt_lines = [
    'You are an AI software engineer.',
    'You have been given a GitHub issue and must produce a structured implementation plan.',
    '',
    'Issue title: ' + issue_title,
    'Issue body: ' + issue_body,
    '',
    'Respond with a JSON object with exactly these keys:',
    '  task: short summary of what to build',
    '  description: full description of the work',
    '  steps: list of implementation steps',
    '  files_to_modify: list of existing file paths to change',
    '  files_to_create: list of new file paths to create',
    '',
    'Return only the JSON object, no other text.',
]
planning_prompt = chr(10).join(prompt_lines)

message = client.messages.create(
    model='claude-opus-4-5-20251101',
    max_tokens=1024,
    messages=[
        {'role': 'user', 'content': planning_prompt}
    ]
)

raw = message.content[0].text.strip()
print('Raw planner response:', raw)

plan = json.loads(raw)

print('Generated plan:')
print(json.dumps(plan, indent=2))

print('Planner ready for code generation')

# --- Repository analysis layer ---
print('Running repository analysis...')

repo_root = pathlib.Path('.')
important_dirs = ['src', 'components', 'hooks', 'supabase', '.ai', '.github']

project_map = {
    'root_files': [],
    'directories': {},
}

for item in sorted(repo_root.iterdir()):
    if item.is_file():
        project_map['root_files'].append(item.name)

for dir_name in important_dirs:
    dir_path = repo_root / dir_name
    if dir_path.exists() and dir_path.is_dir():
        entries = []
        for item in sorted(dir_path.rglob('*')):
            if item.is_file():
                entries.append(str(item.relative_to(repo_root)))
        project_map['directories'][dir_name] = entries

print('Project map:')
print(json.dumps(project_map, indent=2))
