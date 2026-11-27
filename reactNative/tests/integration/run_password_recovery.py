import os
import secrets
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]
prefix = 'agri-recovery-' + secrets.token_hex(4)
qa = root / 'dist/recovery-qa' / prefix
qa.mkdir(parents=True, exist_ok=True)
(qa / 'inbox').mkdir(exist_ok=True)
(qa / 'staging').mkdir(exist_ok=True)
containers = []
image = os.environ.get('AGRI_RECOVERY_IMAGE', 'agriai-backend:agri163-lockout')

def run(*args, **kwargs):
    return subprocess.run(list(args), check=True, capture_output=True, text=True, **kwargs)

def container(suffix, *args):
    name = prefix + '-' + suffix
    containers.append(name)
    return run('docker', 'run', '--name', name, '--network', prefix, *args)

try:
    # Refuse an occupied port rather than accidentally testing another API.
    with socket.socket() as port_check:
        port_check.bind(('127.0.0.1', 15066))
    run(os.environ.get('AGRI_OPENSSL', 'C:/Program Files/Git/usr/bin/openssl.exe'), 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', str(qa / 'key.pem'), '-out', str(qa / 'cert.pem'), '-days', '1',
        '-subj', '/CN=agri-recovery-smtp', '-addext', 'subjectAltName=DNS:agri-recovery-smtp')
    run('docker', 'network', 'create', prefix)
    password = secrets.token_hex(16)
    container('db', '-d', '--network-alias', 'recovery-db', '--tmpfs', '/var/lib/postgresql/data',
              '-e', 'POSTGRES_DB=recovery_qa', '-e', 'POSTGRES_USER=qa',
              '-e', 'POSTGRES_PASSWORD=' + password, 'postgres:16-alpine')
    for attempt in range(20):
        ready = subprocess.run(['docker', 'exec', prefix + '-db', 'pg_isready', '-U', 'qa'], capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Disposable PostgreSQL did not start')
    smtp = prefix + '-smtp'
    containers.append(smtp)
    run('docker', 'create', '--name', smtp, '--network', prefix, '--network-alias', 'agri-recovery-smtp',
        'python:3.12-alpine', 'python', '/smtp.py')
    run('docker', 'cp', str(qa), smtp + ':/qa')
    run('docker', 'cp', str(root / 'tests/integration/fixtures/login_otp_smtp.py'), smtp + ':/smtp.py')
    run('docker', 'start', smtp)
    env = {
        'ASPNETCORE_ENVIRONMENT': 'Production',
        'ConnectionStrings__DefaultConnection': 'Host=recovery-db;Database=recovery_qa;Username=qa;Password=' + password,
        'JwtSettings__Secret': secrets.token_hex(32),
        'Smtp__Host': 'agri-recovery-smtp', 'Smtp__Port': '2525',
        'Smtp__Sender': 'qa@example.test', 'Smtp__Password': 'synthetic-only',
        'SSL_CERT_FILE': '/qa/cert.pem',
        'R2__ServiceUrl': 'https://qa.r2.cloudflarestorage.com',
        'R2__BucketName': 'qa', 'R2__AccessKeyId': 'synthetic-only', 'R2__SecretAccessKey': 'synthetic-only',
    }
    settings = []
    for key, value in env.items():
        settings += ['-e', key + '=' + value]
    container('migrate', *settings, image, '--migrate')
    api = prefix + '-api'
    containers.append(api)
    run('docker', 'create', '--name', api, '--network', prefix, '-p', '127.0.0.1:15066:8080', *settings, image)
    run('docker', 'cp', str(qa), api + ':/qa')
    run('docker', 'start', api)
    published = run('docker', 'port', api, '8080').stdout.strip()
    if published != '127.0.0.1:15066':
        raise RuntimeError('QA API must own the expected loopback-only port')
    for attempt in range(20):
        try:
            with urllib.request.urlopen('http://127.0.0.1:15066/api/health', timeout=2) as response:
                if response.status == 200:
                    break
        except Exception:
            time.sleep(1)
    else:
        raise RuntimeError('Disposable API did not start')
    # Copy captured messages while the Node test waits for SMTP delivery.
    import threading
    stopped = threading.Event()
    capture_errors = []
    def sync_inbox():
        while not stopped.wait(0.1):
            try:
                # Docker writes only to staging. Publish each complete message
                # once so readers never race with an overwrite on Windows.
                run('docker', 'cp', smtp + ':/qa/inbox/.', str(qa / 'staging'))
                for message in (qa / 'staging').glob('*.json'):
                    destination = qa / 'inbox' / message.name
                    if not destination.exists():
                        os.replace(message, destination)
            except Exception as error:
                capture_errors.append(error)
                stopped.set()
                return
    worker = threading.Thread(target=sync_inbox, daemon=True)
    worker.start()
    test_env = dict(os.environ, AGRI_RECOVERY_API_URL='http://127.0.0.1:15066', AGRI_RECOVERY_INBOX=str(qa / 'inbox'))
    result = run('powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(root / 'pnpm.ps1'),
                 'exec', 'node', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--test',
                 'tests/integration/passwordRecoveryApi.test.mjs', cwd=root, env=test_env)
    (qa / 'result.log').write_text(result.stdout + result.stderr, encoding='utf-8')
    if capture_errors:
        raise RuntimeError('SMTP inbox capture failed') from capture_errors[0]
    print(result.stdout, flush=True)
except subprocess.CalledProcessError as error:
    print(error.stdout, error.stderr, flush=True)
    raise
finally:
    if 'stopped' in globals():
        stopped.set()
        worker.join(timeout=5)
    for name in reversed(containers):
        subprocess.run(['docker', 'rm', '-f', name], capture_output=True)
    subprocess.run(['docker', 'network', 'rm', prefix], capture_output=True)
    for name in ('key.pem', 'cert.pem'):
        (qa / name).unlink(missing_ok=True)
