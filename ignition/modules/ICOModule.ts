import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

export default buildModule("ICOModule", (m) => {
  // 1 000 000 why deployed (to the owner)
  const token = m.contract("MyToken", [parseEther("1000000")]);

  // Временные рамки считаются в момент деплоя:
  // ICO активно сразу и в течение суток
  const now = Math.floor(Date.now() / 1000);
  const startTime = BigInt(now - 60);
  const endTime = BigInt(now + 24 * 3600);

  // 1000 токенов за 1 ETH
  const rate = 1000n;

  const ico = m.contract("SimpleICO", [token, rate, startTime, endTime]);

  // Новая конструкция: m.call - вызов функции контракта как шаг деплоя.
  // Переводим на "витрину" ICO половину тиража - без этого
  // любая покупка упадёт с "not enough tokens left for sale"
  m.call(token, "transfer", [ico, parseEther("500000")]);

  return { token, ico };
});