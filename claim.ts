import cli from "cli";
import { JsonRpcProvider, Wallet } from "ethers";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getTxLink, loadFromFile } from "./utils";
import { CLAIM_DATA_URL, PROXY_FILENAME, RPC_URL } from "./constants";
import { ClaimDataResponse } from "./types";

const provider = new JsonRpcProvider(RPC_URL);
const [proxy] = await loadFromFile(PROXY_FILENAME);
const agent = proxy ? new HttpsProxyAgent(`http://${proxy}`) : undefined;

export async function getClaimData(address: string, tournamentID: number) {
  cli.spinner("Получаю данные для клейма", false);

  const response = await fetch(CLAIM_DATA_URL, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.7",
      "cache-control": "public, s-maxage=1200, stale-while-revalidate=600",
      "content-type": "application/json",
      "priority": "u=1, i",
      "response-content-type": "application/json",
      "sec-ch-ua":
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "sec-gpc": "1",
      "sf-api-key": "a1c6494d30851c65cdb8cb047fdd",
      "Referer": "https://www.superform.xyz/",
      "Referrer-Policy": "origin-when-cross-origin",
    },
    body: `{"user":"${address}","tournamentID":${tournamentID}}`,
    method: "POST",
    agent,
  });

  const data = await response.json() as ClaimDataResponse;
  cli.spinner("Получаю данные для клейма: готово", true);

  return data;
}

export async function claim(key: string, data: ClaimDataResponse) {
  const wallet = new Wallet(key, provider);
  const { address } = wallet;

  if (!data.to || !data.transactionData || !data.value) {
    console.log("Ошибка в данных для клейма");
    return;
  }

  const unsignedTx = {
    from: address,
    to: data.to,
    value: data.value,
    data: data.transactionData,
  };

  const gasLimit = await wallet.estimateGas(unsignedTx);

  const { maxFeePerGas, maxPriorityFeePerGas } = await provider.getFeeData();

  cli.spinner("Отправляю транзакцию");

  const tx = await wallet.sendTransaction({
    ...unsignedTx,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  await provider.waitForTransaction(tx.hash);

  cli.spinner(getTxLink(tx.hash), true);
}
