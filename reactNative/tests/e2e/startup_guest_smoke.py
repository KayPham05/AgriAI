"""Check that a fresh Android Expo Go installation reaches Welcome."""

import argparse
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--adb', required=True)
    parser.add_argument('--serial', required=True)
    parser.add_argument('--port', type=int, default=8083)
    parser.add_argument('--output', type=Path, default=Path('dist/agri158-native'))
    args = parser.parse_args()
    if not args.serial.startswith('emulator-'):
        parser.error('Use a dedicated emulator with an empty SecureStore.')

    def adb(*command: str) -> bytes:
        return subprocess.check_output([args.adb, '-s', args.serial, *command], timeout=25)

    port = f'tcp:{args.port}'
    adb('reverse', port, port)
    adb('shell', 'am', 'force-stop', 'host.exp.exponent')
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d',
        f'exp://127.0.0.1:{args.port}', 'host.exp.exponent')
    deadline = time.monotonic() + 60
    remote = f'/sdcard/agri158-startup-{time.monotonic_ns()}.xml'
    try:
        while time.monotonic() < deadline:
            dump = adb('shell', 'uiautomator', 'dump', remote)
            if b'dumped to:' in dump:
                xml = adb('exec-out', 'cat', remote)
                adb('shell', 'rm', remote)
                nodes = ET.fromstring(xml).iter('node')
                heading = 'Quan sát chiếc lá.\nHiểu thêm về cây.'
                if any(node.get('text') == heading for node in nodes):
                    args.output.mkdir(parents=True, exist_ok=True)
                    (args.output / 'guest-welcome.xml').write_bytes(xml)
                    (args.output / 'guest-welcome.png').write_bytes(adb('exec-out', 'screencap', '-p'))
                    print('PASS: Guest reached Welcome from the startup route.')
                    return
            time.sleep(1)
    finally:
        adb('shell', 'rm', '-f', remote)
    raise AssertionError('Welcome was not reached. Check startup, Expo Go and the fixture state.')


if __name__ == '__main__':
    main()
