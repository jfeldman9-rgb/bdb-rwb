import { createStartupGuard } from './startup.js';
import { base } from './debug-flag.js';
export async function bootstrap(root=globalThis){
 base(root.document,root.location);const startup=root.__bdbStartup=createStartupGuard(root);
 try{const {bootGame}=await import('./main.js');return bootGame();}catch(error){console.error('BDB startup failed:',error);startup.fail(error);}
}
if(globalThis.document?.getElementById('game'))bootstrap();
