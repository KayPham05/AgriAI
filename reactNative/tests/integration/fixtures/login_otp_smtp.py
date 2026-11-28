import json
import os
import socketserver
import ssl
import time
import uuid
from email import policy
from email.parser import BytesParser
from pathlib import Path

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain("/qa/cert.pem", "/qa/key.pem")
mailbox = Path("/qa/inbox")

class MailHandler(socketserver.StreamRequestHandler):
    def reply(self, value):
        self.wfile.write((value + "\r\n").encode("ascii"))

    def handle(self):
        secure = False
        recipient = None
        self.reply("220 agri163-smtp ESMTP")
        while line := self.rfile.readline():
            command, _, value = line.rstrip().partition(b" ")
            command = command.upper()
            if command in (b"HELO", b"EHLO"):
                self.reply("250 agri163-smtp" if secure else "250-agri163-smtp\r\n250 STARTTLS")
            elif command == b"STARTTLS":
                self.reply("220 Begin TLS")
                self.connection = context.wrap_socket(self.connection, server_side=True)
                self.rfile = self.connection.makefile("rb")
                self.wfile = self.connection.makefile("wb", buffering=0)
                secure = True
            elif command == b"MAIL" or command == b"RSET":
                recipient = None
                self.reply("250 OK")
            elif command == b"RCPT" and secure:
                recipient = value.partition(b"<")[2].partition(b">")[0].decode("ascii")
                self.reply("250 OK")
            elif command == b"DATA" and recipient:
                self.reply("354 End with a dot")
                data = []
                while part := self.rfile.readline():
                    if part == b".\r\n":
                        break
                    data.append(part[1:] if part.startswith(b"..") else part)
                message = BytesParser(policy=policy.default).parsebytes(b"".join(data))
                stem = str(time.time_ns()) + "-" + uuid.uuid4().hex
                tmp = mailbox / (stem + ".tmp")
                tmp.write_text(json.dumps({
                    "to": recipient,
                    "subject": str(message["Subject"]),
                    "body": message.get_body(preferencelist=("html", "plain")).get_content(),
                }), encoding="utf-8")
                os.replace(tmp, mailbox / (stem + ".json"))
                self.reply("250 Accepted")
            elif command == b"QUIT":
                self.reply("221 Bye")
                return
            else:
                self.reply("503 Bad sequence")

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with Server(("0.0.0.0", 2525), MailHandler) as server:
    server.serve_forever()
