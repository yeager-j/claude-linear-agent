import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = { transpilePackages: ["@workspace/contract"] };

export default withWorkflow(nextConfig);
