import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
export type PaymentState={id:string;customerId:string;plan:string;status:string;periodEnd:Date|null};
export interface PaymentProvider {createCheckout(customerId:string,email:string,plan:string):Promise<{id:string;url:string}>;createSubscription(customerId:string,email:string,plan:string):Promise<{id:string;url:string}>;cancelSubscription(id:string):Promise<void>;getSubscription(id:string):Promise<PaymentState>;validateWebhook(headers:Record<string,unknown>,id:string):boolean;}
export class MockProvider implements PaymentProvider {
  constructor(private readonly baseUrl:string){}
  async createCheckout(customerId:string,_email:string,plan:string){return {id:`mock-${customerId}-${plan}-${randomUUID()}`,url:`${this.baseUrl}/portal/#mock`};}
  createSubscription(customerId:string,email:string,plan:string){return this.createCheckout(customerId,email,plan);}
  async cancelSubscription(_id:string){}
  async getSubscription(_id:string):Promise<PaymentState>{throw new Error('Mock settlements use the development-only endpoint');}
  validateWebhook(){return false;}
}
export class MercadoPagoProvider implements PaymentProvider {
  constructor(private readonly env:NodeJS.ProcessEnv,private readonly baseUrl:string){}
  private async request(path:string,method='GET',body?:unknown){const r=await fetch(`https://api.mercadopago.com${path}`,{method,headers:{Authorization:`Bearer ${this.env.PAYMENT_ACCESS_TOKEN}`,'Content-Type':'application/json','X-Idempotency-Key':randomUUID()},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Payment provider unavailable');return r.json() as Promise<any>;}
  async createCheckout(customerId:string,email:string,plan:string){
    const planId=plan==='PRO'?this.env.MP_PRO_PLAN_ID:this.env.MP_BUSINESS_PLAN_ID;
    if(!planId||!this.env.PAYMENT_ACCESS_TOKEN)throw new Error('Payment plan not configured');
    const item=await this.request('/preapproval','POST',{preapproval_plan_id:planId,reason:`RB Gestão ${plan}`,external_reference:`${customerId}:${plan}`,payer_email:email,back_url:`${this.baseUrl}/portal/`,status:'pending'});
    const url=new URL(item.init_point);if(url.protocol!=='https:'||!/(^|\.)mercadopago\.com(\.br)?$/.test(url.hostname))throw new Error('Invalid checkout URL');return {id:String(item.id),url:url.href};
  }
  createSubscription(customerId:string,email:string,plan:string){return this.createCheckout(customerId,email,plan);}
  async cancelSubscription(id:string){await this.request(`/preapproval/${encodeURIComponent(id)}`,'PUT',{status:'cancelled'});}
  async getSubscription(id:string):Promise<PaymentState>{
    const item=await this.request(`/preapproval/${encodeURIComponent(id)}`),[customerId,plan]=String(item.external_reference||'').split(':');
    const expected=plan==='PRO'?this.env.MP_PRO_PLAN_ID:plan==='BUSINESS'?this.env.MP_BUSINESS_PLAN_ID:null;
    if(!expected||item.preapproval_plan_id!==expected)throw new Error('Unexpected payment plan');
    // Authorization alone is not proof of payment. Verify an approved recurring charge.
    const charges=await this.request(`/authorized_payments/search?preapproval_id=${encodeURIComponent(id)}`);
    const settled=(charges.results||[]).filter((p:any)=>p.payment?.status==='approved');
    const status=item.status==='cancelled'?'canceled':item.status==='paused'?'suspended':settled.length&&item.status==='authorized'?'active':'past_due';
    return {id:String(item.id),customerId,plan,status,periodEnd:status==='active'&&item.next_payment_date?new Date(item.next_payment_date):null};
  }
  validateWebhook(headers:Record<string,unknown>,id:string){
    const parts=Object.fromEntries(String(headers['x-signature']||'').split(',').map(x=>x.trim().split('=')));
    const ts=Number(parts.ts),requestId=String(headers['x-request-id']||''),secret=this.env.PAYMENT_WEBHOOK_SECRET;
    if(!secret||!requestId||!id||!Number.isFinite(ts)||Math.abs(Date.now()-(ts<1e12?ts*1000:ts))>300000||!/^[a-f0-9]{64}$/i.test(parts.v1||''))return false;
    const expected=createHmac('sha256',secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest();return timingSafeEqual(expected,Buffer.from(parts.v1,'hex'));
  }
}
