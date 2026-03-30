const PARTNER_LOGOS: Record<string, string> = {
  aave: 'https://imgs.search.brave.com/pFPVewX6EPaA9cqyHiIwKWNoh2RifQawztq9l8PIb30/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvMTBhMzc0YTEy/ZGE4NTAxMzIyYjA5/NjVkNjdhNTZmZTQ1/MzkxZjdjNGU0NjNj/YmNjOTViYTZhNzVh/NWM2NjVhMi93d3cu/YWF2ZS5jb20v',
};

export const getPartnerLogo = (partnerName: string): string | null =>
  PARTNER_LOGOS[partnerName.toLowerCase()] ?? null;
