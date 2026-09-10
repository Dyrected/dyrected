export const getContext = () => ({ headers: {} });
export const getVercelOidcToken = async () => "";
export const getVercelOidcTokenSync = () => "";
export const getVercelToken = async () => "";
export class AccessTokenMissingError extends Error {}
export class RefreshAccessTokenFailedError extends Error {}
