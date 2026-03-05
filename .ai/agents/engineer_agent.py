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

# --- Code patch generator layer ---
print('Running code patch generator...')

patch_prompt_lines = [
    'You are an AI software engineer with expertise in generating Git patches.',
    'You have been given an implementation plan and a repository project map.',
    'Generate a Git patch in unified diff format that implements the plan.',
    '',
    'Implementation plan:',
    json.dumps(plan, indent=2),
    '',
    'Project map:',
    json.dumps(project_map, indent=2),
    '',
    'Rules:',
    '- Output ONLY the raw patch text, no explanation and no markdown fences',
    '- Use standard diff --git headers: diff --git a/file b/file',
    '- Include index lines, --- and +++ lines, and @@ hunk headers',
    '- For new files use /dev/null as the source',
    '- Every hunk must have correct line counts in the @@ header',
]
patch_prompt = chr(10).join(patch_prompt_lines)

patch_message = client.messages.create(
    model='claude-opus-4-5-20251101',
    max_tokens=4096,
    messages=[
        {'role': 'user', 'content': patch_prompt}
    ]
)

patch = patch_message.content[0].text.strip()

print('Generated patch:')
print(patch)

print('Patch generator complete. Patch not applied.')

# --- Patch application layer ---
print('Applying patch...')

import subprocess
import datetime

# 1. Save patch to temp file
patch_path = 'ai_changes.patch'
with open(patch_path, 'w') as f:
    f.write(patch)
print('Patch saved to:', patch_path)

# 2. Create new branch
timestamp = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
branch_name = 'ai/issue-' + timestamp
subprocess.run(['git', 'checkout', '-b', branch_name], check=True)
print('Created branch:', branch_name)

# 3. Apply the patch
apply_result = subprocess.run(
    ['git', 'apply', '--ignore-whitespace', patch_path],
    capture_output=True,
    text=True
)
if apply_result.returncode != 0:
    print('git apply stderr:', apply_result.stderr)
    raise RuntimeError('Patch application failed')
print('Patch applied successfully')

# 4. Stage all modified files
subprocess.run(['git', 'add', '-A'], check=True)
print('Files staged')

# 5. Commit
subprocess.run(
    ['git', 'commit', '-m', 'AI engineer: apply generated patch for issue'],
    check=True
)
print('Changes committed on branch:', branch_name)
print('Patch application complete. Pull request not opened.')
