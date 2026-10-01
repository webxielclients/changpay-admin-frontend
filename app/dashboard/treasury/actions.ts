export type Field = {key:string; label:string; type?:'number'|'boolean'|'textarea'|'ids'; options?:string[]; optional?:boolean};
export type Action = {name:string;path:string;method?:string;permission:string;fields:Field[];note?:string};
const f=(key:string,label:string,type?:Field['type'],options?:string[]):Field=>({key,label,type,options});
const id=(key='id',label='Record ID')=>f(key,label,'number');
const evidence=f('evidence','Review evidence / reference','textarea');const reason=f('reason','Reason','textarea');
const currency=f('currency','Currency',undefined,['USD','NGN','YUAN']);const enabled=f('enabled','Enabled','boolean');
const op='treasury/operations';
export const actions: Action[] = [
 {name:'Fulfil held conversion',path:`${op}/orders/{id}/fulfil`,permission:'treasury.execute',fields:[id(),evidence],note:'Uses the original accepted quote. Confirm current funding and price exposure before fulfilment.'},
 {name:'Cancel conversion and release funds',path:`${op}/orders/{id}/cancel`,permission:'treasury.release',fields:[id(),reason],note:'Only unsettled orders can be cancelled. This releases the source reservation.'},
 {name:'Approve replenishment',path:`${op}/replenishments/{id}/approve`,permission:'treasury.execute',fields:[id(),reason],note:'A configured company-wallet source can submit a real transfer. External funding remains pending receipt verification.'},
 {name:'Confirm external replenishment',path:`${op}/replenishments/{id}/confirm-external`,permission:'treasury.reconcile',fields:[id(),id('capital_id','Verified capital receipt ID'),reason]},
 {name:'Cancel unsubmitted replenishment',path:`${op}/replenishments/{id}/cancel`,permission:'treasury.release',fields:[id(),reason]},
 {name:'Record NGN/YUAN company capital',path:`${op}/capital`,permission:'treasury.reconcile',fields:[f('currency','Currency',undefined,['NGN','YUAN']),f('reference','Unique receipt reference'),f('amount','Amount (currency units)'),evidence],note:'Only verified company funds. Customer deposits must not be classified as company capital.'},
 {name:'Record verified Bridge company funding',path:'treasury/bridge/locations/{id}/company-funding',permission:'treasury.reconcile',fields:[id('id','Bridge location ID'),f('activity_id','Provider funding activity ID'),evidence]},
 {name:'Record bank balance observation',path:'treasury/locations/{id}/observations',permission:'treasury.reconcile',fields:[id('id','Location ID'),f('reference','Statement reference'),f('amount','Observed balance (asset units)'),f('observed_at','Observed at (ISO date/time with timezone)'),evidence]},
 {name:'Approve bank observation',path:`${op}/observations/{id}/approve`,permission:'treasury.reconcile',fields:[id('id','Observation ID'),evidence],note:'A different admin must approve the recorded observation.'},
 {name:'Refresh pool balance',path:`${op}/pools/{currency}/refresh`,permission:'treasury.reconcile',fields:[currency]},
 {name:'Configure settlement pool',path:`${op}/pools`,method:'PUT',permission:'treasury.configure',fields:[currency,id('location_id','Approved location ID'),f('balance_mode','Balance source',undefined,['bridge','nomba','reviewed_statement']),enabled,evidence]},
 {name:'Configure replenishment rule',path:`${op}/rules`,method:'PUT',permission:'treasury.configure',fields:[id('destination_location_id','Destination pool location ID'),{...id('source_position_id','Company Bridge source position ID'),optional:true},f('minimum','Minimum free company balance'),f('target','Target free company balance'),f('maximum','Maximum per replenishment'),f('daily_limit','Rolling daily limit'),enabled,f('automatic','Automatic (also requires ENV switch)','boolean'),reason]},
 {name:'Create migration cohort',path:`${op}/cohorts`,permission:'treasury.configure',fields:[f('reference','Unique cohort reference'),f('wallet_ids','Wallet IDs, separated by commas','ids'),evidence],note:'Created paused. Wallet balances are preserved; unresolved backing blocks enrollment.'},
 {name:'Change cohort state',path:`${op}/cohorts/{id}`,method:'PUT',permission:'treasury.configure',fields:[id('id','Cohort ID'),f('state','State',undefined,['paused','running','retry_failed']),evidence]},
 {name:'Enroll reviewed wallet',path:`${op}/wallets/{id}/enroll`,permission:'treasury.configure',fields:[id('id','Wallet ID'),evidence]},
 {name:'Set conversion rollout stage',path:`${op}/stages/{id}`,method:'PUT',permission:'treasury.configure',fields:[f('id','Stage',undefined,['1','2','3']),enabled,evidence],note:'1: NGN/USD. 2: YUAN/USD. 3: NGN/YUAN. ENV limits and predecessor stages still apply.'},
 {name:'Run operations recovery',path:`${op}/recover`,permission:'treasury.reconcile',fields:[],note:'Queues balance refresh, held-order recovery and configured treasury operations.'},
 {name:'Run backing reconciliation',path:'treasury/reconcile',permission:'treasury.reconcile',fields:[]},
 {name:'Reconcile Bridge movement',path:'treasury/bridge/movements/{id}/reconcile',permission:'treasury.reconcile',fields:[id('id','Movement ID')]},
 {name:'Retry or reconcile pooled payout',path:'treasury/payouts/{id}/retry',permission:'treasury.execute',fields:[id('id','Payout ID'),reason],note:'Uses the existing payout recovery workflow. Do not create a second payout.'},
 {name:'Cancel eligible pooled payout',path:'treasury/payouts/{id}/cancel',permission:'treasury.release',fields:[id('id','Payout ID'),reason]},
];
