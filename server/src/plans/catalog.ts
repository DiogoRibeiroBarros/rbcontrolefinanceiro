export const catalog = {
  FREE:{features:{mobileAccess:false,multipleProfiles:false,advancedReports:false,automaticBackup:false,investments:false,permissions:false,extendedAudit:false,cloudBackup:false},limits:{profiles:1,devices:1},flags:{mobileV2:true,cloudBackup:false,newReports:false}},
  PRO:{features:{mobileAccess:true,multipleProfiles:true,advancedReports:true,automaticBackup:true,investments:true,permissions:true,extendedAudit:false,cloudBackup:false},limits:{profiles:10,devices:5},flags:{mobileV2:true,cloudBackup:false,newReports:false}},
  BUSINESS:{features:{mobileAccess:true,multipleProfiles:true,advancedReports:true,automaticBackup:true,investments:true,permissions:true,extendedAudit:true,cloudBackup:false},limits:{profiles:50,devices:20},flags:{mobileV2:true,cloudBackup:false,newReports:false}}
};
export function effectivePlan(sub:{plan:string;status:string;trialEndsAt:Date|null;currentPeriodEnd:Date|null}|null,now=Date.now()):keyof typeof catalog {
  if(!sub||sub.status==='suspended'||sub.status==='expired') return 'FREE';
  const end=sub.status==='trialing'?sub.trialEndsAt:sub.currentPeriodEnd;
  if(!end||end.getTime()<=now) return 'FREE';
  if(!['trialing','active','canceled','past_due'].includes(sub.status)) return 'FREE';
  return sub.plan==='PRO'||sub.plan==='BUSINESS'?sub.plan:'FREE';
}
