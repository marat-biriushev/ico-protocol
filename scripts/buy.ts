import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const { viem } = await hre.network.create();
  const publicClient = await viem.getPublicClient();

  // Аккаунт #0 - владелец (деплоер), #1 - покупатель
  const [owner, buyer] = await viem.getWalletClients();

  const addresses = JSON.parse(
    readFileSync(
      join(process.cwd(), "ignition/deployments/chain-31337/deployed_addresses.json"),
      "utf-8"
    )
  );

  const token = await viem.getContractAt("MyToken", addresses["ICOModule#MyToken"]);
  const ico = await viem.getContractAt("SimpleICO", addresses["ICOModule#SimpleICO"]);

  console.log("Баланс покупателя до:", formatEther(
    await token.read.balanceOf([buyer.account.address])
  ), "ICOT");

  // Покупка 1: явный вызов buyTokens с 1 ETH
  let hash = await ico.write.buyTokens({
    value: parseEther("1"),
    account: buyer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Куплено за 1 ETH через buyTokens()");

  // Покупка 2: просто отправляем ETH на адрес контракта -
  // сработает receive() и тоже продаст токены
  hash = await buyer.sendTransaction({
    to: ico.address,
    value: parseEther("0.5"),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Куплено за 0.5 ETH простым переводом ETH");

  console.log("Баланс покупателя после:", formatEther(
    await token.read.balanceOf([buyer.account.address])
  ), "ICOT");
  console.log("Собрано в ICO:", formatEther(
    await ico.read.totalRaised()
  ), "ETH");
}

main().catch((e) => { console.error(e); process.exit(1); });