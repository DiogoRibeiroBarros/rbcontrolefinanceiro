'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {PairingService}=require('../app/services/pairing-service.cjs');
const {createMobileV2HttpHandler}=require('../app/services/mobile-v2-http.cjs');

test('novo protocolo: código, autorização local, dois dispositivos, sessão WebView e reinício',async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rb-mobile-v2-'));
  let server;
  try {
    const filePath=path.join(directory,'pairing.json');
    const pairing=new PairingService({filePath});
    const handler=createMobileV2HttpHandler({pairing,webRoot:path.join(__dirname,'../app'),getPublicUrl:()=>'',allowInsecureLoopback:true});
    server=http.createServer((req,res) => {void handler(req,res,new URL(req.url,'http://localhost'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${server.address().port}`;
    const post=async(route,body,headers={}) => {
      const response=await fetch(origin+route,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
      return {response,data:await response.json()};
    };
    const identity=await (await fetch(origin+'/v2/mobile/identity')).json();
    assert.equal(identity.protocol,2);
    assert.equal((await post('/v2/mobile/pair/request',{code:'000000',name:'Errado'})).response.status,401);
    const requests=await Promise.all(['Celular A','Celular B'].map(name=>post('/v2/mobile/pair/request',{code:pairing.data.code,name})));
    for (const item of requests) assert.equal(item.response.status,202);
    const first=requests[0].data;
    assert.equal((await post('/v2/mobile/pair/complete',{requestId:first.requestId,requestSecret:first.requestSecret})).data.status,'pending');
    for(const item of requests) assert.equal(pairing.decide(item.data.requestId,true),true);
    const credentials=await Promise.all(requests.map(item=>post('/v2/mobile/pair/complete',{requestId:item.data.requestId,requestSecret:item.data.requestSecret})));
    assert.notEqual(credentials[0].data.token,credentials[1].data.token);
    for(const item of credentials) {
      const response=await fetch(origin+'/v2/mobile/heartbeat',{headers:{Authorization:`Bearer ${item.data.token}`}});
      assert.equal(response.status,200);
      assert.equal((await response.json()).installationId,identity.installationId);
    }
    const token=credentials[0].data.token;
    assert.equal((await post('/v2/mobile/session',{}, {Authorization:`Bearer ${token}`,Origin:'https://evil.example'})).response.status,403);
    const session=await post('/v2/mobile/session',{}, {Authorization:`Bearer ${token}`,Origin:origin,'Sec-Fetch-Site':'same-origin'});
    assert.equal(session.response.status,200);
    assert.match(session.response.headers.get('set-cookie'),/^rb_device=/);
    assert.match(session.response.headers.get('set-cookie'),/HttpOnly/);
    const restarted=new PairingService({filePath});
    assert.equal(restarted.data.code,pairing.data.code);
    assert.ok(restarted.authenticate(token));
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
