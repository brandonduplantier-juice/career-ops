#!/usr/bin/env node
// Restore local-only configuration from an authenticated, separately cloned private repository.
import { existsSync, lstatSync, realpathSync, mkdirSync, readFileSync, copyFileSync, constants } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=realpathSync(dirname(fileURLToPath(import.meta.url)));
const files=["config/profile.yml","modes/_profile.md","portals.yml","data/applications.md","data/daily_queue.md"];
const arg=process.argv[2];
if (!arg || process.argv.length!==3) { console.error('Usage: node import-private-config.mjs <private-config-directory>'); process.exit(2); }
const source=realpathSync(resolve(arg));
if(source===root) throw Error('Use a separate configuration checkout');
function checked(base,path){
  let current=base;
  for(const part of path.split('/')){
    current=join(current,part);
    let entry;
    try { entry=lstatSync(current); } catch (error) { if(error.code!=='ENOENT') throw error; }
    if(entry?.isSymbolicLink()) throw Error('Symlink not allowed: '+path);
  }
  return current;
}
const plan=files.map(path=>{
  const from=checked(source,path),to=checked(root,path);
  if(!lstatSync(from).isFile()) throw Error('Source must be a regular file: '+path);
  if(existsSync(to)){
    if(!lstatSync(to).isFile() || !readFileSync(from).equals(readFileSync(to))) throw Error('Existing local file differs; preserve and reconcile manually: '+path);
    return {path,from,to,skip:true};
  }
  return {path,from,to,skip:false};
});
for(const item of plan){
  if(item.skip)continue;
  mkdirSync(dirname(item.to),{recursive:true});
  copyFileSync(item.from,item.to,constants.COPYFILE_EXCL);
}
console.log('Configuration verified/imported: '+plan.length+' files. Existing content preserved.');
