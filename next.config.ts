import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/jobs',
        destination: '/squad-d2/src/app/jobs',
      },
      {
        source: '/register',
        destination: '/squad-d2/src/app/register',
      },
      {
        source: '/kanban',
        destination: '/squad-d2/src/app/kanban',
      },
    ];
  },
};

export default nextConfig;
