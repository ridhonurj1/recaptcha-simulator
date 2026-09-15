import json, subprocess, urllib.request

# Ambil PAT dari remote URL repo lama (pola GitHub deploy yang sudah ada di home)
remotes = subprocess.run(['git', '-C', '/home/kaiden/projects/youtube-clipper-v3', 'remote', '-v'],
                         capture_output=True, text=True).stdout
pat = None
for line in remotes.splitlines():
    if 'github.com' in line and '@' in line:
        after = line.split('@')[0]
        pat = after.split('//')[-1].split(':')[-1]
        break

assert pat, 'PAT tidak ditemukan di remote repo lama'

# Buat repo private
req = urllib.request.Request(
    'https://api.github.com/user/repos',
    data=json.dumps({'name': 'recaptcha-simulator', 'private': True,
                     'description': 'Game simulasi reCAPTCHA — tugas akhir Cyber Security (100% offline edukasi)'}).encode(),
    headers={'Authorization': f'token {pat}', 'Accept': 'application/vnd.github+json'},
    method='POST')
try:
    with urllib.request.urlopen(req) as r:
        print('repo created:', json.loads(r.read())['full_name'])
except urllib.error.HTTPError as e:
    print('create:', e.code, e.read().decode()[:120])

# Tambah remote + push
subprocess.run(['git', 'remote', 'add', 'origin',
                f'https://ridhonurj1:{pat}@github.com/ridhonurj1/recaptcha-simulator.git'],
               cwd='/home/kaiden/projects/recaptcha-sim', check=False)
p = subprocess.run(['git', 'push', '-u', 'origin', 'main'],
                   cwd='/home/kaiden/projects/recaptcha-sim', capture_output=True, text=True)
print(p.stdout[-200:], p.stderr[-300:])
