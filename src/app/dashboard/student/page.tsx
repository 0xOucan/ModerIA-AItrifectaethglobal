"use client";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { parseUnits } from "viem";
import { sendUSDC } from "@/lib/sendUSDC";

export default function StudentDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [usdcAmount, setUsdcAmount] = useState("");
  const { ready, authenticated, user } = usePrivy();

  const AGENT_OPTIONS = [
    // I need to add agent wallet address later. (after decided if Privy or ZKEmail)
    { name: "Mentorship", amount: "25", wallet: "0x0000000000000000000000000000000000000000" },
    { name: "Community Call", amount: "1", wallet: "0x1111111111111111111111111111111111111111" },
    { name: "Conference", amount: "100", wallet: "0x2222222222222222222222222222222222222222" },
  ];

  useEffect(() => {
    if (selectedAgent) {
      const agent = AGENT_OPTIONS.find(agent => agent.name === selectedAgent);
      if (agent) {
        setUsdcAmount(agent.amount);
      }
    }
  }, [selectedAgent]);
  
  const handleDeposit = async () => {
    if (!authenticated || !ready || !selectedAgent) {
      alert("You must be logged in and select an agent.");
      return;
    }

    const agent = AGENT_OPTIONS.find(agent => agent.name === selectedAgent);
    if (!agent) return alert("Selected agent not found.");

    const recipient = agent.wallet;
    const amount = parseUnits(usdcAmount, 6);

    console.log(`💸 Sending ${usdcAmount} USDC to ${recipient}...`);

    try {
      const tx = await sendUSDC(user, selectedAgent, amount);
      console.log("✅ USDC sent! TxHash:", tx);
      alert(`✅ Sent ${usdcAmount} USDC to ${recipient}`);
    } catch (err) {
      console.error("❌ Failed to send USDC:", err);
      alert("❌ Failed to send USDC");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>

        {/* Select Agent */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Select an Agent:</h2>
          <div className="flex space-x-2 mt-2">
            {["Mentorship", "Community Call", "Conference"].map((agent) => (
              <button
                key={agent}
                className={`p-2 rounded-md ${selectedAgent === agent ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setSelectedAgent(agent)}
              >
                {agent}
              </button>
            ))}
          </div>
        </div>

        {/* Deposit USDC */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Deposit USDC:</h2>
          <input
            type="number"
            className="border p-2 rounded-md w-full"
            placeholder="Amount"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
          />
          <button onClick={handleDeposit} className="mt-2 p-2 w-full bg-green-500 text-white rounded-md">
            Deposit
          </button>
        </div>

        {/* Match Code */}
        <div className="mt-4 p-3 bg-yellow-100 text-center rounded-md">
          <p>🔑 Match Code: 1234ABCD</p>
        </div>
      </div>
    </main>
  );
}
