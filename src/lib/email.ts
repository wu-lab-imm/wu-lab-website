export const emailAddress = (email: string) => email.replace(/\s*\(at\)\s*/i, '@');

export const emailHref = (email: string) => `mailto:${emailAddress(email)}`;
