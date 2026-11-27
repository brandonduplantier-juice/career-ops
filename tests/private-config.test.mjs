import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const paths=['config/profile.yml','modes/_profile.md','portals.yml','data/applications.md','data/daily_queue.md'];
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'career-config-test-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const source=join(root,'source'), dest=join(root,'dest');
  mkdirSync(source); mkdirSync(dest);
  const script=join(dest,'import-private-config.mjs');
  copyFileSync(fileURLToPath(new URL('../import-private-config.mjs',import.meta.url)),script);
  for(const path of paths){mkdirSync(dirname(join(source,path)),{recursive:true});writeFileSync(join(source,path),'synthetic '+path+'\n');}
  return {source,dest,run:()=>spawnSync(process.execPath,[script,source],{encoding:'utf8'})};
}
test('imports all expected files, ignores unrelated files, repeats without overwriting',t=>{
  const f=fixture(t);writeFileSync(join(f.source,'unrelated.txt'),'not imported');
  assert.equal(f.run().status,0);
  for(const p of paths)assert.deepEqual(readFileSync(join(f.source,p)),readFileSync(join(f.dest,p)));
  assert.equal(existsSync(join(f.dest,'unrelated.txt')),false);
  assert.equal(f.run().status,0);
});
test('conflicting local content aborts before copying anything',t=>{
  const f=fixture(t);writeFileSync(join(f.dest,'portals.yml'),'local changes');
  assert.notEqual(f.run().status,0);
  assert.equal(readFileSync(join(f.dest,'portals.yml'),'utf8'),'local changes');
  assert.equal(existsSync(join(f.dest,'config/profile.yml')),false);
});
test('missing source file aborts without partial import',t=>{
  const f=fixture(t);rmSync(join(f.source,'data/daily_queue.md'));
  assert.notEqual(f.run().status,0);assert.equal(existsSync(join(f.dest,'config/profile.yml')),false);
});
test('rejects destination symlink including dangling link',t=>{
  const f=fixture(t);symlinkSync(join(f.source,'nonexistent'),join(f.dest,'portals.yml'));
  assert.notEqual(f.run().status,0);assert.equal(existsSync(join(f.dest,'config/profile.yml')),false);
});
test('rejects source symlink',t=>{
  const f=fixture(t);rmSync(join(f.source,'portals.yml'));symlinkSync(join(f.source,'data/applications.md'),join(f.source,'portals.yml'));
  assert.notEqual(f.run().status,0);assert.equal(existsSync(join(f.dest,'config/profile.yml')),false);
});
