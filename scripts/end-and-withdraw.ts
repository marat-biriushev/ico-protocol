import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const { viem } = await hre.network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [owner, buyer] = await viem.getWalletClients();

  const addresses = JSON.parse(
    readFileSync(
      join(process.cwd(), "ignition/deployments/chain-31337/deployed_addresses.json"),
      "utf-8"
    )
  );
  const ico = await viem.getContractAt("SimpleICO", addresses["ICOModule#SimpleICO"]);

  // Отказ 1: покупка с нулевым value
  try {
    await ico.write.buyTokens({ value: 0n, account: buyer.account });
  } catch (e: any) {
    console.log("Отказ при msg.value = 0:", e.shortMessage ?? e.message);
  }

  // Промотка времени локальной ноды на 25 часов - ICO закончится
  await testClient.increaseTime({ seconds: 25 * 3600 });
  await testClient.mine({ blocks: 1 });
  console.log("Время ноды промотано на 25 часов вперёд");

  // Отказ 2: покупка после окончания ICO
  try {
    await ico.write.buyTokens({ value: parseEther("1"), account: buyer.account });
  } catch (e: any) {
    console.log("Отказ после окончания ICO:", e.shortMessage ?? e.message);
  }

  // Вывод собранного ETH владельцем
  const before = await publicClient.getBalance({ address: owner.account.address });
  const hash = await ico.write.withdraw({ account: owner.account });
  await publicClient.waitForTransactionReceipt({ hash });
  const after = await publicClient.getBalance({ address: owner.account.address });

  console.log("Владелец вывел:", formatEther(after - before), "ETH (минус газ)");
}

main().catch((e) => { console.error(e); process.exit(1); });