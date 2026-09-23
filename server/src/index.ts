import {PrismaClient} from '@prisma/client';
import {buildApp} from './app.js';
const db=new PrismaClient();
const api=await buildApp(db);
await api.listen({host:'127.0.0.1',port:Number(process.env.PORT||3080)});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await api.close();await db.$disconnect();process.exit(0);});
