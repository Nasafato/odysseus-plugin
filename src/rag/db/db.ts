import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';

const db = new Database(path.join(__dirname, 'odysseus.db'));

db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(path.join(__dirname, 'migrations', '01.init.sql'), 'utf8'));

export { db };
