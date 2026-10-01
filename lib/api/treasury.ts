import { useAuthStore } from '@/store/authStore';
export type Row = Record<string, unknown>;
export async function treasuryRequest(path: string, method = 'GET', body?: Row): Promise<unknown> {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`/api/proxy/${path}`, {method, cache:'no-store', headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`}, ...(body ? {body:JSON.stringify(body)} : {})});
  const data = await response.json().catch(()=>{throw new Error('Unexpected server response. Check status before retrying.');});
  if (!response.ok) throw new Error(response.status===403?'You do not have permission for this action.':data.message || `Request failed (${response.status}).`);
  return data.data ?? data;
}
export function rows(value: unknown): Row[] { return Array.isArray(value)?value.filter(v=>v&&typeof v==='object') as Row[]:[]; }
export function record(value: unknown): Row {return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
export function display(value: unknown): string {return value==null?'Not provided':typeof value==='object'?JSON.stringify(value):String(value);}
export function minor(value: unknown,scale=2):string {
  if(typeof value==='number'&&!Number.isSafeInteger(value))return 'Amount exceeds safe display precision';
  const text=String(value??'');if(!/^-?\d+$/.test(text))return 'Not available';
  const negative=text.startsWith('-');const digits=(negative?text.slice(1):text).padStart(scale+1,'0');
  return `${negative?'-':''}${scale?digits.slice(0,-scale)+'.'+digits.slice(-scale):digits}`;
}
