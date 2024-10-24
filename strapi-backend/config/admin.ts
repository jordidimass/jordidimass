export default ({ env }: { env: (key: string) => string }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
});