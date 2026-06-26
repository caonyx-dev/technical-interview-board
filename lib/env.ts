function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  get interviewerPassword() {
    return required("INTERVIEWER_PASSWORD");
  },
  get jwtSecret() {
    return required("JWT_SECRET");
  },
  get port() {
    return Number(process.env.PORT ?? 3002);
  },
};
