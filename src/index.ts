
import 'dotenv/config';

import * as net from 'node:net';
import { execFile } from 'node:child_process';

const _getGroups = (user: string) => new Promise<string[]>((resolve, reject) => {
  const child = execFile('id', ['-Gnz', user], (err, stdout) => {
    if (err) {
      reject(err);
      return;
    }
    const users = stdout.split('\0');
    resolve(users);
  });
  child.stderr?.pipe(process.stderr);
  child.stdin?.end();
});

const server = net.createServer((socket) => {
  socket.setEncoding('latin1');

  let buffer = '';
  socket.on('data', async (data) => {
    try {
      buffer += data;
      const parts = buffer.split(':');
      if (parts.length < 2) return;
      const length = parseInt(parts[0]!, 10);
      const remaining = parts.slice(1).join(':');
      if (remaining.length <= length) return;
      const content = remaining.slice(0, length);
      const comma = remaining.slice(length, length + 1);
      console.assert(comma === ',');
      buffer = remaining.slice(length + 1);
      const parsed = content.split(' ');
      const _nameTag = parsed[0];
      const value = parsed.slice(1).join(' ');
      try {
        const groups = await _getGroups(value);
        if (!groups.includes(process.env.ALLOWED_GROUP ?? 'sudo')) {
          throw new Error('Unauthorized');
        }
        const message = 'OK OK';
        const length = message.length;
        socket.write(`${length}:${message},`);
      } catch (e) {
        const message = 'NOTFOUND ';
        const length = message.length;
        socket.write(`${length}:${message},`);
      }
    } catch (e) {
      console.error(e);
    }
  });
});

const PORT = parseInt(process.env.LISTEN_PORT ?? '7165', 10);
server.listen(PORT, '127.0.0.1', 511, () => {
  console.log('Server started');
});
