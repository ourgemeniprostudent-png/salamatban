export const isOpenTestMode =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_OPEN_TEST_MODE === 'true';
