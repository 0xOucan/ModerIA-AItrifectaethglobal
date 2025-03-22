import { erc20Abi } from "viem";

const USDC_ADDRESS = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"; // Sepolia USDC

const AGENT_WALLETS = {
  Mentorship: "0x0000000000000000000000000000000000000000",
  CommunityCall: "0x0000000000000000000000000000000000000001",
  Conference: "0x0000000000000000000000000000000000000002",
};

export async function sendUSDC(
  user: any,
  agent: string,
  amount: bigint
) {
  if (!user?.wallet) throw new Error("User wallet not found");

  const recipient = AGENT_WALLETS[agent as keyof typeof AGENT_WALLETS] as `0x${string}`;
  const walletClient = await user.wallet.getWalletClient();

  return await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amount],
  });
}
