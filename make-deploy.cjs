const fs = require('fs');
const path = require('path');

const root = __dirname;
const deploy = path.join(root, 'deploy');

function rmrf(p){ if(fs.existsSync(p)) fs.rmSync(p,{recursive:true,force:true}); }
function copyDir(src,dst){
  fs.mkdirSync(dst,{recursive:true});
  for(const e of fs.readdirSync(src,{withFileTypes:true})){
    const s=path.join(src,e.name), d=path.join(dst,e.name);
    if(e.isDirectory()) copyDir(s,d); else fs.copyFileSync(s,d);
  }
}

if(!fs.existsSync(path.join(root,'dist','index.html'))){
  console.error('먼저 빌드가 필요합니다 (npm run build).'); process.exit(1);
}

rmrf(deploy);
// dist 내용을 deploy 최상위에 복사 (index.html이 루트에 오도록)
copyDir(path.join(root,'dist'), deploy);
// 시세 함수 포함
copyDir(path.join(root,'netlify','functions'), path.join(deploy,'netlify','functions'));
// netlify 설정: 루트를 그대로 게시 + 함수 디렉터리 지정
fs.writeFileSync(path.join(deploy,'netlify.toml'),
`[build]\n  publish = "."\n\n[functions]\n  directory = "netlify/functions"\n  node_bundler = "esbuild"\n`);

console.log('deploy 폴더 준비 완료 (index.html 루트 배치) ->', deploy);
