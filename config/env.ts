/** Runtime-safe frontend configuration. Secrets must remain server-side. */
export const frontendConfig = {
  termsUrl: process.env.NEXT_PUBLIC_TERMS_URL ?? '/terms',
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL ?? '/privacy',
  enableTwoFactor: process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false',
  reconciliationEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_ENABLED !== 'false',
  reconciliationDvaEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_DVA_ENABLED !== 'false',
  reconciliationNgnWithdrawalsEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_NGN_WITHDRAWALS_ENABLED !== 'false',
  reconciliationYellowCardEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_YELLOWCARD_ENABLED !== 'false',
  reconciliationBridgeEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_BRIDGE_ENABLED !== 'false',
  reconciliationQueueRecoveryEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_QUEUE_ENABLED !== 'false',
  reconciliationDeploymentCheckEnabled: process.env.NEXT_PUBLIC_ADMIN_RECONCILIATION_DEPLOYMENT_ENABLED !== 'false',
  adminTreasuryEnabled: process.env.NEXT_PUBLIC_ADMIN_TREASURY_ENABLED === 'true',
  apiProxyPath: '/api/proxy',
} as const;

export type FrontendFeatureFlag =
  | 'reconciliationEnabled'
  | 'reconciliationDvaEnabled'
  | 'reconciliationNgnWithdrawalsEnabled'
  | 'reconciliationYellowCardEnabled'
  | 'reconciliationBridgeEnabled'
  | 'reconciliationQueueRecoveryEnabled'
  | 'reconciliationDeploymentCheckEnabled'
  | 'adminTreasuryEnabled';
