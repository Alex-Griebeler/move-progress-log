import os
import json

print('AI Engineer Agent started')

issue_title = os.getenv('ISSUE_TITLE', '')
issue_body = os.getenv('ISSUE_BODY', '')

print('Issue title:', issue_title)
print('Issue body:', issue_body)

plan = {
    'task': issue_title,
    'description': issue_body,
    'steps': [
        'analyze repository structure',
        'identify files to modify',
        'generate code changes',
        'prepare pull request'
    ]
}

print('Generated plan:')
print(json.dumps(plan, indent=2))

print('Planner ready for code generation')
